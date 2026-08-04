import { supabase } from '../../lib/supabase';

export interface UserGamificationProfile {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  total_xp: number;
  current_level: number;
  glow_points: number;
  badges_earned: string[];
  last_scan_date?: string;
  total_scans: number;
  consistency_rate: number;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  badge_code: string;
  name: string;
  description: string;
  icon_url: string;
  earned_at: string;
  glow_points_reward: number;
  xp_reward: number;
}

export interface GamificationEvent {
  type: 'scan' | 'streak' | 'improvement' | 'milestone' | 'special';
  user_id: string;
  journey_id?: string;
  analysis_id?: string;
  xp_earned: number;
  glow_points_earned: number;
  badges_earned: string[];
  metadata: any;
}

export interface BadgeDefinition {
  badge_code: string;
  name: string;
  description: string;
  icon_url: string;
  category: 'streak' | 'improvement' | 'consistency' | 'milestone' | 'special';
  requirements: {
    type: string;
    value: number;
    condition?: string;
  };
  glow_points_reward: number;
  xp_reward: number;
  is_active: boolean;
}

class GlowGameEngine {
  private readonly XP_PER_SCAN = 10;
  private readonly XP_PER_STREAK_DAY = 20;
  private readonly XP_PER_IMPROVEMENT = 50;
  private readonly XP_PER_MILESTONE = 100;

  private readonly GLOW_POINTS_PER_SCAN = 5;
  private readonly GLOW_POINTS_PER_STREAK_DAY = 10;
  private readonly GLOW_POINTS_PER_IMPROVEMENT = 25;
  private readonly GLOW_POINTS_PER_MILESTONE = 50;

  private readonly LEVEL_XP_REQUIREMENTS = [
    0, 50, 150, 300, 500, 750, 1050, 1400, 1800, 2250, 2750, 3300, 3900, 4550, 5250
  ]; // Level 1-15

  /**
   * Process a new scan and update gamification metrics
   */
  async processScanEvent(userId: string, journeyId: string, analysisId: string): Promise<GamificationEvent> {
    try {
      // Get current user profile
      const profile = await this.getUserGamificationProfile(userId);
      
      // Calculate streak
      const streakData = await this.calculateStreak(userId, journeyId);
      
      // Calculate consistency
      const consistencyRate = await this.calculateConsistencyRate(userId, journeyId);
      
      // Check for improvements
      const improvementData = await this.checkForImprovements(userId, analysisId);
      
      // Calculate rewards
      let xpEarned = this.XP_PER_SCAN;
      let glowPointsEarned = this.GLOW_POINTS_PER_SCAN;
      const badgesEarned: string[] = [];

      // Add streak bonuses
      if (streakData.currentStreak > 0) {
        xpEarned += streakData.currentStreak * this.XP_PER_STREAK_DAY;
        glowPointsEarned += streakData.currentStreak * this.GLOW_POINTS_PER_STREAK_DAY;
      }

      // Add improvement bonuses
      if (improvementData.hasImprovement) {
        xpEarned += this.XP_PER_IMPROVEMENT;
        glowPointsEarned += this.GLOW_POINTS_PER_IMPROVEMENT;
      }

      // Check for badge eligibility
      const eligibleBadges = await this.checkBadgeEligibility(userId, {
        streakDays: streakData.currentStreak,
        totalScans: profile.total_scans + 1,
        consistencyRate,
        hasImprovement: improvementData.hasImprovement,
        currentLevel: profile.current_level
      });

      badgesEarned.push(...eligibleBadges.map(badge => badge.badge_code));

      // Add badge rewards
      for (const badge of eligibleBadges) {
        xpEarned += badge.xp_reward;
        glowPointsEarned += badge.glow_points_reward;
      }

      // Update user profile
      await this.updateUserGamificationProfile(userId, {
        total_scans: profile.total_scans + 1,
        current_streak: streakData.currentStreak,
        longest_streak: Math.max(profile.longest_streak, streakData.currentStreak),
        total_xp: profile.total_xp + xpEarned,
        glow_points: profile.glow_points + glowPointsEarned,
        consistency_rate: consistencyRate,
        last_scan_date: new Date().toISOString(),
        current_level: this.calculateLevel(profile.total_xp + xpEarned)
      });

      // Award badges
      if (badgesEarned.length > 0) {
        await this.awardBadges(userId, badgesEarned, journeyId);
      }

      // Calculate journey streak
      await supabase.rpc('calculate_journey_streak', { p_journey_id: journeyId });

      const event: GamificationEvent = {
        type: 'scan',
        user_id: userId,
        journey_id: journeyId,
        analysis_id: analysisId,
        xp_earned: xpEarned,
        glow_points_earned: glowPointsEarned,
        badges_earned: badgesEarned,
        metadata: {
          streak: streakData.currentStreak,
          consistency: consistencyRate,
          improvement: improvementData
        }
      };

      return event;
    } catch (error) {
      console.error('Error processing scan event:', error);
      throw new Error('Failed to process gamification event');
    }
  }

