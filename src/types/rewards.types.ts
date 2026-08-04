/**
 * Rewards System Type Definitions
 * 
 * Types for the glow points, streak, and level system
 */

export interface RewardsData {
  glow_points: number;
  current_streak: number;
  best_streak: number;
  last_scan_date?: string | null;
}

export interface GlowLevel {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number;
  description: string;
  icon: string;
}

export interface LevelProgress {
  currentLevel: GlowLevel;
  nextLevel?: GlowLevel;
  pointsToNextLevel?: number;
  progressPercentage: number;
}

export interface RewardRedemption {
  id?: string;
  user_id: string;
  reward_type: string;
  points_used: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at?: string;
  redeemed_at?: string | null;
  metadata?: Record<string, any>;
}
