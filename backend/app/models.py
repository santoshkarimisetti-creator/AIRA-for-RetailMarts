from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, timedelta
from app.database import Base

IST = timezone(timedelta(hours=5, minutes=30))

def get_ist_now():
    return datetime.now(IST)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    store_name = Column(String, default="AIRA Mart & Superstore")
    owner_name = Column(String, default="Store Owner")
    role = Column(String, default="Store Manager (Admin)")
    created_at = Column(DateTime, default=get_ist_now)

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    sku = Column(String, unique=True, index=True, nullable=False)
    category = Column(String, index=True, nullable=False)
    price = Column(Float, nullable=False)
    cost_price = Column(Float, nullable=False)
    unit_profit = Column(Float, default=0.0)
    margin = Column(Float, default=0.0)
    roi = Column(Float, default=0.0)
    stock = Column(Integer, default=0)
    min_stock = Column(Integer, default=15)
    units_sold = Column(Integer, default=0)
    revenue = Column(Float, default=0.0)
    total_profit = Column(Float, default=0.0)
    status = Column(String, default="Healthy") # Healthy, Low Stock, Critical, Overstock
    sales_velocity = Column(String, default="High")
    image = Column(String, default="https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop")
    primary_advice_type = Column(String, default="restock")
    advice_title = Column(String, default="AIRA Restock Suggestion")
    advice_text = Column(Text, default="Restock units to meet demand surge.")
    order_recommendation = Column(Integer, default=30)
    confidence = Column(Integer, default=95)
    created_at = Column(DateTime, default=get_ist_now)

class SalesRecord(Base):
    __tablename__ = "sales_records"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String(64), index=True, nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    units_sold = Column(Integer, nullable=False)
    price_per_unit = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    discount_percent = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    final_amount = Column(Float, default=0.0)
    sale_date = Column(DateTime, default=get_ist_now)

    product = relationship("Product")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    desc = Column(Text, nullable=False)
    type = Column(String, default="warning") # critical, warning, opportunity, info
    priority = Column(String, default="High Priority")
    time = Column(String, default="Just now")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=get_ist_now)