  /**
   * Calculate user's current streak
   */
  private async calculateStreak(userId: string, journeyId: string): Promise<{ currentStreak: number; streakHistory: Date[] }> {
    try {
      // Get scan dates for this journey
      const { data: analyses } = await supabase
        .from('face_analyses')
        .select('scan_timestamp')
        .eq('journey_id', journeyId)
        .order('scan_timestamp', { ascending: true });

      if (!analyses || analyses.length === 0) {
        return { currentStreak: 0, streakHistory: [] };
      }

      const scanDates = analyses.map(a => new Date(a.scan_timestamp).toDateString());
      const uniqueDates = [...new Set(scanDates)];
      
      let currentStreak = 0;
      const today = new Date().toDateString();
      
      // Check if there's a scan today or yesterday
      const hasToday = uniqueDates.includes(today);
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
      const hasYesterday = uniqueDates.includes(yesterday);
      
      if (!hasToday && !hasYesterday) {
        return { currentStreak: 0, streakHistory: uniqueDates.map(d => new Date(d)) };
      }

      // Calculate consecutive days
      let checkDate = hasToday ? new Date() : new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      while (uniqueDates.includes(checkDate.toDateString())) {
        currentStreak++;
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
      }

      return {
        currentStreak,
        streakHistory: uniqueDates.map(d => new Date(d))
      };
    } catch (error) {
      console.error('Error calculating streak:', error);
      return { currentStreak: 0, streakHistory: [] };
    }
  }

  /**
   * Calculate user's consistency rate
   */
  private async calculateConsistencyRate(userId: string, journeyId: string): Promise<number> {
    try {
      // Get journey start date
      const { data: journey } = await supabase
        .from('glow_journeys')
        .select('start_date')
        .eq('id', journeyId)
        .single();

      if (!journey) return 0;

      const startDate = new Date(journey.start_date);
      const today = new Date();
      const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Get total scans
      const { data: analyses } = await supabase
        .from('face_analyses')
        .select('scan_timestamp')
        .eq('journey_id', journeyId);

      const totalScans = analyses?.length || 0;
      
      // Consistency = scans / days since start (max 100%)
      const consistencyRate = Math.min(100, (totalScans / daysSinceStart) * 100);
      
      return Math.round(consistencyRate);
    } catch (error) {
      console.error('Error calculating consistency:', error);
      return 0;
    }
  }

  /**
   * Check for improvements in skin metrics
   */
  private async checkForImprovements(userId: string, analysisId: string): Promise<{ hasImprovement: boolean; improvements: any }> {
    try {
      // Get current analysis
      const { data: currentAnalysis } = await supabase
        .from('face_analyses')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (!currentAnalysis) return { hasImprovement: false, improvements: null };

      // Get previous analysis for comparison
      const { data: previousAnalysis } = await supabase
        .from('face_analyses')
        .select('*')
        .eq('user_id', userId)
        .eq('journey_id', currentAnalysis.journey_id)
        .neq('id', analysisId)
        .order('scan_timestamp', { ascending: false })
        .limit(1)
        .single();

      if (!previousAnalysis) return { hasImprovement: false, improvements: null };

      // Calculate improvements
      const skinScoreImprovement = currentAnalysis.overall_skin_health_score - previousAnalysis.overall_skin_health_score;
      const rednessImprovement = previousAnalysis.final_redness_score - currentAnalysis.final_redness_score;
      const textureImprovement = currentAnalysis.final_texture_score - previousAnalysis.final_texture_score;

      const hasImprovement = skinScoreImprovement > 2; // At least 2 points improvement

      return {
        hasImprovement,
        improvements: {
          skinScoreImprovement,
          rednessImprovement,
          textureImprovement
        }
      };
    } catch (error) {
      console.error('Error checking improvements:', error);
      return { hasImprovement: false, improvements: null };
    }
  }

  /**
   * Check badge eligibility
   */
  private async checkBadgeEligibility(userId: string, metrics: any): Promise<BadgeDefinition[]> {
    try {
      // Get all active badges
      const { data: badges } = await supabase
        .from('glow_badges')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!badges) return [];

      // Get user's existing badges
      const { data: userBadges } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId);

