import { LAB } from '../lib/ai/computer-vision/colorConversion';
import { SkinToneResult } from '../lib/ai/skin-analysis/skinToneAnalysis';
import { UndertoneResult } from '../lib/ai/skin-analysis/undertoneDetection';
import { FaceShapeResult } from '../lib/ai/analysis/faceShapeAnalyzer';
import { SkinBeautyResult } from '../lib/ai/analysis/skinConditionAnalyzer';
import { SkinAgeResult } from '../lib/ai/analysis/skinAgeEstimator';
import { ConfidenceResult } from '../lib/ai/computer-vision/confidenceScore';

export interface SkinProfile {
  id: string;
  userId: string;
  labValues: LAB;
  skinTone: string;
  undertone: string;
  faceShape: string;
  skinAge: number;
  confidence: number;
  lightingQuality: number;
  scanTimestamp: string;
  metadata: {
    fitzpatrickType?: number;
    warmthLevel?: number;
    conditions: SkinBeautyResult['concern'];
    ageFactors: SkinAgeResult['ageFactors'];
  };
}

export interface ProfileComparison {
  profile: SkinProfile;
  similarity: number;
  differences: {
    labDifference: number;
    toneMatch: boolean;
    undertoneMatch: boolean;
    faceShapeMatch: boolean;
  };
  recommendation: 'maintain' | 'rescan' | 'update';
}

