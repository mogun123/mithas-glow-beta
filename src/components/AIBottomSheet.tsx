import { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Camera, Mic, MessageCircle, ChevronUp } from 'lucide-react';

interface AIBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSkinScan: () => void;
  onVoice: () => void;
  onAIStylist: () => void;
}

export const AIBottomSheet = ({ 
  isOpen, 
  onClose, 
  onSkinScan, 
  onVoice, 
  onAIStylist 
}: AIBottomSheetProps) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);

  // Handle sheet animation
  useEffect(() => {
    if (!sheetRef.current) return;

    if (isOpen) {
      sheetRef.current.style.transform = 'translateY(0)';
    } else {
      sheetRef.current.style.transform = 'translateY(100%)';
    }
  }, [isOpen]);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStartY(clientY);
    setCurrentY(0);
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - dragStartY;
    setCurrentY(Math.max(0, deltaY));
    
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // Close if dragged more than 100px
    if (currentY > 100) {
      onClose();
    } else {
      // Reset position
      if (sheetRef.current) {
        sheetRef.current.style.transform = 'translateY(0)';
      }
    }
    setCurrentY(0);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out"
        style={{ 
          transform: 'translateY(100%)',
          maxHeight: '80vh',
        }}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
                <p className="text-sm text-gray-500">How can I help you today?</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Action Grid */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-3 gap-4">
            {/* Skin Scan */}
            <button
              onClick={onSkinScan}
              className="group flex flex-col items-center p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl hover:from-pink-100 hover:to-pink-200 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-800">Skin Scan</span>
              <span className="text-xs text-gray-500 mt-1">AI Analysis</span>
            </button>

            {/* Voice Search */}
            <button
              onClick={onVoice}
              className="group flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl hover:from-purple-100 hover:to-purple-200 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-800">Voice</span>
              <span className="text-xs text-gray-500 mt-1">Talk to AI</span>
            </button>

            {/* AI Stylist */}
            <button
              onClick={onAIStylist}
              className="group flex flex-col items-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl hover:from-indigo-100 hover:to-indigo-200 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-800">Stylist</span>
              <span className="text-xs text-gray-500 mt-1">Get Advice</span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 p-4 bg-gray-50 rounded-2xl">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-3 bg-white rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-between group">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                    <Camera className="w-4 h-4 text-pink-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Try Virtual Makeup</span>
                </div>
                <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </button>

              <button className="w-full text-left px-4 py-3 bg-white rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-between group">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Product Recommendations</span>
                </div>
                <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </button>

              <button className="w-full text-left px-4 py-3 bg-white rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-between group">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Beauty Tips & Tutorials</span>
                </div>
                <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
