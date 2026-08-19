import { useState } from 'react';
import { Home } from 'lucide-react';
import { MirrorView } from './mirror/MirrorView';
import { DIYGuideView } from './mirror/DIYGuideView';
import { ReelCreatorView } from './mirror/ReelCreatorView';
import { ShopView } from './mirror/ShopView';
import { OptionsModal } from './mirror/OptionsModal';
import { ARTrialModal } from './mirror/ARTrialModal';
import { ChatModal } from './mirror/ChatModal';
import { CommunityModal } from './mirror/CommunityModal';
import { toast } from 'sonner@2.0.3';

export type Mode = 'Office/College' | 'Party Glam' | 'Bridal Full Set' | 'Professional Work';
export type MirrorViewType = 'home' | 'mirror' | 'diy' | 'reelCreator' | 'shop';
export type Language = 'en' | 'ta';
export type ShopCategory = 'Recommended' | 'Makeup' | 'Skincare' | 'Fashion' | 'Accessories';

export interface Look {
  name: string;
  desc: string;
  icon: string;
}

export interface Customizations {
  lipstick: string | null;
  eyeliner: string | null;
  blush: string | null;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  ar: boolean;
  image: string;
  bundle: boolean;
  seller: string;
  delivery: string;
}

interface MirrorScreenProps {
  onNavigateHome?: () => void;
}

