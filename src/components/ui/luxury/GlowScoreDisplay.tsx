// ═════════════════════════════════════════════════════════════════════════════
// ✨ GLOW SCORE DISPLAY - IONTYX Glow Mirror (LUXURY UI)
// ═════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../ui/utils';

export interface GlowScoreComponents {
  luminance: number;
  texture: number;
  symmetry: number;
  tone: number;
}

export interface GlowScoreResult {
  score: number;
  components: GlowScoreComponents;
}

interface GlowScoreDisplayProps {
  glowScore: GlowScoreResult;
  previousScore?: number;
  showComponents?: boolean;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export const GlowScoreDisplay: React.FC<GlowScoreDisplayProps> = ({
  glowScore,
  previousScore,
  showComponents = false,
  className,
  size = 'medium'
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [scoreChange, setScoreChange] = useState<'up' | 'down' | 'neutral'>('neutral');

  // Animate score number
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = (glowScore.score - animatedScore) / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const newScore = animatedScore + increment * currentStep;
      
      if (currentStep >= steps) {
        setAnimatedScore(glowScore.score);
        clearInterval(timer);
      } else {
        setAnimatedScore(newScore);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [glowScore.score]);

  // Determine score change direction
  useEffect(() => {
    if (previousScore !== undefined) {
      if (glowScore.score > previousScore) {
        setScoreChange('up');
      } else if (glowScore.score < previousScore) {
        setScoreChange('down');
      } else {
        setScoreChange('neutral');
      }
    }
  }, [glowScore.score, previousScore]);

  // Get score color and status
  const getScoreInfo = (score: number) => {
    if (score >= 80) {
      return { color: 'text-green-600', bgColor: 'bg-green-100', borderColor: 'border-green-300', status: 'Excellent' };
    } else if (score >= 60) {
      return { color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-300', status: 'Good' };
    } else if (score >= 40) {
      return { color: 'text-yellow-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-300', status: 'Fair' };
    } else {
      return { color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-300', status: 'Poor' };
    }
  };

  const scoreInfo = getScoreInfo(glowScore.score);

  // Size configurations
  const sizeConfig = {
    small: {
      container: 'w-32 h-32',
      circle: 'w-24 h-24',
      text: 'text-2xl',
      label: 'text-xs'
    },
    medium: {
      container: 'w-40 h-40',
      circle: 'w-32 h-32',
      text: 'text-3xl',
      label: 'text-sm'
    },
    large: {
      container: 'w-48 h-48',
      circle: 'w-40 h-40',
      text: 'text-4xl',
      label: 'text-base'
    }
  };

  const config = sizeConfig[size];

  // Calculate stroke dash for progress ring
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className={cn("relative", config.container, className)}>
      {/* Main Score Circle */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Background Circle */}
        <div className={cn(
          "absolute rounded-full border-2",
          scoreInfo.bgColor,
          scoreInfo.borderColor
        )} style={{ width: config.circle, height: config.circle }} />

        {/* Progress Ring */}
        <svg
          className="absolute inset-0 transform -rotate-90"
          viewBox="0 0 128 128"
          style={{ width: config.circle, height: config.circle }}
        >
          <defs>
            <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9333EA" />
              <stop offset="50%" stopColor="#C084FC" />
              <stop offset="100%" stopColor="#F472B6" />
            </linearGradient>
          </defs>
          
          {/* Background Ring */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200"
          />
          
          {/* Progress Ring */}
          <motion.circle
            cx="64"
            cy="64"
            r={radius}
            stroke="url(#glowGradient)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />
        </svg>

        {/* Score Content */}
        <div className="relative flex flex-col items-center justify-center">
          <div className="flex items-center gap-1">
            <Sparkles className={cn("w-4 h-4", scoreInfo.color)} />
            <span className={cn("font-bold", config.text, scoreInfo.color)}>
              {Math.round(animatedScore)}
            </span>
          </div>
          <span className={cn("font-medium", config.label, "text-gray-600")}>
            {scoreInfo.status}
          </span>
        </div>

        {/* Score Change Indicator */}
        <AnimatePresence>
          {scoreChange !== 'neutral' && previousScore !== undefined && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 0 }}
              animate={{ opacity: 1, scale: 1, y: -10 }}
              exit={{ opacity: 0, scale: 0.5, y: 0 }}
              className={cn(
                "absolute top-0 right-0 flex items-center gap-1 px-2 py-1 rounded-full",
                scoreChange === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              )}
            >
              {scoreChange === 'up' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span className="text-xs font-medium">
                {Math.abs(glowScore.score - previousScore)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Component Breakdown */}
      {showComponents && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 space-y-2"
        >
          <div className="text-center">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Score Components</h4>
          </div>
          
          {Object.entries(glowScore.components).map(([key, value]) => {
            const componentInfo = getScoreInfo(value);
            const componentWidth = value;
            
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600 capitalize w-20">
                  {key}
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", componentInfo.bgColor)}
                    initial={{ width: 0 }}
                    animate={{ width: `${componentWidth}%` }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  />
                </div>
                <span className={cn("text-xs font-medium w-8 text-right", componentInfo.color)}>
                  {value}
                </span>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default GlowScoreDisplay;
