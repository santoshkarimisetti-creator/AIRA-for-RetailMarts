"""
AIRA - Database-Grounded Multilingual Retail Assistant Engine
Connects directly to PostgreSQL to answer inventory, sales, pricing, and health queries.
Features rich multilingual & bilingual code-switching understanding:
- Telugu (తెలుగు) + English
- Hindi (हिन्दी) + English
- English
- Tamil (தமிழ்) + English
- Malayalam (മലയാളം) + English
With direct, friendly, conversational responses without robotic database prefixes.
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
    "బిస్కెట్": "biscuit", "బిస్కెట్లు": "biscuit", "ఉప్పు": "salt",

    # Hindi
    "चावल": "rice", "तेल": "oil", "आटा": "atta", "दूध": "milk", "दाल": "dal", "चीनी": "sugar",
    "शक्कर": "sugar", "साबुन": "soap", "चाय": "tea", "कॉफी": "coffee", "घी": "ghee",
    "बिस्कुट": "biscuit", "नमक": "salt", "मसाला": "masala", "हल्दी": "turmeric", "मिर्च": "chilli",

    # Tamil
    "அரிசி": "rice", "எண்ணெய்": "oil", "மாவு": "atta", "பால்": "milk", "பருப்பு": "dal",
    "சர்க்கரை": "sugar", "சோப்": "soap", "தேநீர்": "tea", "டீ": "tea", "காபி": "coffee",
    "நெய்": "ghee", "பிஸ்கட்": "biscuit", "உப்பு": "salt",

    # Malayalam
    "അരി": "rice", "എണ്ണ": "oil", "ആട്ട": "atta", "പാൽ": "milk", "പരിപ്പ്": "dal",
    "പഞ്ചസാര": "sugar", "സോപ്പ്": "soap", "ചായ": "tea", "ടീ": "tea", "കാപ്പി": "coffee",
    "നെയ്യ്": "ghee", "ബിസ്കറ്റ്": "biscuit", "ഉപ്പ്": "salt"
}

def detect_language(text: str, hint: str = "en") -> str:
    """Detects language among Telugu (te), Hindi (hi), Tamil (ta), Malayalam (ml), or English (en)."""
    if hint.startswith("te") or re.search(r'[ఀ-౿]', text):
        return "te"
    if hint.startswith("hi") or re.search(r'[ऀ-ॿ]', text):
        return "hi"
    if hint.startswith("ta") or re.search(r'[஀-௿]', text):
        return "ta"
    if hint.startswith("ml") or re.search(r'[ഀ-ൿ]', text):
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
        # 1. OPERATION: LIVE RESTOCK VIA ASSISTANT
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
                    reply = f"{target_prod.name} కు {qty_val} యూనిట్ల స్టాక్ విజయవంతంగా చేర్చబడింది. ప్రస్తుత నిల్వ: {target_prod.stock} యూనిట్లు."
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

        # =========================================================================
        # 2. OPERATION: LIVE SALE VIA ASSISTANT
        # =========================================================================
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
        # 3. QUERY: TODAY'S SALES & ORDERS (Multilingual)
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

        # =========================================================================
        # 4. QUERY: LOW STOCK / REORDER (Multilingual)
        # =========================================================================
        is_low_stock_query = (
            any(w in q_lower for w in ["reorder", "restock", "out of stock", "critical", "shortage", "low stock"])
            or ("low" in q_lower and "stock" in q_lower)
            or any(w in query for w in ["తక్కువ", "స్టాక్ తక్కువ", "రీఆర్డర్"])
            or any(w in query for w in ["कम स्टॉक", "स्टॉक कम", "खत्म"])
            or any(w in query for w in ["குறைந்த இருப்பு", "கம்மி", "தீர்ந்து"])
            or any(w in query for w in ["കുറഞ്ഞ സ്റ്റോക്ക്", "തീർന്നു"])
        )
        
        specific_prod_match = None
        if not is_low_stock_query and not any(w in q_lower for w in ["highest profit", "top seller", "best seller", "top selling", "most profit"]):
            specific_prod_match = self._find_matching_product(query, all_products)

        if is_low_stock_query and not specific_prod_match:
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
                elif lang == "ta":
                    reply = "தற்போது உங்கள் கடையில் அனைத்து பொருட்களின் இருப்பும் போதுமானதாக உள்ளது."
                elif lang == "ml":
                    reply = "നിലവിൽ കടയിലെ എല്ലാ സാധനങ്ങൾക്കും ആവശ്യത്തിന് സ്റ്റോക്ക് ഉണ്ട്."
                else:
                    reply = "All your items have plenty of stock right now. No urgent reorders are needed."
            return self._format_result(reply, "Inventory Status", cards, f"{lang}-IN")

        # =========================================================================
        # 5. QUERY: SPECIFIC PRODUCT INQUIRY / STOCK / PRICE (Multilingual)
        # =========================================================================
        if not specific_prod_match:
            specific_prod_match = self._find_matching_product(query, all_products)

        if specific_prod_match:
            p = specific_prod_match
            if lang == "te":
                reply = f"{p.name} ధర {currency}{p.price:,.2f}. ప్రస్తుతం మీ దగ్గర {p.stock} యూనిట్ల స్టాక్ ఉంది, ఇప్పటివరకు {p.units_sold} యూనిట్లు అమ్ముడయ్యాయి. ఇంకో {p.order_recommendation or 30} యూనిట్లు రీఆర్డర్ చేయడం మంచిది."
            elif lang == "hi":
                reply = f"{p.name} की कीमत {currency}{p.price:,.2f} है। आपके पास {p.stock} यूनिट्स का स्टॉक है, और अब तक {p.units_sold} यूनिट्स बिक चुकी हैं। लगभग {p.order_recommendation or 30} यूनिट्स और रीऑर्डर करने की सलाह है।"
            elif lang == "ta":
                reply = f"{p.name} விலை {currency}{p.price:,.2f}. உங்களிடம் {p.stock} அலகுகள் இருப்பு உள்ளது, இதுவரை {p.units_sold} அலகுகள் விற்பனையாகியுள்ளது. மேலும் {p.order_recommendation or 30} அலகுகள் ரீஆர்டர் செய்ய பரிந்துரைக்கப்படுகிறது."
            elif lang == "ml":
                reply = f"{p.name}ന്റെ വില {currency}{p.price:,.2f} ആണ്. ഇപ്പോൾ {p.stock} യൂണിറ്റുകൾ സ്റ്റോക്ക് ഉണ്ട്, ഇതുവരെ {p.units_sold} യൂണിറ്റുകൾ വിറ്റുപോയി. ഏകദേശം {p.order_recommendation or 30} യൂണിറ്റുകൾ കൂടി റീഓർഡർ ചെയ്യുന്നത് നല്ലതാണ്."
            else:
                reply = f"{p.name} is priced at {currency}{p.price:,.2f} and you have {p.stock} units in stock. You've sold {p.units_sold} units so far, and I recommend keeping about {p.order_recommendation or 30} more on hand."
            cards.append(self._product_to_card(p))
            return self._format_result(reply, "Product Information", cards, f"{lang}-IN")

        # =========================================================================
        # 6. GENERAL GREETING & STORE OVERVIEW
        # =========================================================================
        total_rev = sum(p.revenue or 0.0 for p in all_products)
        low_items_count = len([p for p in all_products if (p.stock or 0) <= (p.min_stock or 15)])

        if lang == "te":
            reply = f"నమస్తే! మీ స్టోర్‌లోని {len(all_products)} ఉత్పత్తులను నేను ట్రాక్ చేస్తున్నాను. మొత్తం అమ్మకాలు {currency}{total_rev:,.2f}, మరియు {low_items_count} వస్తువుల స్టాక్ తక్కువగా ఉంది. ఈ రోజు మీకు ఎలా సహాయపడాలి?"
        elif lang == "hi":
            reply = f"नमस्ते! मैं आपकी दुकान के {len(all_products)} प्रोडक्ट्स ट्रैक कर रहा हूँ। कुल बिक्री {currency}{total_rev:,.2f} है और {low_items_count} सामान कम स्टॉक में हैं। मैं आपकी क्या मदद कर सकता हूँ?"
        elif lang == "ta":
            reply = f"வணக்கம்! உங்கள் கடையின் {len(all_products)} பொருட்களை நான் கண்காணிக்கிறேன். மொத்த விற்பனை {currency}{total_rev:,.2f}. {low_items_count} பொருட்கள் குறைந்த இருப்பில் உள்ளன. உங்களுக்கு எவ்வாறு உதவ வேண்டும்?"
        elif lang == "ml":
            reply = f"നമസ്കാരം! കടയിലെ {len(all_products)} സാധനങ്ങളുടെ വിവരങ്ങൾ ഞാൻ ട്രാക്ക് ചെയ്യുന്നു. ആകെ വിൽപ്പന {currency}{total_rev:,.2f} ആണ്. {low_items_count} സാധനങ്ങൾക്ക് സ്റ്റോക്ക് കുറവുണ്ട്. എന്ത് സഹായമാണ് വേണ്ടത്?"
        else:
            reply = f"Hi! I'm tracking your {len(all_products)} products with {currency}{total_rev:,.2f} in total sales. Right now, {low_items_count} items are low on stock. What would you like to check?"

        low_prods = [p for p in all_products if (p.stock or 0) <= (p.min_stock or 15)]
        for p in low_prods[:2]:
            cards.append(self._product_to_card(p))
        return self._format_result(reply, "Store Assistant", cards, f"{lang}-IN")

    def _find_matching_product(self, term: str, products: List[Product]) -> Optional[Product]:
        term_clean = term.lower().strip()

        # 1. Check multilingual product terms (Telugu, Hindi, Tamil, Malayalam)
        for reg_word, en_word in MULTILINGUAL_PRODUCT_MAP.items():
            if reg_word in term_clean:
                for p in products:
                    if en_word in p.name.lower() or en_word in p.category.lower():
                        return p

        # 2. Extract meaningful product tokens
        tokens = [
            t for t in re.findall(r'[a-zA-Z0-9]+', term_clean)
            if ((len(t) >= 4) or (t in {'tea', 'dal', 'oil', 'egg', 'ghee', 'atta', 'rice', 'milk'})) and t not in STOPWORDS and t not in QUERY_FILLERS
        ]

        for t in tokens:
            for p in products:
                p_name = p.name.lower()
                if t in p_name or t in p.category.lower() or t == p.sku.lower():
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
        Determines whether the query can be directly answered by the verified
        PostgreSQL rule assistant in Telugu, Hindi, Tamil, Malayalam, or English.
        """
        q = query.lower().strip()
        all_products = db.query(Product).all()

        # Restock / Sale operations
        if re.search(r'(?:restock|add|order|sell|sold|billed)\s+\d+', q):
            return True

        # Today's sales (multilingual)
        today_keywords = [
            "today", "todays sales", "today sales",
            "ఈ రోజు", "ఈరోజు", "నేడు",
            "आज", "आजकी", "आज की बिक्री", "आज की sales",
            "இன்று", "இன்றைய விற்பனை", "இன்று sales",
            "ഇന്ന്", "ഇന്നത്തെ sales", "ഇന്നത്തെ വിൽപ്പന"
        ]
        if any(w in query or w in q for w in today_keywords):
            return True

        # Low stock (multilingual)
        low_stock_keywords = [
            "low stock", "stock low", "out of stock", "reorder",
            "తక్కువ స్టాక్", "స్టాక్ తక్కువ",
            "कम स्टॉक", "स्टॉक कम", "खत्म",
            "குறைந்த இருப்பு", "இருப்பு கம்மி",
            "കുറഞ്ഞ സ്റ്റോക്ക്", "സ്റ്റോക്ക് കുറവ്"
        ]
        if any(w in query or w in q for w in low_stock_keywords):
            return True

        # Specific product inquiry (multilingual)
        if self._find_matching_product(query, all_products) is not None:
            return True

        return False

rule_assistant = RuleBasedAssistantEngine()
