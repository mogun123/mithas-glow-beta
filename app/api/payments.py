"""
Payment API Endpoints
Handles order creation, payment verification, and refunds
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.models import User, Order, OrderItem, Product
from app.core.dependencies import get_current_user
from app.services.payment_service import get_payment_service
from app.services.email_service import get_email_service

router = APIRouter(prefix="/api/payments", tags=["payments"])

# Request/Response schemas
class CreateOrderRequest(BaseModel):
    items: list[dict]  # [{product_id, quantity}]
    shipping_address: str
    delivery_date: str

class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class RefundRequest(BaseModel):
    order_id: UUID
    reason: str

# Endpoints
@router.post("/create-order")
async def create_payment_order(
    order_req: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    payment_service = Depends(get_payment_service)
):
    """Create order and initiate payment"""
    try:
        # Verify products and calculate total
        total = 0
        items = []
        
        for item in order_req.items:
            result = await db.execute(
                select(Product).where(Product.id == UUID(item['product_id']))
            )
            product = result.scalars().first()
            
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product {item['product_id']} not found"
                )
            
            item_total = product.price * item['quantity']
            total += item_total
            items.append({
                "product_id": item['product_id'],
                "quantity": item['quantity'],
                "price": product.price
            })
        
        # Create Razorpay order
        razorpay_order = await payment_service.create_order(
            amount=total,
            notes={
                "user_id": str(current_user.id),
                "items": len(items)
            }
        )
        
        # Store order in DB (pending payment)
        new_order = Order(
            user_id=current_user.id,
            total_amount=total,
            status='pending',
            razorpay_order_id=razorpay_order['order_id'],
            shipping_address=order_req.shipping_address,
            delivery_date=order_req.delivery_date
        )
        
        db.add(new_order)
        await db.flush()
        
        # Add order items
        for item in items:
            order_item = OrderItem(
                order_id=new_order.id,
                product_id=UUID(item['product_id']),
                quantity=item['quantity'],
                price=item['price']
            )
            db.add(order_item)
        
        await db.commit()
        
        return {
            "success": True,
            "order_id": str(new_order.id),
            "razorpay_order_id": razorpay_order['order_id'],
            "amount": total,
            "key_id": "use_your_razorpay_key_from_frontend"
        }
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/verify-payment")
async def verify_payment(
    verify_req: PaymentVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    payment_service = Depends(get_payment_service),
    email_service = Depends(get_email_service)
):
    """Verify payment and confirm order"""
    try:
        # Verify signature
        is_valid = await payment_service.verify_payment(
            verify_req.razorpay_order_id,
            verify_req.razorpay_payment_id,
            verify_req.razorpay_signature
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment verification failed"
            )
        
        # Update order status
        result = await db.execute(
            select(Order).where(Order.razorpay_order_id == verify_req.razorpay_order_id)
        )
        order = result.scalars().first()
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        order.status = 'confirmed'
        order.razorpay_payment_id = verify_req.razorpay_payment_id
        order.paid_at = datetime.utcnow()
        
        db.add(order)
        await db.commit()
        
        # Send confirmation email
        await email_service.send_order_confirmation(
            current_user.email,
            str(order.id),
            order.total_amount,
            len(order.items) if order.items else 0
        )
        
        return {
            "success": True,
            "message": "Payment successful",
            "order_id": str(order.id),
            "status": order.status
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/refund")
async def refund_order(
    refund_req: RefundRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    payment_service = Depends(get_payment_service)
):
    """Refund an order"""
    try:
        result = await db.execute(
            select(Order).where(Order.id == refund_req.order_id)
        )
        order = result.scalars().first()
        
        if not order or order.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        if not order.razorpay_payment_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No payment to refund"
            )
        
        # Process refund
        refund = await payment_service.refund_payment(
            order.razorpay_payment_id,
            order.total_amount
        )
        
        # Update order status
        order.status = 'refunded'
        db.add(order)
        await db.commit()
        
        return {
            "success": True,
            "refund_id": refund['refund_id'],
            "amount": refund['amount']
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/orders")
async def get_user_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's orders"""
    result = await db.execute(
        select(Order).where(Order.user_id == current_user.id)
    )
    orders = result.scalars().all()
    
    return {
        "success": True,
        "orders": [
            {
                "id": str(order.id),
                "total": order.total_amount,
                "status": order.status,
                "created_at": order.created_at.isoformat()
            }
            for order in orders
        ]
    }
