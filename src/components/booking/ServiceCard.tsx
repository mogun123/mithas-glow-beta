import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Types
interface Service {
  id: string;
  title: string;
  price: number;
  duration_minutes: number;
  description?: string;
}

interface ServiceCardProps {
  service: Service;
  isSelected?: boolean;
  onSelect: () => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, isSelected, onSelect }) => {
  return (
    <TouchableOpacity 
      style={[styles.card, isSelected && styles.cardSelected]} 
      onPress={onSelect}
      activeOpacity={0.8}
    >
      <View style={styles.cardContent}>
        <View style={styles.serviceHeader}>
          <Text style={styles.serviceTitle}>{service.title}</Text>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color="#D4AF37" />
          )}
        </View>
        
        {service.description && (
          <Text style={styles.serviceDescription} numberOfLines={2}>
            {service.description}
          </Text>
        )}
        
        <View style={styles.serviceFooter}>
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.durationText}>{service.duration_minutes} min</Text>
          </View>
          <Text style={styles.priceText}>₹{service.price.toLocaleString()}</Text>
        </View>
      </View>
      
      {isSelected && (
        <LinearGradient
          colors={['rgba(212, 175, 55, 0.1)', 'rgba(212, 175, 55, 0.05)']}
          style={styles.selectedBorder}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
    </TouchableOpacity>
  );
};

// Styles
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSelected: {
    borderColor: '#D4AF37',
    borderWidth: 1,
  },
  selectedBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  cardContent: {
    zIndex: 1,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '600',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#D4AF37',
  },
});
