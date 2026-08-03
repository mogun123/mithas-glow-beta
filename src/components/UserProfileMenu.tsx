import React, { useState, useEffect } from 'react';
import { 
  X, User, Award, ShoppingBag, Heart, ShoppingCart, Package,
  Clock, MapPin, Sparkles, RefreshCw, MessageCircle, Ruler,
  Wallet, FileText, Shield, Mic, Settings, Palette, Bell,
  Lock, Trophy, TrendingUp, Users, Gift, HelpCircle,
  LogOut, ChevronRight, Eye, Cpu, Zap, Crown, Star,
  Home, Scan, Camera, Box, Truck, Phone, Mail, CreditCard,
  Calendar, Activity, Target, Flame, Moon, Sun, Download,
  Share2, BarChart3, Percent, AlertCircle, Check, Store
} from 'lucide-react';
import { supabase, isSupabaseConfigured, realtime } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import { useGlobalStore } from '../lib/globalStore';
import { toast } from 'sonner@2.0.3';

interface UserProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  glowPoints: number;
  onNavigateToOrders?: () => void;
  onNavigateToCart?: () => void;
  onNavigateToWishlist?: () => void;
}

export function UserProfileMenu({ 
  isOpen, 
  onClose, 
  userId, 
  glowPoints,
  onNavigateToOrders,
  onNavigateToCart,
  onNavigateToWishlist
}: UserProfileMenuProps) {
  // Use global store for real-time data
  const { user: globalUser, shop, isProUser, fetchUserProfile, fetchShopData } = useGlobalStore();
  
  // --- Backend action helpers ---
  const handleAddFunds = async (amount = 500) => {
    toast.info('Processing top-up...');
    try {
      if (isSupabaseConfigured() && userId) {
        // Insert transaction and update wallet balance atomically if possible
        await supabase.from('wallet_transactions').insert({ user_id: userId, amount, currency: 'INR', created_at: new Date().toISOString() });
        // Update profiles.wallet_balance (best-effort)
        await supabase.from('profiles').update({ wallet_balance: (walletBalance || 0) + amount }).eq('id', userId);
        setWalletBalance(prev => prev + amount);
        toast.success('Funds added to your wallet');
      } else {
        // Demo fallback
        setWalletBalance(prev => prev + amount);
        toast.success('Demo: Funds added locally');
      }
    } catch (e) {
      console.warn('Add funds failed', e);
      toast.error('Failed to add funds');
    }
  };

  const handleToggleDroneOptIn = async () => {
    try {
      if (isSupabaseConfigured() && userId) {
        const upd = !(userProfile?.drone_opt_in);
        await supabase.from('profiles').update({ drone_opt_in: upd }).eq('id', userId);
        setUserProfile(prev => ({ ...(prev||{}), drone_opt_in: upd }));
        toast.success(`Drone delivery ${upd ? 'enabled' : 'disabled'}`);
      } else {
        setUserProfile(prev => ({ ...(prev||{}), drone_opt_in: !(prev?.drone_opt_in) }));
        toast.info('Demo: Toggled drone opt-in');
      }
    } catch (e) { console.warn('Drone opt-in toggle failed', e); toast.error('Failed to update delivery preferences'); }
  };

  const handleOpenWarranty = async () => {
    try {
      if (isSupabaseConfigured() && userId) {
        await supabase.from('warranty_accesses').insert({ user_id: userId, accessed_at: new Date().toISOString() });
      }
    } catch (e) { console.warn('warranty log failed', e); }
    window.open('/warranty', '_blank');
  };

  const handleOpenReturnsSupport = async () => {
    try {
      if (isSupabaseConfigured() && userId) {
        await supabase.from('support_requests').insert({ user_id: userId, type: 'returns', created_at: new Date().toISOString(), status: 'open' });
      }
    } catch (e) { console.warn('support request failed', e); }
    window.open('https://support.mithas.glow', '_blank');
  };

  const [assistantEnabled, setAssistantEnabled] = useState(true);

  const handleToggleAssistant = async () => {
    try {
      const newVal = !assistantEnabled;
      setAssistantEnabled(newVal);
      if (isSupabaseConfigured() && userId) {
        await supabase.from('profiles').update({ assistant_enabled: newVal }).eq('id', userId);
      }
      toast.success(`AI suggestions ${newVal ? 'enabled' : 'disabled'}`);
    } catch (e) { console.warn('toggle assistant failed', e); toast.error('Failed to update preference'); }
  };

  const handleToggleNotifications = async () => {
    try {
      const newVal = !(userProfile?.notifications_enabled);
      setUserProfile(prev => ({ ...(prev||{}), notifications_enabled: newVal }));
      if (isSupabaseConfigured() && userId) {
        await supabase.from('profiles').update({ notifications_enabled: newVal }).eq('id', userId);
      }
      toast.success(`Notifications ${newVal ? 'enabled' : 'disabled'}`);
    } catch (e) { console.warn('toggle notifications failed', e); toast.error('Failed to update notifications'); }
  };

  const handleToggleTheme = async () => {
    try {
      const newTheme = (userProfile?.theme_pref === 'neon') ? 'dark' : 'neon';
      setUserProfile(prev => ({ ...(prev||{}), theme_pref: newTheme }));
      if (isSupabaseConfigured() && userId) {
        await supabase.from('profiles').update({ theme_pref: newTheme }).eq('id', userId);
      }
      toast.success(`Theme set to ${newTheme}`);
    } catch (e) { console.warn('toggle theme failed', e); }
  };

  const handleReferNow = async () => {
    try {
      if (isSupabaseConfigured() && userId) {
        await supabase.from('support_requests').insert({ user_id: userId, type: 'referral', payload: { action: 'generate_link' }, created_at: new Date().toISOString() });
      }
    } catch (e) { console.warn('refer failed', e); }
    // demo share fallback
    try { navigator.share && await navigator.share({ title: 'Join Mithas', text: 'Join Mithas 2076', url: window.location.href }); } catch (e) {}
  };

  const handleStartVoiceFromProfile = async () => {
    try {
      window.dispatchEvent(new CustomEvent('startVoiceFromProfile'));
      if (isSupabaseConfigured() && userId) {
        await supabase.from('support_requests').insert({ user_id: userId, type: 'voice_invocation', payload: { via: 'profile' }, created_at: new Date().toISOString() });
      }
    } catch (e) { console.warn('voice from profile failed', e); }
  };

  const handleOpenTerms = async () => {
    try {
      if (isSupabaseConfigured() && userId) {
        await supabase.from('support_requests').insert({ user_id: userId, type: 'terms_access', created_at: new Date().toISOString() });
      }
    } catch (e) { console.warn('terms access log failed', e); }
    window.open('/terms', '_blank');
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [tryOnHistory, setTryOnHistory] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [glowDNA, setGlowDNA] = useState(0);
  const [neuralRank, setNeuralRank] = useState('Silver');
  const [moodStatus, setMoodStatus] = useState('Your glow today is trending 🔥');
  
  const isSupabaseReady = isSupabaseConfigured();
  const authStoreProfile = useAuthStore((state) => state.user || (state as any).profile);

  // Fetch user profile data
  useEffect(() => {
    if (!isOpen || !userId) return;
    
    const fetchUserData = async () => {
      setIsLoading(true);
      
      // Use global user data if available (real-time)
      if (globalUser && globalUser.id === userId) {
        setUserProfile(globalUser);
        setWalletBalance(globalUser.wallet_balance || 0);
        
        // Calculate Glow DNA based on activity - STRICTLY use real database values only
        const dna = Math.min(100, Math.round(
          ((globalUser.glow_points || 0) / 100) * 0.4 +
          (globalUser.orders_count || 0) * 5 +
          (globalUser.try_on_count || 0) * 3
        ));
        setGlowDNA(dna);
        
        // Determine rank based on glow points - STRICTLY use real database values
        const points = globalUser.glow_points || 0;
        if (points > 5000) setNeuralRank('Quantum');
        else if (points > 2000) setNeuralRank('Gold');
        else setNeuralRank('Silver');
        
        // Continue fetching other data (orders, wishlist, etc.) below
      }
      // Fallback to auth store if global user not available
      else if (authStoreProfile && authStoreProfile.id === userId) {
        setUserProfile(authStoreProfile);
        setWalletBalance(authStoreProfile.wallet_balance || 0);
        
        // Calculate Glow DNA based on activity - STRICTLY use real database values only
        const dna = Math.min(100, Math.round(
          ((authStoreProfile.glow_points || 0) / 100) * 0.4 +
          (authStoreProfile.orders_count || 0) * 5 +
          (authStoreProfile.try_on_count || 0) * 3
        ));
        setGlowDNA(dna);
        
        // Determine rank based on glow points - STRICTLY use real database values
        const points = authStoreProfile.glow_points || 0;
        if (points > 5000) setNeuralRank('Quantum');
        else if (points > 2000) setNeuralRank('Gold');
        else setNeuralRank('Silver');
      }
      
      // NO MOCK DATA FALLBACK - If no real data exists, show loading state or empty state
      if (!isSupabaseReady) {
        // Do NOT set any demo/mock data
        setIsLoading(false);
        return;
      }

      try {
        // If we already have profile from auth store, skip fetching it again
        if (!authStoreProfile || authStoreProfile.id !== userId) {
          // Fetch profile from Supabase (only if not in auth store)
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (profile) {
            setUserProfile(profile);
            setWalletBalance(profile.wallet_balance || 0);
            
            // Calculate Glow DNA based on activity
            const dna = Math.min(100, Math.round(
              ((profile.glow_points || 0) / 100) * 0.4 +
              (profile.orders_count || 0) * 5 +
              (profile.try_on_count || 0) * 3
            ));
            setGlowDNA(dna);
            
            // Determine rank based on glow points
            const points = profile.glow_points || glowPoints || 0;
            if (points > 5000) setNeuralRank('Quantum');
            else if (points > 2000) setNeuralRank('Gold');
            else setNeuralRank('Silver');
          }
        }
        // Note: If auth store has profile, it's already set above in the first if block

        // Fetch orders
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*, order_items(count)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (ordersData) {
          setOrders(ordersData);
        }

        // Fetch wishlist count
        const { count: wishlistC } = await supabase
          .from('wishlists')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        setWishlistCount(wishlistC || 0);

        // Fetch cart count
        const { count: cartC } = await supabase
          .from('cart_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        setCartCount(cartC || 0);

        // Fetch AR try-on history
        const { data: tryOnData } = await supabase
          .from('ar_try_sessions')
          .select(`
            *,
            product:products(name, images)
          `)
          .eq('user_id', userId)
          .eq('saved', true)
          .order('created_at', { ascending: false })
          .limit(10);

        if (tryOnData) {
          setTryOnHistory(tryOnData.map((t: any) => ({
            id: t.id,
            product_name: t.product?.name || 'Product',
            image: t.product?.images?.[0] || '',
            occasion: t.occasion_tag || 'Casual',
            rating: 4.5
          })));
        }

        setIsLoading(false);

      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load profile');
        setIsLoading(false);
      }
    };

    fetchUserData();

    // realtime subscriptions: orders, cart_items, wishlists, ar_try_sessions
    if (isSupabaseReady && userId) {
      const refreshCounts = async () => {
        try {
          const { count: wishlistC } = await supabase.from('wishlists').select('*', { count: 'exact', head: true }).eq('user_id', userId);
          setWishlistCount(wishlistC || 0);
        } catch (e) {}
        try {
          const { count: cartC } = await supabase.from('cart_items').select('*', { count: 'exact', head: true }).eq('user_id', userId);
          setCartCount(cartC || 0);
        } catch (e) {}
      };
      refreshCounts();

      const ordersChannel = realtime.subscribe('orders', (payload: any) => {
        try {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          if (eventType === 'INSERT') setOrders(prev => [ newRecord, ...prev ]);
          else if (eventType === 'UPDATE') setOrders(prev => prev.map(o => o.id === newRecord.id ? newRecord : o));
          else if (eventType === 'DELETE') setOrders(prev => prev.filter(o => o.id !== oldRecord.id));
        } catch (e) { console.warn('orders realtime error', e); }
      });

      const cartChannel = realtime.subscribe('cart_items', (payload: any) => {
        try { refreshCounts(); } catch (e) {}
      });

      const wishChannel = realtime.subscribe('wishlists', (payload: any) => {
        try { refreshCounts(); } catch (e) {}
      });

      const tryChannel = realtime.subscribe('ar_try_sessions', (payload: any) => {
        try { /* optionally refresh tryOnHistory */ } catch (e) {}
      });

      return () => {
        try { realtime.unsubscribe(ordersChannel); } catch (e) {}
        try { realtime.unsubscribe(cartChannel); } catch (e) {}
        try { realtime.unsubscribe(wishChannel); } catch (e) {}
        try { realtime.unsubscribe(tryChannel); } catch (e) {}
      };
    }
  }, [isOpen, userId, isSupabaseReady, glowPoints, authStoreProfile]);

  const handleLogout = async () => {
    if (isSupabaseReady) {
      await supabase.auth.signOut();
    }
    toast.success('Logged out successfully');
    onClose();
    // Reload to reset state
    setTimeout(() => window.location.reload(), 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[800] bg-slate-950/95 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="h-full overflow-y-auto">
        <div className="max-w-md mx-auto">
          
          {/* NEURAL IDENTITY HEADER */}
          <div className="sticky top-0 z-50 bg-gradient-to-br from-pink-600 via-purple-600 to-indigo-600 p-6 pb-8">
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 hover:bg-white/20 transition-all"
            >
              <X size={20} />
            </button>

            {isLoading ? (
              <div className="text-center py-8">
                <Cpu size={48} className="mx-auto animate-spin mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">Loading Neural Profile...</p>
              </div>
            ) : (
              <>
                {/* 3D Avatar */}
                <div className="flex items-center gap-5 mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white/20 to-white/5 border-4 border-white/30 flex items-center justify-center overflow-hidden backdrop-blur-xl">
                      {userProfile?.avatar_url ? (
                        <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User size={40} />
                      )}
                    </div>
                    {/* Glow Ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-pink-400 animate-ping opacity-50" />
                  </div>
                  
                  <div className="flex-grow">
                    <h2 className="text-2xl font-black italic uppercase tracking-tight mb-1">
                      {userProfile?.display_name || userProfile?.full_name || 'Neural User'}
                    </h2>
                    <div className="flex items-center gap-2 text-xs opacity-80 mb-2">
                      <MapPin size={12} />
                      <span className="font-bold uppercase tracking-widest">{userProfile?.node_name || 'Karamadai Node'}</span>
                    </div>
                    
                    {/* Neural Rank Badge */}
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 ${
                        neuralRank === 'Quantum' ? 'bg-cyan-400/30 border border-cyan-400/50 text-cyan-100' :
                        neuralRank === 'Gold' ? 'bg-yellow-400/30 border border-yellow-400/50 text-yellow-100' :
                        'bg-slate-400/30 border border-slate-400/50 text-slate-100'
                      }`}>
                        <Crown size={10} />
                        {neuralRank} Rank
                      </div>
                      
                      <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[9px] font-black uppercase border border-white/20">
                        {glowPoints} GP
                      </div>
                    </div>
                  </div>
                </div>

                {/* Glow DNA Score */}
                <div className="bg-white/10 backdrop-blur-xl rounded-[25px] p-4 border border-white/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black uppercase tracking-widest">Glow DNA Score</span>
                    <span className="text-2xl font-black">{glowDNA}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-pink-400 to-cyan-400 transition-all duration-1000 rounded-full"
                      style={{ width: `${glowDNA}%` }}
                    />
                  </div>
                  <p className="text-[9px] opacity-70 mt-2 italic">{moodStatus}</p>
                </div>
              </>
            )}
          </div>

          {/* NEURAL DASHBOARD */}
          {activeTab === 'dashboard' && !isLoading && (
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-black uppercase mb-4 opacity-40">Neural Dashboard</h3>
              
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-[25px] p-4">
                  <Package size={24} className="text-pink-400 mb-2" />
                  <p className="text-2xl font-black">{orders.filter(o => o.status === 'in_transit' || o.status === 'pending').length}</p>
                  <p className="text-[9px] font-bold uppercase opacity-60">Active Orders</p>
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-[25px] p-4">
                  <Wallet size={24} className="text-green-400 mb-2" />
                  <p className="text-2xl font-black">₹{walletBalance}</p>
                  <p className="text-[9px] font-bold uppercase opacity-60">Wallet Balance</p>
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-[25px] p-4">
                  <Camera size={24} className="text-purple-400 mb-2" />
                  <p className="text-2xl font-black">{tryOnHistory.length}</p>
                  <p className="text-[9px] font-bold uppercase opacity-60">Try-On Looks</p>
                </div>
                
                {/* Role-based info display */}
                <div className="bg-white/5 border border-white/10 rounded-[25px] p-4">
                  {isProUser() ? (
                    <>
                      <Store size={24} className="text-cyan-400 mb-2" />
                      <p className="text-2xl font-black">{shop?.shop_name || 'Shop'}</p>
                      <p className="text-[9px] font-bold uppercase opacity-60">Business</p>
                    </>
                  ) : (
                    <>
                      <User size={24} className="text-blue-400 mb-2" />
                      <p className="text-2xl font-black">{globalUser?.display_name || 'Normal'}</p>
                      <p className="text-[9px] font-bold uppercase opacity-60">Personal</p>
                    </>
                  )}
                </div>
              </div>

              {/* AI Suggestion Card */}
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-[30px] p-5">
                <div className="flex items-start gap-3">
                  <Sparkles size={24} className="text-purple-400 mt-1" />
                  <div className="flex-grow">
                    <h4 className="text-sm font-black uppercase mb-1">AI Suggestion</h4>
                    <p className="text-xs opacity-80">"Wedding silk match found for you. Check Floor 1"</p>
                    <button onClick={() => { if (onNavigateToOrders) onNavigateToOrders(); else setActiveTab('orders'); onClose(); }} className="mt-3 px-4 py-2 bg-purple-500 rounded-full text-[9px] font-black uppercase">
                      View Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MENU SECTIONS */}
          <div className="p-6 space-y-6">
            
            {/* CORE SHOPPING */}
            <div>
              <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
                <ShoppingBag size={20} className="text-pink-500" />
                Core Shopping
              </h3>
              
              <div className="space-y-2">
                <button 
                  onClick={onNavigateToOrders}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-[25px] flex items-center justify-between hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Package size={20} className="text-blue-400" />
                    <div className="text-left">
                      <p className="text-sm font-black">My Orders</p>
                      <p className="text-[9px] opacity-60">{orders.length} total orders</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="opacity-40 group-hover:opacity-100" />
                </button>

                <button 
                  onClick={onNavigateToWishlist}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-[25px] flex items-center justify-between hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Heart size={20} className="text-pink-400" />
                    <div className="text-left">
                      <p className="text-sm font-black">Wishlist (Dream Link)</p>
                      <p className="text-[9px] opacity-60">{wishlistCount} saved items</p>
                    </div>
                  </div>
                  {wishlistCount > 0 && (
                    <span className="bg-pink-500 text-[8px] font-bold px-2 py-1 rounded-full">{wishlistCount}</span>
                  )}
                </button>

                <button 
                  onClick={onNavigateToCart}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-[25px] flex items-center justify-between hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingCart size={20} className="text-green-400" />
                    <div className="text-left">
                      <p className="text-sm font-black">My Cart</p>
                      <p className="text-[9px] opacity-60">{cartCount} items ready</p>
                    </div>
                  </div>
                  {cartCount > 0 && (
                    <span className="bg-green-500 text-[8px] font-bold px-2 py-1 rounded-full">{cartCount}</span>
                  )}
                </button>

                <button className="w-full p-4 bg-white/5 border border-white/10 rounded-[25px] flex items-center justify-between hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-3">
                    <RefreshCw size={20} className="text-yellow-400" />
                    <div className="text-left">
                      <p className="text-sm font-black">Returns & Support</p>
                      <p className="text-[9px] opacity-60">Style-GPT AI enabled</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="opacity-40 group-hover:opacity-100" />
                </button>
              </div>
            </div>

            {/* MIRROR MEMORY */}
            <div>
              <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
                <Camera size={20} className="text-purple-500" />
                Mirror Memory
              </h3>
              
              <div className="space-y-2">
                <div className="p-4 bg-white/5 border border-white/10 rounded-[25px]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-black">Your Looks</p>
                    <span className="text-xs opacity-60">{tryOnHistory.length} saved</span>
                  </div>
                  
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {tryOnHistory.slice(0, 5).map((look) => (
                      <div key={look.id} onClick={async () => {
                        toast.info('Opening saved look...');
                        try {
                          if (isSupabaseConfigured()) {
                            await supabase.from('try_on_revisits').insert({ user_id: userId, try_on_id: look.id, revisited_at: new Date().toISOString() });
                          }
                        } catch (e) { console.warn('try-on revisit log failed', e); }
                        onClose();
                      }} className="min-w-[100px] cursor-pointer bg-white/5 rounded-2xl p-2 border border-white/10">
                        <img src={look.image} className="w-full h-20 object-cover rounded-xl mb-2" />
                        <p className="text-[8px] font-bold truncate">{look.product_name}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star size={8} className="text-yellow-400 fill-yellow-400" />
                          <span className="text-[7px]">{look.rating}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button className="w-full p-4 bg-white/5 border border-white/10 rounded-[25px] flex items-center justify-between hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-3">
                    <Eye size={20} className="text-indigo-400" />
                    <div className="text-left">
                      <p className="text-sm font-black">Try-On History</p>
                      <p className="text-[9px] opacity-60">With AI feedback</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="opacity-40 group-hover:opacity-100" />
                </button>
              </div>
            </div>

            {/* BIO-SYNC */}
            <div>
              <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
                <Ruler size={20} className="text-green-500" />
                Bio-Sync
              </h3>

              <div className="space-y-2">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-[25px]">
                  <div className="flex items-center gap-3 mb-3">
                    <Ruler size={20} className="text-green-400" />
                    <div className="flex-grow">
                      <p className="text-sm font-black">My Dimensions</p>
                      <p className="text-[9px] opacity-60">{userProfile?.body_measurements ? 'Scanned & Synced' : 'Not scanned yet'}</p>
                    </div>
                    {userProfile?.body_measurements && <Check size={16} className="text-green-400" />}
                  </div>

                  {userProfile?.body_measurements && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-white/5 rounded-xl p-2 text-center">
                        <p className="text-[9px] opacity-60">Height</p>
                        <p className="text-sm font-black">{Math.round(userProfile.body_measurements.height)} cm</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2 text-center">
                        <p className="text-[9px] opacity-60">Size</p>
                        <p className="text-sm font-black">{userProfile.recommended_size || 'M'}</p>
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={async () => {
                  toast.info('Starting body scan...');
                  try {
                    if (isSupabaseConfigured() && userId) {
                      await supabase.from('body_scans').insert({ user_id: userId, started_at: new Date().toISOString() });
                    }
                  } catch (e) { console.warn('body scan request failed', e); }
                  try { window.dispatchEvent(new CustomEvent('bodyScanRequested', { detail: { userId } })); } catch (e) {}
                }} className="w-full p-4 bg-white/5 border border-white/10 rounded-[25px] flex items-center justify-between hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-3">
                    <Scan size={20} className="text-cyan-400" />
                    <div className="text-left">
                      <p className="text-sm font-black">Neural Body Mesh</p>
                      <p className="text-[9px] opacity-60">3D avatar sync</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="opacity-40 group-hover:opacity-100" />
                </button>

                <button onClick={handleToggleDroneOptIn} className="w-full p-4 bg-white/5 border border-white/10 rounded-[25px] flex items-center justify-between hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-3">
                    <Truck size={20} className="text-orange-400" />
                    <div className="text-left">
                      <p className="text-sm font-black">Drone Node Config</p>
                      <p className="text-[9px] opacity-60">Delivery permissions</p>
                    </div>
                  </div>
                  <button className="px-3 py-2 bg-white/5 rounded-md text-xs">{userProfile?.drone_opt_in ? 'Enabled' : 'Configure'}</button>
                </button>

              </div>
            </div>

            {/* VOICE & AI CONTROL */}
            <div>
              <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
                <Mic size={20} className="text-indigo-500" />
                Voice & AI Control
              </h3>
              
              <div className="space-y-2">
                <button onClick={handleStartVoiceFromProfile} className="w-full p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-[25px] flex items-center justify-between hover:bg-indigo-500/20 transition-all group">
                  <div className="flex items-center gap-3">
                    <Mic size={20} className="text-indigo-400" />
                    <div className="text-left">
                      <p className="text-sm font-black">Voice Commands</p>
                      <p className="text-[9px] opacity-60">Long press user icon</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="opacity-40 group-hover:opacity-100" />
                </button>

                <div className="p-4 bg-white/5 border border-white/10 rounded-[25px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Cpu size={20} className="text-purple-400" />
                      <div>
                        <p className="text-sm font-black">AI Intent Suggestions</p>
                        <p className="text-[9px] opacity-60">Smart recommendations</p>
                      </div>
                    </div>
                    <button onClick={handleToggleAssistant} className={`w-12 h-6 rounded-full relative ${assistantEnabled ? 'bg-green-500' : 'bg-white/5'}`}>
                      <span className={`absolute right-1 top-1 w-4 h-4 bg-white rounded-full ${assistantEnabled ? '' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CONTROL CENTER */}
            <div>
              <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
                <Settings size={20} className="text-slate-400" />
                Control Center
              </h3>
              
              <div className="space-y-2">
                <button onClick={handleToggleTheme} className="w-full p-4 bg-white/5 border border-white/10 rounded-[25px] flex items-center justify-between hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-3">
                    <Palette size={20} className="text-pink-400" />
                    <div className="text-left">
                      <p className="text-sm font-black">UI & Theme</p>
                      <p className="text-[9px] opacity-60">Dark / Neon / Glow modes</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="opacity-40 group-hover:opacity-100" />
                </button>

                <button onClick={handleToggleNotifications} className="w-full p-4 bg-white/5 border border-white/10 rounded-[25px] flex items-center justify-between hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-3">
                    <Bell size={20} className="text-yellow-400" />
                    <div className="text-left">
                      <p className="text-sm font-black">Notifications</p>
                      <p className="text-[9px] opacity-60">Orders, trends, rewards</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="opacity-40 group-hover:opacity-100" />
                </button>

                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-[25px] flex items-center gap-3">
                  <Shield size={20} className="text-green-400 animate-pulse" />
                  <div className="flex-grow">
                    <p className="text-sm font-black">Privacy Shield</p>
                    <p className="text-[9px] text-green-400">Protected 🟢 Encrypted</p>
                  </div>
                </div>
              </div>
            </div>

            {/* COMMUNITY & STATUS */}
            <div>
              <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
                <Trophy size={20} className="text-yellow-500" />
                Community & Status
              </h3>
              
              <div className="space-y-2">
                <div className="p-4 bg-white/5 border border-white/10 rounded-[25px]">
                  <p className="text-sm font-black mb-3">Achievements</p>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {achievements.map((ach) => (
                      <div 
                        key={ach.id}
                        className={`min-w-[80px] p-3 rounded-2xl text-center ${
                          ach.earned ? 'bg-yellow-500/20 border border-yellow-500/40' : 'bg-white/5 border border-white/10 opacity-40'
                        }`}
                      >
                        <div className="text-2xl mb-1">{ach.icon}</div>
                        <p className="text-[8px] font-bold">{ach.name}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button className="w-full p-4 bg-white/5 border border-white/10 rounded-[25px] flex items-center justify-between hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-3">
                    <BarChart3 size={20} className="text-cyan-400" />
                    <div className="text-left">
                      <p className="text-sm font-black">Glow Activity Stats</p>
                      <p className="text-[9px] opacity-60">Your usage insights</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="opacity-40 group-hover:opacity-100" />
                </button>

                <button onClick={handleReferNow} className="w-full p-4 bg-white/5 border border-white/10 rounded-[25px] flex items-center justify-between hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-3">
                    <Gift size={20} className="text-pink-400" />
                    <div className="text-left">
                      <p className="text-sm font-black">Refer & Earn</p>
                      <p className="text-[9px] opacity-60">Invite friends, get rewards</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="opacity-40 group-hover:opacity-100" />
                </button>

                <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-[25px]">
                  <div className="flex items-center gap-3">
                    <Target size={20} className="text-purple-400" />
                    <div>
                      <p className="text-sm font-black">Local Rank</p>
                      <p className="text-[9px] text-purple-400">Top 3% Glow Creator in Karamadai 🏆</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SUPPORT & LEGAL */}
            <div className="pb-8">
              <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2 opacity-40">
                Support & Legal
              </h3>
              
              <div className="space-y-2">
                <button onClick={() => window.open('https://support.mithas.glow', '_blank')} className="w-full p-4 bg-white/5 border border-white/10 rounded-[25px] flex items-center justify-between hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-3">
                    <HelpCircle size={20} className="text-blue-400" />
                    <p className="text-sm font-black">Help Centre</p>
                  </div>
                  <ChevronRight size={20} className="opacity-40 group-hover:opacity-100" />
                </button>

                <button onClick={handleOpenTerms} className="w-full p-4 bg-white/5 border border-white/10 rounded-[25px] flex items-center justify-between hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-slate-400" />
                    <p className="text-sm font-black">Terms & Privacy Policy</p>
                  </div>
                  <ChevronRight size={20} className="opacity-40 group-hover:opacity-100" />
                </button>

                <button 
                  onClick={handleLogout}
                  className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-[25px] flex items-center justify-center gap-3 hover:bg-red-500/20 transition-all group"
                >
                  <LogOut size={20} className="text-red-400" />
                  <p className="text-sm font-black text-red-400">Logout</p>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

export default UserProfileMenu;
