/**
 * Hooks Module Exports
 * All SWR-based data hooks with FastAPI backend integration
 */

// Products
export {
  useProducts,
  useProduct,
  useFeaturedProducts,
  useTrendingProducts,
  useCategories,
  useProductSearch,
  useProductRecommendations,
} from "./use-products"

// Cart & Orders
export { useCart } from "./use-cart"
export { useOrders, useOrder, useOrderTracking, useCreateOrder } from "./use-orders"

// Reels
export { useReelsFeed, useForYouFeed, useReel, useReelInteractions, useReelComments } from "./use-reels"

// AI
export { useSkinAnalysis, useVirtualTryOn, useStyleRecommendations, useAIChat, useVisualSearch } from "./use-ai"

// Booking
export {
  useSalons,
  useNearbySalons,
  useSalon,
  useSalonServices,
  useAvailableSlots,
  useBookingSlots,
  useMyBookings,
  useCreateBooking,
  useCancelBooking,
} from "./use-booking"

// Wallet
export {
  useWallet,
  useWalletTransactions,
  useAddFunds,
  useAddMoney,
  useWithdrawMoney,
  useWalletPay,
} from "./use-wallet"

// Chat
export { useChats, useChatMessages, useCreateVendorChat } from "./use-chat"

// Seller
export {
  useSellerProfile,
  useSellerDashboard,
  useSellerAnalytics,
  useSellerProducts,
  useSellerOrders,
  useSellerRegistration,
  useAddProduct,
} from "./use-seller"

// Search
export { useSearch, useProductSearch as useSearchProducts, useSearchSuggestions } from "./use-search"

// User
export { useUserProfile, useAddresses, useWishlist, useNotifications } from "./use-user"

// Geo
export { useNearbyStores, useNearbyDeals, useLocationSearch, useUserLocation } from "./use-geo"
