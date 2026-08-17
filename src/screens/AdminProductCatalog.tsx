import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/hooks/useAuth';
import { supabase } from '../lib/supabase';
import type { Json } from '../lib/database.types';

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  currency: string;
  status: 'active' | 'inactive';
  images: string[];
  attributes_json: Json;
}

const MERCHANTS = ['Nykaa', 'Amazon', 'Flipkart', 'Other'];

const CATEGORIES = [
  'Skincare',
  'Makeup',
  'Haircare',
  'Foundation',
  'Concealer',
  'Lipstick',
  'Serum',
  'Cleanser',
  'Moisturizer',
  'Sunscreen',
  'Hair',
  'Fragrance',
  'Tools',
  'Other'
];

export const AdminProductCatalog: React.FC = () => {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: 'Skincare',
    description: '',
    price: '',
    currency: 'INR',
    image_url: '',
    merchant: 'Nykaa',
    affiliate_url: '',
    status: 'active' as 'active' | 'inactive'
  });

  // Check admin access
  useEffect(() => {
    if (profile?.role !== 'admin' && profile?.role !== 'professional') {
      setError('Unauthorized access. Admin or professional privileges required.');
    }
  }, [profile]);

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Validate affiliate URL
  const validateAffiliateUrl = (url: string, merchant: string): boolean => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return false;

      const hostname = parsed.hostname.toLowerCase();
      
      if (merchant === 'Nykaa' && !hostname.includes('nykaa.com')) return false;
      if (merchant === 'Amazon' && !hostname.includes('amazon.in') && !hostname.includes('amzn.to')) return false;
      if (merchant === 'Flipkart' && !hostname.includes('flipkart.com')) return false;
      
      return true;
    } catch {
      return false;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }
    if (!formData.brand.trim()) {
      setError('Brand is required');
      return;
    }
    if (!formData.affiliate_url.trim()) {
      setError('Affiliate URL is required');
      return;
    }
    if (!validateAffiliateUrl(formData.affiliate_url, formData.merchant)) {
      setError(`Invalid affiliate URL for ${formData.merchant}. Must be a valid HTTPS URL from the merchant's domain.`);
      return;
    }
    if (!formData.image_url.trim()) {
      setError('Product image URL is required');
      return;
    }

    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Price must be a positive number');
      return;
    }

    try {
      const productData = {
        name: formData.name.trim(),
        brand: formData.brand.trim(),
        category: formData.category,
        description: formData.description.trim() || null,
        price: priceNum,
        currency: formData.currency,
        images: [formData.image_url.trim()],
        status: formData.status,
        attributes_json: {
          brand: formData.brand.trim(),
          merchant: formData.merchant,
          affiliate_url: formData.affiliate_url.trim(),
          ...(formData.category !== 'Other' && { category: formData.category })
        }
      };

      let result;
      if (editingProduct) {
        // Update existing product
        result = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        setSuccess('Product updated successfully');
      } else {
        // Create new product
        result = await supabase
          .from('products')
          .insert([productData]);
        setSuccess('Product added successfully');
      }

      if (result.error) throw result.error;

      // Reset form and refresh list
      setFormData({
        name: '',
        brand: '',
        category: 'Skincare',
        description: '',
        price: '',
        currency: 'INR',
        image_url: '',
        merchant: 'Nykaa',
        affiliate_url: '',
        status: 'active'
      });
      setShowForm(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    }
  };

  // Handle edit
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      brand: product.brand || '',
      category: product.category || 'Skincare',
      description: product.description || '',
      price: product.price.toString(),
      currency: product.currency || 'INR',
      image_url: product.images?.[0] || '',
      merchant: (product.attributes_json as any)?.merchant || 'Nykaa',
      affiliate_url: (product.attributes_json as any)?.affiliate_url || '',
      status: product.status
    });
    setShowForm(true);
  };

  // Handle delete/deactivate
  const handleDelete = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) throw error;
      setSuccess('Product deleted successfully');
      fetchProducts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle status toggle
  const handleToggleStatus = async (product: Product) => {
    try {
      const newStatus = product.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', product.id);

      if (error) throw error;
      fetchProducts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Filter products by search
  const filteredProducts = products.filter(p => {
    const name = p.name ?? '';
    const brand = p.brand ?? '';
    const category = p.category ?? '';
    const query = searchQuery.toLowerCase();
    return name.toLowerCase().includes(query) ||
      brand.toLowerCase().includes(query) ||
      category.toLowerCase().includes(query);
  });

  if (profile?.role !== 'admin' && profile?.role !== 'professional') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600">Admin or professional privileges required to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-1">Product Catalog</h1>
          <p className="text-sm opacity-90">Manage affiliate products</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="max-w-lg mx-auto mt-4 px-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        </div>
      )}
      {success && (
        <div className="max-w-lg mx-auto mt-4 px-4">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="max-w-lg mx-auto p-4">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={() => {
              setEditingProduct(null);
              setFormData({
                name: '',
                brand: '',
                category: 'Skincare',
                description: '',
                price: '',
                currency: 'INR',
                image_url: '',
                merchant: 'Nykaa',
                affiliate_url: '',
                status: 'active'
              });
              setShowForm(!showForm);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Add'}
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
            <h3 className="font-semibold text-gray-800">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>
            
            <input
              type="text"
              placeholder="Product Name *"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            
            <input
              type="text"
              placeholder="Brand *"
              value={formData.brand}
              onChange={(e) => setFormData({...formData, brand: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={2}
            />
            
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="Price *"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
              <select
                value={formData.currency}
                onChange={(e) => setFormData({...formData, currency: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="INR">₹ INR</option>
                <option value="USD">$ USD</option>
              </select>
            </div>
            
            <input
              type="url"
              placeholder="Product Image URL *"
              value={formData.image_url}
              onChange={(e) => setFormData({...formData, image_url: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            
            {formData.image_url && (
              <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={formData.image_url}
                  alt="Preview"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-gray-400 text-xs">Preview</span>
                </div>
              </div>
            )}
            
            <select
              value={formData.merchant}
              onChange={(e) => setFormData({...formData, merchant: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {MERCHANTS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            
            <input
              type="url"
              placeholder="Affiliate URL *"
              value={formData.affiliate_url}
              onChange={(e) => setFormData({...formData, affiliate_url: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <button
              type="submit"
              className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              {editingProduct ? 'Update Product' : 'Add Product'}
            </button>
          </form>
        )}

        {/* Product List */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-gray-600">No products found</p>
            <p className="text-sm text-gray-500 mt-1">Add your first affiliate product</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white rounded-lg shadow p-3 flex gap-3">
                {/* Image */}
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '';
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      No Image
                    </div>
                  )}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.brand}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                          {(product.attributes_json as any)?.merchant || product.category || 'Merchant'}
                        </span>
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      product.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {product.status}
                    </span>
                  </div>
                  
                  <p className="text-sm font-semibold text-purple-600 mt-1">
                    ₹{product.price}
                  </p>
                  
                  {/* Actions */}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleToggleStatus(product)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      {product.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleEdit(product)}
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
