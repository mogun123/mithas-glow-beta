/**

 * MITHAS GLOW - API Module

 * Unified exports for all backend services (FastAPI integration)

 */



// Config

export { API_CONFIG, ENDPOINTS, getApiUrl, isBackendConfigured } from "./config"



// HTTP Client

export { httpClient, type ApiResponse, type ApiError, type RequestConfig } from "./http-client"



// Services

export { authService, type LoginData, type RegisterData, type AuthResponse } from "./services/auth.service"

export {

  shopService,

  type Product,

  type Category,

  type Cart,

  type CartItem,

  type Order,

  type OrderStatus,

  type OrderTracking,

  type Address,

  type ProductFilters,

  type Review,

} from "./services/shop.service"

export {

  reelsService,

  type Reel,

  type ReelComment,

  type ReelProduct,

  type CreateReelData,

  type ReelFilters,

} from "./services/reels.service"

export {

  aiService,

  type SkinAnalysisResult,

  type ARTryOnResult,

  type StyleRecommendation,

  type ProductRecommendation,

  type AIChatMessage,

} from "./services/ai.service"

export {

  bookingService,

  type Salon,

  type SalonWithDistance,

  type Service,

  type TimeSlot,

  type Booking,

  type BookingStatus,

  type CreateBookingData,

} from "./services/booking.service"

export { geoService, type Deal, type RouteInfo, type LocationSearchResult } from "./services/geo.service"

export {

  walletService,

  type WalletBalance,

  type WalletTransaction,

  type BankAccount,

  type PayoutRequest,

} from "./services/wallet.service"

export {

  paymentsService,

  type PaymentOrder,

  type PaymentVerification,

  type PaymentMethod,

  type UPIIntent,

} from "./services/payments.service"

export { chatService, type Chat, type ChatMessage, type SendMessageData } from "./services/chat.service"

export {

  sellerService,

  type SellerProfile,

  type SellerDashboard,

  type SellerAnalytics,

  type CreateProductData,

} from "./services/seller.service"

export {

  userService,

  type UserProfile,

  type SkinProfile,

  type Notification,

  type NotificationPreferences,

  type WishlistItem,

} from "./services/user.service"

export {

  searchService,

  type SearchResult,

  type SearchSuggestion,

  type GlobalSearchResult,

} from "./services/search.service"