      const existingBadgeIds = userBadges?.map(ub => ub.badge_id) || [];
      const eligibleBadges: BadgeDefinition[] = [];

      for (const badge of badges) {
        // Skip if already earned
        if (existingBadgeIds.includes(badge.id)) continue;

        // Check requirements
        const isEligible = this.checkBadgeRequirements(badge.requirements, metrics);
        
        if (isEligible) {
          eligibleBadges.push(badge);
        }
      }

      return eligibleBadges;
    } catch (error) {
      console.error('Error checking badge eligibility:', error);
      return [];
    }
  }

  /**
   * Check if user meets badge requirements
   */
  private checkBadgeRequirements(requirements: any, metrics: any): boolean {
    const { type, value, condition } = requirements;

    switch (type) {
      case 'scan_count':
        return metrics.totalScans >= value;
      
      case 'streak_days':
        return metrics.streakDays >= value;
      
      case 'consistency_rate':
        return metrics.consistencyRate >= value;
      
      case 'improvement_score':
        return metrics.hasImprovement === true;
      
      case 'journey_complete':
        return metrics.totalScans >= value; // 30 scans for 30-day journey
      
      case 'level_reached':
        return metrics.currentLevel >= value;
      
      default:
        return false;
    }
  }

  /**
   * Award badges to user
   */
  private async awardBadges(userId: string, badgeCodes: string[], journeyId?: string): Promise<void> {
    try {
      // Get badge IDs from codes
      const { data: badges } = await supabase
        .from('glow_badges')
        .select('id')
        .in('badge_code', badgeCodes);

      if (!badges || badges.length === 0) return;

      // Insert user badges
      const userBadgeEntries = badges.map(badge => ({
        user_id: userId,
        badge_id: badge.id,
        journey_id: journeyId || null
      }));

      await supabase.from('user_badges').insert(userBadgeEntries);
    } catch (error) {
      console.error('Error awarding badges:', error);
    }
  }

  /**
   * Get user's gamification profile
   */
  async getUserGamificationProfile(userId: string): Promise<UserGamificationProfile> {
    try {
      // Get user's journey data
      const { data: journey } = await supabase
        .rpc('get_active_glow_journey', { p_user_id: userId });

      const currentStreak = journey?.[0]?.streak_days || 0;
      const longestStreak = journey?.[0]?.longest_streak || 0;
      const totalScans = journey?.[0]?.total_scans || 0;
      const glowPoints = journey?.[0]?.glow_points || 0;
      const xpEarned = journey?.[0]?.xp_earned || 0;

      // Get user's badges
      const { data: userBadges } = await supabase
        .from('user_badges')
        .select(`
          badge_id,
          earned_at,
          glow_badges (
            badge_code,
            name,
            description,
            icon_url,
            glow_points_reward,
            xp_reward
          )
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      const achievements: Achievement[] = (userBadges || []).map(ub => ({
        id: ub.badge_id,
        badge_code: ub.glow_badges.badge_code,
        name: ub.glow_badges.name,
        description: ub.glow_badges.description,
        icon_url: ub.glow_badges.icon_url,
        earned_at: ub.earned_at,
        glow_points_reward: ub.glow_badges.glow_points_reward,
        xp_reward: ub.glow_badges.xp_reward
      }));

      // Calculate consistency rate
      const consistencyRate = totalScans > 0 && journey?.[0]?.start_date ? 
        await this.calculateConsistencyRate(userId, journey[0].id) : 0;

      return {
        user_id: userId,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        total_xp: xpEarned,
        current_level: this.calculateLevel(xpEarned),
        glow_points: glowPoints,
        badges_earned: achievements.map(a => a.badge_code),
        total_scans: totalScans,
        consistency_rate: consistencyRate,
        achievements
      };
    } catch (error) {
      console.error('Error getting user gamification profile:', error);
      return {
        user_id: userId,
        current_streak: 0,
        longest_streak: 0,
        total_xp: 0,
        current_level: 1,
        glow_points: 0,
        badges_earned: [],
        total_scans: 0,
        consistency_rate: 0,
        achievements: []
      };
    }
  }

  /**
   * Calculate user level based on XP
   */
  private calculateLevel(totalXp: number): number {
    for (let level = this.LEVEL_XP_REQUIREMENTS.length - 1; level >= 0; level--) {
      if (totalXp >= this.LEVEL_XP_REQUIREMENTS[level]) {
        return level + 1;
      }
    }
    return 1;
  }

  /**
   * Get XP needed for next level
   */
  getXpForNextLevel(currentXp: number): { currentLevel: number; xpNeeded: number; progress: number } {
    const currentLevel = this.calculateLevel(currentXp);
    const nextLevelIndex = currentLevel; // 0-based index
    
    if (nextLevelIndex >= this.LEVEL_XP_REQUIREMENTS.length) {
      return { currentLevel, xpNeeded: 0, progress: 100 };
    }

    const currentLevelXp = this.LEVEL_XP_REQUIREMENTS[nextLevelIndex - 1] || 0;
    const nextLevelXp = this.LEVEL_XP_REQUIREMENTS[nextLevelIndex];
    const xpNeeded = nextLevelXp - currentXp;
    const progress = ((currentXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

    return { currentLevel, xpNeeded, progress: Math.round(progress) };
  }

  /**
   * Update user gamification profile
   */
  private async updateUserGamificationProfile(userId: string, updates: Partial<UserGamificationProfile>): Promise<void> {
    try {
      // Update journey with gamification data
      await supabase
        .from('glow_journeys')
        .update({
          streak_days: updates.current_streak,
          longest_streak: updates.longest_streak,
          total_scans: updates.total_scans,
          glow_points: updates.glow_points,
          xp_earned: updates.total_xp,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active');
    } catch (error) {
      console.error('Error updating user gamification profile:', error);
    }
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(type: 'xp' | 'streak' | 'points' = 'xp', limit = 10): Promise<any[]> {
    try {
      let query = supabase
        .from('glow_journeys')
        .select(`
          user_id,
          xp_earned,
          streak_days,
          glow_points,
          profiles (
            display_name,
            avatar_url
          )
        `)
        .eq('status', 'active')
        .order(type === 'xp' ? 'xp_earned' : type === 'streak' ? 'streak_days' : 'glow_points', { ascending: false })
        .limit(limit);

      const { data, error } = await query;
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  /**
   * Get available badges catalog
   */
  async getBadgesCatalog(): Promise<BadgeDefinition[]> {
    try {
      const { data, error } = await supabase
        .from('glow_badges')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error getting badges catalog:', error);
      return [];
    }
  }

  /**
   * Simulate daily streak reset check
   */
  async checkDailyStreakReset(): Promise<void> {
    try {
      // This would typically run as a scheduled job
      // For now, it's handled in the calculateStreak method
      
      console.log('Daily streak reset check completed');
    } catch (error) {
      console.error('Error in daily streak reset:', error);
    }
  }

  /**
   * Get gamification insights for user
   */
  async getUserInsights(userId: string): Promise<any> {
    try {
      const profile = await this.getUserGamificationProfile(userId);
      const { currentLevel, xpNeeded, progress } = this.getXpForNextLevel(profile.total_xp);
      
      // Get recent achievements
      const recentAchievements = profile.achievements.slice(0, 5);
      
      // Calculate engagement metrics
      const avgScansPerWeek = profile.total_scans > 0 ? 
        (profile.total_scans / Math.max(1, profile.consistency_rate / 100 * 4.3)) : 0;
      
      return {
        level: {
          current: currentLevel,
          xpNeeded,
          progress,
          totalXp: profile.total_xp
        },
        streak: {
          current: profile.current_streak,
          longest: profile.longest_streak,
          consistencyRate: profile.consistency_rate
        },
        engagement: {
          totalScans: profile.total_scans,
          avgScansPerWeek: Math.round(avgScansPerWeek * 10) / 10,
          glowPoints: profile.glow_points
        },
        achievements: {
          total: profile.achievements.length,
          recent: recentAchievements,
          nextMilestone: this.getNextMilestone(profile)
        }
      };
    } catch (error) {
      console.error('Error getting user insights:', error);
      return null;
    }
  }

  /**
   * Get next milestone for user
   */
  private getNextMilestone(profile: UserGamificationProfile): any {
    const milestones = [
      { type: 'streak', value: 7, name: '7 Day Streak' },
      { type: 'streak', value: 14, name: '14 Day Streak' },
      { type: 'streak', value: 30, name: '30 Day Champion' },
      { type: 'scans', value: 10, name: '10 Scans' },
      { type: 'scans', value: 25, name: '25 Scans' },
      { type: 'scans', value: 50, name: '50 Scans' }
    ];

    for (const milestone of milestones) {
      if (milestone.type === 'streak' && profile.current_streak < milestone.value) {
        return {
          ...milestone,
          progress: (profile.current_streak / milestone.value) * 100
        };
      }
      if (milestone.type === 'scans' && profile.total_scans < milestone.value) {
        return {
          ...milestone,
          progress: (profile.total_scans / milestone.value) * 100
        };
      }
    }

    return null;
  }
}

// Export singleton instance
export const glowGameEngine = new GlowGameEngine();
export default glowGameEngine;
