/**
 * Premium Skeleton Loading Components
 * Maintains luxury UI aesthetic while loading
 */

interface SkeletonProps {
  className?: string;
}

/**
 * Base skeleton pulse animation
 */
function SkeletonBase({ className = '' }: SkeletonProps): JSX.Element {
  return (
    <div 
      className={`animate-pulse bg-gradient-to-r from-purple-100 via-fuchsia-100 to-purple-100 rounded-lg ${className}`}
      style={{
        backgroundSize: '200% 100%',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  );
}

/**
 * Dashboard Overview Skeleton
 */
export function DashboardSkeleton(): JSX.Element {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Welcome Card */}
      <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-white shadow-sm">
        <div className="flex items-center gap-3">
          <SkeletonBase className="w-14 h-14 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBase className="h-5 w-32" />
            <SkeletonBase className="h-3 w-20" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 border border-white shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <SkeletonBase className="w-8 h-8 rounded-lg" />
              <SkeletonBase className="h-6 w-12" />
            </div>
            <SkeletonBase className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Bookings Section */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-purple-100/50 bg-white/40">
          <div className="flex items-center justify-between mb-4">
            <SkeletonBase className="h-6 w-24" />
            <SkeletonBase className="h-5 w-16 rounded-full" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonBase key={i} className="h-7 w-20 rounded-full flex-shrink-0" />
            ))}
          </div>
        </div>
        <div className="p-3 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/90 rounded-xl p-4 border border-white shadow-sm">
              <div className="flex items-start gap-3">
                <SkeletonBase className="w-12 h-12 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <SkeletonBase className="h-5 w-32" />
                    <SkeletonBase className="h-4 w-16 rounded-full" />
                  </div>
                  <SkeletonBase className="h-4 w-24" />
                  <div className="flex gap-2">
                    <SkeletonBase className="h-5 w-20 rounded" />
                    <SkeletonBase className="h-5 w-20 rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Booking List Skeleton
 */
export function BookingSkeleton(): JSX.Element {
  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonBase key={i} className="h-8 w-20 rounded-full flex-shrink-0" />
        ))}
      </div>

      {/* Booking Cards */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white/90 rounded-xl p-4 border border-white shadow-sm">
          <div className="flex items-start gap-3">
            <SkeletonBase className="w-12 h-12 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <SkeletonBase className="h-5 w-32" />
                <SkeletonBase className="h-4 w-16 rounded-full" />
              </div>
              <SkeletonBase className="h-4 w-24" />
              <div className="flex gap-2 flex-wrap">
                <SkeletonBase className="h-5 w-24 rounded" />
                <SkeletonBase className="h-5 w-24 rounded" />
                <SkeletonBase className="h-5 w-16 rounded" />
              </div>
              <div className="flex gap-2 pt-3 border-t border-purple-100/50">
                <SkeletonBase className="h-9 flex-1 rounded-lg" />
                <SkeletonBase className="h-9 flex-1 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Analytics Section Skeleton
 */
export function AnalyticsSkeleton(): JSX.Element {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <SkeletonBase className="h-8 w-40" />

      {/* Chart Placeholder */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-sm">
        <SkeletonBase className="h-48 w-full rounded-xl" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-white shadow-sm">
            <SkeletonBase className="h-4 w-20 mb-2" />
            <SkeletonBase className="h-8 w-24" />
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-white shadow-sm">
        <SkeletonBase className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonBase className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonBase className="h-4 w-32" />
                <SkeletonBase className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Availability Calendar Skeleton
 */
export function AvailabilitySkeleton(): JSX.Element {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonBase className="h-8 w-40" />
        <SkeletonBase className="h-10 w-32 rounded-full" />
      </div>

      {/* Calendar Grid */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-white shadow-sm">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <SkeletonBase key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
        {/* Date Cells */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <SkeletonBase key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Time Slots */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-white shadow-sm">
        <SkeletonBase className="h-6 w-28 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonBase className="h-4 w-16" />
              <SkeletonBase className="h-8 flex-1 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Profile Section Skeleton
 */
export function ProfileSkeleton(): JSX.Element {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Profile Header */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-sm text-center">
        <SkeletonBase className="w-24 h-24 rounded-full mx-auto mb-4" />
        <SkeletonBase className="h-6 w-48 mx-auto mb-2" />
        <SkeletonBase className="h-4 w-32 mx-auto" />
      </div>

      {/* Profile Form Fields */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-white shadow-sm">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i}>
              <SkeletonBase className="h-4 w-24 mb-2" />
              <SkeletonBase className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <SkeletonBase className="h-12 flex-1 rounded-full" />
        <SkeletonBase className="h-12 flex-1 rounded-full" />
      </div>
    </div>
  );
}

/**
 * AI Assistant Skeleton
 */
export function AISkeleton(): JSX.Element {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* AI Header */}
      <div className="bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 backdrop-blur-xl rounded-2xl p-4 border border-purple-100">
        <div className="flex items-center gap-3">
          <SkeletonBase className="w-12 h-12 rounded-full" />
          <div className="space-y-2">
            <SkeletonBase className="h-5 w-40" />
            <SkeletonBase className="h-3 w-28" />
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              i % 2 === 0 
                ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500' 
                : 'bg-white/70 backdrop-blur-xl border border-white'
            }`}>
              <SkeletonBase className={`h-4 ${i % 2 === 0 ? 'w-48' : 'w-64'}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-white shadow-sm">
        <SkeletonBase className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Generic Full Screen Loading Skeleton
 */
export function FullScreenSkeleton(): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F4F0FA] via-[#FDF2F8] to-[#F4F0FA] relative overflow-hidden">
      <div className="text-center bg-white/70 backdrop-blur-xl border border-white p-6 rounded-3xl shadow-lg">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-purple-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-slate-700 font-extrabold tracking-wide text-sm">Loading...</p>
      </div>
    </div>
  );
}

export default {
  DashboardSkeleton,
  BookingSkeleton,
  AnalyticsSkeleton,
  AvailabilitySkeleton,
  ProfileSkeleton,
  AISkeleton,
  FullScreenSkeleton,
};
