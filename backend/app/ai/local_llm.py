"""
AIRA - Local Multilingual Ollama LLM Intelligence Engine
Translates user natural language:
- Telugu (తెలుగు) + English
- Hindi (हिन्दी) + English
- English
- Tamil (தமிழ்) + English
- Malayalam (മലയാളം) + English
into safe PostgreSQL queries, executes read-only queries against live PostgreSQL records,
and synthesizes natural conversational answers strictly in the user's chosen language.
Guarantees 100% offline, local inference without cloud dependencies.
"""

import os
import re
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models import Product, SalesRecord, Alert
from app.ai.rule_based_assistant import rule_assistant, detect_language

logger = logging.getLogger("aira.local_llm")

OLLAMA_BASE_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")

DB_SCHEMA_PROMPT = """PostgreSQL Database: aira_db. Current Date: {today}
Strict Tables (NO OTHER TABLES EXIST):
1. products (id, name, sku, category, price, cost_price, unit_profit, margin, stock, min_stock, units_sold, revenue, total_profit, order_recommendation)
2. sales_records (id, product_id, units_sold, price_per_unit, total_amount, sale_date)

MULTILINGUAL ENTITY DICTIONARY (Translate regional terms to English product search):
- Telugu: నూనె -> Oil, బియ్యం -> Rice, పాలు -> Milk, చక్కెర -> Sugar, పప్పు -> Dal, నెయ్యి -> Ghee, సబ్బు -> Soap, ఆటా -> Atta, బిస్కెట్ -> Biscuit
- Hindi: तेल -> Oil, चावल -> Rice, दूध -> Milk, चीनी -> Sugar, दाल -> Dal, घी -> Ghee, साबुन -> Soap, आटा -> Atta, बिस्कुट -> Biscuit
- Tamil: எண்ணெய் -> Oil, அரிசி -> Rice, பால் -> Milk, சர்க்கரை -> Sugar, பருப்பு -> Dal, நெய் -> Ghee, சோப் -> Soap, மாவு -> Atta, பிஸ்கட் -> Biscuit
- Malayalam: എണ്ണ -> Oil, അരി -> Rice, പാൽ -> Milk, പഞ്ചസാര -> Sugar, പരിപ്പ് -> Dal, നെയ്യ് -> Ghee, സോപ്പ് -> Soap, ആട്ട -> Atta, ബിസ്കറ്റ് -> Biscuit

RULES:
- Return ONLY ONE valid PostgreSQL SELECT query inside ```sql ... ```.
- Strictly read-only SELECT.
- ONLY query tables 'products' or 'sales_records'. Do NOT invent tables like rice_stock or oil_stock.
- Product name search must use English keywords with ILIKE, e.g.: WHERE name ILIKE '%oil%' or WHERE name ILIKE '%rice%' or WHERE name ILIKE '%milk%'
- Today's sales: WHERE DATE(sale_date) = CURRENT_DATE or DATE(sale_date) = '{today}'
"""

SYNTHESIS_SYSTEM_PROMPT = """You are AIRA (Autonomous Intelligent Retail Assistant), a friendly, helpful store assistant speaking directly to the retail store owner.
You are running locally on their device.

CRITICAL MULTILINGUAL & BILINGUAL CODE-SWITCHING RULES:
1. Respond STRICTLY in the target language requested (Telugu, Hindi, Tamil, Malayalam, or English).
2. Natural bilingual code-switching with everyday retail English words (such as 'sales', 'stock', 'orders', 'units', 'price', 'profit') is encouraged and expected for natural conversational flow.
   - Example (Telugu): "ఈ రోజు మొత్తం ₹1,630 sales అయ్యాయి. 4 orders ద్వారా 4 units అమ్ముడయ్యాయి."
   - Example (Hindi): "आज कुल ₹1,630 की sales हुई है। 4 orders में 4 units बिकी हैं।"
   - Example (Tamil): "இன்று மொத்தம் ₹1,630 விற்பனை (sales) ஆகியுள்ளது. 4 orders மூலம் 4 units விற்பனையானது."
   - Example (Malayalam): "ഇന്ന് ആകെ ₹1,630 sales നടന്നിട്ടുണ്ട്. 4 orders വഴി 4 units വിറ്റുപോയി."
   - Example (English): "Today's sales are ₹1,630 so far across 4 orders."
3. NEVER use robotic database phrases like:
   - Do NOT say "According to PostgreSQL records..."
   - Do NOT say "The SQL query returned..."
   - Do NOT say "Database telemetry indicates..."
4. Keep the answer direct, warm, and concise (1-2 sentences) so it can be read easily and spoken aloud via text-to-speech.
5. Base all financial figures strictly on the provided real Database Query Results. Never invent numbers.
"""

