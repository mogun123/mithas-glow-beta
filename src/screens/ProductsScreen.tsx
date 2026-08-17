import { useState, useEffect, useMemo } from "react";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { useAuthStore } from "../lib/store";
import { supabase } from "../lib/supabase";
import { useSkinToneMatching } from "../hooks/useSkinToneMatching";
import { Search, Filter, ExternalLink, Star, Heart } from "lucide-react";

type ProductsScreenProps = {
  onNavigateToMirror: () => void;
  onNavigateToProfile: () => void;
  onNavigateToEvents?: () => void;
  onNavigateHome?: () => void;
};

interface AffiliateProduct {
  id: string;
  product_name: string;
  brand: string;
  category: string;
  subcategory?: string;
  image_url: string;
  affiliate_url: string;
  merchant: string;
  price: number;
  original_price?: number;
  currency: string;
  rating?: number;
  review_count?: number;
  description?: string;
  ingredients?: string;
  skin_types?: string[];
  concerns?: string[];
  undertone?: 'warm' | 'cool' | 'neutral';
  shade_info?: string;
  is_active: boolean;
  created_at: string;
}

interface ProductMatch {
  productId: string;
  matchScore: number;
  matchReasons: string[];
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'skincare', label: 'Skincare' },
  { id: 'makeup', label: 'Makeup' },
  { id: 'hair', label: 'Hair' },
  { id: 'lip', label: 'Lip' },
  { id: 'face', label: 'Face' },
  { id: 'sunscreen', label: 'Sunscreen' },
  { id: 'serum', label: 'Serum' },
  { id: 'moisturizer', label: 'Moisturizer' },
];

const SCREEN_CSS = `
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in-up { animation: fade-in-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
.fade-in-up-d1 { animation-delay: 0.08s; }
.fade-in-up-d2 { animation-delay: 0.16s; }
.fade-in-up-d3 { animation-delay: 0.24s; }

@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
.skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 100%);
  background-size: 1000px 100%;
  animation: shimmer 1.5s infinite;
}
`;

