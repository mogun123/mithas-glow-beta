import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { ArtistPortfolioItem, SocialLink } from '../lib/database.types';

interface UseArtistPortfolioReturn {
  portfolioItems: ArtistPortfolioItem[];
  socialLinks: SocialLink[];
  loading: boolean;
  error: string | null;
  uploadImage: (file: File, category: string, caption?: string) => Promise<boolean>;
  deleteImage: (id: string) => Promise<boolean>;
  updateCaption: (id: string, caption: string) => Promise<boolean>;
  addSocialLink: (platform: 'instagram' | 'youtube', url: string) => Promise<boolean>;
  removeSocialLink: (id: string) => Promise<boolean>;
  refreshPortfolio: () => Promise<void>;
}

export function useArtistPortfolio(): UseArtistPortfolioReturn {
  const [portfolioItems, setPortfolioItems] = useState<ArtistPortfolioItem[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError('No authenticated user');
        setLoading(false);
        return;
      }

      // Try artist_portfolio table first
      let { data: items, error: itemsError } = await supabase
        .from('artist_portfolio')
        .select('*')
        .eq('artist_id', session.user.id)
        .order('created_at', { ascending: false });

      // Fallback to profiles table
      if (itemsError && itemsError.code === '42P01') {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('portfolio_items, social_links')
          .eq('id', session.user.id)
          .single();

        if (profileError) throw profileError;
        items = profileData?.portfolio_items || [];
        setSocialLinks(profileData?.social_links || []);
      } else {
        // Fetch social links from separate table if using dedicated tables
        const { data: linksData } = await supabase
          .from('artist_social_links')
          .select('*')
          .eq('artist_id', session.user.id);
        
        setSocialLinks(linksData || []);
      }

      if (itemsError && itemsError.code !== '42P01') throw itemsError;
      setPortfolioItems(items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch portfolio');
      console.error('Portfolio fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const uploadImage = async (file: File, category: string, caption?: string): Promise<boolean> => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError('No authenticated user');
        return false;
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('portfolio-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('portfolio-media')
        .getPublicUrl(fileName);

      // Save to database
      const newItem = {
        artist_id: session.user.id,
        image_url: publicUrl,
        category,
        caption: caption || '',
        is_cover: false,
        created_at: new Date().toISOString(),
      };

      // Try artist_portfolio table first
      let { error: dbError } = await supabase
        .from('artist_portfolio')
        .insert([newItem]);

      // Fallback to profiles table
      if (dbError && dbError.code === '42P01') {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('portfolio_items')
          .eq('id', session.user.id)
          .single();

        const updatedItems = [...(currentProfile?.portfolio_items || []), newItem];

        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ portfolio_items: updatedItems })
          .eq('id', session.user.id);

        if (profileUpdateError) throw profileUpdateError;
      } else if (dbError) {
        throw dbError;
      }

      await fetchPortfolio();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
      console.error('Upload error:', err);
      return false;
    }
  };

  const deleteImage = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return false;

      // Find item to delete from storage
      const itemToDelete = portfolioItems.find((item) => item.id === id);
      
      if (itemToDelete) {
        // Extract file path from URL
        const urlParts = itemToDelete.image_url.split('/portfolio-media/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          
          await supabase.storage
            .from('portfolio-media')
            .remove([filePath]);
        }
      }

      // Delete from database
      let { error: deleteError } = await supabase
        .from('artist_portfolio')
        .delete()
        .eq('id', id)
        .eq('artist_id', session.user.id);

      // Fallback to profiles table
      if (deleteError && deleteError.code === '42P01') {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('portfolio_items')
          .eq('id', session.user.id)
          .single();

        const updatedItems = (currentProfile?.portfolio_items || []).filter(
          (item: ArtistPortfolioItem) => item.id !== id
        );

        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ portfolio_items: updatedItems })
          .eq('id', session.user.id);

        if (profileUpdateError) throw profileUpdateError;
      } else if (deleteError) {
        throw deleteError;
      }

      await fetchPortfolio();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to delete image');
      console.error('Delete error:', err);
      return false;
    }
  };

  const updateCaption = async (id: string, caption: string): Promise<boolean> => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return false;

      let { error: updateError } = await supabase
        .from('artist_portfolio')
        .update({ caption })
        .eq('id', id)
        .eq('artist_id', session.user.id);

      // Fallback to profiles table
      if (updateError && updateError.code === '42P01') {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('portfolio_items')
          .eq('id', session.user.id)
          .single();

        const updatedItems = (currentProfile?.portfolio_items || []).map(
          (item: ArtistPortfolioItem) =>
            item.id === id ? { ...item, caption } : item
        );

        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ portfolio_items: updatedItems })
          .eq('id', session.user.id);

        if (profileUpdateError) throw profileUpdateError;
      } else if (updateError) {
        throw updateError;
      }

      await fetchPortfolio();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to update caption');
      return false;
    }
  };

  const addSocialLink = async (platform: 'instagram' | 'youtube', url: string): Promise<boolean> => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return false;

      const newLink: SocialLink = {
        id: crypto.randomUUID(),
        platform,
        url,
        created_at: new Date().toISOString(),
      };

      // Try artist_social_links table first
      let { error: linkError } = await supabase
        .from('artist_social_links')
        .insert([{ ...newLink, artist_id: session.user.id }]);

      // Fallback to profiles table
      if (linkError && linkError.code === '42P01') {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('social_links')
          .eq('id', session.user.id)
          .single();

        const updatedLinks = [...(currentProfile?.social_links || []), newLink];

        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ social_links: updatedLinks })
          .eq('id', session.user.id);

        if (profileUpdateError) throw profileUpdateError;
      } else if (linkError) {
        throw linkError;
      }

      await fetchPortfolio();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to add social link');
      return false;
    }
  };

  const removeSocialLink = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return false;

      let { error: deleteError } = await supabase
        .from('artist_social_links')
        .delete()
        .eq('id', id)
        .eq('artist_id', session.user.id);

      // Fallback to profiles table
      if (deleteError && deleteError.code === '42P01') {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('social_links')
          .eq('id', session.user.id)
          .single();

        const updatedLinks = (currentProfile?.social_links || []).filter(
          (link: SocialLink) => link.id !== id
        );

        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ social_links: updatedLinks })
          .eq('id', session.user.id);

        if (profileUpdateError) throw profileUpdateError;
      } else if (deleteError) {
        throw deleteError;
      }

      await fetchPortfolio();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to remove social link');
      return false;
    }
  };

  return {
    portfolioItems,
    socialLinks,
    loading,
    error,
    uploadImage,
    deleteImage,
    updateCaption,
    addSocialLink,
    removeSocialLink,
    refreshPortfolio: fetchPortfolio,
  };
}
