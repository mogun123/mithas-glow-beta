--- src/components/common/NotificationCenter.tsx (原始)


+++ src/components/common/NotificationCenter.tsx (修改后)
/**
 * Notification Center Types and Components
 * Future-ready architecture for notifications
 */

import { Bell } from 'lucide-react';

export type NotificationType = 'booking' | 'review' | 'system' | 'payment' | 'reminder';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationCenterState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
}

interface NotificationBellProps {
  unreadCount?: number;
  onClick?: () => void;
  className?: string;
}

/**
 * Notification Bell Component with Unread Badge
 * Premium design with smooth animations
 */
export function NotificationBell({
  unreadCount = 0,
  onClick,
  className = ''
}: NotificationBellProps): JSX.Element {
  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className={`relative w-10 h-10 rounded-full bg-white/80 backdrop-blur-xl border border-purple-200 shadow-sm flex items-center justify-center overflow-hidden transition-all duration-300 hover:scale-110 hover:shadow-lg hover:border-purple-300 ${className}`}
      aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="w-5 h-5 text-purple-600 transition-colors" />

      {/* Unread Badge */}
      {hasUnread && (
        <>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-rose-500 to-fuchsia-500 rounded-full text-[9px] font-black text-white flex items-center justify-center shadow-lg animate-in zoom-in duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
          {/* Pulse Animation for urgent notifications */}
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500/30 rounded-full animate-ping" />
        </>
      )}
    </button>
  );
}

/**
 * Empty hook for future notification fetching
 * Ready for Supabase integration
 */
export function useNotificationCenter() {
  // TODO: Implement Supabase realtime subscription for notifications
  // TODO: Fetch notifications from database
  // TODO: Mark as read functionality
  // TODO: Delete notification functionality

  return {
    notifications: [] as Notification[],
    unreadCount: 0,
    isLoading: false,
    markAsRead: async (_notificationId: string) => {},
    deleteNotification: async (_notificationId: string) => {},
    markAllAsRead: async () => {},
  };
}

export default {
  NotificationBell,
  useNotificationCenter,
};