export class SupabaseService {
  private supabaseUrl: string;
  private supabaseKey: string;
  private client: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    this.initializeClient();
  }

  private initializeClient(): void {
    // This would initialize the actual Supabase client
    // For now, we'll create a mock implementation
    this.client = {
      from: (table: string) => ({
        select: (columns: string) => ({
          eq: (column: string, value: any) => ({
            single: () => Promise.resolve({ data: null, error: null }),
            order: (column: string, options: any) => ({
              limit: (count: number) => Promise.resolve({ data: [], error: null })
            })
          }),
          order: (column: string, options: any) => ({
            limit: (count: number) => Promise.resolve({ data: [], error: null })
          })
        }),
        insert: (data: any) => ({
          select: () => Promise.resolve({ data: null, error: null })
        }),
        update: (data: any) => ({
          eq: (column: string, value: any) => ({
            select: () => Promise.resolve({ data: null, error: null })
          })
        }),
        delete: () => ({
          eq: (column: string, value: any) => Promise.resolve({ data: null, error: null })
        })
      })
    };
  }

  public async saveSkinProfile(
    userId: string,
    analysisData: {
      labValues: LAB;
      skinTone: SkinToneResult;
      undertone: UndertoneResult;
      faceShape: FaceShapeResult;
      skinConditions: SkinBeautyResult;
      skinAge: SkinAgeResult;
      confidence: ConfidenceResult;
    }
  ): Promise<{ success: boolean; profileId?: string; error?: string }> {
    try {
      const profile: Omit<SkinProfile, 'id' | 'scanTimestamp'> = {
        userId,
        labValues: analysisData.labValues,
        skinTone: analysisData.skinTone.skinTone,
        undertone: analysisData.undertone.undertone,
        faceShape: analysisData.faceShape.faceShape,
        skinAge: analysisData.skinAge.estimatedAge,
        confidence: analysisData.confidence.overallScore,
        lightingQuality: analysisData.confidence.factors.lighting.uniformity,
        metadata: {
          fitzpatrickType: analysisData.skinTone.metadata.FitzpatrickType,
          warmthLevel: analysisData.skinTone.metadata.warmthLevel,
          conditions: analysisData.skinConditions.concern,
          ageFactors: analysisData.skinAge.ageFactors,
        },
      };

      // In a real implementation, this would save to Supabase
      const { data, error } = await this.client
        .from('skin_profiles')
        .insert([profile])
        .select();

      if (error) {
        throw new Error(`Failed to save profile: ${error.message}`);
      }

      return {
        success: true,
        profileId: data?.[0]?.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async getUserSkinProfile(userId: string): Promise<{
    success: boolean;
    profile?: SkinProfile;
    error?: string;
  }> {
    try {
      const { data, error } = await this.client
        .from('skin_profiles')
        .select('*')
        .eq('userId', userId)
        .order('scanTimestamp', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw new Error(`Failed to fetch profile: ${error.message}`);
      }

      return {
        success: true,
        profile: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async compareWithStoredProfile(
    userId: string,
    currentAnalysis: {
      labValues: LAB;
      skinTone: string;
      undertone: string;
      faceShape: string;
      confidence: number;
    }
  ): Promise<{
    success: boolean;
    comparison?: ProfileComparison;
    error?: string;
  }> {
    try {
      // Get user's stored profile
      const { success, profile, error } = await this.getUserSkinProfile(userId);
      
      if (!success || error) {
        throw new Error(error || 'Failed to get stored profile');
      }

      if (!profile) {
        return {
          success: true,
          comparison: undefined,
        };
      }

      // Calculate differences
      const labDifference = this.calculateLABDifference(currentAnalysis.labValues, profile.labValues);
      const toneMatch = currentAnalysis.skinTone === profile.skinTone;
      const undertoneMatch = currentAnalysis.undertone === profile.undertone;
      const faceShapeMatch = currentAnalysis.faceShape === profile.faceShape;

      // Calculate overall similarity
      const similarity = this.calculateSimilarity(
        labDifference,
        toneMatch,
        undertoneMatch,
        faceShapeMatch
      );

      // Determine recommendation
      const recommendation = this.determineRecommendation(
        similarity,
        currentAnalysis.confidence,
        profile.confidence
      );

      const comparison: ProfileComparison = {
        profile,
        similarity,
        differences: {
          labDifference,
          toneMatch,
          undertoneMatch,
          faceShapeMatch,
        },
        recommendation,
      };

      return {
        success: true,
        comparison,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private calculateLABDifference(lab1: LAB, lab2: LAB): number {
    const lDiff = Math.abs(lab1.l - lab2.l);
    const aDiff = Math.abs(lab1.a - lab2.a);
    const bDiff = Math.abs(lab1.b - lab2.b);
    
    return Math.sqrt(lDiff * lDiff + aDiff * aDiff + bDiff * bDiff);
  }

  private calculateSimilarity(
    labDifference: number,
    toneMatch: boolean,
    undertoneMatch: boolean,
    faceShapeMatch: boolean
  ): number {
    let similarity = 100;

    // Penalize LAB difference
    similarity -= Math.min(50, labDifference * 2);

    // Penalize mismatches
    if (!toneMatch) similarity -= 20;
    if (!undertoneMatch) similarity -= 15;
    if (!faceShapeMatch) similarity -= 10;

    return Math.max(0, similarity);
  }

  private determineRecommendation(
    similarity: number,
    currentConfidence: number,
    storedConfidence: number
  ): 'maintain' | 'rescan' | 'update' {
    // High similarity and good confidence - maintain
    if (similarity > 85 && currentConfidence > 70) {
      return 'maintain';
    }

    // Low similarity - might need update
    if (similarity < 60) {
      return currentConfidence > storedConfidence ? 'update' : 'rescan';
    }

    // Moderate similarity - update if current confidence is better
    return currentConfidence > storedConfidence + 10 ? 'update' : 'maintain';
  }

  public async updateSkinProfile(
    profileId: string,
    updateData: Partial<SkinProfile>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.client
        .from('skin_profiles')
        .update(updateData)
        .eq('id', profileId)
        .select();

      if (error) {
        throw new Error(`Failed to update profile: ${error.message}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async deleteSkinProfile(profileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.client
        .from('skin_profiles')
        .delete()
        .eq('id', profileId);

      if (error) {
        throw new Error(`Failed to delete profile: ${error.message}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async getUserAnalysisHistory(
    userId: string,
    limit: number = 10
  ): Promise<{
    success: boolean;
    profiles?: SkinProfile[];
    error?: string;
  }> {
    try {
      const { data, error } = await this.client
        .from('skin_profiles')
        .select('*')
        .eq('userId', userId)
        .order('scanTimestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch history: ${error.message}`);
      }

      return {
        success: true,
        profiles: data || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public validateProfile(profile: SkinProfile): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check required fields
    if (!profile.userId) issues.push('User ID is required');
    if (!profile.labValues) issues.push('LAB values are required');
    if (!profile.skinTone) issues.push('Skin tone is required');
    if (!profile.undertone) issues.push('Undertone is required');
    if (!profile.faceShape) issues.push('Face shape is required');

    // Check value ranges
    if (profile.labValues.l < 0 || profile.labValues.l > 100) {
      issues.push('L value out of range');
    }
    if (profile.labValues.a < -128 || profile.labValues.a > 127) {
      issues.push('A value out of range');
    }
    if (profile.labValues.b < -128 || profile.labValues.b > 127) {
      issues.push('B value out of range');
    }

    if (profile.confidence < 0 || profile.confidence > 100) {
      issues.push('Confidence score out of range');
    }

    if (profile.skinAge < 0 || profile.skinAge > 100) {
      issues.push('Skin age out of range');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}
