import { useState, useEffect, useMemo } from "react";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { useAuthStore } from "../lib/store";
import { supabase } from "../lib/supabase";
import { useSkinToneMatching } from "../hooks/useSkinToneMatching";
import { Search, ExternalLink } from "lucide-react";

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
  skin_types?: string[];
  concerns?: string[];
  undertone?: 'warm' | 'cool' | 'neutral';
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'skincare', label: 'Skincare' },
  { id: 'makeup', label: 'Makeup' },
  { id: 'hair', label: 'Hair' },
  { id: 'face', label: 'Face' },
  { id: 'lip', label: 'Lip' },
  { id: 'serum', label: 'Serum' },
  { id: 'cleanser', label: 'Cleanser' },
  { id: 'moisturizer', label: 'Moisturizer' },
  { id: 'sunscreen', label: 'Sunscreen' },
];

const SCREEN_CSS = `
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.fade-in { animation: fade-in 0.4s ease-out; }

@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
.skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 100%);
  background-size: 1000px 100%;
  animation: shimmer 1.5s infinite;
}

.product-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.product-card:active {
  transform: scale(0.98);
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

        const { data, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(50);

        if (fetchError) throw fetchError;

        if (data && data.length > 0) {
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
            skin_types: item.attributes_json?.skin_types,
            concerns: item.attributes_json?.concerns,
            undertone: item.attributes_json?.undertone,
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

  // Filter products
  useEffect(() => {
    let result = [...products];

    if (selectedCategory !== 'all') {
      result = result.filter(p => 
        p.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        p.subcategory?.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

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

  // Get personalized recommendations
  const recommendedProducts = useMemo(() => {
    if (!hasSkinProfile || !skinProfile || filteredProducts.length === 0) return [];
    return filteredProducts
      .filter(p => p.undertone === skinProfile.undertone || !p.undertone)
      .slice(0, 6);
  }, [filteredProducts, hasSkinProfile, skinProfile]);

  const handleOpenProduct = (product: AffiliateProduct) => {
    if (product.affiliate_url && product.affiliate_url !== '#') {
      window.open(product.affiliate_url, '_blank', 'noopener,noreferrer');
    }
  };

  const getMerchantColor = (merchant: string) => {
    const m = merchant.toLowerCase();
    if (m.includes('nykaa')) return '#e11d48';
    if (m.includes('amazon')) return '#f59e0b';
    if (m.includes('flipkart')) return '#3b82f6';
    return '#6b7280';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{ position: "relative", zIndex: 1 }}>
        <div className="neural-bg" aria-hidden="true" />
        <div className="glass-header sticky top-0" style={{ zIndex: 30 }}>
          <Header onNavigateToProfile={onNavigateToProfile} />
        </div>

        <main className="flex-grow overflow-y-auto pb-24 px-4" style={{ WebkitOverflowScrolling: "touch", paddingTop: "60px" }}>
          <h1 className="text-xl font-bold mb-4" style={{ color: '#1f2937' }}>Products</h1>
          
          {/* Skeleton grid */}
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton" style={{ borderRadius: '12px', height: '180px' }} />
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

        <main className="flex-grow overflow-y-auto pb-24 px-4 flex items-center justify-center" style={{ WebkitOverflowScrolling: "touch", paddingTop: "60px" }}>
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
            <h2 className="text-base font-bold mb-2" style={{ color: '#1f2937' }}>Unable to Load Products</h2>
            <p className="text-xs mb-4" style={{ color: '#6b7280' }}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                color: 'white',
                fontSize: '13px',
                fontWeight: 600,
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

  // Empty state - compact and honest
  if (!hasData) {
    return (
      <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{ position: "relative", zIndex: 1 }}>
        <div className="neural-bg" aria-hidden="true" />
        <div className="glass-header sticky top-0" style={{ zIndex: 30 }}>
          <Header onNavigateToProfile={onNavigateToProfile} />
        </div>

        <main className="flex-grow overflow-y-auto pb-24 px-4" style={{ WebkitOverflowScrolling: "touch", paddingTop: "60px" }}>
          <div className="fade-in">
            <h1 className="text-lg font-bold mb-1" style={{ color: '#1f2937' }}>Products</h1>
            <p className="text-xs" style={{ color: '#6b7280' }}>Discover beauty products from trusted marketplaces</p>
          </div>

          {/* Category chips */}
          <div className="fade-in mt-4" style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                disabled
                style={{
                  flex: '0 0 auto',
                  padding: '8px 14px',
                  borderRadius: '99px',
                  background: 'rgba(168,85,247,0.08)',
                  border: '1px solid rgba(168,85,247,0.15)',
                  color: '#9ca3af',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'not-allowed'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Compact empty state */}
          <div className="fade-in mt-8" style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧴</div>
            <h2 className="text-base font-bold mb-2" style={{ color: '#1f2937' }}>No products yet</h2>
            <p className="text-xs" style={{ color: '#6b7280', maxWidth: '240px', margin: '0 auto' }}>
              The catalog is being prepared. Check back soon for personalized recommendations.
            </p>
          </div>

          {!hasSkinProfile && (
            <div className="fade-in mt-4" style={{
              background: "rgba(16,185,129,0.06)",
              border: "1px solid rgba(16,185,129,0.15)",
              borderRadius: "12px",
              padding: "16px",
              textAlign: "center"
            }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "#059669" }}>
                ✨ Get Personalized Picks
              </p>
              <p className="text-xs mb-3" style={{ color: "#6b7280" }}>
                Analyze your skin for product matches
              </p>
              <button
                onClick={onNavigateToMirror}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #10b981, #06b6d4)",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: 600,
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

      <main className="flex-grow overflow-y-auto pb-24 px-4" style={{ WebkitOverflowScrolling: "touch", paddingTop: "60px" }}>
        {/* Header */}
        <div className="fade-in">
          <h1 className="text-lg font-bold mb-1" style={{ color: '#1f2937' }}>Products</h1>
          <p className="text-xs" style={{ color: '#6b7280' }}>Discover beauty from trusted marketplaces</p>
        </div>

        {/* Search */}
        <div className="fade-in mt-4" style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search products, brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 40px',
              borderRadius: '10px',
              border: '1px solid rgba(148,163,184,0.2)',
              background: 'rgba(255,255,255,0.8)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          <Search style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '16px',
            height: '16px',
            color: '#9ca3af'
          }} />
        </div>

        {/* Category chips */}
        <div className="fade-in mt-4" style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                flex: '0 0 auto',
                padding: '8px 14px',
                borderRadius: '99px',
                background: selectedCategory === cat.id 
                  ? 'linear-gradient(135deg, #a855f7, #ec4899)' 
                  : 'rgba(168,85,247,0.08)',
                border: `1px solid ${selectedCategory === cat.id ? 'transparent' : 'rgba(168,85,247,0.15)'}`,
                color: selectedCategory === cat.id ? 'white' : '#6b7280',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Recommended section */}
        {hasSkinProfile && recommendedProducts.length > 0 && (
          <div className="fade-in mt-6">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h2 className="text-sm font-bold" style={{ color: '#1f2937' }}>✨ Recommended for You</h2>
              <span className="text-xs" style={{ color: '#6b7280' }}>Based on your skin profile</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {recommendedProducts.map((product) => (
                <div
                  key={product.id}
                  className="product-card"
                  onClick={() => handleOpenProduct(product)}
                  style={{
                    background: 'rgba(255,255,255,0.9)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid rgba(148,163,184,0.1)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ position: 'relative', paddingTop: '100%', background: '#f9fafb' }}>
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className="hidden" style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f3f4f6',
                      color: '#9ca3af',
                      fontSize: '10px'
                    }}>
                      Image unavailable
                    </div>
                  </div>
                  <div style={{ padding: '8px' }}>
                    <p className="text-xs font-semibold truncate" style={{ color: '#6b7280' }}>{product.brand}</p>
                    <p className="text-xs font-medium truncate" style={{ color: '#1f2937', marginTop: '2px' }}>{product.product_name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                      <span className="text-sm font-bold" style={{ color: '#1f2937' }}>₹{product.price}</span>
                      <span className="text-xs" style={{ color: getMerchantColor(product.merchant), fontWeight: 600 }}>
                        {product.merchant} →
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All products section */}
        <div className="fade-in mt-6">
          <h2 className="text-sm font-bold mb-3" style={{ color: '#1f2937' }}>
            {selectedCategory === 'all' ? 'All Products' : CATEGORIES.find(c => c.id === selectedCategory)?.label}
            <span className="text-xs font-normal" style={{ color: '#9ca3af', marginLeft: '6px' }}>({filteredProducts.length})</span>
          </h2>
          
          {filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', background: 'rgba(255,255,255,0.5)', borderRadius: '12px' }}>
              <p className="text-sm" style={{ color: '#6b7280' }}>No products found</p>
              <p className="text-xs" style={{ color: '#9ca3af', marginTop: '4px' }}>Try a different category or search</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="product-card"
                  onClick={() => handleOpenProduct(product)}
                  style={{
                    background: 'rgba(255,255,255,0.9)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid rgba(148,163,184,0.1)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ position: 'relative', paddingTop: '100%', background: '#f9fafb' }}>
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className="hidden" style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f3f4f6',
                      color: '#9ca3af',
                      fontSize: '10px'
                    }}>
                      Image unavailable
                    </div>
                  </div>
                  <div style={{ padding: '8px' }}>
                    <p className="text-xs font-semibold truncate" style={{ color: '#6b7280' }}>{product.brand}</p>
                    <p className="text-xs font-medium truncate" style={{ color: '#1f2937', marginTop: '2px' }}>{product.product_name}</p>
                    {product.rating && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                        <span className="text-xs" style={{ color: '#f59e0b' }}>★</span>
                        <span className="text-xs" style={{ color: '#6b7280' }}>{product.rating} {product.review_count ? `(${product.review_count})` : ''}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span className="text-sm font-bold" style={{ color: '#1f2937' }}>₹{product.price}</span>
                      <ExternalLink style={{ width: '12px', height: '12px', color: getMerchantColor(product.merchant) }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
