/**
 * Rewards Dashboard Component
 * 
 * Displays user's glow journey including:
 * - Current and best streaks
 * - Glow points
 * - Current level
 * - Level progress
 * - Reward redemption CTA
 */

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRewardsStore } from '@/store/useRewardsStore';
import { motion } from 'framer-motion';

const RewardsDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { rewards, levelProgress, loading, error, fetchRewards, refreshRewards } = useRewardsStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchRewards(user.id);
    }
  }, [user?.id, fetchRewards]);

  const handleRefresh = async () => {
    if (user?.id) {
      setIsRefreshing(true);
      await refreshRewards(user.id);
      setIsRefreshing(false);
    }
  };

  const handleRedeemClick = () => {
    // Navigate to rewards page when implemented
    console.log("Navigate to rewards redemption page");
    // TODO: Implement navigation to rewards redemption page
  };

  if (loading && !rewards) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Your Glow Journey</h2>
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-50"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Current Streak Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-400 to-pink-500 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center">
            <div className="mr-4 text-3xl">🔥</div>
            <div>
              <p className="text-sm opacity-80">Current Streak</p>
              <p className="text-3xl font-bold">{rewards?.current_streak || 0} Days</p>
            </div>
          </div>
        </motion.div>

        {/* Best Streak Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center">
            <div className="mr-4 text-3xl">🏆</div>
            <div>
              <p className="text-sm opacity-80">Best Streak</p>
              <p className="text-3xl font-bold">{rewards?.best_streak || 0} Days</p>
            </div>
          </div>
        </motion.div>

        {/* Glow Points Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center">
            <div className="mr-4 text-3xl">⭐</div>
            <div>
              <p className="text-sm opacity-80">Glow Points</p>
              <p className="text-3xl font-bold">{rewards?.glow_points || 0} Points</p>
            </div>
          </div>
        </motion.div>

        {/* Current Level Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-blue-500 to-teal-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center">
            <div className="mr-4 text-3xl">👑</div>
            <div>
              <p className="text-sm opacity-80">Current Level</p>
              <p className="text-xl font-bold">{levelProgress?.currentLevel.name || '🌱 Glow Beginner'}</p>
            </div>
          </div>
        </motion.div>

        {/* Redeem Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center">
            <div className="mr-4 text-3xl">🎁</div>
            <div>
              <p className="text-sm opacity-80">Rewards</p>
              <p className="text-lg font-bold">Redeem Now</p>
            </div>
          </div>
          <button
            onClick={handleRedeemClick}
            className="mt-4 bg-white text-green-700 font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-all"
          >
            Claim
          </button>
        </motion.div>
      </div>

      {/* Level Progress Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl p-6 shadow-md border border-gray-200"
      >
        <h3 className="text-xl font-bold text-gray-800 mb-4">Level Progress</h3>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{levelProgress?.currentLevel.name}</span>
            <span>
              {rewards?.glow_points || 0} / {levelProgress?.pointsToNextLevel !== undefined ? 
                (rewards?.glow_points || 0) + (levelProgress.pointsToNextLevel || 0) : 
                '∞'} Points
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress?.progressPercentage || 0}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          
          <div className="flex justify-between text-sm text-gray-600 mt-2">
            <span>Progress: {Math.round(levelProgress?.progressPercentage || 0)}%</span>
            {levelProgress?.nextLevel && (
              <span>Next: {levelProgress.nextLevel.name} in {levelProgress.pointsToNextLevel} pts</span>
            )}
          </div>
        </div>
        
        {/* Level Descriptions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { id: 'beginner', name: 'Glow Beginner', points: '0-499', icon: '🌱' },
            { id: 'silver', name: 'Glow Silver', points: '500-1999', icon: '✨' },
            { id: 'gold', name: 'Glow Gold', points: '2000-4999', icon: '💎' },
            { id: 'platinum', name: 'Glow Platinum', points: '5000+', icon: '👑' }
          ].map((level) => (
            <div 
              key={level.id}
              className={`p-3 rounded-lg border ${
                levelProgress?.currentLevel.id === level.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center">
                <span className="text-xl mr-2">{level.icon}</span>
                <span className="font-medium">{level.name}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{level.points}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default RewardsDashboard;
