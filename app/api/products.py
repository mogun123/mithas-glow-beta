from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from uuid import UUID
import uuid

from app.database import get_db
from app.models import Product, ProductCategory, ProductReview, Order, OrderItem, CartItem
from app.schemas.product import (
    ProductResponse, ProductCreate, ProductUpdate, ProductCategoryResponse,
    ProductReviewCreate, ProductReviewResponse
)
from app.models import User
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/products", tags=["products"])

@router.get("/categories", response_model=list[ProductCategoryResponse])
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Get all product categories"""
    result = await db.execute(select(ProductCategory))
    categories = result.scalars().all()
    return [ProductCategoryResponse.from_orm(cat) for cat in categories]

@router.get("/", response_model=list[ProductResponse])
async def list_products(
    category_id: UUID = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    trending: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    """List products with filtering"""
    query = select(Product).where(Product.is_active == True)
    
    if category_id:
        query = query.where(Product.category_id == category_id)
    
    if trending:
        query = query.where(Product.trending == True)
    
    query = query.order_by(desc(Product.created_at)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    products = result.scalars().all()
    
    return [ProductResponse.from_orm(prod) for prod in products]

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get single product"""
    result = await db.execute(
        select(Product).where((Product.id == product_id) & (Product.is_active == True))
    )
    product = result.scalars().first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return ProductResponse.from_orm(product)

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new product (sellers only)"""
    if not current_user.is_seller:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only sellers can create products"
        )
    
    # Verify category exists
    cat_result = await db.execute(
        select(ProductCategory).where(ProductCategory.id == product_data.category_id)
    )
    if not cat_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    new_product = Product(
        seller_id=current_user.id,
        category_id=product_data.category_id,
        name=product_data.name,
        description=product_data.description,
        price=product_data.price,
        discount_price=product_data.discount_price,
        stock_quantity=product_data.stock_quantity,
        images=product_data.images,
        sku=product_data.sku or str(uuid.uuid4()),
    )
    
    db.add(new_product)
    await db.commit()
    await db.refresh(new_product)
    
    return ProductResponse.from_orm(new_product)

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    product_data: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update product"""
    result = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    product = result.scalars().first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if product.seller_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this product"
        )
    
    update_data = product_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    
    db.add(product)
    await db.commit()
    await db.refresh(product)
    
    return ProductResponse.from_orm(product)

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete product"""
    result = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    product = result.scalars().first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if product.seller_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    product.is_active = False
    db.add(product)
    await db.commit()

@router.get("/{product_id}/reviews", response_model=list[ProductReviewResponse])
async def get_product_reviews(
    product_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get product reviews"""
    result = await db.execute(
        select(ProductReview)
        .where(ProductReview.product_id == product_id)
        .order_by(desc(ProductReview.created_at))
        .offset(skip)
        .limit(limit)
    )
    reviews = result.scalars().all()
    
    return [ProductReviewResponse.from_orm(review) for review in reviews]

@router.post("/{product_id}/reviews", response_model=ProductReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    product_id: UUID,
    review_data: ProductReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create product review"""
    # Verify product exists
    prod_result = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    product = prod_result.scalars().first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    new_review = ProductReview(
        product_id=product_id,
        user_id=current_user.id,
        rating=review_data.rating,
        comment=review_data.comment,
        images=review_data.images or []
    )
    
    db.add(new_review)
    await db.commit()
    await db.refresh(new_review)
    
    # Update product rating
    rating_result = await db.execute(
        select(ProductReview).where(ProductReview.product_id == product_id)
    )
    reviews = rating_result.scalars().all()
    if reviews:
        avg_rating = sum(r.rating for r in reviews) / len(reviews)
        product.rating = avg_rating
        product.review_count = len(reviews)
        db.add(product)
        await db.commit()
    
    return ProductReviewResponse.from_orm(new_review)
