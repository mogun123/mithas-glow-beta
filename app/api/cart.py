from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.models import CartItem, Product, User
from app.schemas.product import CartItemCreate, CartItemResponse, CartItemWithProduct, ProductResponse
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/cart", tags=["cart"])

@router.get("/", response_model=list[CartItemWithProduct])
async def get_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's cart"""
    result = await db.execute(
        select(CartItem).where(CartItem.user_id == current_user.id)
    )
    items = result.scalars().all()
    
    cart_items = []
    for item in items:
        prod_result = await db.execute(
            select(Product).where(Product.id == item.product_id)
        )
        product = prod_result.scalars().first()
        if product:
            cart_items.append({
                **CartItemResponse.from_orm(item).dict(),
                "product": ProductResponse.from_orm(product)
            })
    
    return cart_items

@router.post("/add", response_model=CartItemResponse)
async def add_to_cart(
    item_data: CartItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add item to cart"""
    # Check product exists
    prod_result = await db.execute(
        select(Product).where(Product.id == item_data.product_id)
    )
    product = prod_result.scalars().first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if product.stock_quantity < item_data.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient stock"
        )
    
    # Check if item already in cart
    existing = await db.execute(
        select(CartItem).where(
            (CartItem.user_id == current_user.id) &
            (CartItem.product_id == item_data.product_id)
        )
    )
    cart_item = existing.scalars().first()
    
    if cart_item:
        cart_item.quantity += item_data.quantity
    else:
        cart_item = CartItem(
            user_id=current_user.id,
            product_id=item_data.product_id,
            quantity=item_data.quantity
        )
    
    db.add(cart_item)
    await db.commit()
    await db.refresh(cart_item)
    
    return CartItemResponse.from_orm(cart_item)

@router.put("/items/{item_id}", response_model=CartItemResponse)
async def update_cart_item(
    item_id: UUID,
    quantity: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update cart item quantity"""
    result = await db.execute(
        select(CartItem).where(CartItem.id == item_id)
    )
    cart_item = result.scalars().first()
    
    if not cart_item or cart_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found"
        )
    
    if quantity <= 0:
        await db.delete(cart_item)
        await db.commit()
        return None
    
    cart_item.quantity = quantity
    db.add(cart_item)
    await db.commit()
    await db.refresh(cart_item)
    
    return CartItemResponse.from_orm(cart_item)

@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_cart_item(
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove item from cart"""
    result = await db.execute(
        select(CartItem).where(CartItem.id == item_id)
    )
    cart_item = result.scalars().first()
    
    if not cart_item or cart_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found"
        )
    
    await db.delete(cart_item)
    await db.commit()

@router.delete("/clear", status_code=status.HTTP_204_NO_CONTENT)
async def clear_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Clear entire cart"""
    await db.execute(
        select(CartItem).where(CartItem.user_id == current_user.id)
    )
    result = await db.execute(
        select(CartItem).where(CartItem.user_id == current_user.id)
    )
    items = result.scalars().all()
    
    for item in items:
        await db.delete(item)
    
    await db.commit()
