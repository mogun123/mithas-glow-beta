from fastapi import APIRouter, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.models import Product, FeedPost, Reel, User
from app.services.meilisearch_service import meilisearch_service
from app.schemas.product import ProductResponse
from app.schemas.feed import FeedPostResponse, ReelResponse
from app.schemas.user import UserResponse
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/search", tags=["search"])

@router.get("/global")
async def global_search(
    query: str = Query(..., min_length=1, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Global search across products, posts, reels, and users"""
    products = meilisearch_service.search_products(query, limit=5)
    posts = meilisearch_service.search_feed_posts(query, limit=5)
    reels = meilisearch_service.search_reels(query, limit=5)
    users = meilisearch_service.search_users(query, limit=5)
    
    return {
        "products": products,
        "posts": posts,
        "reels": reels,
        "users": users
    }

@router.get("/products", response_model=list[ProductResponse])
async def search_products(
    query: str = Query(..., min_length=1, max_length=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Search products"""
    # First search in Meilisearch
    search_results = meilisearch_service.search_products(query, limit=limit + skip)
    
    if not search_results:
        return []
    
    # Get full product details from database
    product_ids = [UUID(result['id']) for result in search_results[skip:skip+limit]]
    
    result = await db.execute(
        select(Product).where(Product.id.in_(product_ids))
    )
    products = result.scalars().all()
    
    # Maintain search result order
    products_dict = {str(p.id): p for p in products}
    ordered_products = [products_dict[str(pid)] for pid in product_ids if str(pid) in products_dict]
    
    return [ProductResponse.from_orm(prod) for prod in ordered_products]

@router.get("/feed-posts", response_model=list[FeedPostResponse])
async def search_feed_posts(
    query: str = Query(..., min_length=1, max_length=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Search feed posts"""
    search_results = meilisearch_service.search_feed_posts(query, limit=limit + skip)
    
    if not search_results:
        return []
    
    post_ids = [UUID(result['id']) for result in search_results[skip:skip+limit]]
    
    result = await db.execute(
        select(FeedPost).where(FeedPost.id.in_(post_ids))
    )
    posts = result.scalars().all()
    
    posts_dict = {str(p.id): p for p in posts}
    ordered_posts = [posts_dict[str(pid)] for pid in post_ids if str(pid) in posts_dict]
    
    return [FeedPostResponse.from_orm(post) for post in ordered_posts]

@router.get("/reels", response_model=list[ReelResponse])
async def search_reels(
    query: str = Query(..., min_length=1, max_length=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Search reels"""
    search_results = meilisearch_service.search_reels(query, limit=limit + skip)
    
    if not search_results:
        return []
    
    reel_ids = [UUID(result['id']) for result in search_results[skip:skip+limit]]
    
    result = await db.execute(
        select(Reel).where(Reel.id.in_(reel_ids))
    )
    reels = result.scalars().all()
    
    reels_dict = {str(r.id): r for r in reels}
    ordered_reels = [reels_dict[str(rid)] for rid in reel_ids if str(rid) in reels_dict]
    
    return [ReelResponse.from_orm(reel) for reel in ordered_reels]

@router.get("/users", response_model=list[UserResponse])
async def search_users(
    query: str = Query(..., min_length=1, max_length=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Search users"""
    search_results = meilisearch_service.search_users(query, limit=limit + skip)
    
    if not search_results:
        return []
    
    user_ids = [UUID(result['id']) for result in search_results[skip:skip+limit]]
    
    result = await db.execute(
        select(User).where(User.id.in_(user_ids))
    )
    users = result.scalars().all()
    
    users_dict = {str(u.id): u for u in users}
    ordered_users = [users_dict[str(uid)] for uid in user_ids if str(uid) in users_dict]
    
    return [UserResponse.from_orm(user) for user in ordered_users]
