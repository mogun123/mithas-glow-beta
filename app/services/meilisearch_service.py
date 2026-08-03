import meilisearch
from app.config import get_settings
from typing import List, Optional
from uuid import UUID

settings = get_settings()

class MeilisearchService:
    def __init__(self):
        self.client = meilisearch.Client(settings.MEILISEARCH_URL, settings.MEILISEARCH_MASTER_KEY)
        self._init_indexes()
    
    def _init_indexes(self):
        """Initialize Meilisearch indexes"""
        indexes = ['products', 'feed_posts', 'reels', 'users']
        for index_name in indexes:
            try:
                self.client.create_index(index_name, {'primaryKey': 'id'})
            except Exception as e:
                # Index might already exist
                pass
    
    def index_product(self, product: dict):
        """Index a product"""
        try:
            self.client.index('products').add_documents([{
                'id': str(product['id']),
                'name': product['name'],
                'description': product.get('description', ''),
                'price': float(product['price']),
                'discount_price': float(product.get('discount_price', 0)) if product.get('discount_price') else 0,
                'category_id': str(product['category_id']),
                'seller_id': str(product['seller_id']),
                'rating': product.get('rating', 0),
                'review_count': product.get('review_count', 0),
                'trending': product.get('trending', False),
            }], {'primaryKey': 'id'})
        except Exception as e:
            print(f"Error indexing product: {e}")
    
    def index_feed_post(self, post: dict):
        """Index a feed post"""
        try:
            self.client.index('feed_posts').add_documents([{
                'id': str(post['id']),
                'user_id': str(post['user_id']),
                'caption': post.get('caption', ''),
                'tags': post.get('tags', []),
                'like_count': post.get('like_count', 0),
                'comment_count': post.get('comment_count', 0),
                'created_at': post.get('created_at').isoformat() if post.get('created_at') else None,
            }], {'primaryKey': 'id'})
        except Exception as e:
            print(f"Error indexing feed post: {e}")
    
    def index_reel(self, reel: dict):
        """Index a reel"""
        try:
            self.client.index('reels').add_documents([{
                'id': str(reel['id']),
                'user_id': str(reel['user_id']),
                'title': reel.get('title', ''),
                'description': reel.get('description', ''),
                'view_count': reel.get('view_count', 0),
                'like_count': reel.get('like_count', 0),
                'trending': reel.get('trending', False),
                'created_at': reel.get('created_at').isoformat() if reel.get('created_at') else None,
            }], {'primaryKey': 'id'})
        except Exception as e:
            print(f"Error indexing reel: {e}")
    
    def index_user(self, user: dict):
        """Index a user"""
        try:
            self.client.index('users').add_documents([{
                'id': str(user['id']),
                'username': user.get('username', ''),
                'full_name': user.get('full_name', ''),
                'bio': user.get('bio', ''),
                'is_artist': user.get('is_artist', False),
                'is_seller': user.get('is_seller', False),
            }], {'primaryKey': 'id'})
        except Exception as e:
            print(f"Error indexing user: {e}")
    
    def search_products(self, query: str, limit: int = 20) -> List[dict]:
        """Search products"""
        try:
            results = self.client.index('products').search(query, {'limit': limit})
            return results.get('hits', [])
        except Exception as e:
            print(f"Error searching products: {e}")
            return []
    
    def search_feed_posts(self, query: str, limit: int = 20) -> List[dict]:
        """Search feed posts"""
        try:
            results = self.client.index('feed_posts').search(query, {'limit': limit})
            return results.get('hits', [])
        except Exception as e:
            print(f"Error searching feed posts: {e}")
            return []
    
    def search_reels(self, query: str, limit: int = 20) -> List[dict]:
        """Search reels"""
        try:
            results = self.client.index('reels').search(query, {'limit': limit})
            return results.get('hits', [])
        except Exception as e:
            print(f"Error searching reels: {e}")
            return []
    
    def search_users(self, query: str, limit: int = 20) -> List[dict]:
        """Search users"""
        try:
            results = self.client.index('users').search(query, {'limit': limit})
            return results.get('hits', [])
        except Exception as e:
            print(f"Error searching users: {e}")
            return []
    
    def delete_product(self, product_id: str):
        """Delete product from index"""
        try:
            self.client.index('products').delete_document(product_id)
        except Exception as e:
            print(f"Error deleting product from index: {e}")
    
    def delete_feed_post(self, post_id: str):
        """Delete feed post from index"""
        try:
            self.client.index('feed_posts').delete_document(post_id)
        except Exception as e:
            print(f"Error deleting feed post from index: {e}")
    
    def delete_reel(self, reel_id: str):
        """Delete reel from index"""
        try:
            self.client.index('reels').delete_document(reel_id)
        except Exception as e:
            print(f"Error deleting reel from index: {e}")

meilisearch_service = MeilisearchService()
