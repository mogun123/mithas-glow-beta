import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface RealtimeMetrics {
  views: number;
  likes: number;
  saves: number;
  shares: number;
  purchases: number;
  uniqueViewers: number;
}

interface UseRealtimeMetricsProps {
  contentId: string;
  contentType: 'product' | 'reel' | 'look' | 'tutorial' | 'event';
  userId?: string | null;
}

export function useRealtimeMetrics({ 
  contentId, 
  contentType, 
  userId 
}: UseRealtimeMetricsProps) {
  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    views: 0,
    likes: 0,
    saves: 0,
    shares: 0,
    purchases: 0,
    uniqueViewers: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const subscriptionRef = useRef<any>(null);

  // Fetch initial metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_content_metrics', {
            p_content_id: contentId,
            p_content_type: contentType
          }) as any;

        if (error) {
          console.error('Error fetching metrics:', error);
          return;
        }

        if (data && data.length > 0) {
          setMetrics({
            views: data[0].total_views || 0,
            likes: data[0].total_likes || 0,
            saves: data[0].total_saves || 0,
            shares: data[0].total_shares || 0,
            purchases: data[0].total_purchases || 0,
            uniqueViewers: data[0].unique_viewers || 0
          });
        }

        // Check if current user has liked/saved this content
        if (userId) {
          const { data: userInteractions } = await supabase
            .from('content_metrics')
            .select('interaction_type')
            .eq('content_id', contentId)
            .eq('content_type', contentType)
            .eq('user_id', userId)
            .in('interaction_type', ['like', 'save']);

          if (userInteractions) {
            setIsLiked(userInteractions.some(i => i.interaction_type === 'like'));
            setIsSaved(userInteractions.some(i => i.interaction_type === 'save'));
          }
        }
      } catch (error) {
        console.error('Error in fetchMetrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [contentId, contentType, userId]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`content_metrics_${contentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_aggregates',
          filter: `content_id=eq.${contentId}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            setMetrics(prev => ({
              views: payload.new.total_views || prev.views,
              likes: payload.new.total_likes || prev.likes,
              saves: payload.new.total_saves || prev.saves,
              shares: payload.new.total_shares || prev.shares,
              purchases: payload.new.total_purchases || prev.purchases,
              uniqueViewers: prev.uniqueViewers // This needs separate query
            }));
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [contentId]);

  // Record a view
  const recordView = async (duration?: number, context?: any) => {
    if (!userId) return;

    try {
      await supabase.rpc('record_view', {
        p_content_id: contentId,
        p_content_type: contentType,
        p_user_id: userId,
        p_duration_seconds: duration,
        p_context: context || {}
      } as any);
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  // Toggle like
  const toggleLike = async () => {
    if (!userId) {
      toast.error('Please login to like content');
      return;
    }

    try {
      if (isLiked) {
        // Unlike - delete the interaction
        await supabase
          .from('content_metrics')
          .delete()
          .eq('content_id', contentId)
          .eq('content_type', contentType)
          .eq('user_id', userId)
          .eq('interaction_type', 'like');
        
        setIsLiked(false);
        setMetrics(prev => ({ ...prev, likes: Math.max(0, prev.likes - 1) }));
      } else {
        // Like
        await supabase.rpc('record_like', {
          p_content_id: contentId,
          p_content_type: contentType,
          p_user_id: userId
        } as any);
        
        setIsLiked(true);
        setMetrics(prev => ({ ...prev, likes: prev.likes + 1 }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  // Toggle save
  const toggleSave = async () => {
    if (!userId) {
      toast.error('Please login to save content');
      return;
    }

    try {
      if (isSaved) {
        // Unsave - delete the interaction
        await supabase
          .from('content_metrics')
          .delete()
          .eq('content_id', contentId)
          .eq('content_type', contentType)
          .eq('user_id', userId)
          .eq('interaction_type', 'save');
        
        setIsSaved(false);
        setMetrics(prev => ({ ...prev, saves: Math.max(0, prev.saves - 1) }));
      } else {
        // Save
        await supabase.rpc('record_save', {
          p_content_id: contentId,
          p_content_type: contentType,
          p_user_id: userId
        } as any);
        
        setIsSaved(true);
        setMetrics(prev => ({ ...prev, saves: prev.saves + 1 }));
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      toast.error('Failed to update save');
    }
  };

  return {
    metrics,
    isLoading,
    isLiked,
    isSaved,
    recordView,
    toggleLike,
    toggleSave
  };
}
