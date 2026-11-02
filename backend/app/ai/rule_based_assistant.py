"""
AIRA - Database-Grounded Multilingual Retail Assistant Engine
Connects directly to PostgreSQL to answer inventory, sales, pricing, and health queries.
Strictly partitioned into 15 specific question patterns across 4 groups:
1. PROFITS: Highest profit, lowest profit/margin, best profit margins
2. SALES: Today's sales & orders, total store sales/revenue, top sellers, low selling/least sold
3. PRICES: Specific product price, most expensive product, cheapest product
4. STOCKS: Specific product stock, low stock/reorder items, out-of-stock items, high stock items, live restock/sale actions

Supports Telugu (తెలుగు), Hindi (हिन्दी), English, Tamil (தமிழ்), and Malayalam (മലയാളം).
All un-templated questions return can_handle() = False to let Ollama LLM handle them.
"""

import os
import re
from datetime import datetime, date
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Product, SalesRecord, Alert

STOPWORDS = {
    "what", "is", "the", "are", "of", "in", "to", "for", "on", "a", "an", "and", "or",
    "how", "much", "many", "tell", "me", "show", "give", "any", "all", "our", "my",
    "can", "you", "will", "would", "could", "should", "does", "did", "do", "has", "have", "had",
    "item", "items", "product", "products", "available", "good", "fine", "see", "get"
}

QUERY_FILLERS = {
    "demand", "stock", "price", "left", "cost", "margin", "profit",
    "rate", "units", "count", "available", "details", "status", "info",
    "low", "high", "top", "best", "fast", "most", "today", "yesterday",
    "overall", "total", "store", "sale", "sales", "business", "orders", "order",
    "compare", "trend", "trends", "weekend", "festive", "festival", "month", "year", "week"
}

MULTILINGUAL_PRODUCT_MAP = {
    # Telugu
    "బియ్యం": "rice", "రైస్": "rice", "నూనె": "oil", "ఆయిల్": "oil", "గోధుమ": "atta", "ఆటా": "atta",
    "పిండి": "flour", "చక్కెర": "sugar", "షుగర్": "sugar", "పాలు": "milk", "మిల్క్": "milk",
    "సబ్బు": "soap", "సోప్": "soap", "టీ": "tea", "చాయ్": "tea", "కాఫీ": "coffee", "పప్పు": "dal",
    "దాల్": "dal", "నెయ్యి": "ghee", "ఘీ": "ghee", "సగ్గుబియ్యం": "sago", "జామ్": "jam",
    "బిస్కెట్": "biscuit", "బిస్కెట్లు": "biscuit", "ఉప్పు": "salt", "గుడ్లు": "egg", "ఎగ్స్": "egg",
    "బాదం": "almond", "కాజు": "cashew", "జీడిపప్పు": "cashew", "మ్యాగీ": "maggi", "నూడుల్స్": "noodle",
    "ఓట్స్": "oats", "షాంపూ": "shampoo", "పేస్ట్": "paste", "టూత్‌పేస్ట్": "paste", "సర్ఫ్": "detergent",
    "డిటర్జెంట్": "detergent",

    # Hindi
    "चावल": "rice", "तेल": "oil", "आटा": "atta", "दूध": "milk", "दाल": "dal", "चीनी": "sugar",
    "शक्कर": "sugar", "साबुन": "soap", "चाय": "tea", "कॉफी": "coffee", "घी": "ghee",
    "बिस्कुट": "biscuit", "नमक": "salt", "मसाला": "masala", "हल्दी": "turmeric", "मिर्च": "chilli",
    "अंडे": "egg", "बादाम": "almond", "काजू": "cashew", "मैगी": "maggi", "नूडल्स": "noodle",
    "ओट्स": "oats", "शैम्पू": "shampoo", "पेस्ट": "paste", "टूथपेस्ट": "paste", "सर्फ": "detergent",

    # Tamil
    "அரிசி": "rice", "எண்ணெய்": "oil", "மாவு": "atta", "பால்": "milk", "பருப்பு": "dal",
    "சர்க்கரை": "sugar", "சோப்": "soap", "தேநீர்": "tea", "டீ": "tea", "காபி": "coffee",
    "நெய்": "ghee", "பிஸ்கட்": "biscuit", "உப்பு": "salt", "முட்டை": "egg", "பாதாம்": "almond",
    "முந்திரி": "cashew", "மேகி": "maggi", "ஷாம்பு": "shampoo", "பேஸ்ட்": "paste",

    # Malayalam
    "അരി": "rice", "എണ്ണ": "oil", "ആട്ട": "atta", "പാൽ": "milk", "പരിപ്പ്": "dal",
    "പഞ്ചസാര": "sugar", "സോപ്പ്": "soap", "ചായ": "tea", "ടീ": "tea", "കാപ്പി": "coffee",
    "നെയ്യ്": "ghee", "ബിസ്കറ്റ്": "biscuit", "ഉപ്പ്": "salt", "മുട്ട": "egg", "ബദാം": "almond",
    "കശുവണ്ടി": "cashew", "മാഗി": "maggi", "ഷാംപൂ": "shampoo", "പേസ്റ്റ്": "paste"
}

def detect_language(text: str, hint: str = "en") -> str:
    """Detects language among Telugu (te), Hindi (hi), Tamil (ta), Malayalam (ml), or English (en)."""
    if hint.startswith("te") or re.search(r'[\u0C00-\u0C7F]', text):
        return "te"
    if hint.startswith("hi") or re.search(r'[\u0900-\u097F]', text):
        return "hi"
    if hint.startswith("ta") or re.search(r'[\u0B80-\u0BFF]', text):
        return "ta"
    if hint.startswith("ml") or re.search(r'[\u0D00-\u0D7F]', text):
        return "ml"
    if hint.startswith("en"):
        return "en"
    return "en"

