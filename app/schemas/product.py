from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from decimal import Decimal

class ProductCategoryResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class ProductCreate(BaseModel):
    category_id: UUID
    name: str
    description: Optional[str] = None
    price: Decimal = Field(..., gt=0)
    discount_price: Optional[Decimal] = Field(None, ge=0)
    stock_quantity: int = Field(..., ge=0)
    images: List[str] = []
    sku: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = Field(None, gt=0)
    discount_price: Optional[Decimal] = Field(None, ge=0)
    stock_quantity: Optional[int] = Field(None, ge=0)
    images: Optional[List[str]] = None
    sku: Optional[str] = None
    trending: Optional[bool] = None

class ProductResponse(BaseModel):
    id: UUID
    seller_id: UUID
    category_id: UUID
    name: str
    description: Optional[str] = None
    price: Decimal
    discount_price: Optional[Decimal] = None
    stock_quantity: int
    images: List[str]
    sku: Optional[str] = None
    rating: float
    review_count: int
    trending: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class CartItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(..., ge=1)

class CartItemResponse(BaseModel):
    id: UUID
    user_id: UUID
    product_id: UUID
    quantity: int
    added_at: datetime
    
    class Config:
        from_attributes = True

class CartItemWithProduct(CartItemResponse):
    product: ProductResponse

class OrderItemResponse(BaseModel):
    id: UUID
    order_id: UUID
    product_id: UUID
    quantity: int
    price: Decimal
    discount_price: Optional[Decimal] = None
    
    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    shipping_address: dict
    payment_method: str = "razorpay"

class OrderResponse(BaseModel):
    id: UUID
    order_number: str
    user_id: UUID
    total_amount: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    status: str
    payment_status: str
    payment_method: Optional[str] = None
    shipping_address: Optional[dict] = None
    tracking_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    delivered_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ProductReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    images: Optional[List[str]] = []

class ProductReviewResponse(BaseModel):
    id: UUID
    product_id: UUID
    user_id: UUID
    rating: int
    comment: Optional[str] = None
    images: List[str]
    helpful_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class RazorpayOrderRequest(BaseModel):
    order_id: UUID
    amount: Decimal

class RazorpayPaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
