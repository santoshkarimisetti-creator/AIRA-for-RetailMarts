"""
AIRA - Database-Grounded Rule-Based Retail Assistant Engine
Connects directly to PostgreSQL to answer inventory, sales, pricing, and health queries.
Features rich bilingual understanding (Telugu & English, and mixed Telugu-English)
with direct, friendly, conversational responses without robotic database prefixes.
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
    "compare", "trend", "trends", "weekend", "festive", "festival", "month", "year", "week",
    "ఎంత", "ఉంది", "ఉన్నాయి", "చెప్పు", "ఎలా", "ఎన్ని", "ఏంటి", "డిమాండ్", "ధర", "సంగతి", "వివరాలు",
    "తక్కువ", "ఎక్కువ", "మొత్తం", "అమ్మకాలు", "సేల్స్", "స్టాక్", "లాభం", "మార్జిన్"
}

TELUGU_PRODUCT_MAP = {
    "బియ్యం": "rice",
    "రైస్": "rice",
    "నూనె": "oil",
    "ఆయిల్": "oil",
    "గోధుమ": "atta",
    "ఆటా": "atta",
    "పిండి": "flour",
    "చక్కెర": "sugar",
    "షుగర్": "sugar",
    "పాలు": "milk",
    "మిల్క్": "milk",
    "సబ్బు": "soap",
    "సోప్": "soap",
    "టీ": "tea",
    "చాయ్": "tea",
    "కాఫీ": "coffee",
    "పప్పు": "dal",
    "దాల్": "dal",
    "నెయ్యి": "ghee",
    "ఘీ": "ghee",
    "సగ్గుబియ్యం": "sago",
    "జామ్": "jam",
    "బిస్కెట్": "biscuit",
    "బిస్కెట్లు": "biscuit"
}

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

        # Detect Telugu Language from unicode range or language code
        is_telugu = (language.startswith("te") or bool(re.search(r'[\u0C00-\u0C7F]', query)))

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

        if prod_term and qty_val and qty_val > 0:
            target_prod = self._find_matching_product(prod_term, all_products)
            if target_prod:
                old_stock = target_prod.stock
                target_prod.stock += qty_val
                if target_prod.stock > target_prod.min_stock:
                    target_prod.status = "Healthy"
                db.commit()
                db.refresh(target_prod)

                if is_telugu:
                    reply = f"సరే! {target_prod.name} కు {qty_val} యూనిట్లు కలిపాము. ఇప్పుడు మొత్తం {target_prod.stock} యూనిట్లు ఉన్నాయి."
                else:
                    reply = f"Got it! Added {qty_val} units to {target_prod.name}. You now have {target_prod.stock} units in stock."
                cards.append(self._product_to_card(target_prod))
                return self._format_result(reply, "DB Operation (Live Update)", cards, "te-IN" if is_telugu else language)

        # =========================================================================
        # 2. OPERATION: LIVE SALE VIA ASSISTANT
        # =========================================================================
        sale_match = re.search(r'(?:sell|sold|billed)\s+(\d+)\s*(?:units|packets|bottles|boxes|items)?\s*(?:of|for)?\s*(.+)', q_lower)
        if sale_match:
            qty_val = int(sale_match.group(1))
            prod_term = sale_match.group(2).strip()
            target_prod = self._find_matching_product(prod_term, all_products)
            if target_prod and qty_val > 0:
                if target_prod.stock < qty_val:
                    if is_telugu:
                        reply = f"క్షమించండి, {target_prod.name} లో కేవలం {target_prod.stock} యూనిట్లు మాత్రమే మిగిలి ఉన్నాయి."
                    else:
                        reply = f"Sorry, you only have {target_prod.stock} units of {target_prod.name} left in stock."
                    cards.append(self._product_to_card(target_prod))
                    return self._format_result(reply, "DB Operation (Stock Warning)", cards, "te-IN" if is_telugu else language)

                sale_amount = round(qty_val * target_prod.price, 2)
                target_prod.stock -= qty_val
                target_prod.units_sold = (target_prod.units_sold or 0) + qty_val
                target_prod.revenue = (target_prod.revenue or 0.0) + sale_amount
                target_prod.total_profit = (target_prod.total_profit or 0.0) + round(qty_val * (target_prod.unit_profit or 0.0), 2)

                if target_prod.stock <= 0:
                    target_prod.status = "Critical"
                elif target_prod.stock <= target_prod.min_stock:
                    target_prod.status = "Low Stock"

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

                if is_telugu:
                    reply = f"{qty_val} {target_prod.name} అమ్మకం నమోదైంది ({currency}{sale_amount:,.2f}). ఇంకా {target_prod.stock} యూనిట్లు మిగిలి ఉన్నాయి."
                else:
                    reply = f"Sold {qty_val} units of {target_prod.name} for {currency}{sale_amount:,.2f}. You have {target_prod.stock} units remaining."
                cards.append(self._product_to_card(target_prod))
                return self._format_result(reply, "DB Operation (Live Sale)", cards, "te-IN" if is_telugu else language)

        # =========================================================================
        # 3. QUERY: TODAY'S SALES & ORDERS (Bilingual English / Telugu / Hinglish)
        # e.g., "What are today's sales?", "ఈ రోజు sales ఎంత?", "today sales ఎలా ఉన్నాయి?"
        # =========================================================================
        is_today_query = (
            any(w in q_lower for w in ["today", "today's", "todays"])
            or any(w in query for w in ["ఈ రోజు", "ఈరోజు", "నేడు", "నేటి", "ఇవాళ", "ఈవేళ"])
        )
        sales_terms = [
            "sale", "sales", "revenue", "business", "orders", "order", "collection", "turnover", "sold",
            "అమ్మకాలు", "కలెక్షన్", "వసూలు", "సేల్స్", "సేల్", "వ్యాపారం", "బిజినెస్", "ఆర్డర్లు", "ఆర్డర్స్", "అమ్ముడ"
        ]
        has_sales_intent = (
            any(w in q_lower for w in sales_terms)
            or any(w in query for w in sales_terms)
            or any(w in query for w in ["ఎంత", "ఎలా", "ఎన్ని"])
            or "how much" in q_lower
        )

        if is_today_query and has_sales_intent:
            today_date = datetime.now().date()
            today_records = db.query(SalesRecord).filter(func.date(SalesRecord.sale_date) == today_date).all()
            today_rev = sum(r.total_amount for r in today_records) if today_records else 0.0
            today_units = sum(r.units_sold for r in today_records) if today_records else 0

            if is_telugu:
                if today_rev > 0:
                    reply = f"ఈ రోజు మొత్తం అమ్మకాలు {currency}{today_rev:,.2f} అయ్యాయి. మొత్తం {len(today_records)} ఆర్డర్లలో {today_units} వస్తువులు అమ్ముడయ్యాయి."
                else:
                    reply = f"ఈ రోజు ఇప్పటివరకు ఎలాంటి అమ్మకాలు నమోదు కాలేదు. బిల్లింగ్ కౌంటర్ సిద్ధంగా ఉంది."
            else:
                if today_rev > 0:
                    reply = f"Today's sales are {currency}{today_rev:,.2f} so far, across {len(today_records)} order{'s' if len(today_records) != 1 else ''} ({today_units} items sold)."
                else:
                    reply = f"Today's sales are {currency}0.00 so far. No orders have been logged yet today."

            top_prods = sorted(all_products, key=lambda x: x.units_sold or 0, reverse=True)[:2]
            for p in top_prods:
                cards.append(self._product_to_card(p))
            return self._format_result(reply, "Daily Sales", cards, "te-IN" if is_telugu else language)

        # =========================================================================
        # 4. QUERY: LOW STOCK / REORDER / CRITICAL ITEMS (Bilingual)
        # e.g., "Which products are low in stock?", "ఏ products stock తక్కువగా ఉంది?", "low stock items ఏవి?"
        # =========================================================================
        is_low_stock_query = (
            any(w in q_lower for w in ["reorder", "restock", "out of stock", "critical", "shortage", "threshold", "need order", "need stock", "low stock"])
            or ("low" in q_lower and "stock" in q_lower)
            or any(w in query for w in ["తక్కువ", "రీఆర్డర్", "అయిపో", "ఖాళీ", "నిండుకో"])
        )
        
        # Check specific product lookup only if it's not a generic low-stock or profit question
        specific_prod_match = None
        if not is_low_stock_query and not any(w in q_lower for w in ["highest profit", "top seller", "best seller", "top selling", "most profit"]):
            specific_prod_match = self._find_matching_product(query, all_products)

        if is_low_stock_query and not specific_prod_match:
            low_items = [p for p in all_products if (p.stock or 0) <= (p.min_stock or 15)]
            if low_items:
                details = [f"{p.name} ({p.stock} left)" for p in low_items[:4]]
                if is_telugu:
                    reply = f"మీ స్టోర్‌లో ప్రస్తుతం {len(low_items)} వస్తువులు తక్కువ స్టాక్‌లో ఉన్నాయి: {', '.join(details)}. సరుకు అయిపోకముందే వీటిని త్వరగా రీఆర్డర్ చేయడం మంచిది."
                else:
                    reply = f"You have {len(low_items)} products running low right now: {', '.join(details)}. I suggest placing a reorder soon so you don't run out."
                for p in low_items[:4]:
                    cards.append(self._product_to_card(p))
            else:
                if is_telugu:
                    reply = "ప్రస్తుతానికి మీ స్టోర్‌లో అన్ని వస్తువుల స్టాక్ బాగుంది. ఎలాంటి రీఆర్డర్ అవసరం లేదు."
                else:
                    reply = "All your items have plenty of stock right now. No urgent reorders are needed."
            return self._format_result(reply, "Inventory Status", cards, "te-IN" if is_telugu else language)

        # =========================================================================
        # 5. QUERY: PROFIT MARGINS / ROI (Bilingual)
        # e.g., "Which product gave highest profit?", "ఏ product ఎక్కువ profit ఇచ్చింది?", "highest margin product ఏది?"
        # =========================================================================
        is_profit_query = (
            any(w in q_lower for w in ["margin", "profit", "roi", "earnings"])
            or any(w in query for w in ["లాభం", "మార్జిన్", "ప్రాఫిట్", "ఎక్కువ లాభం"])
        )
        if is_profit_query and not specific_prod_match:
            sorted_margin = sorted(all_products, key=lambda x: x.margin or 0.0, reverse=True)
            top_margin = sorted_margin[0] if sorted_margin else None
            avg_margin = sum(p.margin or 0.0 for p in all_products) / max(1, len(all_products))

            if is_telugu:
                if top_margin:
                    reply = f"మీ స్టోర్ సగటు లాభాల మార్జిన్ {avg_margin:.1f}%. అత్యధిక లాభం ఇచ్చిన ప్రొడక్ట్ {top_margin.name}, దీని మార్జిన్ {top_margin.margin}%."
                else:
                    reply = f"మీ స్టోర్ సగటు లాభాల మార్జిన్ {avg_margin:.1f}%."
            else:
                if top_margin:
                    reply = f"Your store is averaging a {avg_margin:.1f}% profit margin. Your most profitable item is {top_margin.name} with a {top_margin.margin}% margin (ROI: {top_margin.roi}%)."
                else:
                    reply = f"Your store average profit margin is {avg_margin:.1f}%."
            if top_margin:
                cards.append(self._product_to_card(top_margin))
            return self._format_result(reply, "Margin Analysis", cards, "te-IN" if is_telugu else language)

        # =========================================================================
        # 6. QUERY: TOP SELLERS / POPULAR PRODUCTS (Bilingual)
        # e.g., "what are our top sellers?", "ఏవి వేగంగా అమ్ముడవుతున్నాయి?", "fast moving items ఏవి?"
        # =========================================================================
        is_top_seller_query = (
            any(w in q_lower for w in ["top seller", "top selling", "best seller", "best selling", "fast moving", "popular", "fastest"])
            or any(w in query for w in ["వేగంగా", "ఎక్కువగా", "టాప్", "ఫాస్ట్ మూవింగ్"])
        )
        if is_top_seller_query and not specific_prod_match:
            sorted_prods = sorted(all_products, key=lambda x: x.units_sold or 0, reverse=True)
            top_3 = sorted_prods[:3]
            details = [f"{p.name} ({p.units_sold} sold)" for p in top_3]

            if is_telugu:
                reply = f"మీ దగ్గర అత్యధికంగా అమ్ముడవుతున్నవి: {', '.join(details)}. ఇందులో {top_3[0].name} మొదటి స్థానంలో ఉంది."
            else:
                reply = f"Your top selling product is {top_3[0].name} with {top_3[0].units_sold} units sold ({currency}{top_3[0].revenue:,.2f}), followed by {top_3[1].name}."
            for p in top_3:
                cards.append(self._product_to_card(p))
            return self._format_result(reply, "Top Sellers", cards, "te-IN" if is_telugu else language)

        # =========================================================================
        # 7. QUERY: TOTAL CUMULATIVE SALES / REVENUE (Bilingual)
        # e.g., "overall sales ఎంత?", "total business ఎంత?", "మొత్తం సేల్స్ ఎంత?"
        # =========================================================================
        is_total_sales_query = (
            any(w in q_lower for w in ["sales", "revenue", "earnings", "turnover", "income", "collection", "business"])
            or any(w in query for w in ["అమ్మకాలు", "ఆదాయం", "వసూలు", "వ్యాపారం", "సేల్స్", "బిజినెస్", "మొత్తం"])
        )
        if is_total_sales_query and not specific_prod_match:
            total_rev = sum(p.revenue or 0.0 for p in all_products)
            total_profit = sum(p.total_profit or 0.0 for p in all_products)
            total_units = sum(p.units_sold or 0 for p in all_products)
            sales_records_count = db.query(SalesRecord).count()

            if is_telugu:
                reply = f"స్టోర్ మొత్తం అమ్మకాలు ఇప్పటివరకు {currency}{total_rev:,.2f} అయ్యాయి ({sales_records_count:,} ఆర్డర్లు). మొత్తం వచ్చిన లాభం {currency}{total_profit:,.2f}."
            else:
                reply = f"Your total store sales to date are {currency}{total_rev:,.2f} across {sales_records_count:,} orders, generating {currency}{total_profit:,.2f} in gross profit."
            sorted_by_rev = sorted(all_products, key=lambda x: x.revenue or 0.0, reverse=True)
            for p in sorted_by_rev[:2]:
                cards.append(self._product_to_card(p))
            return self._format_result(reply, "Store Sales Summary", cards, "te-IN" if is_telugu else language)

        # =========================================================================
        # 8. QUERY: SPECIFIC PRODUCT INQUIRY / DEMAND / STOCK (Bilingual)
        # e.g., "what is the demand for rice?", "oil stock ఎంత ఉంది?", "sugar price ఎంత?"
        # =========================================================================
        if not specific_prod_match:
            specific_prod_match = self._find_matching_product(query, all_products)

        if specific_prod_match:
            p = specific_prod_match
            if is_telugu:
                reply = f"{p.name} ధర {currency}{p.price:,.2f}. ప్రస్తుతం మీ దగ్గర {p.stock} యూనిట్ల స్టాక్ ఉంది, ఇప్పటివరకు {p.units_sold} యూనిట్లు అమ్ముడయ్యాయి. ఇంకో {p.order_recommendation or 30} యూనిట్లు రీఆర్డర్ చేయడం మంచిది."
            else:
                reply = f"{p.name} is priced at {currency}{p.price:,.2f} and you have {p.stock} units in stock. You've sold {p.units_sold} units so far, and I recommend keeping about {p.order_recommendation or 30} more on hand."
            cards.append(self._product_to_card(p))
            return self._format_result(reply, "Product Information", cards, "te-IN" if is_telugu else language)

        # =========================================================================
        # 9. GENERAL OVERVIEW & GREETING
        # =========================================================================
        total_rev = sum(p.revenue or 0.0 for p in all_products)
        low_items_count = len([p for p in all_products if (p.stock or 0) <= (p.min_stock or 15)])

        if is_telugu:
            reply = f"నమస్తే! మీ స్టోర్‌లోని {len(all_products)} ఉత్పత్తులను నేను ట్రాక్ చేస్తున్నాను. మొత్తం అమ్మకాలు {currency}{total_rev:,.2f}, మరియు {low_items_count} వస్తువుల స్టాక్ తక్కువగా ఉంది. ఈ రోజు మీకు ఎలా సహాయపడాలి?"
        else:
            reply = f"Hi! I'm tracking your {len(all_products)} products with {currency}{total_rev:,.2f} in total sales. Right now, {low_items_count} items are low on stock. What would you like to check?"
        low_prods = [p for p in all_products if (p.stock or 0) <= (p.min_stock or 15)]
        for p in low_prods[:2]:
            cards.append(self._product_to_card(p))
        return self._format_result(reply, "Store Assistant", cards, "te-IN" if is_telugu else language)

    def _find_matching_product(self, term: str, products: List[Product]) -> Optional[Product]:
        term_clean = term.lower().strip()

        # 1. Translate common Telugu product terms to English keywords
        for te_word, en_word in TELUGU_PRODUCT_MAP.items():
            if te_word in term_clean:
                for p in products:
                    if en_word in p.name.lower() or en_word in p.category.lower():
                        return p

        # 2. Extract meaningful product tokens (excluding question words & fillers)
        tokens = [
            t for t in re.findall(r'[a-zA-Z0-9]+', term_clean)
            if ((len(t) >= 4) or (t in {'tea', 'dal', 'oil', 'egg', 'ghee', 'atta'})) and t not in STOPWORDS and t not in QUERY_FILLERS
        ]

        # Prioritize exact token match in product name or category
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
        Determines whether the query can be directly and immediately answered
        by the verified PostgreSQL rule assistant without invoking Ollama.
        """
        q = query.lower().strip()
        all_products = db.query(Product).all()

        # 1. Restock operation
        if re.search(r'(?:restock|add|order)\s+\d+', q):
            return True

        # 2. Sale operation
        if re.search(r'(?:sell|sold|billed)\s+\d+', q):
            return True

        # 3. Today\'s sales / revenue
        if any(w in q for w in ["today", "ఈ రోజు", "ఈరోజు", "todays sales", "today sales", "ఈ రోజు sales"]):
            return True

        # 4. Low stock items / restocking
        if any(w in q for w in ["low stock", "stock low", "out of stock", "reorder", "తక్కువ స్టాక్", "స్టాక్ తక్కువ", "need restock", "which products are low"]):
            return True

        # 5. Top selling products
        if any(w in q for w in ["top selling", "best seller", "highest selling", "popular", "top products", "most sold", "ఎక్కువగా అమ్ముడవుతున్న"]):
            return True

        # 6. Highest profit / margin
        if any(w in q for w in ["highest profit", "best margin", "profitable", "most profit", "ఎక్కువ లాభం", "ఎక్కువ మార్జిన్"]):
            return True

        # 7. Total all-time store sales
        if any(w in q for w in ["total sales", "overall sales", "total revenue", "store sales", "మొత్తం అమ్మకాలు", "మొత్తం సేల్స్"]):
            return True

        # 8. Specific product search (e.g., rice, oil, sugar, tea, milk, dal, soap, biscuit)
        if self._find_matching_product(query, all_products) is not None:
            return True

        return False

rule_assistant = RuleBasedAssistantEngine()
