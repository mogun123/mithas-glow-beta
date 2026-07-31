import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../../lib/utils/index';

interface BeautyPledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommitToGlow: () => void;
  onSaveSummary: () => void;
  isProcessing?: boolean;
}

export const BeautyPledgeModal: React.FC<BeautyPledgeModalProps> = ({
  isOpen,
  onClose,
  onCommitToGlow,
  onSaveSummary,
  isProcessing = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-gradient-to-br from-purple-50 via-lavender-100 to-pink-50/90 backdrop-blur-3xl shadow-2xl rounded-[40px] border border-purple-100/30 p-8 transform transition-all duration-300 ease-out">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-gray-100/80 hover:bg-gray-200/80 transition-colors"
          disabled={isProcessing}
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-3xl font-bold text-[#1A1A1A] mb-2">
            Elevate Your Beauty Journey ✨
          </h2>
        </div>

        {/* Disclosure Content */}
        <div className="bg-gradient-to-br from-purple-100/60 via-lavender-50/40 to-pink-50/30 rounded-[24px] p-6 mb-8">
          <p className="text-[#1A1A1A] leading-relaxed text-sm mb-4">
            To craft your bespoke <strong>30-day radiance story</strong> and continuously refine our AI for your unique skin, we securely preserve your analysis reports and diagnostic images in our private database.
          </p>
          
          <div className="bg-white/60 rounded-[16px] p-4">
            <p className="text-[#1A1A1A] leading-relaxed text-sm font-medium">
              This allows us to track every micro-improvement and predict your skin's future glow.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={onCommitToGlow}
            disabled={isProcessing}
            className={cn(
              "w-full py-4 px-6 text-lg font-semibold rounded-[20px] transition-all duration-200",
              "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white",
              "shadow-lg hover:shadow-xl transform hover:scale-[1.02] animate-pulse",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:animate-none"
            )}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <Sparkles className="w-5 h-5" />
                <span>I Commit to My Glow</span>
              </div>
            )}
          </Button>

          <Button
            onClick={onSaveSummary}
            disabled={isProcessing}
            variant="outline"
            className={cn(
              "w-full py-4 px-6 text-lg font-semibold rounded-[20px] transition-all duration-200",
              "bg-gradient-to-r from-red-500 via-lavender-600 to-purple-600 hover:from-red-600 hover:via-lavender-700 hover:to-purple-700 text-white",
              "border-2 border-lavender-300 hover:border-lavender-400",
              "backdrop-blur-sm animate-pulse",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-none"
            )}
          >
            <div className="flex items-center justify-center space-x-2">
              <span>Just Save My Summary</span>
            </div>
          </Button>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Choose your preferred privacy level for your <strong>Radiance Story</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
