"""
AIRA - Local Ollama LLM Intelligence Engine
Translates user natural language (English, Telugu, or mixed Telugu-English) into PostgreSQL queries,
executes safe read-only queries against live PostgreSQL records, and synthesizes natural conversational answers.
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
from app.ai.rule_based_assistant import rule_assistant

logger = logging.getLogger("aira.local_llm")

OLLAMA_BASE_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")

DB_SCHEMA_PROMPT = """PostgreSQL Database: aira_db. Current Date: {today}
Tables:
1. products (id, name, sku, category, price, cost_price, unit_profit, margin, stock, min_stock, units_sold, revenue, total_profit, order_recommendation)
2. sales_records (id, product_id, units_sold, price_per_unit, total_amount, sale_date)

RULES:
- Return ONLY ONE valid PostgreSQL SELECT query inside ```sql ... ```.
- Strictly read-only SELECT.
- Today's sales: WHERE DATE(sale_date) = CURRENT_DATE or DATE(sale_date) = '{today}'
- Product name search: ILIKE '%name%'
"""

SYNTHESIS_SYSTEM_PROMPT = """You are AIRA (Autonomous Intelligent Retail Assistant), a friendly, experienced digital store manager talking directly to the retail store owner.
You are running locally on their laptop.

CRITICAL COMMUNICATION RULES:
1. Speak in NATURAL, EVERYDAY HUMAN LANGUAGE like a helpful shop manager or cashier speaking to the owner.
   - Example (English): "Today's sales are ₹1,630 so far, across 4 orders."
   - Example (Telugu): "ఈ రోజు మొత్తం అమ్మకాలు ₹1,630 అయ్యాయి. మొత్తం 4 ఆర్డర్లలో 4 వస్తువులు అమ్ముడయ్యాయి."
2. NEVER use robotic database phrases like:
   - Do NOT say "According to PostgreSQL records..."
   - Do NOT say "The SQL query returned..."
   - Do NOT say "Database telemetry indicates..."
3. BILINGUAL RESPONSE RULE:
   - If the user asks in Telugu or mixed Telugu-English (code-switching like 'ఈ రోజు sales ఎంత?' or 'today sales ఎలా ఉన్నాయి?'), respond in warm, natural conversational Telugu.
   - If the user asks in English, respond in clear, friendly English.
4. Keep the answer direct and concise (1-2 sentences) so it can be read easily and spoken out loud via text-to-speech.
5. Base all financial figures strictly on the provided real Database Query Results. Never invent fake numbers.
"""

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
        """Asks Ollama LLM to generate a safe PostgreSQL SELECT query from user's natural language."""
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
            "options": {"temperature": 0.0, "num_predict": 60}
        }

        try:
            resp = self.client.post(f"{self.base_url}/api/chat", json=payload, timeout=90.0)
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

        # Disallow dangerous SQL tokens
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

    def _synthesize_answer(self, user_query: str, db_results: List[Dict[str, Any]], model_name: str, is_telugu: bool) -> Optional[str]:
        """Asks Ollama LLM to synthesize a natural conversational response in Telugu or English."""
        results_json = json.dumps(db_results, default=str)
        lang_target = "Telugu (తెలుగు)" if is_telugu else "English"

        prompt = (
            f"User Question: {user_query}\n"
            f"Verified PostgreSQL Results: {results_json}\n\n"
            f"Respond directly to the shop owner in {lang_target} in 1-2 conversational sentences. "
            f"Do not use robotic prefixes. State the numbers naturally."
        )

        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": SYNTHESIS_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            "stream": False,
            "keep_alive": -1,
            "options": {"temperature": 0.2, "num_predict": 75}
        }

        try:
            resp = self.client.post(f"{self.base_url}/api/chat", json=payload, timeout=90.0)
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
        Main query entrypoint.
        1. Uses Ollama to understand the text and generate a SQL query.
        2. Executes the safe read-only SQL on PostgreSQL.
        3. Uses Ollama to speak the final answer in natural language.
        4. If Ollama is downloading or starting up, uses the verified ORM fallback.
        """
        is_telugu = (language.startswith("te") or bool(re.search(r'[\u0C00-\u0C7F]', prompt)))

        # Check if Ollama is running and has models
        if self.is_ollama_available():
            available = self.get_available_models()
            model_to_use = self.default_model
            matched = [m for m in available if self.default_model in m]
            if matched:
                model_to_use = matched[0]
            elif available:
                model_to_use = available[0]

            logger.info(f"Ollama running model: {model_to_use}. Translating query to SQL...")
            
            # Step 1: Text-to-SQL
            sql = self._generate_sql(prompt, model_to_use)
            if sql:
                logger.info(f"Generated SQL: {sql}")
                # Step 2: Safe execution on PostgreSQL
                db_results, err = self._execute_safe_sql(sql, db)
                if not err and db_results:
                    # Step 3: Natural language conversational synthesis
                    conversational_reply = self._synthesize_answer(prompt, db_results, model_to_use, is_telugu)
                    if conversational_reply:
                        # Extract product cards if product IDs or names are present
                        cards = self._extract_cards_from_results(db_results, db)
                        return {
                            "reply": conversational_reply,
                            "response": conversational_reply,
                            "speech_text": self._clean_speech_text(conversational_reply),
                            "model": f"Ollama ({model_to_use})",
                            "engine": "Ollama Text-to-SQL + PostgreSQL",
                            "sql_executed": sql,
                            "cards": cards,
                            "language": "te-IN" if is_telugu else "en-IN"
                        }

        # Step 4: Fallback to ORM Intelligence if Ollama is loading or model is downloading
        base_result = rule_assistant.execute_and_reply(
            query=prompt,
            db=db,
            store_name=store_name,
            currency="₹",
            language="te-IN" if is_telugu else "en-IN"
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
            "language": "te-IN" if is_telugu else "en-IN"
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
