import React from 'react';

interface EventDashboardSkeletonProps {
  tab: 'overview' | 'scans' | 'insights' | 'journey' | 'achievements';
}

export const EventDashboardSkeleton: React.FC<EventDashboardSkeletonProps> = ({ tab }) => {
  const renderOverviewSkeleton = () => (
    <div className="space-y-6">
      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 rounded-xl p-4 animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>

      {/* Recent Activity Skeleton */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions Skeleton */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderScansSkeleton = () => (
    <div className="space-y-6">
      {/* Scan History Skeleton */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 bg-gray-200 rounded w-48"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Scan Details Skeleton */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderInsightsSkeleton = () => (
    <div className="space-y-6">
      {/* Actionable Insights Skeleton */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-blue-50 border border-blue-200 rounded-xl p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-blue-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-blue-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-blue-200 rounded w-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Before/After Skeleton */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="bg-gray-50 rounded-xl p-4 h-64 animate-pulse"></div>
      </div>

      {/* Consultation History Skeleton */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3 animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderJourneySkeleton = () => (
    <div className="space-y-6">
      {/* Journey Progress Skeleton */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
        <div className="h-6 bg-white/20 rounded w-40 mb-4"></div>
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <div className="h-3 bg-white/20 rounded w-16"></div>
            <div className="h-3 bg-white/20 rounded w-12"></div>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div className="bg-white rounded-full h-3 w-3/4 animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <div className="h-8 bg-white/20 rounded mx-auto mb-2 w-12"></div>
              <div className="h-3 bg-white/20 rounded w-16 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Journey Stats Skeleton */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAchievementsSkeleton = () => (
    <div className="space-y-6">
      {/* Achievements Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl p-4 text-center animate-pulse">
            <div className="h-12 bg-gray-400 rounded mx-auto mb-2 w-12"></div>
            <div className="h-4 bg-gray-400 rounded w-20 mx-auto"></div>
          </div>
        ))}
      </div>

      {/* Milestones Skeleton */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  switch (tab) {
    case 'overview':
      return renderOverviewSkeleton();
    case 'scans':
      return renderScansSkeleton();
    case 'insights':
      return renderInsightsSkeleton();
    case 'journey':
      return renderJourneySkeleton();
    case 'achievements':
      return renderAchievementsSkeleton();
    default:
      return renderOverviewSkeleton();
  }
};
