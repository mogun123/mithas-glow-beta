import axios from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance with default configuration
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or logout
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Endpoints
export const api = {
  // Auth endpoints
  auth: {
    login: (credentials: any) => apiClient.post('/auth/login', credentials),
    register: (userData: any) => apiClient.post('/auth/register', userData),
    logout: () => apiClient.post('/auth/logout'),
    refresh: () => apiClient.post('/auth/refresh'),
    me: () => apiClient.get('/auth/me'),
  },

  // User endpoints
  users: {
    getProfile: () => apiClient.get('/users/profile'),
    updateProfile: (data: any) => apiClient.put('/users/profile', data),
    getFollowers: () => apiClient.get('/users/followers'),
    getFollowing: () => apiClient.get('/users/following'),
    followUser: (userId: string) => apiClient.post(`/users/${userId}/follow`),
    unfollowUser: (userId: string) => apiClient.delete(`/users/${userId}/follow`),
  },

  // Reels endpoints
  reels: {
    getReels: (params?: any) => apiClient.get('/reels', { params }),
    getReel: (id: string) => apiClient.get(`/reels/${id}`),
    createReel: (data: any) => apiClient.post('/reels', data),
    updateReel: (id: string, data: any) => apiClient.put(`/reels/${id}`, data),
    deleteReel: (id: string) => apiClient.delete(`/reels/${id}`),
    likeReel: (id: string) => apiClient.post(`/reels/${id}/like`),
    unlikeReel: (id: string) => apiClient.delete(`/reels/${id}/like`),
    commentReel: (id: string, comment: string) => apiClient.post(`/reels/${id}/comments`, { comment }),
    getComments: (id: string) => apiClient.get(`/reels/${id}/comments`),
  },

  // Products endpoints
  products: {
    getProducts: (params?: any) => apiClient.get('/products', { params }),
    getProduct: (id: string) => apiClient.get(`/products/${id}`),
    createProduct: (data: any) => apiClient.post('/products', data),
    updateProduct: (id: string, data: any) => apiClient.put(`/products/${id}`, data),
    deleteProduct: (id: string) => apiClient.delete(`/products/${id}`),
    searchProducts: (query: string) => apiClient.get('/products/search', { params: { q: query } }),
  },

  // Cart endpoints
  cart: {
    getCart: () => apiClient.get('/cart'),
    addToCart: (productId: string, quantity: number = 1) => apiClient.post('/cart/add', { productId, quantity }),
    removeFromCart: (itemId: string) => apiClient.delete(`/cart/${itemId}`),
    updateCartQuantity: (itemId: string, quantity: number) => apiClient.put(`/cart/${itemId}`, { quantity }),
    clearCart: () => apiClient.delete('/cart/clear'),
  },

  // Orders endpoints
  orders: {
    getOrders: () => apiClient.get('/orders'),
    getOrder: (id: string) => apiClient.get(`/orders/${id}`),
    createOrder: (data: any) => apiClient.post('/orders', data),
    updateOrderStatus: (id: string, status: string) => apiClient.put(`/orders/${id}/status`, { status }),
  },

  // Chat endpoints
  chat: {
    getConversations: () => apiClient.get('/chat/conversations'),
    getMessages: (conversationId: string) => apiClient.get(`/chat/conversations/${conversationId}/messages`),
    sendMessage: (conversationId: string, message: string) => apiClient.post(`/chat/conversations/${conversationId}/messages`, { message }),
    createConversation: (userId: string) => apiClient.post('/chat/conversations', { userId }),
  },

  // Notifications endpoints
  notifications: {
    getNotifications: () => apiClient.get('/notifications'),
    markAsRead: (id: string) => apiClient.put(`/notifications/${id}/read`),
    markAllAsRead: () => apiClient.put('/notifications/read-all'),
  },

  // File upload endpoints
  upload: {
    uploadFile: (file: File, type: string = 'general') => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      return apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    uploadVideo: (file: File) => {
      const formData = new FormData();
      formData.append('video', file);
      return apiClient.post('/upload/video', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
  },

  // Search endpoints
  search: {
    search: (query: string, type?: string) => apiClient.get('/search', { params: { q: query, type } }),
    getTrending: () => apiClient.get('/search/trending'),
    getSuggestions: (query: string) => apiClient.get('/search/suggestions', { params: { q: query } }),
  },

  // Wallet endpoints
  wallet: {
    getBalance: () => apiClient.get('/wallet/balance'),
    getTransactions: () => apiClient.get('/wallet/transactions'),
    addFunds: (amount: number) => apiClient.post('/wallet/add-funds', { amount }),
    withdraw: (amount: number) => apiClient.post('/wallet/withdraw', { amount }),
  },
};

// Export default API client for custom requests
export default apiClient;

// Utility functions
export const handleApiError = (error: any) => {
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.message || error.response.statusText || 'Server error';
    return { success: false, message, status: error.response.status };
  } else if (error.request) {
    // Request was made but no response received
    return { success: false, message: 'Network error. Please check your connection.' };
  } else {
    // Something else happened
    return { success: false, message: error.message || 'An unexpected error occurred' };
  }
};

// Health check function
export const healthCheck = async () => {
  try {
    const response = await apiClient.get('/health');
    return { success: true, data: response.data };
  } catch (error) {
    return handleApiError(error);
  }
};
