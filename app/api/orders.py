from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from uuid import UUID
from datetime import datetime
from decimal import Decimal

from app.database import get_db
from app.models import Order, OrderItem, Product, CartItem, User
from app.schemas.product import OrderResponse, OrderCreate, RazorpayPaymentVerify, RazorpayOrderRequest
from app.core.dependencies import get_current_user
from app.services.razorpay_service import RazorpayService

router = APIRouter(prefix="/api/orders", tags=["orders"])
razorpay_service = RazorpayService()

@router.get("/", response_model=list[OrderResponse])
async def get_user_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's orders"""
    result = await db.execute(
        select(Order)
        .where(Order.user_id == current_user.id)
        .order_by(desc(Order.created_at))
    )
    orders = result.scalars().all()
    
    return [OrderResponse.from_orm(order) for order in orders]

@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get order details"""
    result = await db.execute(
        select(Order).where((Order.id == order_id) & (Order.user_id == current_user.id))
    )
    order = result.scalars().first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    return OrderResponse.from_orm(order)

@router.post("/create", response_model=dict)
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create order from cart"""
    # Get cart items
    cart_result = await db.execute(
        select(CartItem).where(CartItem.user_id == current_user.id)
    )
    cart_items = cart_result.scalars().all()
    
    if not cart_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart is empty"
        )
    
    # Calculate totals
    total_amount = Decimal(0)
    order_items = []
    
    for cart_item in cart_items:
        prod_result = await db.execute(
            select(Product).where(Product.id == cart_item.product_id)
        )
        product = prod_result.scalars().first()
        
        if not product or product.stock_quantity < cart_item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product {product.name if product else 'unknown'} out of stock"
            )
        
        item_price = product.discount_price or product.price
        item_total = item_price * cart_item.quantity
        total_amount += item_total
        
        order_items.append({
            "product": product,
            "quantity": cart_item.quantity,
            "price": product.price,
            "discount_price": product.discount_price
        })
    
    # Create order
    order_number = f"ORD-{datetime.utcnow().timestamp()}"
    new_order = Order(
        user_id=current_user.id,
        order_number=order_number,
        total_amount=total_amount,
        discount_amount=Decimal(0),
        tax_amount=Decimal(0),
        status="pending",
        payment_status="pending",
        payment_method=order_data.payment_method,
        shipping_address=order_data.shipping_address
    )
    
    db.add(new_order)
    await db.flush()
    
    # Create order items
    for item_data in order_items:
        order_item = OrderItem(
            order_id=new_order.id,
            product_id=item_data["product"].id,
            quantity=item_data["quantity"],
            price=item_data["price"],
            discount_price=item_data["discount_price"]
        )
        db.add(order_item)
        
        # Reduce product stock
        item_data["product"].stock_quantity -= item_data["quantity"]
        db.add(item_data["product"])
    
    await db.commit()
    await db.refresh(new_order)
    
    # Create Razorpay order
    try:
        razorpay_order = razorpay_service.create_order(
            amount=total_amount,
            notes={"order_id": str(new_order.id)}
        )
        new_order.razorpay_order_id = razorpay_order["id"]
        db.add(new_order)
        await db.commit()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    return {
        "order_id": str(new_order.id),
        "razorpay_order_id": new_order.razorpay_order_id,
        "total_amount": float(total_amount),
        "currency": "INR"
    }

@router.post("/verify-payment")
async def verify_payment(
    payment_data: RazorpayPaymentVerify,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Verify Razorpay payment"""
    try:
        # Verify signature
        is_valid = razorpay_service.verify_payment_signature(
            payment_data.razorpay_order_id,
            payment_data.razorpay_payment_id,
            payment_data.razorpay_signature
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payment signature"
            )
        
        # Update order
        result = await db.execute(
            select(Order).where(Order.razorpay_order_id == payment_data.razorpay_order_id)
        )
        order = result.scalars().first()
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        order.razorpay_payment_id = payment_data.razorpay_payment_id
        order.payment_status = "completed"
        order.status = "confirmed"
        
        db.add(order)
        
        # Clear user's cart
        await db.execute(
            select(CartItem).where(CartItem.user_id == current_user.id)
        )
        cart_items = (await db.execute(
            select(CartItem).where(CartItem.user_id == current_user.id)
        )).scalars().all()
        
        for item in cart_items:
            await db.delete(item)
        
        await db.commit()
        
        return {"status": "success", "order_id": str(order.id)}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