export function ProductsScreen({ onNavigateToMirror, onNavigateToProfile, onNavigateHome }: ProductsScreenProps) {
  const [styleId, setStyleId] = useState<string>("");
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<AffiliateProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hasData, setHasData] = useState(false);

  const authStore = useAuthStore();
  const userId = authStore.user?.id || null;
  
  // Use existing skin tone matching hook
  const { skinProfile, hasProfile: hasSkinProfile } = useSkinToneMatching({ userId });

  useEffect(() => {
    const id = "products-screen-css";
    if (!document.getElementById(id)) {
      const styleEl = document.createElement("style");
      styleEl.id = id;
      styleEl.textContent = SCREEN_CSS;
      document.head.appendChild(styleEl);
      setStyleId(id);
    }
    return () => {
      const s = styleId && document.getElementById(styleId);
      if (s) s.remove();
    };
  }, [styleId]);

  // Fetch products from Supabase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Query products table - looking for affiliate product data
        const { data, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(50);

        if (fetchError) {
          throw fetchError;
        }

        if (data && data.length > 0) {
          // Map database products to AffiliateProduct interface
          const mappedProducts: AffiliateProduct[] = data.map((item: any) => ({
            id: item.id,
            product_name: item.name || 'Unknown Product',
            brand: item.attributes_json?.brand || 'Generic',
            category: item.category?.toLowerCase() || 'general',
            subcategory: item.subcategory,
            image_url: item.images?.[0] || '',
            affiliate_url: item.attributes_json?.affiliate_url || item.product_url || '#',
            merchant: item.attributes_json?.merchant || 'Unknown',
            price: Number(item.price) || 0,
            original_price: item.original_price ? Number(item.original_price) : undefined,
            currency: item.currency || 'INR',
            rating: item.attributes_json?.rating,
            review_count: item.attributes_json?.review_count,
            description: item.description,
            ingredients: item.attributes_json?.ingredients,
            skin_types: item.attributes_json?.skin_types,
            concerns: item.attributes_json?.concerns,
            undertone: item.attributes_json?.undertone,
            shade_info: item.attributes_json?.shade_info,
            is_active: item.status === 'active',
            created_at: item.created_at,
          }));

          setProducts(mappedProducts);
          setHasData(true);
        } else {
          setHasData(false);
          setProducts([]);
        }
      } catch (err: any) {
        console.error('Error fetching products:', err);
        setError(err.message || 'Failed to load products');
        setHasData(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter products based on category and search
  useEffect(() => {
    let result = [...products];

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(p => 
        p.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        p.subcategory?.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.product_name.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(result);
  }, [products, selectedCategory, searchQuery]);

  // Get personalized recommendations using skin profile
  const recommendedProducts = useMemo(() => {
    if (!hasSkinProfile || !skinProfile || filteredProducts.length === 0) {
      return [];
    }

    // Simple recommendation logic based on undertone match
    return filteredProducts
      .filter(p => p.undertone === skinProfile.undertone || !p.undertone)
      .slice(0, 6);
  }, [filteredProducts, hasSkinProfile, skinProfile]);

  const handleOpenProduct = (product: AffiliateProduct) => {
    // Open affiliate URL in new tab/window
    if (product.affiliate_url && product.affiliate_url !== '#') {
      window.open(product.affiliate_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{ position: "relative", zIndex: 1 }}>
        <div className="neural-bg" aria-hidden="true" />
        <div className="glass-header sticky top-0" style={{ zIndex: 30 }}>
          <Header onNavigateToProfile={onNavigateToProfile} />
        </div>

        <main className="flex-grow overflow-y-auto pb-32 px-5" style={{ WebkitOverflowScrolling: "touch", paddingTop: "80px" }}>
          <h1 className="text-2xl font-extrabold mb-4">Products</h1>
          
          {/* Skeleton loaders */}
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ borderRadius: '16px', height: '140px' }} />
            ))}
          </div>
        </main>

        <div className="glass-nav sticky bottom-0" style={{ zIndex: 30 }}>
          <BottomNav
            onNavigateHome={onNavigateHome}
            onNavigateToMirror={onNavigateToMirror}
            onNavigateToProfile={onNavigateToProfile}
          />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{ position: "relative", zIndex: 1 }}>
        <div className="neural-bg" aria-hidden="true" />
        <div className="glass-header sticky top-0" style={{ zIndex: 30 }}>
          <Header onNavigateToProfile={onNavigateToProfile} />
        </div>

        <main className="flex-grow overflow-y-auto pb-32 px-5 flex items-center justify-center" style={{ WebkitOverflowScrolling: "touch", paddingTop: "80px" }}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#1f2937' }}>Unable to Load Products</h2>
            <p className="text-sm mb-6" style={{ color: '#6b7280' }}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                color: 'white',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        </main>

        <div className="glass-nav sticky bottom-0" style={{ zIndex: 30 }}>
          <BottomNav
            onNavigateHome={onNavigateHome}
            onNavigateToMirror={onNavigateToMirror}
            onNavigateToProfile={onNavigateToProfile}
          />
        </div>
      </div>
    );
  }

  // No data state
  if (!hasData && !isLoading) {
    return (
      <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{ position: "relative", zIndex: 1 }}>
        <div className="neural-bg" aria-hidden="true" />
        <div className="glass-header sticky top-0" style={{ zIndex: 30 }}>
          <Header onNavigateToProfile={onNavigateToProfile} />
        </div>

        <main className="flex-grow overflow-y-auto pb-32 px-5" style={{ WebkitOverflowScrolling: "touch", paddingTop: "80px" }}>
          <div className="fade-in-up mb-8">
            <h1 className="text-2xl font-extrabold mb-2" style={{ 
              background: "linear-gradient(135deg,#a855f7,#ec4899)", 
              WebkitBackgroundClip: "text", 
              WebkitTextFillColor: "transparent",
              lineHeight: 1.1
            }}>
              Products
            </h1>
            <p className="text-sm font-medium" style={{ color: "#6b7280", marginTop: "4px" }}>
              AI Recommended Products
            </p>
          </div>

          <div style={{ 
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(168,85,247,0.18)",
            borderRadius: "28px",
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            boxShadow: "0 8px 32px rgba(168,85,247,0.1)"
          }}>
            <div style={{ 
              width: "96px", 
              height: "96px", 
              borderRadius: "24px",
              background: "linear-gradient(135deg, rgba(236,72,153,0.12), rgba(168,85,247,0.15))",
              border: "1px solid rgba(168,85,247,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "48px",
            }}>
              🧴
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2" style={{ color: "#1f2937" }}>
                Coming Soon
              </h2>
              <p className="text-sm max-w-xs mx-auto leading-relaxed" style={{ color: "#6b7280" }}>
                Affiliate product data source is not currently connected.
              </p>
              <p className="text-xs mt-2" style={{ color: "#9ca3af" }}>
                We're partnering with Nykaa, Amazon, and Flipkart to bring you personalized recommendations.
              </p>
            </div>
          </div>

          {!hasSkinProfile && (
            <div className="fade-in-up-d1 mt-6" style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: "20px",
              padding: "20px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>✨</div>
              <h3 className="text-base font-bold mb-2" style={{ color: "#059669" }}>
                Get Personalized Recommendations
              </h3>
              <p className="text-xs mb-4" style={{ color: "#6b7280" }}>
                Analyze your skin to discover products matched to your profile.
              </p>
              <button
                onClick={onNavigateToMirror}
                style={{
                  padding: "10px 20px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #10b981, #06b6d4)",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Analyze My Skin
              </button>
            </div>
          )}
        </main>

        <div className="glass-nav sticky bottom-0" style={{ zIndex: 30 }}>
          <BottomNav
            onNavigateHome={onNavigateHome}
            onNavigateToMirror={onNavigateToMirror}
            onNavigateToProfile={onNavigateToProfile}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{ position: "relative", zIndex: 1 }}>
      <div className="neural-bg" aria-hidden="true" />
      <div className="glass-header sticky top-0" style={{ zIndex: 30 }}>
        <Header onNavigateToProfile={onNavigateToProfile} />
      </div>

      <main className="flex-grow overflow-y-auto pb-32 px-5" style={{ WebkitOverflowScrolling: "touch", paddingTop: "80px" }}>
        <div className="fade-in-up mb-8">
          <h1 className="text-3xl font-extrabold mb-2" style={{ 
            background: "linear-gradient(135deg,#a855f7,#ec4899)", 
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent",
            lineHeight: 1.1
          }}>
            Products
          </h1>
          <p className="text-sm font-medium" style={{ color: "#6b7280", marginTop: "4px" }}>
            AI Recommended Products
          </p>
        </div>

        <div className="fade-in-up-d1" style={{ 
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(168,85,247,0.18)",
          borderRadius: "28px",
          padding: "64px 32px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
          boxShadow: "0 8px 32px rgba(168,85,247,0.1)"
        }}>
          <div style={{ 
            width: "120px", 
            height: "120px", 
            borderRadius: "32px",
            background: "linear-gradient(135deg, rgba(236,72,153,0.12), rgba(168,85,247,0.15))",
            border: "1px solid rgba(168,85,247,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "56px",
          }}>
            🧴
          </div>

          <div>
            <h2 className="text-2xl font-extrabold mb-3" style={{ color: "#1f2937" }}>
              Coming Soon
            </h2>
            <p className="text-sm max-w-xs mx-auto leading-relaxed" style={{ color: "#6b7280" }}>
              Your personal AI-curated product recommendations based on your skin profile are on the way.
            </p>
          </div>

          <div style={{ 
            width: "100%",
            maxWidth: "280px",
            padding: "10px 16px",
            borderRadius: "999px",
            background: "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(236,72,153,0.1))",
            border: "1px solid rgba(168,85,247,0.2)",
            color: "#a855f7",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.02em",
            textAlign: "center"
          }}>
            ✦ In Development
          </div>
        </div>

        <div className="fade-in-up-d2 mt-8 grid grid-cols-2 gap-3">
          {[
            { icon: "✨", label: "Serums", desc: "Soon" },
            { icon: "🌿", label: "Cleansers", desc: "Soon" },
            { icon: "☀️", label: "Sunscreens", desc: "Soon" },
            { icon: "💧", label: "Moisturizers", desc: "Soon" },
          ].map((category) => (
            <div key={category.label} style={{
              background: "rgba(255,255,255,0.7)",
              borderRadius: "18px",
              padding: "20px 14px",
              textAlign: "center",
              border: "1px solid rgba(148,163,184,0.15)",
              opacity: 0.6
            }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>{category.icon}</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#374151" }}>{category.label}</div>
              <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>{category.desc}</div>
            </div>
          ))}
        </div>
      </main>

      <div className="glass-nav sticky bottom-0" style={{ zIndex: 30 }}>
        <BottomNav
          onNavigateHome={onNavigateHome}
          onNavigateToMirror={onNavigateToMirror}
          onNavigateToProfile={onNavigateToProfile}
        />
      </div>
    </div>
  );
}
