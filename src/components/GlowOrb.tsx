import { useState, useEffect, useRef } from 'react';
import { Sparkles, Brain, Camera, MessageCircle } from 'lucide-react';

interface GlowOrbProps {
  onOpen: () => void;
}

export const GlowOrb = ({ onOpen }: GlowOrbProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState(0.5);
  const orbRef = useRef<HTMLDivElement>(null);

  // Pulsing animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseIntensity(prev => {
        const next = prev + 0.02;
        return next > 1 ? 0.3 : next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const handleOpen = () => {
    onOpen();
  };

  return (
    <div className="relative p-6">
      {/* Glow effect background */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-60"
        style={{
          background: `radial-gradient(circle, rgba(236, 72, 153, ${pulseIntensity * 0.8}) 0%, rgba(168, 85, 247, ${pulseIntensity * 0.6}) 50%, transparent 70%)`,
          transform: `scale(${1 + pulseIntensity * 0.2})`,
        }}
      />
      
      {/* Main orb button */}
      <button
        ref={orbRef}
        onClick={handleOpen}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        style={{
          boxShadow: isHovered 
            ? '0 0 40px rgba(236, 72, 153, 0.6), 0 0 80px rgba(168, 85, 247, 0.4)' 
            : '0 8px 32px rgba(236, 72, 153, 0.3), 0 0 16px rgba(168, 85, 247, 0.2)',
        }}
      >
        {/* Inner glow */}
        <div 
          className="absolute inset-1 rounded-full bg-white opacity-20"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8) 0%, transparent 60%)',
          }}
        />
        
        {/* Central icon */}
        <div className="relative w-full h-full flex items-center justify-center">
          <Brain 
            className="w-8 h-8 text-white relative z-10"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
            }}
          />
          
          {/* Floating sparkles */}
          <Sparkles 
            className="absolute w-4 h-4 text-white opacity-80 animate-pulse"
            style={{
              top: '-4px',
              right: '-4px',
              animation: 'float 3s ease-in-out infinite',
            }}
          />
        </div>
      </button>

      {/* Feature indicators that appear on hover */}
      {isHovered && (
        <div className="absolute bottom-full right-0 mb-4 space-y-2 animate-fade-in">
          <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg">
            <Camera className="w-4 h-4 text-pink-500" />
            <span className="text-xs font-medium text-gray-700">Skin Scan</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg">
            <MessageCircle className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-gray-700">AI Stylist</span>
          </div>
        </div>
      )}

      {/* CSS for custom animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(180deg); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};
