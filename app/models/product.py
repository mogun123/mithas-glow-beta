from sqlalchemy import Column, String, Integer, Float, DateTime, Text, UUID, Boolean, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSON
from pgvector.sqlalchemy import Vector
from datetime import datetime
import uuid

from app.database import Base

class ProductCategory(Base):
    __tablename__ = "product_categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    icon_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("product_categories.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(DECIMAL(10, 2), nullable=False)
    discount_price = Column(DECIMAL(10, 2), nullable=True)
    stock_quantity = Column(Integer, default=0)
    images = Column(JSON, default=[])
    sku = Column(String(100), unique=True, nullable=True)
    rating = Column(Float, default=0)
    review_count = Column(Integer, default=0)
    trending = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    embedding = Column(Vector(384), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    seller = relationship("User", back_populates="products")
    category = relationship("ProductCategory", back_populates="products")

class ProductReview(Base):
    __tablename__ = "product_reviews"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    images = Column(JSON, default=[])
    helpful_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class CartItem(Base):
    __tablename__ = "cart_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1)
    added_at = Column(DateTime, default=datetime.utcnow)

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    order_number = Column(String(50), unique=True, nullable=False)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    discount_amount = Column(DECIMAL(10, 2), default=0)
    tax_amount = Column(DECIMAL(10, 2), default=0)
    status = Column(String(50), default="pending")
    payment_status = Column(String(50), default="pending")
    payment_method = Column(String(50), nullable=True)
    razorpay_order_id = Column(String(255), nullable=True)
    razorpay_payment_id = Column(String(255), nullable=True)
    shipping_address = Column(JSON, nullable=True)
    tracking_number = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    delivered_at = Column(DateTime, nullable=True)

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(DECIMAL(10, 2), nullable=False)
    discount_price = Column(DECIMAL(10, 2), nullable=True)
