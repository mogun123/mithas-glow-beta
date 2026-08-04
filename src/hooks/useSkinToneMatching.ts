import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SkinToneProfile {
  skinTone: string;
  undertone: 'warm' | 'cool' | 'neutral';
  complexion: 'fair' | 'light' | 'medium' | 'tan' | 'deep';
  hexColor: string;
  recommendations: string[];
  analyzedAt: string;
}

interface ProductMatch {
  productId: string;
  matchScore: number;
  matchReasons: string[];
  recommendedShades: string[];
}

interface UseSkinToneMatchingProps {
  userId?: string | null;
}

export function useSkinToneMatching({ userId }: UseSkinToneMatchingProps) {
  const [skinProfile, setSkinProfile] = useState<SkinToneProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [productMatches, setProductMatches] = useState<Map<string, ProductMatch>>(new Map());

  // Load user's skin tone profile from database
  useEffect(() => {
    const loadSkinProfile = async () => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from('user_skin_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (data && !error) {
          setSkinProfile(data);
        }
      } catch (error) {
        console.error('Error loading skin profile:', error);
      }
    };

    loadSkinProfile();
  }, [userId]);

  // Save skin tone profile to database
  const saveSkinProfile = async (profile: Omit<SkinToneProfile, 'analyzedAt'>) => {
    if (!userId) return false;

    setIsLoading(true);
    try {
      const profileToSave = {
        ...profile,
        user_id: userId,
        analyzed_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_skin_profiles')
        .upsert(profileToSave, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving skin profile:', error);
        return false;
      }

      setSkinProfile({
        ...profile,
        analyzedAt: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Error saving skin profile:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate match score for a product
  const calculateProductMatch = (product: any): ProductMatch => {
    if (!skinProfile) {
      return {
        productId: product.id,
        matchScore: 0,
        matchReasons: [],
        recommendedShades: []
      };
    }

    let matchScore = 50; // Base score
    const matchReasons: string[] = [];
    const recommendedShades: string[] = [];

    // Match based on undertone
    if (product.undertone === skinProfile.undertone) {
      matchScore += 25;
      matchReasons.push(`Perfect ${skinProfile.undertone} undertone match`);
    } else if (product.undertone === 'neutral') {
      matchScore += 15;
      matchReasons.push('Neutral undertone suits all skin tones');
    }

    // Match based on product category and skin tone recommendations
    if (product.category === 'foundation' || product.category === 'concealer') {
      const foundationShades = getRecommendedFoundationShades(skinProfile);
      recommendedShades.push(...foundationShades);
      
      if (foundationShades.some(shade => product.shades?.includes(shade))) {
        matchScore += 20;
        matchReasons.push('Available in your recommended shades');
      }
    }

    // Match based on color family
    if (product.colorFamily) {
      const recommendedColors = getRecommendedColors(skinProfile);
      if (recommendedColors.includes(product.colorFamily)) {
        matchScore += 15;
        matchReasons.push(`Perfect ${product.colorFamily} tones for your skin`);
      }
    }

    // Bonus for products specifically designed for the complexion
    if (product.targetComplexion === skinProfile.complexion) {
      matchScore += 10;
      matchReasons.push(`Formulated for ${skinProfile.complexion} skin`);
    }

    return {
      productId: product.id,
      matchScore: Math.min(100, matchScore),
      matchReasons,
      recommendedShades: [...new Set(recommendedShades)] // Remove duplicates
    };
  };

  // Get recommended foundation shades based on skin profile
  const getRecommendedFoundationShades = (profile: SkinToneProfile): string[] => {
    const shadeMap: Record<string, string[]> = {
      'fair-warm': ['Porcelain', 'Ivory', 'Cream'],
      'fair-cool': ['Alabaster', 'Fair', 'Light'],
      'fair-neutral': ['Nude', 'Vanilla', 'Natural'],
      'light-warm': ['Warm Beige', 'Honey', 'Golden'],
      'light-cool': ['Cool Beige', 'Rose', 'Pink'],
      'light-neutral': ['Beige', 'Sand', 'Wheat'],
      'medium-warm': ['Medium Beige', 'Caramel', 'Golden Tan'],
      'medium-cool': ['Medium Tan', 'Bronze', 'Terracotta'],
      'medium-neutral': ['Medium', 'Natural Tan', 'Warm Tan'],
      'tan-warm': ['Tan', 'Deep Golden', 'Bronze'],
      'tan-cool': ['Deep Tan', 'Cocoa', 'Rich Bronze'],
      'tan-neutral': ['Deep Beige', 'Honey Tan', 'Warm Bronze'],
      'deep-warm': ['Deep Bronze', 'Chestnut', 'Rich Copper'],
      'deep-cool': ['Deep Cocoa', 'Espresso', 'Dark Bronze'],
      'deep-neutral': ['Deep', 'Rich Brown', 'Dark Brown']
    };

    const key = `${profile.complexion}-${profile.undertone}`;
    return shadeMap[key] || ['Medium', 'Natural'];
  };

  // Get recommended colors based on skin profile
  const getRecommendedColors = (profile: SkinToneProfile): string[] => {
    const colorMap: Record<string, string[]> = {
      'warm': ['Peach', 'Coral', 'Warm Brown', 'Gold', 'Bronze', 'Terracotta', 'Copper'],
      'cool': ['Pink', 'Rose', 'Berry', 'Plum', 'Cool Brown', 'Silver', 'Lavender'],
      'neutral': ['Nude', 'Taupe', 'Mauve', 'Dusty Rose', 'Soft Brown', 'Champagne']
    };

    return colorMap[profile.undertone] || [];
  };

  // Get match score for a specific product
  const getProductMatch = (product: any): ProductMatch => {
    if (productMatches.has(product.id)) {
      return productMatches.get(product.id)!;
    }

    const match = calculateProductMatch(product);
    setProductMatches(prev => new Map(prev.set(product.id, match)));
    return match;
  };

  // Clear skin profile
  const clearSkinProfile = async () => {
    if (!userId) return;

    try {
      await supabase
        .from('user_skin_profiles')
        .delete()
        .eq('user_id', userId);

      setSkinProfile(null);
      setProductMatches(new Map());
    } catch (error) {
      console.error('Error clearing skin profile:', error);
    }
  };

  return {
    skinProfile,
    isLoading,
    productMatches,
    saveSkinProfile,
    getProductMatch,
    clearSkinProfile,
    hasProfile: !!skinProfile
  };
}
