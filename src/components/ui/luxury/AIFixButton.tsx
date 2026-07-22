// ═════════════════════════════════════════════════════════════════════════════
// 🎯 AI FIX BUTTON - IONTYX Glow Mirror (LUXURY UI)
// ═════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '../../ui/utils';

interface AIFixButtonProps {
  onFix: () => Promise<void>;
  isProcessing?: boolean;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'glow';
  disabled?: boolean;
  children?: React.ReactNode;
}

export const AIFixButton: React.FC<AIFixButtonProps> = ({
  onFix,
  isProcessing = false,
  className,
  size = 'medium',
  variant = 'primary',
  disabled = false,
  children
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Size configurations
  const sizeConfig = {
    small: {
      padding: 'px-3 py-2',
      text: 'text-sm',
      icon: 'w-4 h-4',
      gap: 'gap-2'
    },
    medium: {
      padding: 'px-4 py-3',
      text: 'text-base',
      icon: 'w-5 h-5',
      gap: 'gap-2'
    },
    large: {
      padding: 'px-6 py-4',
      text: 'text-lg',
      icon: 'w-6 h-6',
      gap: 'gap-3'
    }
  };

  // Variant configurations
  const variantConfig = {
    primary: {
      bg: 'bg-gradient-to-r from-purple-600 to-pink-600',
      hover: 'hover:from-purple-700 hover:to-pink-700',
      text: 'text-white',
      shadow: 'shadow-lg shadow-purple-500/25',
      border: 'border-transparent'
    },
    secondary: {
      bg: 'bg-white/80 backdrop-blur-lg',
      hover: 'hover:bg-white/90',
      text: 'text-purple-600',
      shadow: 'shadow-lg shadow-purple-200/25',
      border: 'border-purple-200/50'
    },
    glow: {
      bg: 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500',
      hover: 'hover:from-purple-600 hover:via-pink-600 hover:to-purple-600',
      text: 'text-white',
      shadow: 'shadow-xl shadow-purple-500/40',
      border: 'border-transparent'
    }
  };

  const sizeStyle = sizeConfig[size];
  const variantStyle = variantConfig[variant];

  const handleClick = async () => {
    if (isProcessing || disabled) return;
    await onFix();
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={isProcessing || disabled}
      className={cn(
        "relative overflow-hidden rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center",
        sizeStyle.padding,
        sizeStyle.text,
        sizeStyle.gap,
        variantStyle.bg,
        variantStyle.hover,
        variantStyle.text,
        variantStyle.shadow,
        variantStyle.border,
        (isProcessing || disabled) && "opacity-50 cursor-not-allowed",
        className
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: isProcessing || disabled ? 1 : 1.02 }}
      whileTap={{ scale: isProcessing || disabled ? 1 : 0.98 }}
    >
      {/* Background Animation */}
      {variant === 'glow' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{ opacity: 0.3 }}
        />
      )}

      {/* Loading State */}
      {isProcessing ? (
        <>
          <Loader2 className={cn("animate-spin", sizeStyle.icon)} />
          <span>AI Processing...</span>
        </>
      ) : (
        <>
          {/* Sparkles Icon */}
          <motion.div
            animate={{
              rotate: isHovered ? 360 : 0,
              scale: isHovered ? 1.1 : 1,
            }}
            transition={{
              duration: 0.3,
              ease: "easeInOut"
            }}
          >
            <Sparkles className={sizeStyle.icon} />
          </motion.div>

          {/* Button Text */}
          {children || (
            <span>✨ Fix My Look</span>
          )}

          {/* Floating Particles */}
          {isHovered && !isProcessing && (
            <>
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full"
                  initial={{
                    opacity: 0,
                    scale: 0,
                    x: 0,
                    y: 0
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: [0, (i - 1) * 20],
                    y: [0, -20]
                  }}
                  transition={{
                    duration: 0.8,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                />
              ))}
            </>
          )}
        </>
      )}

      {/* Disabled Overlay */}
      {(isProcessing || disabled) && (
        <div className="absolute inset-0 bg-black/10 rounded-2xl" />
      )}

      {/* Glow Effect */}
      {variant === 'glow' && (
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400/20 to-pink-400/20 blur-xl"
          animate={{
            opacity: isHovered ? 1 : 0.5,
          }}
          transition={{
            duration: 0.3
          }}
        />
      )}
    </motion.button>
  );
};

export default AIFixButton;
