import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { glowGameEngine } from '../features/gamification/glowGameEngine';
import { 
  TrendingUp, 
  Award, 
  Target, 
  Zap, 
  Calendar, 
  Users, 
  Star, 
  ChevronRight,
  Flame,
  Trophy,
  Gem
} from 'lucide-react';

interface GlowStatsCardProps {
  userId?: string;
  journeyId?: string;
  compact?: boolean;
  showLeaderboard?: boolean;
  showAchievements?: boolean;
}

interface StatCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  progress?: number;
}

const GlowStatsCard: React.FC<GlowStatsCardProps> = ({
  userId,
  journeyId,
  compact = false,
  showLeaderboard = false,
  showAchievements = true
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadStats();
    }
  }, [userId, journeyId]);

  const loadStats = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // Load gamification profile
      const gamificationProfile = await glowGameEngine.getUserGamificationProfile(userId);
      setProfile(gamificationProfile);

      // Load insights
      const userInsights = await glowGameEngine.getUserInsights(userId);
      setInsights(userInsights);

      // Load leaderboard if requested
      if (showLeaderboard) {
        const leaderboardData = await glowGameEngine.getLeaderboard('xp', 5);
        setLeaderboard(leaderboardData);
      }

    } catch (err: any) {
      console.error('Error loading stats:', err);
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: number) => {
    if (level >= 10) return 'text-purple-600 bg-purple-100';
    if (level >= 7) return 'text-blue-600 bg-blue-100';
    if (level >= 5) return 'text-green-600 bg-green-100';
    if (level >= 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 14) return 'text-red-600 bg-red-100';
    if (streak >= 7) return 'text-orange-600 bg-orange-100';
    if (streak >= 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getStatCards = (): StatCard[] => {
    if (!profile || !insights) return [];

    const cards: StatCard[] = [
      {
        title: 'Current Level',
        value: profile.current_level,
        subtitle: `${insights.level.totalXp} total XP`,
        icon: <Trophy className="w-5 h-5" />,
        color: getLevelColor(profile.current_level),
        progress: insights.level.progress,
        trend: {
          value: insights.level.xpNeeded,
          direction: 'up'
        }
      },
      {
        title: 'Current Streak',
        value: profile.current_streak,
        subtitle: `${profile.longest_streak} longest`,
        icon: <Flame className="w-5 h-5" />,
        color: getStreakColor(profile.current_streak),
        trend: {
          value: profile.consistency_rate,
          direction: profile.consistency_rate >= 80 ? 'up' : 'neutral'
        }
      },
      {
        title: 'Glow Points',
        value: profile.glow_points,
        subtitle: `${profile.total_scans} scans`,
        icon: <Gem className="w-5 h-5" />,
        color: 'text-green-600 bg-green-100',
        trend: {
          value: profile.total_scans,
          direction: 'up'
        }
      },
      {
        title: 'Achievements',
        value: profile.achievements.length,
        subtitle: insights.achievements?.nextMilestone ? 
          `${insights.achievements.nextMilestone.progress?.toFixed(0)}% to ${insights.achievements.nextMilestone.name}` :
          'Keep going!',
        icon: <Award className="w-5 h-5" />,
        color: 'text-purple-600 bg-purple-100',
        trend: {
          value: profile.achievements.length,
          direction: 'up'
        }
      }
    ];

    return cards;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="text-center py-4">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-red-600">!</span>
          </div>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile || !insights) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="text-center py-4">
          <Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Complete scans to see your stats</p>
        </div>
      </div>
    );
  }

  const statCards = getStatCards();

  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-xl'}`}>
          Your Glow Stats
        </h3>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-purple-600">
            Level {profile.current_level}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'} gap-4 mb-6`}>
        {statCards.map((card, index) => (
          <div key={index} className="relative">
            <div className={`${card.color} rounded-lg p-3 ${compact ? 'p-2' : 'p-3'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`${card.color} rounded-full p-1`}>
                  {card.icon}
                </div>
                {card.trend && (
                  <div className={`flex items-center gap-1 text-xs ${
                    card.trend.direction === 'up' ? 'text-green-600' :
                    card.trend.direction === 'down' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    <TrendingUp className={`w-3 h-3 ${
                      card.trend.direction === 'down' ? 'rotate-180' : ''
                    }`} />
                    {card.trend.value}
                  </div>
                )}
              </div>
              
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {card.value}
              </div>
              
              <div className="text-xs text-gray-600">
                {card.title}
              </div>
              
              {card.subtitle && (
                <div className="text-xs text-gray-500 mt-1">
                  {card.subtitle}
                </div>
              )}

              {/* Progress Bar */}
              {card.progress !== undefined && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-purple-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${card.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Engagement Metrics */}
      {!compact && insights.engagement && (
        <div className="border-t border-gray-200 pt-4 mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">Engagement</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-600">
                {insights.engagement.avgScansPerWeek}
              </div>
              <div className="text-xs text-gray-500">Scans/Week</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {insights.engagement.totalScans}
              </div>
              <div className="text-xs text-gray-500">Total Scans</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">
                {insights.streak.consistencyRate}%
              </div>
              <div className="text-xs text-gray-500">Consistency</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Achievements */}
      {showAchievements && profile.achievements.length > 0 && (
        <div className="border-t border-gray-200 pt-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">Recent Achievements</h4>
            <button className="text-sm text-purple-600 hover:text-purple-700">
              View All
            </button>
          </div>
          <div className="space-y-2">
            {profile.achievements.slice(0, compact ? 2 : 3).map((achievement: any, index: number) => (
              <div key={achievement.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Award className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">
                    {achievement.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(achievement.earned_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-purple-600">
                  <Star className="w-3 h-3 fill-current" />
                  {achievement.glow_points_reward}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {showLeaderboard && leaderboard.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">Top Players</h4>
            <button className="text-sm text-purple-600 hover:text-purple-700">
              View Leaderboard
            </button>
          </div>
          <div className="space-y-2">
            {leaderboard.slice(0, 3).map((entry, index) => (
              <div key={entry.user_id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-yellow-400 text-white' :
                  index === 1 ? 'bg-gray-300 text-white' :
                  index === 2 ? 'bg-orange-400 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">
                    {entry.profiles?.display_name || 'Anonymous'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {entry.xp_earned} XP
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-purple-600">
                  <Trophy className="w-3 h-3" />
                  Level {Math.floor(entry.xp_earned / 100) + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Milestone */}
      {!compact && insights.achievements?.nextMilestone && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="font-semibold text-gray-900 mb-3">Next Milestone</h4>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium text-purple-900">
                  {insights.achievements.nextMilestone.name}
                </div>
                <div className="text-xs text-purple-700">
                  {insights.achievements.nextMilestone.type === 'streak' && 'Streak Challenge'}
                  {insights.achievements.nextMilestone.type === 'scans' && 'Scan Milestone'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-purple-900">
                  {insights.achievements.nextMilestone.progress?.toFixed(0)}%
                </div>
                <div className="text-xs text-purple-700">Complete</div>
              </div>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${insights.achievements.nextMilestone.progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      {!compact && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
            <Target className="w-4 h-4" />
            View Full Profile
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default GlowStatsCard;