LANGUAGE_DISPLAY_NAMES = {
    "te": "Telugu (తెలుగు) with natural English retail loanwords",
    "hi": "Hindi (हिन्दी) with natural English retail loanwords",
    "ta": "Tamil (தமிழ்) with natural English retail loanwords",
    "ml": "Malayalam (മലയാളം) with natural English retail loanwords",
    "en": "English"
}

class LocalOllamaAssistant:
    def __init__(self, base_url: str = OLLAMA_BASE_URL, default_model: str = DEFAULT_MODEL):
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model
        self.client = httpx.Client(timeout=60.0)

    def is_ollama_available(self) -> bool:
        """Checks if local Ollama service is reachable at localhost:11434."""
        try:
            resp = self.client.get(f"{self.base_url}/api/tags", timeout=1.5)
            return resp.status_code == 200
        except Exception:
            return False

    def get_available_models(self) -> List[str]:
        """Returns list of downloaded model tags from local Ollama."""
        try:
            resp = self.client.get(f"{self.base_url}/api/tags", timeout=2.0)
            if resp.status_code == 200:
                data = resp.json()
                return [m.get("name", "") for m in data.get("models", [])]
        except Exception:
            pass
        return []

    def _clean_speech_text(self, text_str: str) -> str:
        """Strips symbols, markdown, and emojis for smooth TTS speech."""
        cleaned = re.sub(r'[*_#`~>\[\]]', '', text_str)
        cleaned = re.sub(r'\(http[s]?://\S+\)', '', cleaned)
        cleaned = re.sub(r'[\U00010000-\U0010ffff]', '', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    def _generate_sql(self, user_query: str, model_name: str) -> Optional[str]:
        """Asks Ollama LLM to generate a safe PostgreSQL SELECT query from user's multilingual question."""
        today_str = datetime.now().strftime("%Y-%m-%d")
        system_content = DB_SCHEMA_PROMPT.format(today=today_str)
        user_content = f"User Question: {user_query}\nGenerate the PostgreSQL SQL query:"

        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_content}
            ],
            "stream": False,
            "keep_alive": -1,
            "options": {"temperature": 0.0, "num_predict": 45, "num_ctx": 1024}
        }

        try:
            resp = self.client.post(f"{self.base_url}/api/chat", json=payload, timeout=25.0)
            if resp.status_code == 200:
                content = resp.json().get("message", {}).get("content", "").strip()
                match = re.search(r'```(?:sql)?\s*(SELECT.+?)\s*```', content, re.DOTALL | re.IGNORECASE)
                if match:
                    return match.group(1).strip()
                if content.strip().upper().startswith("SELECT"):
                    return content.strip().split(";")[0] + ";"
        except Exception as e:
            logger.warning(f"Error generating SQL with Ollama: {e}")
        return None

    def _execute_safe_sql(self, sql_query: str, db: Session) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """Executes a strictly validated read-only SQL query on PostgreSQL."""
        cleaned = sql_query.strip()

        # Security check: must start with SELECT
        if not re.match(r'^\s*SELECT\b', cleaned, re.IGNORECASE):
            return [], "Only SELECT queries are permitted."

        dangerous_tokens = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "EXEC", "CREATE", "GRANT", "REVOKE"]
        for token in dangerous_tokens:
            if re.search(r'\b' + token + r'\b', cleaned, re.IGNORECASE):
                return [], f"Forbidden SQL token detected: {token}"

        try:
            cursor = db.execute(text(cleaned))
            rows = cursor.fetchall()
            keys = cursor.keys()
            results = [dict(zip(keys, row)) for row in rows]
            return results, None
        except Exception as e:
            logger.warning(f"SQL execution error: {e}")
            return [], str(e)

    def _synthesize_answer(self, user_query: str, db_results: List[Dict[str, Any]], model_name: str, target_lang: str) -> Optional[str]:
        """Asks Ollama LLM to synthesize a natural conversational response in the user's specific language."""
        results_json = json.dumps(db_results, default=str)
        lang_target_desc = LANGUAGE_DISPLAY_NAMES.get(target_lang, "English")

        prompt = (
            f"User Question: {user_query}\n"
            f"Verified PostgreSQL Results: {results_json}\n\n"
            f"Respond directly to the shop owner strictly in {lang_target_desc} in 1-2 conversational sentences. "
            f"Do not use robotic database prefixes. State the financial/inventory numbers naturally."
        )

        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": SYNTHESIS_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            "stream": False,
            "keep_alive": -1,
            "options": {"temperature": 0.1, "num_predict": 50, "num_ctx": 1024}
        }

        try:
            resp = self.client.post(f"{self.base_url}/api/chat", json=payload, timeout=25.0)
            if resp.status_code == 200:
                answer = resp.json().get("message", {}).get("content", "").strip()
                return answer
        except Exception as e:
            logger.warning(f"Error synthesizing answer with Ollama: {e}")
        return None

    def query(
        self,
        prompt: str,
        db: Session,
        language: str = "en",
        store_name: str = "AIRA Supermarket"
    ) -> Dict[str, Any]:
        """
        Main multilingual query entrypoint.
        Supports Telugu (te), Hindi (hi), English (en), Tamil (ta), and Malayalam (ml).
        1. Checks Rule-Based Engine first for instant (< 50ms) direct responses.
        2. Routes un-templated questions to Ollama (gemma3:4b).
        3. Generates safe read-only SQL, executes on PostgreSQL, and synthesizes reply in the user's language.
        """
        user_lang = detect_language(prompt, language)
        bcp_lang_tag = f"{user_lang}-IN"

        # Priority Check: Answer instantly (< 50ms) via verified Rule Assistant if query pattern matches
        if rule_assistant.can_handle(prompt, db):
            logger.info(f"Query matched verified pattern. Answering directly in {user_lang} via PostgreSQL rule engine.")
            base_result = rule_assistant.execute_and_reply(
                query=prompt,
                db=db,
                store_name=store_name,
                currency="₹",
                language=bcp_lang_tag
            )
            db_reply = base_result.get("reply", base_result.get("response", ""))
            return {
                "reply": db_reply,
                "response": db_reply,
                "speech_text": base_result.get("speech_text", self._clean_speech_text(db_reply)),
                "model": "AIRA Instant Rule Assistant",
                "engine": "PostgreSQL Rule Engine",
                "cards": base_result.get("cards", []),
                "language": bcp_lang_tag
            }

        # Check if Ollama is running and has models
        if self.is_ollama_available():
            available = self.get_available_models()
            model_to_use = self.default_model
            matched = [m for m in available if self.default_model in m]
            if matched:
                model_to_use = matched[0]
            elif available:
                model_to_use = available[0]

            logger.info(f"Ollama running model: {model_to_use}. Translating multilingual query to SQL...")
            
            # Step 1: Text-to-SQL
            sql = self._generate_sql(prompt, model_to_use)
            if sql:
                logger.info(f"Generated SQL: {sql}")
                # Step 2: Safe execution on PostgreSQL
                db_results, err = self._execute_safe_sql(sql, db)
                if not err and db_results:
                    # Step 3: Natural language conversational synthesis in user's original language
                    conversational_reply = self._synthesize_answer(prompt, db_results, model_to_use, user_lang)
                    if conversational_reply:
                        cards = self._extract_cards_from_results(db_results, db)
                        return {
                            "reply": conversational_reply,
                            "response": conversational_reply,
                            "speech_text": self._clean_speech_text(conversational_reply),
                            "model": f"Ollama ({model_to_use})",
                            "engine": "Ollama Multilingual SQL + PostgreSQL",
                            "sql_executed": sql,
                            "cards": cards,
                            "language": bcp_lang_tag
                        }

        # Step 4: Fallback to ORM Intelligence if Ollama is loading
        base_result = rule_assistant.execute_and_reply(
            query=prompt,
            db=db,
            store_name=store_name,
            currency="₹",
            language=bcp_lang_tag
        )

        db_reply = base_result.get("reply", base_result.get("response", ""))
        cards = base_result.get("cards", [])

        return {
            "reply": db_reply,
            "response": db_reply,
            "speech_text": base_result.get("speech_text", self._clean_speech_text(db_reply)),
            "model": "AIRA Intelligent Store Engine",
            "engine": "PostgreSQL Live Ground",
            "cards": cards,
            "language": bcp_lang_tag
        }

    def _extract_cards_from_results(self, results: List[Dict[str, Any]], db: Session) -> List[Dict[str, Any]]:
        """Extracts product cards for the frontend UI from query results."""
        cards = []
        for r in results[:4]:
            prod = None
            if "id" in r and isinstance(r["id"], int):
                prod = db.query(Product).filter(Product.id == r["id"]).first()
            elif "product_id" in r and isinstance(r["product_id"], int):
                prod = db.query(Product).filter(Product.id == r["product_id"]).first()
            elif "name" in r:
                prod = db.query(Product).filter(Product.name == str(r["name"])).first()

            if prod and prod not in cards:
                cards.append({
                    "id": prod.id,
                    "name": prod.name,
                    "stock": prod.stock,
                    "minStock": prod.min_stock,
                    "price": prod.price,
                    "margin": prod.margin,
                    "orderRecommendation": prod.order_recommendation or 30,
                    "image": prod.image or "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop"
                })
        return cards

local_assistant = LocalOllamaAssistant()
