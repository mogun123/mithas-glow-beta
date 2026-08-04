import { useState, useEffect } from 'react';
import { X, Bell, Package, Star, Sparkles, ShoppingBag, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export interface Notification {
  id: string;
  type: 'order' | 'review' | 'vendor' | 'promo' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  icon?: 'package' | 'star' | 'sparkles' | 'bag' | 'clock' | 'check' | 'alert';
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

const getNotificationIcon = (icon?: string) => {
  switch (icon) {
    case 'package':
      return <Package className="w-5 h-5" />;
    case 'star':
      return <Star className="w-5 h-5" />;
    case 'sparkles':
      return <Sparkles className="w-5 h-5" />;
    case 'bag':
      return <ShoppingBag className="w-5 h-5" />;
    case 'clock':
      return <Clock className="w-5 h-5" />;
    case 'check':
      return <CheckCircle className="w-5 h-5" />;
    case 'alert':
      return <AlertCircle className="w-5 h-5" />;
    default:
      return <Bell className="w-5 h-5" />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'order':
      return 'bg-blue-100 text-blue-600';
    case 'review':
      return 'bg-yellow-100 text-yellow-600';
    case 'vendor':
      return 'bg-purple-100 text-purple-600';
    case 'promo':
      return 'bg-pink-100 text-pink-600';
    case 'system':
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

const formatTimestamp = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

export function NotificationCenter({ isOpen, onClose, onNotificationClick }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    // Initialize with mock notifications
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'order',
        title: 'Order Delivered!',
        message: 'Your Banarasi Silk Saree has been delivered',
        timestamp: new Date(Date.now() - 1800000), // 30 min ago
        read: false,
        icon: 'check',
        actionUrl: '/orders/ORD-001'
      },
      {
        id: '2',
        type: 'vendor',
        title: 'New Vendor Nearby',
        message: 'Meera\'s Boutique (0.5km) just joined MITHAS',
        timestamp: new Date(Date.now() - 7200000), // 2h ago
        read: false,
        icon: 'sparkles'
      },
      {
        id: '3',
        type: 'order',
        title: 'Order Out for Delivery',
        message: 'Your order #ORD-002 is on the way',
        timestamp: new Date(Date.now() - 10800000), // 3h ago
        read: true,
        icon: 'package'
      },
      {
        id: '4',
        type: 'review',
        title: 'Rate Your Purchase',
        message: 'How was your Velvet Matte Lipstick?',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        read: true,
        icon: 'star'
      },
      {
        id: '5',
        type: 'promo',
        title: 'Flash Sale Alert! 🔥',
        message: '50% off on selected makeup items today',
        timestamp: new Date(Date.now() - 172800000), // 2 days ago
        read: true,
        icon: 'sparkles'
      }
    ];
    setNotifications(mockNotifications);
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );
    
    if (onNotificationClick) {
      onNotificationClick(notification);
    } else {
      toast.success('Opening notification...');
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const clearAll = () => {
    setNotifications([]);
    toast.success('All notifications cleared');
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-purple-500 text-white p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-6 h-6" />
              <h2 className="text-xl">Notifications</h2>
              {unreadCount > 0 && (
                <span className="bg-white text-pink-600 text-xs px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-2 px-3 rounded-full transition-all text-sm ${
                filter === 'all'
                  ? 'bg-white text-pink-600'
                  : 'bg-white/20 text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 py-2 px-3 rounded-full transition-all text-sm ${
                filter === 'unread'
                  ? 'bg-white text-pink-600'
                  : 'bg-white/20 text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex gap-2 p-3 bg-gray-50 border-b">
            <button
              onClick={markAllAsRead}
              className="flex-1 py-2 px-3 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Mark all read
            </button>
            <button
              onClick={clearAll}
              className="flex-1 py-2 px-3 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="overflow-y-auto" style={{ height: 'calc(100% - 180px)' }}>
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-500 text-sm">
                {filter === 'unread'
                  ? "You're all caught up!"
                  : "We'll notify you when something new arrives"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getNotificationColor(
                        notification.type
                      )}`}
                    >
                      {getNotificationIcon(notification.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`text-sm ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="flex-shrink-0 w-2 h-2 bg-pink-500 rounded-full mt-1"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{notification.message}</p>
                      <p className="text-xs text-gray-400">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook to manage notifications
export function useNotifications() {
  const [hasUnread, setHasUnread] = useState(true);
  const [count, setCount] = useState(2);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };
    
    // In a real app, this would update a global state
    setCount(prev => prev + 1);
    setHasUnread(true);
    
    // Show toast
    toast.success(notification.title, {
      description: notification.message
    });
  };

  return {
    hasUnread,
    count,
    addNotification
  };
}
