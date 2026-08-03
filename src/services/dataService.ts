/**
 * Data Service
 * MITHAS GLOW - Real Supabase integration for products, users, orders
 */

import { supabase, db, isSupabaseConfigured } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type Order = Database['public']['Tables']['orders']['Row'];
type CartItem = Database['public']['Tables']['cart']['Row'];

export interface ProductFilters {
  category?: string;
  gender?: 'male' | 'female';
  minPrice?: number;
  maxPrice?: number;
  floor?: number;
  search?: string;
}

class DataService {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = isSupabaseConfigured();
  }

  // PRODUCTS
  async getProducts(filters: ProductFilters = {}): Promise<Product[]> {
    console.log('getProducts called, isConfigured:', this.isConfigured);
    if (!this.isConfigured) {
      console.warn('Supabase not configured, returning empty products');
      return [];
    }

    try {
      let query = db.from('products').select('*');

      // Only show active products for buyers
      query = query.eq('status', 'active');
      console.log('Fetching products with status=active filter');

      // Apply filters
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.gender) {
        query = query.eq('gender', filters.gender);
      }
      if (filters.floor) {
        query = query.eq('floor', filters.floor);
      }
      if (filters.minPrice) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice) {
        query = query.lte('price', filters.maxPrice);
      }
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      console.log('Products query result:', { data, error });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    if (!this.isConfigured) return null;

    try {
      const { data, error } = await db
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  }

  async getProductsByCategory(category: string, gender?: 'male' | 'female'): Promise<Product[]> {
    return this.getProducts({ category, gender });
  }

  async getProductsByFloor(floor: number, gender?: 'male' | 'female'): Promise<Product[]> {
    return this.getProducts({ floor, gender });
  }

  // USER PROFILES
  async getProfile(userId: string): Promise<Profile | null> {
    if (!this.isConfigured) return null;

    try {
      const { data, error } = await db
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const { error } = await db
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  }

  // CART
  async getCartItems(userId: string): Promise<CartItem[]> {
    if (!this.isConfigured) return [];

    try {
      const { data, error } = await db
        .from('cart')
        .select('*, products(*)')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching cart items:', error);
      return [];
    }
  }

  async addToCart(userId: string, productId: string, quantity: number = 1): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      // Check if item already exists
      const { data: existing } = await db
        .from('cart')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single();

      if (existing) {
        // Update quantity
        const { error } = await db
          .from('cart')
          .update({ quantity: existing.quantity + quantity })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Add new item
        const { error } = await db
          .from('cart')
          .insert({
            user_id: userId,
            product_id: productId,
            quantity
          });
        
        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      return false;
    }
  }

  async removeFromCart(userId: string, cartItemId: string): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const { error } = await db
        .from('cart')
        .delete()
        .eq('user_id', userId)
        .eq('id', cartItemId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      return false;
    }
  }

  async updateCartQuantity(userId: string, cartItemId: string, quantity: number): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const { error } = await db
        .from('cart')
        .update({ quantity })
        .eq('user_id', userId)
        .eq('id', cartItemId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating cart quantity:', error);
      return false;
    }
  }

  async clearCart(userId: string): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const { error } = await db
        .from('cart')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  }

  // ORDERS
  async createOrder(userId: string, items: CartItem[], totalAmount: number): Promise<Order | null> {
    if (!this.isConfigured) return null;

    try {
      const { data, error } = await db
        .from('orders')
        .insert({
          user_id: userId,
          total_amount: totalAmount,
          status: 'pending',
          items: items.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.quantity * (item.product?.price || 0)
          }))
        })
        .select()
        .single();

      if (error) throw error;
      
      // Clear cart after successful order
      await this.clearCart(userId);
      
      return data;
    } catch (error) {
      console.error('Error creating order:', error);
      return null;
    }
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    if (!this.isConfigured) return [];

    try {
      const { data, error } = await db
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const { error } = await db
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      return false;
    }
  }

  // SEARCH
  async searchProducts(query: string, filters: ProductFilters = {}): Promise<Product[]> {
    return this.getProducts({ ...filters, search: query });
  }

  // CATEGORIES
  async getCategories(): Promise<string[]> {
    if (!this.isConfigured) return [];

    try {
      const { data, error } = await db
        .from('products')
        .select('category')
        .not('category', 'is', null);

      if (error) throw error;
      
      const categories = [...new Set(data?.map(item => item.category).filter(Boolean))];
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }
}

export const dataService = new DataService();
export default dataService;