class RuleBasedAssistantEngine:
    def __init__(self):
        pass

    def _clean_speech_text(self, text: str) -> str:
        """Strips markdown asterisks, hashes, emojis, and symbols so TTS speaks cleanly."""
        cleaned = re.sub(r'[*_#`~>\[\]]', '', text)
        cleaned = re.sub(r'\(http[s]?://\S+\)', '', cleaned)
        cleaned = re.sub(r'[\U00010000-\U0010ffff]', '', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    def execute_and_reply(
        self,
        query: str,
        db: Session,
        store_name: str = "AIRA Retail Mart",
        currency: str = "₹",
        language: str = "en-IN"
    ) -> Dict[str, Any]:
        q_lower = query.lower().strip()
        all_products = db.query(Product).all()
        cards = []
        lang = detect_language(query, language)

        # =========================================================================
        # GROUP 4, INTENT 15: LIVE RESTOCK OR SALE DB OPERATIONS
        # =========================================================================
        restock_match = re.search(r'(?:restock|add|order)\s+(\d+)\s*(?:units|packets|bottles|boxes|items)?\s*(?:of|to|for)?\s*(.+)', q_lower)
        if not restock_match:
            restock_match = re.search(r'(?:restock|add|order)\s+([a-zA-Z\s]+?)\s*(?:by|with)?\s*(\d+)\s*(?:units)?', q_lower)
            if restock_match:
                prod_term = restock_match.group(1).strip()
                qty_val = int(restock_match.group(2))
            else:
                prod_term = None
                qty_val = None
        else:
            qty_val = int(restock_match.group(1))
            prod_term = restock_match.group(2).strip()

        if qty_val and prod_term:
            target_prod = self._find_matching_product(prod_term, all_products)
            if target_prod:
                target_prod.stock = (target_prod.stock or 0) + qty_val
                if target_prod.stock > (target_prod.min_stock or 15):
                    target_prod.status = "Healthy"
                db.commit()
                db.refresh(target_prod)

                if lang == "te":
                    reply = f"{target_prod.name} కు {qty_val} యూనిట్ల స్టాక్ చేర్చబడింది. ప్రస్తుత నిల్వ: {target_prod.stock} యూనిట్లు."
                elif lang == "hi":
                    reply = f"{target_prod.name} में {qty_val} यूनिट्स का स्टॉक सफलतापूर्वक जोड़ दिया गया है। कुल स्टॉक: {target_prod.stock} यूनिट्स।"
                elif lang == "ta":
                    reply = f"{target_prod.name}க்கு {qty_val} அலகுகள் இருப்பு வெற்றிகரமாக சேர்க்கப்பட்டது. தற்போதைய இருப்பு: {target_prod.stock} அலகுகள்."
                elif lang == "ml":
                    reply = f"{target_prod.name}ലേക്ക് {qty_val} യൂണിറ്റുകൾ സ്റ്റോക്ക് ചേർത്തു. ഇപ്പോഴത്തെ സ്റ്റോക്ക്: {target_prod.stock} യൂണിറ്റുകൾ."
                else:
                    reply = f"Successfully restocked {qty_val} units of {target_prod.name}. Current stock is now {target_prod.stock} units."
                cards.append(self._product_to_card(target_prod))
                return self._format_result(reply, "DB Operation (Restock)", cards, f"{lang}-IN")

        sell_match = re.search(r'(?:sell|sold|billed)\s+(\d+)\s*(?:units|packets|bottles|boxes|items)?\s*(?:of|for)?\s*(.+)', q_lower)
        if sell_match:
            qty_val = int(sell_match.group(1))
            prod_term = sell_match.group(2).strip()
            target_prod = self._find_matching_product(prod_term, all_products)
            if target_prod and (target_prod.stock or 0) >= qty_val:
                target_prod.stock -= qty_val
                target_prod.units_sold = (target_prod.units_sold or 0) + qty_val
                sale_amount = round(qty_val * target_prod.price, 2)
                target_prod.revenue = round((target_prod.revenue or 0.0) + sale_amount, 2)
                unit_prof = round(target_prod.price - target_prod.cost_price, 2) if target_prod.cost_price else 0.0
                target_prod.total_profit = round((target_prod.total_profit or 0.0) + (qty_val * unit_prof), 2)
                if target_prod.stock <= (target_prod.min_stock or 15):
                    target_prod.status = "Critical"

                sale_rec = SalesRecord(
                    product_id=target_prod.id,
                    units_sold=qty_val,
                    price_per_unit=target_prod.price,
                    total_amount=sale_amount,
                    sale_date=datetime.now()
                )
                db.add(sale_rec)
                db.commit()
                db.refresh(target_prod)

                if lang == "te":
                    reply = f"{qty_val} {target_prod.name} అమ్మకం నమోదైంది ({currency}{sale_amount:,.2f}). ఇంకా {target_prod.stock} యూనిట్లు మిగిలి ఉన్నాయి."
                elif lang == "hi":
                    reply = f"{qty_val} {target_prod.name} की बिक्री दर्ज की गई ({currency}{sale_amount:,.2f})। अब {target_prod.stock} यूनिट्स बची हैं।"
                elif lang == "ta":
                    reply = f"{qty_val} {target_prod.name} விற்பனை பதிவானது ({currency}{sale_amount:,.2f}). மீதமுள்ள இருப்பு: {target_prod.stock} அலகுகள்."
                elif lang == "ml":
                    reply = f"{qty_val} {target_prod.name} വിൽപ്പന രേഖപ്പെടുത്തി ({currency}{sale_amount:,.2f}). ബാക്കി {target_prod.stock} യൂണിറ്റുകൾ ഉണ്ട്."
                else:
                    reply = f"Sold {qty_val} units of {target_prod.name} for {currency}{sale_amount:,.2f}. You have {target_prod.stock} units remaining."
                cards.append(self._product_to_card(target_prod))
                return self._format_result(reply, "DB Operation (Live Sale)", cards, f"{lang}-IN")

        # =========================================================================
        # GROUP 1: PROFITS
        # 1. Highest Profit Item
        # 2. Lowest Profit Item / Least Margin
        # 3. Best Profit Margin Items
        # =========================================================================
        is_lowest_profit = (
            any(w in q_lower for w in ["lowest profit", "least profit", "least profitable", "worst profit", "minimum profit", "low profit"])
            or any(w in query for w in ["తక్కువ లాభం", "అతి తక్కువ లాభం", "కనిష్ట లాభం", "తక్కువ ప్రాఫిట్"])
            or any(w in query for w in ["सबसे कम मुनाफा", "कम मुनाफा", "कम प्रॉफिट", "न्यूनतम लाभ"])
            or any(w in query for w in ["குறைந்த லாபம்", "மிகக் குறைந்த லாபம்"])
            or any(w in query for w in ["കുറഞ്ഞ ലാഭം", "ഏറ്റവും കുറഞ്ഞ ലാഭം"])
        )
        if is_lowest_profit:
            min_profit_prod = min(all_products, key=lambda x: (x.total_profit or 0.0), default=None)
            if min_profit_prod:
                lowest_items = sorted(all_products, key=lambda x: (x.total_profit or 0.0))[:3]
                for p in lowest_items:
                    cards.append(self._product_to_card(p))
                if lang == "te":
                    reply = f"మీ స్టోర్‌లో అత్యల్ప లాభం అందించిన వస్తువు {min_profit_prod.name}. దీని లాభం మార్జిన్ {min_profit_prod.margin}% మరియు ఇప్పటివరకు మొత్తం {currency}{min_profit_prod.total_profit:,.2f} లాభం మాత్రమే వచ్చింది."
                elif lang == "hi":
                    reply = f"आपकी दुकान में सबसे कम मुनाफा देने वाला प्रोडक्ट {min_profit_prod.name} है। इसका मार्जिन {min_profit_prod.margin}% है और कुल लाभ केवल {currency}{min_profit_prod.total_profit:,.2f} रहा है।"
                elif lang == "ta":
                    reply = f"உங்கள் கடையில் மிகக் குறைந்த லாபம் தரும் பொருள் {min_profit_prod.name}. இதன் மார்ஜின் {min_profit_prod.margin}% மற்றும் லாபம் {currency}{min_profit_prod.total_profit:,.2f} மட்டுமே."
                elif lang == "ml":
                    reply = f"കടയിൽ ഏറ്റവും കുറഞ്ഞ ലാഭം നൽകിയ ഉൽപ്പന്നം {min_profit_prod.name} ആണ്. ആകെ {currency}{min_profit_prod.total_profit:,.2f} ലാഭം മാത്രമാണ് ഇതിൽ ലഭിച്ചത്."
                else:
                    reply = f"The product with the lowest total profit is {min_profit_prod.name} with a {min_profit_prod.margin}% margin and {currency}{min_profit_prod.total_profit:,.2f} total profit."
                return self._format_result(reply, "Lowest Profit Product", cards, f"{lang}-IN")

        is_best_margin = (
            any(w in q_lower for w in ["best margin", "highest margin", "top margin", "highest margin item", "best margins"])
            or any(w in query for w in ["అత్యధిక మార్జిన్", "ఎక్కువ మార్జిన్", "బెస్ట్ మార్జిన్"])
            or any(w in query for w in ["सबसे ज्यादा मार्जिन", "हाई मार्जिन", "अधिक मार्जिन"])
            or any(w in query for w in ["அதிக மார்ஜின்", "சிறந்த மார்ஜின்"])
            or any(w in query for w in ["കൂടുതൽ മാർജിൻ", "ഏറ്റവും ഉയർന്ന മാർജിൻ"])
        )
        if is_best_margin:
            top_margin_prod = max(all_products, key=lambda x: (x.margin or 0.0), default=None)
            if top_margin_prod:
                top_items = sorted(all_products, key=lambda x: (x.margin or 0.0), reverse=True)[:3]
                for p in top_items:
                    cards.append(self._product_to_card(p))
                if lang == "te":
                    reply = f"మీ స్టోర్‌లో అత్యధిక మార్జిన్ ఉన్న వస్తువు {top_margin_prod.name} ({top_margin_prod.margin}% మార్జిన్). ప్రతి యూనిట్‌పై {currency}{top_margin_prod.unit_profit or 0:,.2f} నికర లాభం వస్తుంది."
                elif lang == "hi":
                    reply = f"आपकी दुकान में सबसे ज्यादा मार्जिन {top_margin_prod.name} का है ({top_margin_prod.margin}% मार्जिन)। प्रति यूनिट शुद्ध मुनाफा {currency}{top_margin_prod.unit_profit or 0:,.2f} है।"
                elif lang == "ta":
                    reply = f"உங்கள் கடையில் அதிக மார்ஜின் உள்ள பொருள் {top_margin_prod.name} ({top_margin_prod.margin}% மார்ஜின்). ஒரு அலகுக்கு {currency}{top_margin_prod.unit_profit or 0:,.2f} லாபம் தருகிறது."
                elif lang == "ml":
                    reply = f"കടയിൽ ഏറ്റവും കൂടുതൽ മാർജിൻ ഉള്ള ഉൽപ്പന്നം {top_margin_prod.name} ({top_margin_prod.margin}% മാർജിൻ) ആണ്."
                else:
                    reply = f"Your highest margin product is {top_margin_prod.name} with a {top_margin_prod.margin}% profit margin ({currency}{top_margin_prod.unit_profit or 0:,.2f} unit profit)."
                return self._format_result(reply, "Best Margin Product", cards, f"{lang}-IN")

        is_highest_profit = (
            any(w in q_lower for w in ["highest profit", "most profit", "top profit", "most profitable", "maximum profit"])
            or any(w in query for w in ["ఎక్కువ లాభం", "అత్యధిక లాభం", "లాభదాయకమైన", "లాభం ఇచ్చే"])
            or any(w in query for w in ["सबसे ज्यादा मुनाफा", "ज्यादा मुनाफा", "अधिक लाभ", "हाई प्रॉफिट", "मुनाफे वाला"])
            or any(w in query for w in ["அதிக லாபம்", "அதிக லாபகரமான"])
            or any(w in query for w in ["കൂടുതൽ ലാഭം", "ഏറ്റവും ലാഭം"])
        )
        if is_highest_profit:
            top_profit_prod = max(all_products, key=lambda x: (x.total_profit or 0.0), default=None)
            if top_profit_prod:
                top_items = sorted(all_products, key=lambda x: (x.total_profit or 0.0), reverse=True)[:3]
                for p in top_items:
                    cards.append(self._product_to_card(p))
                if lang == "te":
                    reply = f"మీ స్టోర్‌లో అత్యధిక లాభం అందించే ఉత్పత్తి {top_profit_prod.name}. దీని లాభం మార్జిన్ {top_profit_prod.margin}% మరియు ఇప్పటివరకు మొత్తం {currency}{top_profit_prod.total_profit:,.2f} లాభం తెచ్చిపెట్టింది."
                elif lang == "hi":
                    reply = f"आपकी दुकान में सबसे ज्यादा मुनाफा देने वाला प्रोडक्ट {top_profit_prod.name} है। इसका मार्जिन {top_profit_prod.margin}% है और इसने अब तक कुल {currency}{top_profit_prod.total_profit:,.2f} का लाभ दिया है।"
                elif lang == "ta":
                    reply = f"உங்கள் கடையில் அதிக லாபம் தரும் பொருள் {top_profit_prod.name}. இதன் லாப வரம்பு {top_profit_prod.margin}% மற்றும் இதுவரை {currency}{top_profit_prod.total_profit:,.2f} லாபம் ஈட்டியுள்ளது."
                elif lang == "ml":
                    reply = f"കടയിൽ ഏറ്റവും കൂടുതൽ ലാഭം നൽകുന്ന ഉൽപ്പന്നം {top_profit_prod.name} ആണ്. ഇതുവരെ {currency}{top_profit_prod.total_profit:,.2f} ലാഭം ലഭിച്ചു."
                else:
                    reply = f"Your most profitable item is {top_profit_prod.name} with a {top_profit_prod.margin}% margin and {currency}{top_profit_prod.total_profit:,.2f} in total profit."
                return self._format_result(reply, "Highest Profit Product", cards, f"{lang}-IN")

        # =========================================================================
        # GROUP 2: SALES
        # 4. Today's Sales & Orders
        # 5. Total Store Sales / Overall Revenue
        # 6. Top Selling / Best Sellers
        # 7. Low Selling / Least Sold Items ("which items sales are very low")
        # =========================================================================
        is_today_query = (
            any(w in q_lower for w in ["today", "today's", "todays"])
            or any(w in query for w in ["ఈ రోజు", "ఈరోజు", "నేడు", "ఇవాళ"])
            or any(w in query for w in ["आज", "आजकी", "आज का"])
            or any(w in query for w in ["இன்று", "இன்றைய"])
            or any(w in query for w in ["ഇന്ന്", "ഇന്നത്തെ"])
        )
        sales_terms = [
            "sale", "sales", "revenue", "business", "orders", "order", "collection", "sold",
            "అమ్మకాలు", "కలెక్షన్", "సేల్స్", "వ్యాపారం",
            "बिक्री", "सेल्स", "कमाई", "ऑर्डर",
            "விற்பனை", "சேல்ஸ்", "வருவாய்",
            "വിൽപ്പന", "സെയിൽസ്", "വരുമാനം"
        ]
        has_sales_intent = (
            any(w in q_lower for w in sales_terms)
            or any(w in query for w in sales_terms)
            or any(w in query for w in ["ఎంత", "कितना", "எவ்வளவு", "എത്ര"])
            or "how much" in q_lower
        )
        if is_today_query and has_sales_intent:
            today_date = datetime.now().date()
            today_records = db.query(SalesRecord).filter(func.date(SalesRecord.sale_date) == today_date).all()
            today_rev = sum(r.total_amount for r in today_records) if today_records else 0.0
            today_units = sum(r.units_sold for r in today_records) if today_records else 0

            if lang == "te":
                reply = (
                    f"ఈ రోజు మొత్తం అమ్మకాలు {currency}{today_rev:,.2f} అయ్యాయి. మొత్తం {len(today_records)} ఆర్డర్లలో {today_units} వస్తువులు అమ్ముడయ్యాయి."
                    if today_rev > 0 else "ఈ రోజు ఇప్పటివరకు ఎలాంటి అమ్మకాలు నమోదు కాలేదు. బిల్లింగ్ కౌంటర్ సిద్ధంగా ఉంది."
                )
            elif lang == "hi":
                reply = (
                    f"आज की कुल sales {currency}{today_rev:,.2f} हुई है। कुल {len(today_records)} orders में {today_units} आइटम्स बिके हैं।"
                    if today_rev > 0 else "आज अभी तक कोई बिक्री दर्ज नहीं हुई है। बिलिंग काउंटर तैयार है।"
                )
            elif lang == "ta":
                reply = (
                    f"இன்று மொத்தம் {currency}{today_rev:,.2f} sales ஆகியுள்ளது. மொத்தம் {len(today_records)} orders மூலம் {today_units} பொருட்கள் விற்பனையானது."
                    if today_rev > 0 else "இன்று இதுவரை எந்த விற்பனையும் பதிவாகவில்லை. பில்லிங் கவுண்டர் தயாராக உள்ளது."
                )
            elif lang == "ml":
                reply = (
                    f"ഇന്ന് ആകെ {currency}{today_rev:,.2f} sales നടന്നിട്ടുണ്ട്. ആകെ {len(today_records)} orders വഴി {today_units} സാധനങ്ങൾ വിറ്റുപോയി."
                    if today_rev > 0 else "ഇന്ന് ഇതുവരെ വിൽപ്പനയൊന്നും രേഖപ്പെടുത്തിയിട്ടില്ല. ബില്ലിംഗ് കൗണ്ടർ തയ്യാറാണ്."
                )
            else:
                reply = (
                    f"Today's sales are {currency}{today_rev:,.2f} so far, across {len(today_records)} order{'s' if len(today_records) != 1 else ''} ({today_units} items sold)."
                    if today_rev > 0 else f"Today's sales are {currency}0.00 so far. No orders have been logged yet today."
                )

            top_prods = sorted(all_products, key=lambda x: x.units_sold or 0, reverse=True)[:2]
            for p in top_prods:
                cards.append(self._product_to_card(p))
            return self._format_result(reply, "Daily Sales", cards, f"{lang}-IN")

        # 7. Low Selling / Least Sold Items ("which items sales are very low")
        is_low_sales_query = (
            any(w in q_lower for w in ["sales are very low", "sales are low", "sales low", "low sales", "least sold", "lowest sales", "lowest selling", "slow moving", "least selling", "worst selling"])
            or ("low" in q_lower and "sale" in q_lower)
            or ("low" in q_lower and "sold" in q_lower)
            or any(w in query for w in ["తక్కువ అమ్మకాలు", "తక్కువగా అమ్ముడైన", "తక్కువ సేల్స్", "అమ్మకాలు తక్కువ", "తక్కువగా సేల్"])
            or any(w in query for w in ["कम बिक्री", "कम बिकने वाला", "सेल्स कम", "कम सेल्स", "धीमी बिक्री"])
            or any(w in query for w in ["குறைந்த விற்பனை", "குறைவாக விற்பனையான", "சேல்ஸ் கம்மி"])
            or any(w in query for w in ["കുറഞ്ഞ വിൽപ്പന", "കുറവ് വിറ്റ", "സെയിൽസ് കുറവ്"])
        )
        if is_low_sales_query:
            slow_prods = sorted(all_products, key=lambda x: (x.units_sold or 0))[:4]
            for p in slow_prods:
                cards.append(self._product_to_card(p))
            names_summary = ", ".join([f"{p.name} ({p.units_sold or 0} sold)" for p in slow_prods])
            if lang == "te":
                reply = f"మీ స్టోర్‌లో అమ్మకాలు చాలా తక్కువగా ఉన్న వస్తువులు: {names_summary}. వీటికి డిస్కౌంట్ ఆఫర్ లేదా కాంబో ప్యాక్ పెట్టడం మంచిది."
            elif lang == "hi":
                reply = f"आपकी दुकान में सबसे कम बिक्री वाले आइटम्स हैं: {names_summary}। इन पर बंडल ऑफर या छूट देकर बिक्री बढ़ाई जा सकती है।"
            elif lang == "ta":
                reply = f"உங்கள் கடையில் மிகக் குறைந்த விற்பனையான பொருட்கள்: {names_summary}। இவற்றிற்கு தள்ளுபடி சலுகை வழங்குவது நல்லது."
            elif lang == "ml":
                reply = f"കടയിൽ ഏറ്റവും കുറഞ്ഞ വിൽപ്പനയുള്ള സാധനങ്ങൾ: {names_summary}। ഇവയ്ക്ക് ഓഫറുകൾ നൽകുന്നത് വിൽപ്പന കൂട്ടാൻ സഹായിക്കും."
            else:
                reply = f"The lowest-selling products in your store are: {names_summary}. Offering small discounts or bundling them can help clear inventory."
            return self._format_result(reply, "Low Selling Products", cards, f"{lang}-IN")

        # 6. Top Selling / Best Sellers
        is_top_seller_query = (
            any(w in q_lower for w in ["top selling", "best seller", "best sellers", "most sold", "top products", "highest sales", "best selling"])
            or any(w in query for w in ["ఎక్కువ అమ్మకాలు", "ఎక్కువగా అమ్ముడైన", "టాప్ సేల్స్", "బెస్ట్ సెల్లింగ్", "బాగా అమ్ముడయ్యే"])
            or any(w in query for w in ["सबसे ज्यादा बिकने वाला", "टॉप सेलिंग", "बेस्ट सेलर", "ज्यादा बिक्री"])
            or any(w in query for w in ["அதிக விற்பனையான", "டாப் செல்லிங்", "பெஸ்ட் செல்லர்"])
            or any(w in query for w in ["കൂടുതൽ വിറ്റ", "ടോപ്പ് സെല്ലിംഗ്", "ബെസ്റ്റ് സെല്ലർ"])
        )
        if is_top_seller_query:
            top_seller_prod = max(all_products, key=lambda x: (x.units_sold or 0), default=None)
            if top_seller_prod:
                top_items = sorted(all_products, key=lambda x: (x.units_sold or 0), reverse=True)[:3]
                for p in top_items:
                    cards.append(self._product_to_card(p))
                if lang == "te":
                    reply = f"మీ స్టోర్‌లో అత్యధికంగా అమ్ముడవుతున్న వస్తువు {top_seller_prod.name}. ఇప్పటివరకు {top_seller_prod.units_sold} యూనిట్లు అమ్ముడై, మొత్తం {currency}{top_seller_prod.revenue:,.2f} సేల్స్ వచ్చాయి."
                elif lang == "hi":
                    reply = f"आपकी दुकान में सबसे ज्यादा बिकने वाला आइटम {top_seller_prod.name} है। अब तक {top_seller_prod.units_sold} यूनिट्स बिक चुकी हैं और कुल {currency}{top_seller_prod.revenue:,.2f} की sales हुई है।"
                elif lang == "ta":
                    reply = f"உங்கள் கடையில் அதிகம் விற்பனையான பொருள் {top_seller_prod.name}. இதுவரை {top_seller_prod.units_sold} அலகுகள் விற்பனையாகி, {currency}{top_seller_prod.revenue:,.2f} விற்பனை ஈட்டியுள்ளது."
                elif lang == "ml":
                    reply = f"കടയിൽ ഏറ്റവും കൂടുതൽ വിറ്റഴിഞ്ഞ സാധനം {top_seller_prod.name} ആണ്. ഇതുവരെ {top_seller_prod.units_sold} യൂണിറ്റുകൾ വിറ്റുപോയി, {currency}{top_seller_prod.revenue:,.2f} രൂപയുടെ sales നടന്നു."
                else:
                    reply = f"Your top-selling product is {top_seller_prod.name} with {top_seller_prod.units_sold} units sold and {currency}{top_seller_prod.revenue:,.2f} in revenue."
                return self._format_result(reply, "Top Selling Product", cards, f"{lang}-IN")

        # 5. Total Store Sales / Overall Revenue
        is_overall_sales_query = (
            any(w in q_lower for w in ["total sales", "overall sales", "total revenue", "how is business", "store revenue", "business summary", "total store sales"])
            or any(w in query for w in ["మొత్తం సేల్స్", "మొత్తం అమ్మకాలు", "మొత్తం కలెక్షన్", "వ్యాపారం ఎలా ఉంది", "మొత్తం బిజినెస్"])
            or any(w in query for w in ["कुल बिक्री", "कुल सेल्स", "व्यापार कैसा है", "कुल कमाई"])
            or any(w in query for w in ["மொத்த விற்பனை", "வியாபாரம் எப்படி", "மொத்த வருவாய்"])
            or any(w in query for w in ["ആകെ വിൽപ്പന", "ബിസിനസ്സ് എങ്ങനെ", "ആകെ വരുമാനം"])
        )
        if is_overall_sales_query:
            total_rev = sum(p.revenue or 0.0 for p in all_products)
            total_units = sum(p.units_sold or 0 for p in all_products)
            top_prods = sorted(all_products, key=lambda x: x.revenue or 0.0, reverse=True)[:3]
            for p in top_prods:
                cards.append(self._product_to_card(p))
            if lang == "te":
                reply = f"మీ స్టోర్‌లో ఇప్పటివరకు మొత్తం అమ్మకాలు {currency}{total_rev:,.2f} నమోదు అయ్యాయి. మొత్తం {total_units} యూనిట్లు అమ్ముడయ్యాయి మరియు {len(all_products)} రకాల ఉత్పత్తులు ఉన్నాయి."
            elif lang == "hi":
                reply = f"आपकी दुकान में अब तक कुल {currency}{total_rev:,.2f} की बिक्री हुई है। {total_units} यूनिट्स बिक चुके हैं और कुल {len(all_products)} तरह के सामान उपलब्ध हैं।"
            elif lang == "ta":
                reply = f"உங்கள் கடையில் இதுவரை மொத்த விற்பனை {currency}{total_rev:,.2f} மற்றும் {total_units} அலகுகள் விற்பனையாகியுள்ளன."
            elif lang == "ml":
                reply = f"കടയിൽ ഇതുവരെ ആകെ {currency}{total_rev:,.2f} വിൽപ്പന നടന്നു, {total_units} യൂണിറ്റുകൾ വിറ്റുപോയി."
            else:
                reply = f"Your store has generated {currency}{total_rev:,.2f} in total sales so far, with {total_units} units sold across {len(all_products)} items."
            return self._format_result(reply, "Store Performance", cards, f"{lang}-IN")

        # =========================================================================
        # GROUP 3: PRICES
        # 8. Specific Product Price Check ("price of ghee", etc.)
        # 9. Most Expensive Product
        # 10. Cheapest Product
        # =========================================================================
        is_expensive_query = (
            any(w in q_lower for w in ["most expensive", "highest price", "highest priced", "costliest product", "costliest item"])
            or any(w in query for w in ["అత్యంత ఖరీదైన", "ఎక్కువ ధర", "ఖరీదైన వస్తువు"])
            or any(w in query for w in ["सबसे महंगा", "अधिक कीमत", "महंगा सामान"])
            or any(w in query for w in ["அதிக விலை", "மிகவும் விலையுயர்ந்த"])
            or any(w in query for w in ["ഏറ്റവും വിലകൂടിയ", "വിലകൂടിയ സാധനം"])
        )
        if is_expensive_query:
            max_price_prod = max(all_products, key=lambda x: (x.price or 0.0), default=None)
            if max_price_prod:
                cards.append(self._product_to_card(max_price_prod))
                if lang == "te":
                    reply = f"మీ స్టోర్‌లో అత్యంత ఖరీదైన వస్తువు {max_price_prod.name}. దీని ధర {currency}{max_price_prod.price:,.2f}. ప్రస్తుత స్టాక్: {max_price_prod.stock} యూనిట్లు."
                elif lang == "hi":
                    reply = f"आपकी दुकान में सबसे महंगा सामान {max_price_prod.name} है, जिसकी कीमत {currency}{max_price_prod.price:,.2f} है। वर्तमान स्टॉक: {max_price_prod.stock} यूनिट्स।"
                elif lang == "ta":
                    reply = f"உங்கள் கடையில் அதிக விலையுள்ள பொருள் {max_price_prod.name} ({currency}{max_price_prod.price:,.2f}). இருப்பு: {max_price_prod.stock} அலகுகள்."
                elif lang == "ml":
                    reply = f"കടയിലെ ഏറ്റവും വിലകൂടിയ ഉൽപ്പന്നം {max_price_prod.name} ({currency}{max_price_prod.price:,.2f}) ആണ്. സ്റ്റോക്ക്: {max_price_prod.stock} യൂണിറ്റുകൾ."
                else:
                    reply = f"The most expensive item in your store is {max_price_prod.name} priced at {currency}{max_price_prod.price:,.2f}. Current stock is {max_price_prod.stock} units."
                return self._format_result(reply, "Most Expensive Product", cards, f"{lang}-IN")

        is_cheapest_query = (
            any(w in q_lower for w in ["cheapest", "lowest price", "lowest priced", "least expensive", "minimum price"])
            or any(w in query for w in ["చౌకైన", "అతి తక్కువ ధర", "తక్కువ ధర వస్తువు"])
            or any(w in query for w in ["सबसे सस्ता", "कम कीमत", "सस्ता सामान"])
            or any(w in query for w in ["குறைந்த விலை", "மலிவான பொருள்"])
            or any(w in query for w in ["ഏറ്റവും വിലകുറഞ്ഞ", "വിലകുറഞ്ഞ സാധനം"])
        )
        if is_cheapest_query:
            min_price_prod = min(all_products, key=lambda x: (x.price or 0.0), default=None)
            if min_price_prod:
                cards.append(self._product_to_card(min_price_prod))
                if lang == "te":
                    reply = f"మీ స్టోర్‌లో అత్యంత చౌకైన వస్తువు {min_price_prod.name}. దీని ధర కేవలం {currency}{min_price_prod.price:,.2f}. ప్రస్తుత స్టాక్: {min_price_prod.stock} యూనిట్లు."
                elif lang == "hi":
                    reply = f"आपकी दुकान में सबसे सस्ता सामान {min_price_prod.name} है, जिसकी कीमत मात्र {currency}{min_price_prod.price:,.2f} है। वर्तमान स्टॉक: {min_price_prod.stock} यूनिट्स।"
                elif lang == "ta":
                    reply = f"உங்கள் கடையில் குறைந்த விலையுள்ள பொருள் {min_price_prod.name} ({currency}{min_price_prod.price:,.2f}). இருப்பு: {min_price_prod.stock} அலகுகள்."
                elif lang == "ml":
                    reply = f"കടയിലെ ഏറ്റവും വിലകുറഞ്ഞ സാധനം {min_price_prod.name} ({currency}{min_price_prod.price:,.2f}) ആണ്."
                else:
                    reply = f"The cheapest product in your store is {min_price_prod.name} priced at {currency}{min_price_prod.price:,.2f} with {min_price_prod.stock} units in stock."
                return self._format_result(reply, "Cheapest Product", cards, f"{lang}-IN")

        # 8. Specific Product Price Check ("price of ghee", "how much is rice", etc.)
        is_price_intent = (
            any(w in q_lower for w in ["price", "cost", "rate", "how much"])
            or any(w in query for w in ["ధర", "రేటు", "ఖరీదు", "కీమత్", "కింత"])
            or any(w in query for w in ["कीमत", "भाव", "दाम"])
            or any(w in query for w in ["விலை", "விலை என்ன"])
            or any(w in query for w in ["വില", "വില എത്ര"])
        )
        matched_prod = self._find_matching_product(query, all_products)
        if matched_prod and is_price_intent:
            cards.append(self._product_to_card(matched_prod))
            if lang == "te":
                reply = f"{matched_prod.name} ధర {currency}{matched_prod.price:,.2f}. ప్రస్తుతం {matched_prod.stock} యూనిట్ల స్టాక్ అందుబాటులో ఉంది."
            elif lang == "hi":
                reply = f"{matched_prod.name} की कीमत {currency}{matched_prod.price:,.2f} है। वर्तमान में {matched_prod.stock} यूनिट्स स्टॉक में उपलब्ध हैं।"
            elif lang == "ta":
                reply = f"{matched_prod.name} விலை {currency}{matched_prod.price:,.2f}. தற்போது {matched_prod.stock} அலகுகள் இருப்பு உள்ளன."
            elif lang == "ml":
                reply = f"{matched_prod.name}ന്റെ വില {currency}{matched_prod.price:,.2f} ആണ്. ഇപ്പോൾ {matched_prod.stock} യൂണിറ്റുകൾ സ്റ്റോക്കുണ്ട്."
            else:
                reply = f"{matched_prod.name} is priced at {currency}{matched_prod.price:,.2f}. You have {matched_prod.stock} units available in stock."
            return self._format_result(reply, "Product Price", cards, f"{lang}-IN")

        # =========================================================================
        # GROUP 4: STOCKS
        # 11. Specific Product Stock Check ("stock of ghee", etc.)
        # 12. Low Stock / Reorder Suggestions
        # 13. Out of Stock Items
        # 14. Plenty Stock / Highest Stock Items
        # =========================================================================
        # 13. Out of Stock
        is_out_of_stock_query = (
            any(w in q_lower for w in ["out of stock", "zero stock", "no stock", "empty stock", "finished"])
            or any(w in query for w in ["పూర్తిగా అయిపోయిన", "జీరో స్టాక్", "అయిపోయిన"])
            or any(w in query for w in ["खत्म", "बिल्कुल खत्म", "शून्य स्टॉक"])
            or any(w in query for w in ["தீர்ந்து", "இருப்பு இல்லை"])
            or any(w in query for w in ["തീർന്നു", "സ്റ്റോക്ക് ഇല്ല"])
        )
        if is_out_of_stock_query:
            out_items = [p for p in all_products if (p.stock or 0) == 0]
            if out_items:
                for p in out_items[:4]:
                    cards.append(self._product_to_card(p))
                details = ", ".join([p.name for p in out_items[:4]])
                if lang == "te":
                    reply = f"మీ స్టోర్‌లో ప్రస్తుతం {len(out_items)} వస్తువుల స్టాక్ పూర్తిగా అయిపోయింది: {details}. వెంటనే రీఆర్డర్ చేయండి."
                elif lang == "hi":
                    reply = f"आपकी दुकान में {len(out_items)} सामान का स्टॉक बिल्कुल खत्म (आउट ऑफ स्टॉक) है: {details}। कृपया तुरंत रीऑर्डर करें।"
                elif lang == "ta":
                    reply = f"உங்கள் கடையில் {len(out_items)} பொருட்கள் முற்றிலும் தீர்ந்துவிட்டன: {details}। உடனே ரீஆர்டர் செய்யவும்."
                elif lang == "ml":
                    reply = f"കടയിൽ {len(out_items)} സാധനങ്ങൾ തീർന്നുപോയിരിക്കുന്നു: {details}। ഉടൻ റീഓർഡർ ചെയ്യുക."
                else:
                    reply = f"You have {len(out_items)} products currently out of stock: {details}. Restocking is recommended immediately."
            else:
                if lang == "te":
                    reply = "ప్రస్తుతం ఏ వస్తువు కూడా అవుట్ ఆఫ్ స్టాక్ కాలేదు. అన్ని ఉత్పత్తులు అందుబాటులో ఉన్నాయి."
                elif lang == "hi":
                    reply = "वर्तमान में कोई भी सामान आउट ऑफ स्टॉक नहीं है। सभी प्रोडक्ट्स उपलब्ध हैं।"
                else:
                    reply = "No items are currently out of stock. All product inventories have active units."
            return self._format_result(reply, "Out of Stock Status", cards, f"{lang}-IN")

        # 14. Plenty Stock / Surplus
        is_high_stock_query = (
            any(w in q_lower for w in ["plenty of stock", "highest stock", "maximum stock", "most stock", "overstocked", "plenty stock"])
            or any(w in query for w in ["ఎక్కువ స్టాక్", "నిండుగా ఉన్న", "బాగా స్టాక్ ఉన్న"])
            or any(w in query for w in ["सबसे ज्यादा स्टॉक", "अधिक स्टॉक", "भरा हुआ स्टॉक"])
            or any(w in query for w in ["அதிக இருப்பு", "நிறைய இருப்பு"])
            or any(w in query for w in ["കൂടുതൽ സ്റ്റോക്ക്", "ധാരാളം സ്റ്റോക്ക്"])
        )
        if is_high_stock_query:
            top_stock_items = sorted(all_products, key=lambda x: (x.stock or 0), reverse=True)[:3]
            for p in top_stock_items:
                cards.append(self._product_to_card(p))
            if top_stock_items:
                p0 = top_stock_items[0]
                if lang == "te":
                    reply = f"మీ స్టోర్‌లో అత్యధిక స్టాక్ ఉన్న వస్తువు {p0.name} ({p0.stock} యూనిట్లు). మొత్తం టాప్ 3 వస్తువులు పుష్కలంగా ఉన్నాయి."
                elif lang == "hi":
                    reply = f"आपकी दुकान में सबसे ज्यादा स्टॉक {p0.name} का है ({p0.stock} यूनिट्स)। पर्याप्त इन्वेंटरी उपलब्ध है।"
                else:
                    reply = f"Your highest stock item is {p0.name} with {p0.stock} units available on hand."
                return self._format_result(reply, "High Stock Status", cards, f"{lang}-IN")

        # 12. Low Stock / Reorder Suggestions
        is_low_stock_query = (
            any(w in q_lower for w in ["reorder", "restock", "critical", "shortage", "low stock", "items to reorder"])
            or ("low" in q_lower and "stock" in q_lower)
            or any(w in query for w in ["స్టాక్ తక్కువ", "తక్కువ స్టాక్", "రీఆర్డర్", "తక్కువగా ఉన్న"])
            or any(w in query for w in ["कम स्टॉक", "स्टॉक कम", "कम सामान", "रीऑर्डर"])
            or any(w in query for w in ["குறைந்த இருப்பு", "ரீஆர்டர்"])
            or any(w in query for w in ["കുറഞ്ഞ സ്റ്റോക്ക്", "റീഓർഡർ"])
        )
        if is_low_stock_query and not matched_prod:
            low_items = [p for p in all_products if (p.stock or 0) <= (p.min_stock or 15)]
            if low_items:
                details = [f"{p.name} ({p.stock} left)" for p in low_items[:4]]
                if lang == "te":
                    reply = f"మీ స్టోర్‌లో ప్రస్తుతం {len(low_items)} వస్తువులు తక్కువ స్టాక్‌లో ఉన్నాయి: {', '.join(details)}. వీటిని రీఆర్డర్ చేయడం మంచిది."
                elif lang == "hi":
                    reply = f"आपकी दुकान में {len(low_items)} आइटम्स का स्टॉक कम है: {', '.join(details)}। इन्हें तुरंत रीऑर्डर करने की सलाह दी जाती है।"
                elif lang == "ta":
                    reply = f"உங்கள் கடையில் {len(low_items)} பொருட்கள் குறைந்த இருப்பில் உள்ளன: {', '.join(details)}। இவற்றை விரைவில் ரீஆர்டர் செய்வது நல்லது."
                elif lang == "ml":
                    reply = f"കടയിൽ {len(low_items)} സാധനങ്ങൾക്ക് സ്റ്റോക്ക് കുറവാണ്: {', '.join(details)}। ഇവ ഉടൻ റീഓർഡർ ചെയ്യുന്നത് നല്ലതാണ്."
                else:
                    reply = f"You have {len(low_items)} products running low right now: {', '.join(details)}. I suggest placing a reorder soon."
                for p in low_items[:4]:
                    cards.append(self._product_to_card(p))
            else:
                if lang == "te":
                    reply = "ప్రస్తుతానికి మీ స్టోర్‌లో అన్ని వస్తువుల స్టాక్ బాగుంది. ఎలాంటి రీఆర్డర్ అవసరం లేదు."
                elif lang == "hi":
                    reply = "वर्तमान में आपकी दुकान में सभी सामान का स्टॉक पर्याप्त है। किसी रीऑर्डर की आवश्यकता नहीं है।"
                else:
                    reply = "All your items have plenty of stock right now. No urgent reorders are needed."
            return self._format_result(reply, "Inventory Status", cards, f"{lang}-IN")

        # 11. Specific Product Stock Check ("stock of milk", etc.)
        if matched_prod:
            p = matched_prod
            cards.append(self._product_to_card(p))
            if lang == "te":
                reply = f"{p.name} స్టాక్ ప్రస్తుతం {p.stock} యూనిట్లు ఉంది (ధర: {currency}{p.price:,.2f}). ఇప్పటివరకు {p.units_sold} యూనిట్లు అమ్ముడయ్యాయి."
            elif lang == "hi":
                reply = f"{p.name} का वर्तमान स्टॉक {p.stock} यूनिट्स है (कीमत: {currency}{p.price:,.2f})। अब तक {p.units_sold} यूनिट्स बिक चुकी हैं।"
            elif lang == "ta":
                reply = f"{matched_prod.name} இருப்பு {matched_prod.stock} அலகுகள் உள்ளது (விலை: {currency}{matched_prod.price:,.2f})."
            elif lang == "ml":
                reply = f"{matched_prod.name} സ്റ്റോക്ക് {matched_prod.stock} യൂണിറ്റുകൾ ഉണ്ട് (വില: {currency}{matched_prod.price:,.2f})."
            else:
                reply = f"You have {p.stock} units of {p.name} in stock (priced at {currency}{p.price:,.2f}). {p.units_sold} units have been sold so far."
            return self._format_result(reply, "Product Stock Info", cards, f"{lang}-IN")

        # If none of the 15 patterns matched, return a polite notification without generic greetings
        if lang == "te":
            reply = "ఈ నిర్దిష్ట ప్రశ్నకు సంబంధించిన ప్రత్యక్ష డేటా రికార్డులను శోధిస్తున్నాను. దయచేసి నిర్దిష్ట ఉత్పత్తి లేదా సేల్స్ వివరాలను అడగండి."
        elif lang == "hi":
            reply = "इस प्रश्न के लिए मैं डेटाबेस सर्च कर रहा हूँ। कृपया किसी विशेष उत्पाद, बिक्री या स्टॉक के बारे में पूछें।"
        else:
            reply = "I'm checking the live store records. For immediate answers, ask about products, sales, stocks, or profits."
        return self._format_result(reply, "AIRA Intelligent Store Engine", cards, f"{lang}-IN")

    def _find_matching_product(self, term: str, products: List[Product]) -> Optional[Product]:
        term_clean = term.lower().strip()

        # 1. Check multilingual product terms mapped to English
        for reg_word, en_word in MULTILINGUAL_PRODUCT_MAP.items():
            if reg_word in term_clean:
                # Pass 1A: Strictly match in product name first
                for p in products:
                    if en_word in p.name.lower():
                        return p
                # Pass 1B: Fallback to category only if no product name matched
                for p in products:
                    if en_word in p.category.lower():
                        return p

        # 2. Extract meaningful product tokens
        tokens = [
            t for t in re.findall(r'[a-zA-Z0-9]+', term_clean)
            if ((len(t) >= 4) or (t in {'tea', 'dal', 'oil', 'egg', 'ghee', 'atta', 'rice', 'milk'})) and t not in STOPWORDS and t not in QUERY_FILLERS
        ]

        # Pass 2A: Strictly match in product name or SKU FIRST (Never let category override product name!)
        for t in tokens:
            for p in products:
                p_name = p.name.lower()
                if t in p_name or t == p.sku.lower():
                    return p

        # Pass 2B: Fallback to category only if no product name matched
        for t in tokens:
            for p in products:
                if t in p.category.lower():
                    return p

        return None

    def _product_to_card(self, p: Product) -> Dict[str, Any]:
        return {
            "id": p.id,
            "name": p.name,
            "stock": p.stock,
            "minStock": p.min_stock,
            "price": p.price,
            "margin": p.margin,
            "orderRecommendation": p.order_recommendation or 30,
            "image": p.image or "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop"
        }

    def _format_result(self, reply: str, model_tag: str, cards: List[Dict[str, Any]], language: str) -> Dict[str, Any]:
        speech = self._clean_speech_text(reply)
        return {
            "response": reply,
            "reply": reply,
            "speech_text": speech,
            "model": model_tag,
            "language": language,
            "source": "postgresql_rule_engine",
            "confidence": 100,
            "cards": cards
        }

    def can_handle(self, query: str, db: Session) -> bool:
        """
        Determines whether the query strictly matches one of the 15 fixed question groups.
        If False, execution smoothly routes to Ollama (gemma3:4b).
        """
        q = query.lower().strip()
        all_products = db.query(Product).all()

        # 15. Restock / Sale operations
        if re.search(r'(?:restock|add|order|sell|sold|billed)\s+\d+', q):
            return True

        # 1, 2, 3: Profits (Highest profit, lowest profit, best margin)
        profit_keywords = [
            "highest profit", "most profit", "top profit", "most profitable", "maximum profit",
            "lowest profit", "least profit", "least profitable", "worst profit",
            "best margin", "highest margin", "top margin", "best margins",
            "ఎక్కువ లాభం", "అత్యధిక లాభం", "లాభదాయకమైన", "తక్కువ లాభం", "అతి తక్కువ లాభం", "మార్జిన్",
            "सबसे ज्यादा मुनाफा", "ज्यादा मुनाफा", "सबसे कम मुनाफा", "कम मुनाफा", "हाई मार्जिन", "मार्जिन",
            "அதிக லாபம்", "குறைந்த லாபம்", "அதிக மார்ஜின்",
            "കൂടുതൽ ലാഭം", "കുറഞ്ഞ ലാഭം", "കൂടുതൽ മാർജിൻ"
        ]
        if any(w in query or w in q for w in profit_keywords):
            return True

        # 7. Low selling / Least sold items ("which items sales are very low")
        low_sales_keywords = [
            "sales are very low", "sales are low", "sales low", "low sales", "least sold",
            "lowest sales", "lowest selling", "slow moving", "least selling", "worst selling",
            "తక్కువ అమ్మకాలు", "తక్కువగా అమ్ముడైన", "తక్కువ సేల్స్", "అమ్మకాలు తక్కువ",
            "कम बिक्री", "कम बिकने वाला", "सेल्स कम", "कम सेल्स", "धीमी बिक्री",
            "குறைந்த விற்பனை", "குறைவாக விற்பனையான", "சேல்ஸ் கம்மி",
            "കുറഞ്ഞ വിൽപ്പന", "കുറവ് വിറ്റ", "സെയിൽസ് കുറവ്"
        ]
        if any(w in query or w in q for w in low_sales_keywords) or ("low" in q and "sale" in q) or ("low" in q and "sold" in q):
            return True

        # 4. Today's sales (multilingual)
        today_keywords = [
            "today", "todays sales", "today sales", "todays orders",
            "ఈ రోజు", "ఈరోజు", "నేడు", "ఇవాళ",
            "आज", "आजकी", "आज की बिक्री", "आज की sales", "आज के आर्डर",
            "இன்று", "இன்றைய விற்பனை", "இன்று sales",
            "ഇന്ന്", "ഇന്നത്തെ sales", "ഇന്നത്തെ വിൽപ്പന"
        ]
        if any(w in query or w in q for w in today_keywords):
            return True

        # 6. Top selling (multilingual)
        top_selling_keywords = [
            "top selling", "best seller", "best sellers", "most sold", "top products", "highest sales", "best selling",
            "ఎక్కువ అమ్మకాలు", "ఎక్కువగా అమ్ముడైన", "టాప్ సేల్స్", "బెస్ట్ సెల్లింగ్", "బాగా అమ్ముడయ్యే",
            "सबसे ज्यादा बिकने वाला", "टॉप सेलिंग", "बेस्ट सेलर", "ज्यादा बिक्री",
            "அதிக விற்பனையான", "டாப் செல்லிங்", "பெஸ்ட் செல்லர்",
            "കൂടുതൽ വിറ്റ", "ടോപ്പ് സെല്ലിംഗ്", "ബെസ്റ്റ് സെല്ലർ"
        ]
        if any(w in query or w in q for w in top_selling_keywords):
            return True

        # 5. Total revenue / store performance (multilingual)
        overall_keywords = [
            "total sales", "overall sales", "total revenue", "how is business", "store summary", "total store sales",
            "మొత్తం సేల్స్", "మొత్తం అమ్మకాలు", "మొత్తం కలెక్షన్", "వ్యాపారం ఎలా ఉంది", "మొత్తం బిజినెస్",
            "कुल बिक्री", "कुल सेल्स", "व्यापार कैसा है", "कुल कमाई",
            "மொத்த விற்பனை", "வியாபாரம் எப்படி", "மொத்த வருவாய்",
            "ആകെ വിൽപ്പന", "ബിസിനസ്സ് എങ്ങനെ", "ആകെ വരുമാനം"
        ]
        if any(w in query or w in q for w in overall_keywords):
            return True

        # 9 & 10. Most expensive / Cheapest
        price_extremes = [
            "most expensive", "highest price", "highest priced", "costliest",
            "cheapest", "lowest price", "lowest priced", "least expensive",
            "ఖరీదైన", "అత్యంత ఖరీదైన", "ఎక్కువ ధర", "చౌకైన", "అతి తక్కువ ధర",
            "सबसे महंगा", "अधिक कीमत", "सबसे सस्ता", "कम कीमत",
            "அதிக விலை", "குறைந்த விலை", "விலையுயர்ந்த", "மலிவான",
            "ഏറ്റവും വിലകൂടിയ", "ഏറ്റവും വിലകുറഞ്ഞ"
        ]
        if any(w in query or w in q for w in price_extremes):
            return True

        # 12, 13, 14. Stock queries (Low stock, out of stock, plenty stock)
        stock_keywords = [
            "low stock", "stock low", "out of stock", "reorder", "zero stock", "no stock",
            "plenty of stock", "highest stock", "maximum stock", "most stock",
            "తక్కువ స్టాక్", "స్టాక్ తక్కువ", "తక్కువగా ఉన్న", "పూర్తిగా అయిపోయిన", "జీరో స్టాక్", "ఎక్కువ స్టాక్",
            "कम स्टॉक", "स्टॉक कम", "खत्म", "कम सामान", "आउट ऑफ स्टॉक", "सबसे ज्यादा स्टॉक",
            "குறைந்த இருப்பு", "இருப்பு கம்மி", "தீர்ந்து", "அதிக இருப்பு",
            "കുറഞ്ഞ സ്റ്റോക്ക്", "സ്റ്റോക്ക് കുറവ്", "തീർന്നു", "കൂടുതൽ സ്റ്റോക്ക്"
        ]
        if any(w in query or w in q for w in stock_keywords):
            return True

        # 8 & 11. Specific product inquiry (price of X, stock of X)
        if self._find_matching_product(query, all_products) is not None:
            return True

        return False

rule_assistant = RuleBasedAssistantEngine()
