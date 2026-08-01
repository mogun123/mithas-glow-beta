import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface TimeSlotGridProps {
  slots: TimeSlot[];
  selectedSlot?: string;
  onSelectSlot: (time: string) => void;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({ slots, selectedSlot, onSelectSlot }) => {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
    >
      {slots.map((slot, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.slotButton,
            !slot.available && styles.slotUnavailable,
            selectedSlot === slot.time && styles.slotSelected,
          ]}
          onPress={() => slot.available && onSelectSlot(slot.time)}
          disabled={!slot.available}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={
              selectedSlot === slot.time
                ? ['#D4AF37', '#B8962E']
                : !slot.available
                ? ['#f5f5f5', '#e8e8e8']
                : ['#fff', '#f9f9f9']
            }
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text
              style={[
                styles.slotText,
                !slot.available && styles.slotTextUnavailable,
                selectedSlot === slot.time && styles.slotTextSelected,
              ]}
            >
              {slot.time}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingVertical: 8,
  },
  slotButton: {
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  slotUnavailable: {
    opacity: 0.5,
  },
  slotSelected: {
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  slotText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  slotTextUnavailable: {
    color: '#999',
  },
  slotTextSelected: {
    color: '#fff',
  },
});
