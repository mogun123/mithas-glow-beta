// ═════════════════════════════════════════════════════════════════════════════
// 🤖 AI SUGGESTION BUBBLE - IONTYX Glow Mirror (LUXURY UI)
// ═════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, Palette, Scissors } from 'lucide-react';
import { cn } from '../../ui/utils';

export interface AISuggestion {
  message: string;
  type: "tone" | "structure" | "texture";
  priority: "low" | "medium" | "high";
  actionable: boolean;
}

interface AISuggestionBubbleProps {
  suggestions: AISuggestion[];
  onDismiss?: () => void;
  autoDismiss?: boolean;
  dismissDelay?: number;
  className?: string;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

export const AISuggestionBubble: React.FC<AISuggestionBubbleProps> = ({
  suggestions,
  onDismiss,
  autoDismiss = true,
  dismissDelay = 3000,
  className,
  position = "top-right"
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const currentSuggestion = suggestions[currentIndex];

  // Auto-dismiss functionality
  useEffect(() => {
    if (!autoDismiss || !isVisible) return;

    const timer = setTimeout(() => {
      if (currentIndex < suggestions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setIsVisible(false);
        onDismiss?.();
      }
    }, dismissDelay);

    return () => clearTimeout(timer);
  }, [currentIndex, suggestions.length, autoDismiss, dismissDelay, isVisible, onDismiss]);

  // Manual dismiss
  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  // Get icon based on suggestion type
  const getSuggestionIcon = (type: AISuggestion['type']) => {
    switch (type) {
      case "tone":
        return <Palette className="w-4 h-4" />;
      case "structure":
        return <Scissors className="w-4 h-4" />;
      case "texture":
        return <Lightbulb className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  // Get color based on priority
  const getPriorityColors = (priority: AISuggestion['priority']) => {
    switch (priority) {
      case "high":
        return {
          bg: "bg-gradient-to-r from-red-500 to-pink-500",
          border: "border-red-300",
          text: "text-white",
          icon: "text-white"
        };
      case "medium":
        return {
          bg: "bg-gradient-to-r from-purple-500 to-indigo-500",
          border: "border-purple-300",
          text: "text-white",
          icon: "text-white"
        };
      case "low":
        return {
          bg: "bg-gradient-to-r from-blue-500 to-cyan-500",
          border: "border-blue-300",
          text: "text-white",
          icon: "text-white"
        };
      default:
        return {
          bg: "bg-gradient-to-r from-gray-500 to-gray-600",
          border: "border-gray-300",
          text: "text-white",
          icon: "text-white"
        };
    }
  };

  // Get position classes
  const getPositionClasses = (pos: typeof position) => {
    switch (pos) {
      case "top-right":
        return "top-4 right-4";
      case "top-left":
        return "top-4 left-4";
      case "bottom-right":
        return "bottom-4 right-4";
      case "bottom-left":
        return "bottom-4 left-4";
      default:
        return "top-4 right-4";
    }
  };

  const colors = getPriorityColors(currentSuggestion.priority);
  const positionClasses = getPositionClasses(position);

  if (!currentSuggestion || !isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ 
            duration: 0.3,
            ease: "easeOut"
          }}
          className={cn(
            "fixed z-50 max-w-sm",
            positionClasses,
            className
          )}
        >
          <div className={cn(
            "relative p-4 rounded-2xl shadow-2xl backdrop-blur-xl border",
            colors.bg,
            colors.border
          )}>
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg bg-white/20", colors.icon)}>
                  {getSuggestionIcon(currentSuggestion.type)}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className={cn("text-xs font-semibold uppercase tracking-wider", colors.text)}>
                      {currentSuggestion.type}
                    </span>
                    {currentSuggestion.actionable && (
                      <span className="px-1.5 py-0.5 bg-white/20 rounded-full">
                        <span className="text-[8px] font-medium text-white">Actionable</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleDismiss}
                className={cn("p-1 rounded-lg hover:bg-white/20 transition-colors", colors.icon)}
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Message */}
            <div className="mb-3">
              <p className={cn("text-sm font-medium leading-relaxed", colors.text)}>
                {currentSuggestion.message}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {suggestions.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all duration-200",
                      index === currentIndex
                        ? "bg-white w-4"
                        : "bg-white/30"
                    )}
                  />
                ))}
              </div>
              
              {autoDismiss && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-white/30 rounded-full animate-pulse" />
                  <span className="text-[10px] text-white/70">Auto-dismiss</span>
                </div>
              )}
            </div>

            {/* Glow Effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
            
            {/* Floating Animation */}
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AISuggestionBubble;
