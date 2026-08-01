import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useArtistProfile, useAvailableSlots, useCreateBooking } from '../../hooks/use-booking';
import { ServiceCard } from './ServiceCard';
import { TimeSlotGrid } from './TimeSlotGrid';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ArtistProfileScreenProps {
  artistId: string;
  onBack: () => void;
  onBookingComplete?: (bookingId: string) => void;
}

export const ArtistProfileScreen: React.FC<ArtistProfileScreenProps> = ({ 
  artistId, 
  onBack,
  onBookingComplete 
}) => {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showBookingFlow, setShowBookingFlow] = useState(false);

  const { artist, services, loading: profileLoading } = useArtistProfile(artistId);
  const { slots, loading: slotsLoading } = useAvailableSlots(
    artistId, 
    selectedDate.toISOString().split('T')[0]
  );

  const { createBooking, loading: bookingLoading } = useCreateBooking();

  // Generate next 7 days
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  const handleBookNow = () => {
    setShowBookingFlow(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedSlot) return;

    try {
      const service = services.find(s => s.id === selectedService);
      if (!service) return;

      // Get current user ID from your auth context
      const customerId = 'current-user-id'; // Replace with actual user ID

      const booking = await createBooking(
        customerId,
        artistId,
        selectedService,
        service.title,
        service.price,
        selectedDate.toISOString().split('T')[0],
        selectedSlot
      );

      if (booking && onBookingComplete) {
        onBookingComplete(booking.id);
      }
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };

  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="hourglass-outline" size={48} color="#D4AF37" />
        <Text style={styles.loadingText}>Loading artist profile...</Text>
      </View>
    );
  }

  if (!artist) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Artist not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onBack}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = artist.shop_name || artist.full_name || artist.username || 'Artist';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        {artist.seller_status === 'verified' && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.avatarContainer}>
            {artist.avatar_url ? (
              <Image source={{ uri: artist.avatar_url }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={['#ec4899', '#a855f7']}
                style={styles.avatarPlaceholder}
              >
                <Ionicons name="person" size={40} color="#fff" />
              </LinearGradient>
            )}
          </View>
          
          <Text style={styles.artistName}>{displayName}</Text>
          
          {artist.experience && (
            <Text style={styles.experience}>{artist.experience} experience</Text>
          )}
          
          {/* Rating */}
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={18} color="#facc15" />
            <Text style={styles.ratingText}>
              {artist.average_rating?.toFixed(1) || 'N/A'}
            </Text>
            <Text style={styles.reviewCount}>
              ({artist.total_reviews || 0} reviews)
            </Text>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.sectionContent}>
            {artist.bio || 'Professional makeup artist specializing in bridal and party makeup.'}
          </Text>
          
          {artist.specialities && (
            <>
              <Text style={styles.sectionSubtitle}>Specialities</Text>
              <View style={styles.specialitiesContainer}>
                {artist.specialities.split(',').map((spec, index) => (
                  <View key={index} style={styles.specialityBadge}>
                    <Text style={styles.specialityText}>{spec.trim()}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Services Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={{
                id: service.id,
                title: service.title,
                price: service.price,
                duration_minutes: service.duration_minutes,
                description: service.description,
              }}
              isSelected={selectedService === service.id}
              onSelect={() => {
                setSelectedService(service.id);
                setShowBookingFlow(true);
              }}
            />
          ))}
        </View>

        {/* Booking Flow */}
        {showBookingFlow && selectedService && (
          <>
            {/* Date Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Date</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.datesScroll}
              >
                {dates.map((date, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dateButton,
                      selectedDate.toDateString() === date.toDateString() && styles.dateButtonSelected,
                    ]}
                    onPress={() => {
                      setSelectedDate(date);
                      setSelectedSlot(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.dateDay,
                        selectedDate.toDateString() === date.toDateString() && styles.dateDaySelected,
                      ]}
                    >
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                    <Text
                      style={[
                        styles.dateNumber,
                        selectedDate.toDateString() === date.toDateString() && styles.dateNumberSelected,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Time Slots */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Time Slots</Text>
              {slotsLoading ? (
                <View style={styles.loadingSlots}>
                  <Ionicons name="hourglass-outline" size={24} color="#666" />
                  <Text style={styles.loadingSlotsText}>Loading slots...</Text>
                </View>
              ) : slots.length > 0 ? (
                <TimeSlotGrid
                  slots={slots}
                  selectedSlot={selectedSlot || undefined}
                  onSelectSlot={setSelectedSlot}
                />
              ) : (
                <View style={styles.noSlotsContainer}>
                  <Ionicons name="calendar-outline" size={32} color="#999" />
                  <Text style={styles.noSlotsText}>No available slots for this date</Text>
                  <Text style={styles.noSlotsSubtext}>Please select another date</Text>
                </View>
              )}
            </View>

            {/* Booking Summary */}
            {selectedSlot && (
              <View style={styles.summarySection}>
                <Text style={styles.summaryTitle}>Booking Summary</Text>
                <View style={styles.summaryContent}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Artist</Text>
                    <Text style={styles.summaryValue}>{displayName}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Service</Text>
                    <Text style={styles.summaryValue}>
                      {services.find(s => s.id === selectedService)?.title}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Date</Text>
                    <Text style={styles.summaryValue}>
                      {selectedDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Time</Text>
                    <Text style={styles.summaryValue}>{selectedSlot}</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.summaryTotal]}>
                    <Text style={styles.summaryTotalLabel}>Total</Text>
                    <Text style={styles.summaryTotalValue}>
                      ₹{services.find(s => s.id === selectedService)?.price.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Fixed Bottom Button */}
      {showBookingFlow && selectedService && selectedSlot && (
        <View style={styles.bottomButtonContainer}>
          <LinearGradient
            colors={['#D4AF37', '#B8962E']}
            style={styles.bookButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity
              style={styles.bookButtonInner}
              onPress={handleConfirmBooking}
              disabled={bookingLoading}
            >
              {bookingLoading ? (
                <Ionicons name="hourglass-outline" size={20} color="#fff" />
              ) : (
                <>
                  <Text style={styles.bookButtonText}>Confirm Booking</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#ef4444',
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#D4AF37',
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#f9fafb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22c55e',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  experience: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  reviewCount: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    marginTop: 12,
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  specialitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialityBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  specialityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D4AF37',
  },
  datesScroll: {
    paddingHorizontal: 4,
  },
  dateButton: {
    width: 64,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dateButtonSelected: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderColor: '#D4AF37',
  },
  dateDay: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dateDaySelected: {
    color: '#D4AF37',
    fontWeight: '700',
  },
  dateNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  dateNumberSelected: {
    color: '#D4AF37',
  },
  loadingSlots: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingSlotsText: {
    fontSize: 14,
    color: '#666',
  },
  noSlotsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  noSlotsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  noSlotsSubtext: {
    fontSize: 12,
    color: '#999',
  },
  summarySection: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  summaryContent: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D4AF37',
  },
  bottomButtonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  bookButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  bookButtonInner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
});
