import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMyBookings, useCancelBooking } from '../../hooks/use-booking';
import type { Booking } from '../../hooks/use-booking';

interface MyBookingsScreenProps {
  userId: string;
  onNavigateToArtistProfile?: (artistId: string) => void;
  onBack?: () => void;
}

type TabType = 'upcoming' | 'completed' | 'cancelled';

export const MyBookingsScreen: React.FC<MyBookingsScreenProps> = ({ 
  userId,
  onNavigateToArtistProfile,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  
  const { bookings, loading, error } = useMyBookings(userId);
  const { cancelBooking, loading: cancelling } = useCancelBooking();

  // Filter bookings by status
  const filteredBookings = bookings?.filter((booking) => {
    if (activeTab === 'upcoming') {
      return ['pending', 'confirmed'].includes(booking.status);
    } else if (activeTab === 'completed') {
      return booking.status === 'completed';
    } else {
      return booking.status === 'cancelled';
    }
  }) || [];

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await cancelBooking(bookingId);
    } catch (error) {
      console.error('Failed to cancel booking:', error);
    }
  };

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'pending':
        return { bg: 'rgba(251, 191, 36, 0.1)', text: '#d97706', border: 'rgba(251, 191, 36, 0.2)' };
      case 'confirmed':
        return { bg: 'rgba(34, 197, 94, 0.1)', text: '#16a34a', border: 'rgba(34, 197, 94, 0.2)' };
      case 'completed':
        return { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.2)' };
      case 'cancelled':
        return { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.2)' };
      default:
        return { bg: 'rgba(107, 114, 128, 0.1)', text: '#6b7280', border: 'rgba(107, 114, 128, 0.2)' };
    }
  };

  const getStatusLabel = (status: Booking['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending Confirmation';
      case 'confirmed':
        return 'Confirmed';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const renderBookingCard = ({ item }: { item: Booking }) => {
    const statusColors = getStatusColor(item.status);
    const artistName = (item.artist as any)?.shop_name || (item.artist as any)?.full_name || 'Artist';
    const serviceName = item.service_name || item.service?.title || 'Service';
    
    return (
      <View style={styles.bookingCard}>
        {/* Header */}
        <View style={styles.bookingHeader}>
          <View style={styles.artistInfo}>
            <View style={styles.artistAvatar}>
              {(item.artist as any)?.avatar_url ? (
                <Text style={styles.avatarText}>
                  {artistName.charAt(0).toUpperCase()}
                </Text>
              ) : (
                <Ionicons name="person" size={20} color="#fff" />
              )}
            </View>
            <View>
              <Text style={styles.artistName}>{artistName}</Text>
              <Text style={styles.serviceName}>{serviceName}</Text>
            </View>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {new Date(item.booking_date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{item.booking_time}</Text>
          </View>
          
          {item.total_price && (
            <View style={styles.detailRow}>
              <Ionicons name="pricetag-outline" size={16} color="#666" />
              <Text style={styles.detailText}>₹{item.total_price.toLocaleString()}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Ionicons name="wallet-outline" size={16} color="#666" />
            <Text style={[styles.detailText, { 
              color: item.payment_status === 'paid' ? '#16a34a' : '#d97706',
              fontWeight: '600'
            }]}>
              {item.payment_status === 'paid' ? 'Paid' : 'Payment Pending'}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.bookingActions}>
          {onNavigateToArtistProfile && (
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => onNavigateToArtistProfile(item.artist_id)}
            >
              <Ionicons name="eye-outline" size={18} color="#D4AF37" />
              <Text style={styles.viewButtonText}>View Artist</Text>
            </TouchableOpacity>
          )}
          
          {item.status === 'pending' && (
            <TouchableOpacity
              style={[styles.cancelButton, cancelling && styles.cancelButtonDisabled]}
              onPress={() => handleCancelBooking(item.id)}
              disabled={cancelling}
            >
              <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          
          {item.status === 'completed' && (
            <TouchableOpacity style={styles.rebookButton}>
              <Ionicons name="refresh-outline" size={18} color="#D4AF37" />
              <Text style={styles.rebookButtonText}>Rebook</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="hourglass-outline" size={48} color="#D4AF37" />
        <Text style={styles.loadingText}>Loading your bookings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabs}>
            {(['upcoming', 'completed', 'cancelled'] as TabType[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.tabTextActive,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Bookings List */}
      {filteredBookings.length > 0 ? (
        <FlatList
          data={filteredBookings}
          renderItem={renderBookingCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons 
            name={
              activeTab === 'upcoming' 
                ? 'calendar-outline' 
                : activeTab === 'completed' 
                ? 'checkmark-done-circle-outline' 
                : 'close-circle-outline'
            } 
            size={64} 
            color="#ccc" 
          />
          <Text style={styles.emptyTitle}>
            {activeTab === 'upcoming'
              ? 'No upcoming bookings'
              : activeTab === 'completed'
              ? 'No completed bookings'
              : 'No cancelled bookings'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'upcoming'
              ? 'Book your first makeup artist now!'
              : activeTab === 'completed'
              ? 'Your completed bookings will appear here'
              : 'Your cancelled bookings will appear here'}
          </Text>
          {activeTab === 'upcoming' && (
            <LinearGradient
              colors={['#ec4899', '#a855f7']}
              style={styles.ctaButton}
            >
              <TouchableOpacity style={styles.ctaButtonInner}>
                <Text style={styles.ctaButtonText}>Browse Artists</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  tabActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#D4AF37',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  artistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  artistAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'linear-gradient(135deg, #ec4899, #a855f7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  artistName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  serviceName: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bookingDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    paddingTop: 12,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D4AF37',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  rebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  rebookButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D4AF37',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  ctaButton: {
    marginTop: 24,
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
