import { useState } from 'react';
import { 
  Sparkles, 
  Camera, 
  Palette, 
  ShoppingBag, 
  Star, 
  Heart,
  Zap,
  Gift,
  Crown
} from 'lucide-react';

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  badge?: string;
  isNew?: boolean;
}

interface FeatureGridInlineProps {
  onFeatureSelect: (feature: string) => void;
  onSkinAnalysis: () => void;
  onShop: () => void;
}

export const FeatureGridInline = ({ 
  onFeatureSelect, 
  onSkinAnalysis, 
  onShop 
}: FeatureGridInlineProps) => {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  const features: Feature[] = [
    {
      id: 'skin-analysis',
      title: 'Skin Analysis',
      description: 'AI-powered skin scan',
      icon: <Sparkles className="w-5 h-5" />,
      color: 'text-purple-600',
      gradient: 'from-purple-500 to-pink-500',
      badge: 'AI',
      isNew: true,
    },
    {
      id: 'virtual-try-on',
      title: 'Virtual Try-On',
      description: 'Test makeup looks',
      icon: <Camera className="w-5 h-5" />,
      color: 'text-pink-600',
      gradient: 'from-pink-500 to-rose-500',
      badge: 'AR',
    },
    {
      id: 'color-matching',
      title: 'Color Matching',
      description: 'Find your perfect shade',
      icon: <Palette className="w-5 h-5" />,
      color: 'text-indigo-600',
      gradient: 'from-indigo-500 to-blue-500',
    },
    {
      id: 'personalized-shop',
      title: 'Personalized Shop',
      description: 'Curated for you',
      icon: <ShoppingBag className="w-5 h-5" />,
      color: 'text-green-600',
      gradient: 'from-green-500 to-emerald-500',
      badge: 'NEW',
    },
    {
      id: 'beauty-score',
      title: 'Beauty Score',
      description: 'Get your rating',
      icon: <Star className="w-5 h-5" />,
      color: 'text-yellow-600',
      gradient: 'from-yellow-500 to-orange-500',
    },
    {
      id: 'wishlist',
      title: 'Wishlist',
      description: 'Save favorites',
      icon: <Heart className="w-5 h-5" />,
      color: 'text-red-600',
      gradient: 'from-red-500 to-pink-500',
    },
    {
      id: 'flash-deals',
      title: 'Flash Deals',
      description: 'Limited offers',
      icon: <Zap className="w-5 h-5" />,
      color: 'text-orange-600',
      gradient: 'from-orange-500 to-red-500',
      badge: 'HOT',
      isNew: true,
    },
    {
      id: 'rewards',
      title: 'Rewards',
      description: 'Earn points',
      icon: <Gift className="w-5 h-5" />,
      color: 'text-purple-600',
      gradient: 'from-purple-500 to-indigo-500',
    },
    {
      id: 'premium',
      title: 'Premium',
      description: 'Unlock all features',
      icon: <Crown className="w-5 h-5" />,
      color: 'text-amber-600',
      gradient: 'from-amber-500 to-yellow-500',
      badge: 'PRO',
    },
  ];

  const handleFeatureClick = (featureId: string, title: string) => {
    switch (featureId) {
      case 'skin-analysis':
        onSkinAnalysis();
        break;
      case 'personalized-shop':
        onShop();
        break;
      default:
        onFeatureSelect(title);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Discover Features</h3>
          <p className="text-sm text-gray-500">AI-powered beauty tools</p>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-500">Live</span>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-3 gap-3">
        {features.map((feature) => (
          <button
            key={feature.id}
            onClick={() => handleFeatureClick(feature.id, feature.title)}
            onMouseEnter={() => setHoveredFeature(feature.id)}
            onMouseLeave={() => setHoveredFeature(null)}
            className="relative group p-3 rounded-xl bg-gray-50 hover:bg-white transition-all duration-200 hover:scale-105 active:scale-95 border border-gray-100 hover:border-gray-200 hover:shadow-lg"
          >
            {/* Badge */}
            {feature.badge && (
              <div 
                className={`absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold text-white rounded-full bg-gradient-to-r ${feature.gradient}`}
              >
                {feature.badge}
              </div>
            )}

            {/* New indicator */}
            {feature.isNew && (
              <div className="absolute -top-1 -left-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </div>
            )}

            {/* Icon */}
            <div className={`w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
              {feature.icon}
            </div>

            {/* Content */}
            <div className="text-center">
              <h4 className="text-sm font-semibold text-gray-900 mb-0.5">
                {feature.title}
              </h4>
              <p className="text-xs text-gray-500 line-clamp-1">
                {feature.description}
              </p>
            </div>

            {/* Hover effect overlay */}
            {hoveredFeature === feature.id && (
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border border-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <div className={`w-8 h-8 mx-auto mb-1 rounded-full bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white`}>
                    {feature.icon}
                  </div>
                  <p className="text-xs font-medium text-gray-700">Tap to explore</p>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            <span className="font-semibold">9 features</span> available
          </p>
          <button 
            onClick={() => onFeatureSelect('All Features')}
            className="text-xs font-medium text-purple-600 hover:text-purple-700 transition-colors"
          >
            View all →
          </button>
        </div>
      </div>

      {/* CSS for line clamp */}
      <style jsx>{`
        .line-clamp-1 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
        }
      `}</style>
    </div>
  );
};
