/**
 * Rewards Store
 * 
 * Global state management for rewards system using Zustand
 * Handles glow points, streaks, levels, and progress
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RewardsData, LevelProgress } from '@/types/rewards.types';
import { RewardsService } from '@/services/rewardsService';

interface RewardsState {
  rewards: RewardsData | null;
  levelProgress: LevelProgress | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchRewards: (userId: string) => Promise<void>;
  updateAfterScan: (userId: string) => Promise<void>;
  refreshRewards: (userId: string) => Promise<void>;
  resetState: () => void;
}

export const useRewardsStore = create<RewardsState>()(
  persist(
    (set, get) => ({
      rewards: null,
      levelProgress: null,
      loading: false,
      error: null,
      
      /**
       * Fetch rewards data for a user
       */
      fetchRewards: async (userId: string) => {
        set({ loading: true, error: null });
        
        try {
          const rewards = await RewardsService.getUserRewards(userId);
          
          if (rewards) {
            const levelProgress = RewardsService.getLevelProgress(rewards.glow_points);
            
            set({
              rewards,
              levelProgress,
              loading: false,
              error: null
            });
          }
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to fetch rewards'
          });
        }
      },
      
      /**
       * Update rewards after a successful scan
       */
      updateAfterScan: async (userId: string) => {
        set({ loading: true, error: null });
        
        try {
          const rewards = await RewardsService.processSuccessfulScan(userId);
          const levelProgress = RewardsService.getLevelProgress(rewards.glow_points);
          
          set({
            rewards,
            levelProgress,
            loading: false,
            error: null
          });
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to update rewards after scan'
          });
        }
      },
      
      /**
       * Refresh rewards data from database
       */
      refreshRewards: async (userId: string) => {
        set({ loading: true, error: null });
        
        try {
          const rewards = await RewardsService.getUserRewards(userId);
          
          if (rewards) {
            const levelProgress = RewardsService.getLevelProgress(rewards.glow_points);
            
            set({
              rewards,
              levelProgress,
              loading: false,
              error: null
            });
          }
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || 'Failed to refresh rewards'
          });
        }
      },
      
      /**
       * Reset state (used on logout)
       */
      resetState: () => {
        set({
          rewards: null,
          levelProgress: null,
          loading: false,
          error: null
        });
      }
    }),
    {
      name: 'rewards-storage',
      partialize: (state) => ({ 
        rewards: state.rewards,
        levelProgress: state.levelProgress 
      })
    }
  )
);
