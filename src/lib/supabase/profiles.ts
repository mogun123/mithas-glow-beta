/**
 * Real Profile Schema Integration with Supabase
 * Replaces mock profile data with real database queries
 */

import { supabase } from '../supabase';

export interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_artist: boolean;
  is_verified: boolean;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FeedItem {
  id: string;
  user_id: string;
  content_type: string;
  title?: string;
  description?: string;
  media_url?: string;
  thumbnail_url?: string;
  metadata: Record<string, any>;
  embedding?: number[];
  tags: string[];
  location_lat?: number;
  location_lng?: number;
  city?: string;
  views_count: number;
  likes_count: number;
  saves_count: number;
  shares_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // Joined profile data
  profile?: UserProfile;
}

export interface TrendingTag {
  id: string;
  tag: string;
  category?: string;
  usage_count: number;
  growth_rate: number;
  is_trending: boolean;
  last_updated: string;
}

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
}

/**
 * Get or create user profile (for new users)
 */
export async function getOrCreateUserProfile(userId: string, userData: Partial<UserProfile>): Promise<UserProfile | null> {
  try {
    // First try to get existing profile
    let profile = await getUserProfile(userId);
    
    if (!profile) {
      // Create new profile if doesn't exist
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          username: userData.username || `user_${userId.slice(0, 8)}`,
          full_name: userData.full_name || '',
          avatar_url: userData.avatar_url || '',
          bio: userData.bio || '',
          city: userData.city || 'Mumbai',
          country: userData.country || 'India',
          lat: userData.lat || 19.0760,
          lng: userData.lng || 72.8777,
          followers_count: 0,
          following_count: 0,
          posts_count: 0,
          is_artist: userData.is_artist || false,
          is_verified: false,
          preferences: userData.preferences || {},
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        return null;
      }

      profile = data;
    }

    return profile;
  } catch (error) {
    console.error('Error in getOrCreateUserProfile:', error);
    return null;
  }
}

/**
 * Get personalized feed items
 */
export async function getPersonalizedFeed(
  userId: string, 
  location: { lat: number; lng: number; city: string },
  limit: number = 10,
  offset: number = 0
): Promise<FeedItem[]> {
  try {
    const { data, error } = await supabase
      .from('feed_items')
      .select(`
        *,
        profile:user_profiles(
          username,
          full_name,
          avatar_url,
          is_verified,
          followers_count
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching personalized feed:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPersonalizedFeed:', error);
    return [];
  }
}

/**
 * Get trending tags
 */
export async function getTrendingTags(limit: number = 20): Promise<TrendingTag[]> {
  try {
    const { data, error } = await supabase
      .from('trending_tags')
      .select('*')
      .eq('is_trending', true)
      .order('usage_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching trending tags:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getTrendingTags:', error);
    return [];
  }
}

/**
 * Track engagement (views, likes, saves, shares)
 */
export async function trackEngagement(
  userId: string,
  itemId: string,
  interactionType: 'view' | 'like' | 'save' | 'share' | 'comment'
): Promise<boolean> {
  try {
    // Insert engagement record
    const { error: engagementError } = await supabase
      .from('engagement_metrics')
      .insert({
        user_id: userId,
        item_id: itemId,
        interaction_type: interactionType,
        metadata: {
          timestamp: new Date().toISOString(),
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
        }
      });

    if (engagementError) {
      console.error('Error tracking engagement:', engagementError);
      return false;
    }

    // For now, just log the count update - we'll implement proper counting later
    console.log(`Engagement tracked: ${interactionType} for item ${itemId} by user ${userId}`);
    
    return true;
  } catch (error) {
    console.error('Error in trackEngagement:', error);
    return false;
  }
}

/**
 * Real-time subscription for profile updates
 */
export function subscribeToProfileUpdates(
  userId: string,
  callback: (profile: UserProfile) => void
) {
  return supabase
    .channel(`profile_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_profiles',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as UserProfile);
        }
      }
    )
    .subscribe();
}
