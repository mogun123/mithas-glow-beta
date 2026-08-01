/**
 * Rewards Service
 * 
 * Handles all rewards-related operations including:
 * - Glow points management
 * - Streak calculation and tracking
 * - Level progression
 * - Future reward redemptions
 */

import { supabase } from '@/lib/supabase';
import { RewardsData, GlowLevel, LevelProgress, RewardRedemption } from '@/types/rewards.types';
import { useAuthStore } from '@/lib/store';

// Glow level definitions
export const GLOW_LEVELS: GlowLevel[] = [
  {
    id: 'beginner',
    name: '🌱 Glow Beginner',
    minPoints: 0,
    maxPoints: 499,
    description: 'Starting your glow journey',
    icon: '🌱'
  },
  {
    id: 'silver',
    name: '✨ Glow Silver',
    minPoints: 500,
    maxPoints: 1999,
    description: 'Shining bright with consistency',
    icon: '✨'
  },
  {
    id: 'gold',
    name: '💎 Glow Gold',
    minPoints: 2000,
    maxPoints: 4999,
    description: 'Radiant excellence achieved',
    icon: '💎'
  },
  {
    id: 'platinum',
    name: '👑 Glow Platinum',
    minPoints: 5000,
    maxPoints: Infinity,
    description: 'Ultimate glow master status',
    icon: '👑'
  }
];

// Points awarded per successful scan
export const POINTS_PER_SCAN = 10;

