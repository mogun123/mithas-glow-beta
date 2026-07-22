// ═════════════════════════════════════════════════════════════════════════════
// 🎠 AR CAROUSEL - IONTYX Glow Mirror (LUXURY UI)
// ═════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '../../ui/utils';

export interface ARAsset {
  id: string;
  name: string;
  type: "outfit" | "hair" | "beard" | "accessory";
  thumbnail?: string;
  parameters?: any;
  isPerfectMatch?: boolean;
  culturalType?: string;
}

interface ARCarouselProps {
  assets: ARAsset[];
  onAssetSelect: (asset: ARAsset) => void;
  selectedAsset?: ARAsset;
  className?: string;
  showAIIndicator?: boolean;
}

export const ARCarousel: React.FC<ARCarouselProps> = ({
  assets,
  onAssetSelect,
  selectedAsset,
  className,
  showAIIndicator = true
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to AI Perfect Match (index 0) on mount
  useEffect(() => {
    if (assets.length > 0 && assets[0]?.isPerfectMatch) {
      setCurrentIndex(0);
    }
  }, [assets]);

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setDragStartX(clientX);
    setDragOffset(0);
  };

  // Handle drag move
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - dragStartX;
    setDragOffset(deltaX);
  };

  // Handle drag end
  const handleDragEnd = () => {
    if (!isDragging) return;
    
    const threshold = 50;
    const itemWidth = 120; // Approximate item width including gap
    
    if (Math.abs(dragOffset) > threshold) {
      const direction = dragOffset > 0 ? -1 : 1;
      const newIndex = Math.max(0, Math.min(assets.length - 1, currentIndex + direction));
      setCurrentIndex(newIndex);
    }
    
    setIsDragging(false);
    setDragOffset(0);
  };

  // Navigate to specific index
  const navigateToIndex = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(assets.length - 1, index)));
  };

  // Previous/Next navigation
  const previous = () => navigateToIndex(currentIndex - 1);
  const next = () => navigateToIndex(currentIndex + 1);

  // Calculate carousel position
  const getCarouselTransform = () => {
    const itemWidth = 120;
    const basePosition = -currentIndex * itemWidth;
    const dragPosition = isDragging ? dragOffset : 0;
    return `translateX(${basePosition + dragPosition}px)`;
  };

  return (
    <div className={cn("relative", className)}>
      {/* Carousel Container */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-50/80 via-lavender-50/80 to-purple-100/80 backdrop-blur-xl border border-purple-200/50 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-200/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-semibold text-purple-900">AI Styling Options</h3>
          </div>
          
          {showAIIndicator && assets[0]?.isPerfectMatch && (
            <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full">
              <Sparkles className="w-3 h-3 text-white" />
              <span className="text-[10px] font-medium text-white">AI Perfect</span>
            </div>
          )}
        </div>

        {/* Carousel Track */}
        <div 
          ref={carouselRef}
          className="relative px-4 py-3 cursor-grab active:cursor-grabbing"
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div 
            className="flex gap-3 transition-transform duration-300 ease-out"
            style={{ transform: getCarouselTransform() }}
          >
            {assets.map((asset, index) => (
              <motion.div
                key={asset.id}
                className="flex-shrink-0 w-28"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  scale: selectedAsset?.id === asset.id ? 1.05 : 1 
                }}
                transition={{ 
                  duration: 0.3,
                  delay: index * 0.05
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <button
                  onClick={() => onAssetSelect(asset)}
                  className={cn(
                    "relative w-full h-32 rounded-2xl border-2 transition-all duration-300 overflow-hidden group",
                    selectedAsset?.id === asset.id
                      ? "border-purple-500 bg-gradient-to-br from-purple-100 to-pink-100 shadow-lg shadow-purple-500/25"
                      : "border-purple-200/50 bg-white/70 hover:border-purple-300 hover:shadow-md"
                  )}
                >
                  {/* AI Perfect Match Badge */}
                  {asset.isPerfectMatch && (
                    <div className="absolute top-2 right-2 z-10">
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-lg">
                        <Sparkles className="w-2 h-2 text-white" />
                        <span className="text-[8px] font-medium text-white">AI</span>
                      </div>
                    </div>
                  )}

                  {/* Asset Content */}
                  <div className="flex flex-col items-center justify-center h-full p-3">
                    {/* Thumbnail or Icon */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      {asset.thumbnail ? (
                        <img 
                          src={asset.thumbnail} 
                          alt={asset.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <div className="text-2xl">
                          {asset.type === "outfit" && "👔"}
                          {asset.type === "hair" && "💇"}
                          {asset.type === "beard" && "🧔"}
                          {asset.type === "accessory" && "💎"}
                        </div>
                      )}
                    </div>

                    {/* Asset Name */}
                    <div className="text-center">
                      <p className="text-[10px] font-medium text-purple-900 line-clamp-2 leading-tight">
                        {asset.name}
                      </p>
                      {asset.culturalType && (
                        <p className="text-[8px] text-purple-600 mt-0.5 capitalize">
                          {asset.culturalType}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Navigation Controls */}
        {assets.length > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-purple-200/30">
            <button
              onClick={previous}
              disabled={currentIndex === 0}
              className={cn(
                "p-2 rounded-full transition-all duration-200",
                currentIndex === 0
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white/80 text-purple-600 hover:bg-purple-100 hover:shadow-md"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dots Indicator */}
            <div className="flex items-center gap-1.5">
              {assets.map((_, index) => (
                <button
                  key={index}
                  onClick={() => navigateToIndex(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-200",
                    index === currentIndex
                      ? "bg-purple-600 w-6"
                      : "bg-purple-300/50 hover:bg-purple-400"
                  )}
                />
              ))}
            </div>

            <button
              onClick={next}
              disabled={currentIndex === assets.length - 1}
              className={cn(
                "p-2 rounded-full transition-all duration-200",
                currentIndex === assets.length - 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white/80 text-purple-600 hover:bg-purple-100 hover:shadow-md"
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Selection Indicator */}
      <AnimatePresence>
        {selectedAsset && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-lg">
              <p className="text-xs font-medium">
                Selected: {selectedAsset.name}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ARCarousel;