export function MirrorScreen({ onNavigateHome }: MirrorScreenProps) {
  const [currentView, setCurrentView] = useState<MirrorViewType>('home');
  const [currentMode, setCurrentMode] = useState<Mode>('Office/College');
  const [currentLookIndex, setCurrentLookIndex] = useState(0);
  const [customizations, setCustomizations] = useState<Customizations>({
    lipstick: null,
    eyeliner: null,
    blush: null,
  });
  const [language, setLanguage] = useState<Language>('en');
  const [shopCategory, setShopCategory] = useState<ShopCategory>('Recommended');
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showARTrialModal, setShowARTrialModal] = useState(false);
  const [arTrialProduct, setARTrialProduct] = useState<Product | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showCommunityModal, setShowCommunityModal] = useState(false);

  const handleModeSelect = (mode: Mode) => {
    setCurrentMode(mode);
    setCurrentView('mirror');
    setCustomizations({ lipstick: null, eyeliner: null, blush: null });
    setCurrentLookIndex(0);
    toast.success(`Camera ON. AI analyzing your face for ${mode}!`);
  };

  const handleAction = (action: string) => {
    setShowOptionsModal(false);
    
    if (action === 'Select Look' || action === 'Buy Combo Kit') {
      setCurrentView('shop');
      setShopCategory('Recommended');
      toast.success('🛍️ Showing the full look bundle in the Glow Shop!');
    } else if (action === 'Start Reels Creator') {
      setCurrentView('reelCreator');
      toast.success('Entering the Before/After Reels Creator!');
    } else if (action === 'Do It Yourself') {
      setCurrentView('diy');
      setLanguage('en');
      toast.success('Generating step-by-step instructions...');
    } else if (action === 'Book Artist') {
      toast.success('Booking an artist...');
    }
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setCustomizations({ lipstick: null, eyeliner: null, blush: null });
  };

  const handleBackToMirror = () => {
    setCurrentView('mirror');
    toast.success('Returning to Live AR Mirror...');
  };

  const handleARTrial = (product: Product) => {
    setARTrialProduct(product);
    setShowARTrialModal(true);
    toast.success(`Quick AR Trial: Starting ${product.name}...`);
  };

  const handleCustomization = (type: keyof Customizations, value: string) => {
    setCustomizations(prev => ({ ...prev, [type]: value }));
    toast.success(`Customization Applied: ${value} ${type}!`);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-gradient-to-b from-[#EBD8FF] to-[#FFD6E8]">
      {/* Back to App Home Button */}
      {onNavigateHome && (
        <button
          onClick={onNavigateHome}
          className="fixed top-4 left-4 z-50 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow"
        >
          <Home className="w-5 h-5 text-purple-600" />
        </button>
      )}

      {/* Render Current View */}
      {currentView === 'home' && (
        <HomeSelectionView onModeSelect={handleModeSelect} onShowCommunity={() => setShowCommunityModal(true)} />
      )}
      
      {currentView === 'mirror' && (
        <MirrorView
          mode={currentMode}
          lookIndex={currentLookIndex}
          customizations={customizations}
          onChangeLook={setCurrentLookIndex}
          onBackToHome={handleBackToHome}
          onShowOptions={() => setShowOptionsModal(true)}
          onShowChat={() => setShowChatModal(true)}
          onAction={handleAction}
        />
      )}

      {currentView === 'diy' && (
        <DIYGuideView
          mode={currentMode}
          lookIndex={currentLookIndex}
          language={language}
          onBackToMirror={handleBackToMirror}
          onLanguageChange={setLanguage}
          onNavigateToShop={(category) => {
            setShopCategory(category);
            setCurrentView('shop');
          }}
        />
      )}

      {currentView === 'reelCreator' && (
        <ReelCreatorView
          mode={currentMode}
          lookIndex={currentLookIndex}
          onBackToMirror={handleBackToMirror}
        />
      )}

      {currentView === 'shop' && (
        <ShopView
          mode={currentMode}
          lookIndex={currentLookIndex}
          category={shopCategory}
          onBackToMirror={handleBackToMirror}
          onCategoryChange={setShopCategory}
          onARTrial={handleARTrial}
          onMicroSample={(product) => {
            toast.success(`🔍 Applying ${product.name} - Micro Sample Test`);
            handleBackToMirror();
          }}
        />
      )}

      {/* Modals */}
      <OptionsModal
        isOpen={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        onAction={handleAction}
      />

      <ARTrialModal
        isOpen={showARTrialModal}
        product={arTrialProduct}
        onClose={() => {
          setShowARTrialModal(false);
          setARTrialProduct(null);
        }}
      />

      <ChatModal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        onCustomization={handleCustomization}
        onNavigateToShop={(category) => {
          setShopCategory(category);
          setCurrentView('shop');
          setShowChatModal(false);
        }}
      />

      <CommunityModal
        isOpen={showCommunityModal}
        onClose={() => setShowCommunityModal(false)}
        onTryLook={(lookName) => {
          toast.success(`Trying on "${lookName}" look!`);
          setShowCommunityModal(false);
        }}
      />
    </div>
  );
}

// Home Selection View Component
interface HomeSelectionViewProps {
  onModeSelect: (mode: Mode) => void;
  onShowCommunity: () => void;
}

function HomeSelectionView({ onModeSelect, onShowCommunity }: HomeSelectionViewProps) {
  const modes: { name: Mode; icon: string; desc: string }[] = [
    { name: 'Office/College', icon: 'briefcase', desc: 'Natural everyday looks' },
    { name: 'Party Glam', icon: 'sparkles', desc: 'Bold evening styles' },
    { name: 'Bridal Full Set', icon: 'heart-handshake', desc: 'Complete bridal looks' },
    { name: 'Professional Work', icon: 'building', desc: 'Formal business styles' },
  ];

  return (
    <div className="flex flex-col w-full p-4 flex-grow">
      {/* Header */}
      <div className="flex items-center justify-between w-full mb-4">
        <div>
          <h1 className="text-3xl text-gray-800">✨ Glow Mirror</h1>
          <p className="text-gray-600 text-sm">Select your style mode</p>
        </div>
      </div>

      {/* Daily Glow Story Card */}
      <div
        onClick={() => onModeSelect('Party Glam')}
        className="w-full bg-purple-600 p-4 rounded-xl shadow-lg mb-4 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
      >
        <div className="flex items-center">
          <div className="p-3 bg-white rounded-full mr-3 border-2 border-purple-600 shadow-inner">
            <span className="text-2xl">🔥</span>
          </div>
          <div>
            <h2 className="text-lg text-white">🔥 Daily Glow Story</h2>
            <p className="text-xs text-purple-200">10-Second AI Glow Reel - Get Trending!</p>
          </div>
        </div>
      </div>

      {/* Local Community Feed Card */}
      <div
        onClick={onShowCommunity}
        className="w-full bg-yellow-500 p-4 rounded-xl shadow-lg mb-6 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
      >
        <div className="flex items-center">
          <div className="p-3 bg-white rounded-full mr-3 border-2 border-yellow-500 shadow-inner">
            <span className="text-2xl">📍</span>
          </div>
          <div>
            <h2 className="text-lg text-white">📍 Local Trending</h2>
            <p className="text-xs text-yellow-100">See the best Reels trending in your area!</p>
          </div>
        </div>
      </div>

      {/* Mode Selection Grid */}
      <h2 className="text-xl text-gray-800 mb-4">Select Your Mode</h2>
      <div className="grid grid-cols-2 gap-4">
        {modes.map((mode) => (
          <button
            key={mode.name}
            onClick={() => onModeSelect(mode.name)}
            className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all active:scale-95"
          >
            <span className="text-3xl mb-2">
              {mode.icon === 'briefcase' && '💼'}
              {mode.icon === 'sparkles' && '✨'}
              {mode.icon === 'heart-handshake' && '💒'}
              {mode.icon === 'building' && '🏢'}
            </span>
            <span className="text-sm text-gray-800 text-center">{mode.name}</span>
            <span className="text-xs text-gray-500 text-center mt-1">{mode.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}