export class RewardsService {
  /**
   * Get current user's rewards data from database
   */
  static async getUserRewards(userId: string): Promise<RewardsData | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('glow_points, current_streak, best_streak, last_scan_date')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user rewards:', error);
      throw error;
    }

    return data as RewardsData;
  }

  /**
   * Process a successful scan and update rewards
   * This is the core logic for streak calculation and points awarding
   */
  static async processSuccessfulScan(userId: string): Promise<RewardsData> {
    console.log('[RewardsService] Processing successful scan for user:', userId);
    
    // Get current rewards data with proper locking to prevent race conditions
    const currentData = await this.getUserRewards(userId);
    console.log('[RewardsService] Current rewards data:', currentData);
    
    if (!currentData) {
      throw new Error('User profile not found');
    }

    // Calculate dates for streak logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastScanDate = currentData.last_scan_date ? new Date(currentData.last_scan_date) : null;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    console.log('[RewardsService] Date comparison:', {
      today: today.toISOString(),
      yesterday: yesterday.toISOString(),
      lastScanDate: lastScanDate?.toISOString()
    });

    let newCurrentStreak = currentData.current_streak;
    let newBestStreak = currentData.best_streak;
    let shouldAwardPoints = true;

    // Streak Logic Implementation
    if (!lastScanDate) {
      // Case 4: First scan ever
      console.log('[RewardsService] Case 4: First scan ever');
      newCurrentStreak = 1;
    } else if (lastScanDate.getTime() === today.getTime()) {
      // Case 2: Already scanned today - don't award duplicate points or increment streak
      console.log('[RewardsService] Case 2: Already scanned today - no points awarded');
      shouldAwardPoints = false;
      // Keep current streak unchanged
    } else if (lastScanDate.getTime() === yesterday.getTime()) {
      // Case 1: Scanned yesterday, continuing streak
      console.log('[RewardsService] Case 1: Scanned yesterday - continuing streak');
      newCurrentStreak += 1;
    } else {
      // Case 3: Last scan was too long ago, reset streak to 1
      console.log('[RewardsService] Case 3: Last scan too long ago - resetting streak');
      newCurrentStreak = 1;
    }

    // Update best streak if current streak exceeds it
    if (newCurrentStreak > newBestStreak) {
      console.log('[RewardsService] Updating best streak from', newBestStreak, 'to', newCurrentStreak);
      newBestStreak = newCurrentStreak;
    }

    // Calculate new glow points
    const newGlowPoints = shouldAwardPoints 
      ? currentData.glow_points + POINTS_PER_SCAN 
      : currentData.glow_points;

    console.log('[RewardsService] Calculated new values:', {
      newGlowPoints,
      newCurrentStreak,
      newBestStreak,
      shouldAwardPoints
    });

    // Update the profile with new values atomically
    const { data, error } = await supabase
      .from('profiles')
      .update({
        glow_points: newGlowPoints,
        current_streak: newCurrentStreak,
        best_streak: newBestStreak,
        last_scan_date: today.toISOString().split('T')[0] // Format as YYYY-MM-DD
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[RewardsService] Error updating user rewards:', error);
      throw error;
    }

    console.log('[RewardsService] Rewards updated successfully:', data);
    
    // CRITICAL: Force refresh global auth store to sync Header and UI immediately
    const currentProfile = useAuthStore.getState().profile;
    if (currentProfile) {
      useAuthStore.getState().setUser({
        ...currentProfile,
        glow_points: newGlowPoints,
        current_streak: newCurrentStreak,
        best_streak: newBestStreak,
        last_scan_date: today.toISOString().split('T')[0]
      });
    }
    
    return data as RewardsData;
  }

  /**
   * Get the current glow level based on points
   */
  static getCurrentLevel(glowPoints: number): GlowLevel {
    return GLOW_LEVELS.find(
      level => glowPoints >= level.minPoints && 
              (level.maxPoints === Infinity || glowPoints <= level.maxPoints)
    ) || GLOW_LEVELS[0]; // Default to beginner if no match
  }

  /**
   * Get progress information including next level
   * Calculates dynamically based on current points
   */
  static getLevelProgress(glowPoints: number): LevelProgress {
    const currentLevel = this.getCurrentLevel(glowPoints);
    
    // Find the next level
    const currentIndex = GLOW_LEVELS.findIndex(level => level.id === currentLevel.id);
    const nextLevel = currentIndex < GLOW_LEVELS.length - 1 ? GLOW_LEVELS[currentIndex + 1] : undefined;
    
    let pointsToNextLevel: number | undefined;
    let progressPercentage: number;
    
    if (nextLevel) {
      pointsToNextLevel = nextLevel.minPoints - glowPoints;
      const range = nextLevel.minPoints - currentLevel.minPoints;
      const progressInCurrentRange = glowPoints - currentLevel.minPoints;
      progressPercentage = Math.min(100, Math.max(0, (progressInCurrentRange / range) * 100));
    } else {
      // For platinum level (or any level with infinity), we'll consider it at 100%
      progressPercentage = 100;
    }

    return {
      currentLevel,
      nextLevel,
      pointsToNextLevel,
      progressPercentage
    };
  }

  /**
   * Redeem points for a reward
   * Future-ready architecture for reward redemptions
   */
  static async redeemReward(
    userId: string, 
    rewardType: string, 
    pointsRequired: number,
    metadata?: Record<string, any>
  ): Promise<RewardRedemption> {
    // First verify user has enough points
    const rewards = await this.getUserRewards(userId);
    
    if (!rewards || rewards.glow_points < pointsRequired) {
      throw new Error('Insufficient glow points for this reward');
    }

    // Deduct points and create redemption record in a transaction
    const { data, error } = await supabase.rpc('redeem_reward', {
      p_user_id: userId,
      p_reward_type: rewardType,
      p_points_used: pointsRequired,
      p_metadata: metadata
    });

    if (error) {
      console.error('Error redeeming reward:', error);
      throw error;
    }

    return data as RewardRedemption;
  }

  /**
   * Get user's redemption history
   */
  static async getRedemptionHistory(userId: string): Promise<RewardRedemption[]> {
    const { data, error } = await supabase
      .from('reward_redemptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching redemption history:', error);
      throw error;
    }

    return data as RewardRedemption[];
  }
}
