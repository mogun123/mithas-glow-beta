import { supabase } from './supabase';
import { toast } from 'sonner';
import { RewardsService } from '../services/rewardsService';
import { useRewardsStore } from '../store/useRewardsStore';

export interface AnalysisMetrics {
  // Clinical Metrics
  skinAge?: number;
  moisture?: number;
  texture?: number;
  pores?: number;
  redness?: number;
  pigmentation?: number;
  darkCircles?: number;
  wrinkles?: number;
  
  // Beauty Metrics
  radiance?: number;
  luminosity?: number;
  clarity?: number;
  smoothness?: number;
  evenness?: number;
  firmness?: number;
  elasticity?: number;
  glowScore?: number;
  
  // Extended Metrics (128-metric engine results)
  extendedClinicalMetrics?: any;
  beautyScores?: any;
  textureAnalysis?: any;
  colorAnalysis?: any;
  
  // Regional Metrics
  forehead?: any;
  leftCheek?: any;
  rightCheek?: any;
  nose?: any;
  chin?: any;
  underEyes?: any;
  
  // Temporal Metrics
  frameStability?: any;
  lightingQuality?: any;
  confidenceScore?: number;
  
  // Additional AI Engine Results
  [key: string]: any;
}

export interface SkinAnalysisData {
  metrics: AnalysisMetrics;
  overallScore: number;
  skinType: 'dry' | 'oily' | 'combination' | 'normal' | 'sensitive';
  faceImage?: string; // Base64 image data
  sessionId?: string;
  deviceInfo?: any;
  analysisDuration?: number;
}

export interface SavedAnalysis {
  id: string;
  user_id: string;
  created_at: string;
  image_url: string | null;
  metrics: AnalysisMetrics;
  overall_score: number;
  skin_type: string;
  is_glow_journey: boolean;
  session_id?: string;
  device_info?: any;
  analysis_duration_ms?: number;
}

export interface GlowJourneyCommitResult {
  analysisId: string;
  journeyId: string | null;
  continuedExistingJourney: boolean;
}

function requireFiniteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`DATA_INTEGRITY_ERROR: Missing live metric "${field}" for Glow Journey`);
  }
  return value;
}

function asJsonbObject(value: unknown, field: string, wrapKey?: string): Record<string, unknown> {
  if (value === null || value === undefined) {
    throw new Error(`DATA_INTEGRITY_ERROR: Missing live field "${field}" for Glow Journey`);
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (wrapKey && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')) {
    return { [wrapKey]: value };
  }
  throw new Error(`DATA_INTEGRITY_ERROR: Field "${field}" must be a JSON object for Glow Journey`);
}

function asJsonbValue(value: unknown, field: string): unknown {
  if (value === null || value === undefined) {
    throw new Error(`DATA_INTEGRITY_ERROR: Missing live field "${field}" for Glow Journey`);
  }
  return value;
}

/**
 * Build RPC payload strictly from the live AI report.
 * Writes ONLY glow_journeys + face_analyses via save_full_transformation_data.
 * Never touches clinical_analyses.
 */
export function buildGlowJourneyRpcPayload(report: any, userId: string, journeyId?: string | null) {
  if (!userId) {
    throw new Error('AUTH_ERROR: User must be logged in to start Glow Journey');
  }
  if (!report) {
    throw new Error('DATA_INTEGRITY_ERROR: Analysis report is missing');
  }

  const clinicalMetrics = report.clinicalMetrics;
  if (!clinicalMetrics || typeof clinicalMetrics !== 'object') {
    throw new Error('DATA_INTEGRITY_ERROR: clinicalMetrics missing from live pipeline');
  }

  const rednessScore = requireFiniteNumber(
    clinicalMetrics.redness ?? report.redness?.score,
    'clinicalMetrics.redness'
  );
  const textureScore = requireFiniteNumber(
    clinicalMetrics.texture ?? report.texture?.score,
    'clinicalMetrics.texture'
  );
  const melaninIndex = requireFiniteNumber(report.melaninIndex, 'melaninIndex');
  const labValues = asJsonbObject(report.labValues, 'labValues');

  const skinTone = asJsonbObject(report.skinTone, 'skinTone', 'skinTone');
  const undertone = asJsonbObject(report.undertone, 'undertone', 'undertone');
  const faceShape = asJsonbObject(
    typeof report.faceShape === 'object' && report.faceShape !== null
      ? report.faceShape
      : {
          faceShape: report.faceShape,
          measurements: report.faceMeasurements,
          ratios: report.faceRatios,
        },
    'faceShape',
    'faceShape'
  );

  const skinAgeSource =
    typeof report.skinAge === 'object' && report.skinAge !== null
      ? report.skinAge
      : { estimatedAge: report.skinAge ?? report.meta?.skinAge };
  const skinAge = asJsonbObject(skinAgeSource, 'skinAge', 'estimatedAge');
  requireFiniteNumber(
    (skinAge as any).estimatedAge ?? (skinAge as any).skinAge,
    'skinAge.estimatedAge'
  );

  const confidenceSource =
    typeof report.confidence === 'object' && report.confidence !== null
      ? report.confidence
      : {
          score: typeof report.confidence === 'number' ? report.confidence : report.engineConfidence,
          engineConfidence: report.engineConfidence,
        };
  const confidence = asJsonbObject(confidenceSource, 'confidence', 'score');
  requireFiniteNumber(
    (confidence as any).score ?? (confidence as any).value,
    'confidence.score'
  );

  const skinConditions = asJsonbValue(
    Array.isArray(report.skinConditions) ? report.skinConditions : report.skinConditions,
    'skinConditions'
  );

  const payload: Record<string, unknown> = {
    p_user_id: userId,
    p_redness_score: rednessScore,
    p_texture_score: textureScore,
    p_melanin_index: melaninIndex,
    p_skin_tone: skinTone,
    p_undertone: undertone,
    p_face_shape: faceShape,
    p_skin_conditions: skinConditions,
    p_skin_age: skinAge,
    p_confidence: confidence,
    p_lab_values: labValues,
  };

  if (journeyId) {
    payload.p_journey_id = journeyId;
  }

  // Optional live beard density only — never invent 0
  if (typeof report.beardDensityScore === 'number' && Number.isFinite(report.beardDensityScore)) {
    payload.p_beard_density = report.beardDensityScore;
  }

  const centerImage = report.frontFrame?.image;
  if (
    typeof centerImage === 'string' &&
    centerImage.trim() &&
    /^https?:\/\//i.test(centerImage.trim())
  ) {
    payload.p_scan_image_url = centerImage.trim();
  }

  return payload;
}

/**
 * Start / continue Glow Journey via RPC only (glow_journeys + face_analyses).
 */
export const commitGlowJourneyFromReport = async (
  userId: string,
  report: any
): Promise<GlowJourneyCommitResult> => {
  const { data: existingJourney, error: journeyLookupError } = await supabase.rpc(
    'get_active_glow_journey',
    { p_user_id: userId }
  );

  if (journeyLookupError) {
    throw new Error(`Unable to start journey: ${journeyLookupError.message}`);
  }

  const continuedExistingJourney = Array.isArray(existingJourney) && existingJourney.length > 0;
  const journeyId = continuedExistingJourney ? existingJourney[0].id : null;

  const payload = buildGlowJourneyRpcPayload(report, userId, journeyId);

  const { data: analysisId, error } = await supabase.rpc(
    'save_full_transformation_data',
    payload
  );

  if (error) {
    console.error('[GlowJourney RPC] save_full_transformation_data failed', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      payloadKeys: Object.keys(payload),
      payloadPreview: {
        p_user_id: payload.p_user_id,
        p_journey_id: payload.p_journey_id ?? null,
        p_redness_score: payload.p_redness_score,
        p_texture_score: payload.p_texture_score,
        p_melanin_index: payload.p_melanin_index,
        p_skin_tone: payload.p_skin_tone,
        p_undertone: payload.p_undertone,
        p_face_shape: payload.p_face_shape,
        p_skin_conditions: payload.p_skin_conditions,
        p_skin_age: payload.p_skin_age,
        p_confidence: payload.p_confidence,
        p_lab_values: payload.p_lab_values,
      },
    });
    const detail = [error.message, error.details, error.hint].filter(Boolean).join(' | ');
    throw new Error(detail || 'Unable to start journey, please try again.');
  }

  // Validate RPC response - ensure we got a valid analysisId
  if (!analysisId || typeof analysisId !== 'string') {
    throw new Error('Unable to start journey: invalid analysis ID returned from database');
  }

  console.log('[GlowJourney RPC] Successfully saved with analysisId:', analysisId);

  // Resolve journey id after create (RPC may have created a new journey)
  let resolvedJourneyId: string | null = journeyId;
  if (!resolvedJourneyId) {
    const { data: journeys, error: refetchError } = await supabase.rpc(
      'get_active_glow_journey',
      { p_user_id: userId }
    );
    if (refetchError) {
      throw new Error(`Journey saved analysis but journey lookup failed: ${refetchError.message}`);
    }
    resolvedJourneyId = journeys?.[0]?.id ?? null;
  }

  // 🔥 CRITICAL FIX: Update rewards AFTER successful scan save
  console.log('[GlowJourney] Calling RewardsService.processSuccessfulScan for user:', userId);
  try {
    const rewardsResult = await RewardsService.processSuccessfulScan(userId);
    console.log('[GlowJourney] ✅ Rewards updated successfully:', rewardsResult);
    
    // Force refresh the Zustand store to update UI immediately
    console.log('[GlowJourney] Refreshing rewards store...');
    await useRewardsStore.getState().refreshRewards(userId);
    console.log('[GlowJourney] ✅ Rewards store refreshed');
  } catch (rewardsError) {
    console.error('[GlowJourney] ⚠️ Rewards update failed (non-critical):', rewardsError);
    // Don't throw here - the scan was successful, rewards failure is non-critical
  }

  return {
    analysisId,
    journeyId: resolvedJourneyId,
    continuedExistingJourney,
  };
};

/**
 * Upload face image to Supabase Storage
 */
export const uploadFaceImage = async (
  userId: string, 
  imageBase64: string, 
  sessionId: string
): Promise<string> => {
  try {
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });
    
    const timestamp = Date.now();
    const filename = `${userId}/${sessionId}-${timestamp}.jpg`;
    
    const { error } = await supabase.storage
      .from('skin-scans')
      .upload(filename, blob, {
        contentType: 'image/jpeg',
        upsert: false
      });
    
    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('skin-scans')
      .getPublicUrl(filename);
    
    return publicUrl;
    
  } catch (error) {
    console.error('Error uploading face image:', error);
    throw error;
  }
};

/**
 * @deprecated Prefer commitGlowJourneyFromReport — legacy user_analyses path.
 * Does not touch clinical_analyses.
 */
export const saveFullTransformationData = async (
  userId: string,
  analysisData: SkinAnalysisData
): Promise<SavedAnalysis> => {
  try {
    if (!analysisData.faceImage) {
      throw new Error('Face image is required for Glow Journey');
    }
    
    const imageUrl = await uploadFaceImage(
      userId, 
      analysisData.faceImage, 
      analysisData.sessionId || 'default'
    );
    
    const { data, error } = await supabase
      .from('user_analyses')
      .insert({
        user_id: userId,
        image_url: imageUrl,
        metrics: analysisData.metrics,
        overall_score: analysisData.overallScore,
        skin_type: analysisData.skinType,
        is_glow_journey: true,
        session_id: analysisData.sessionId,
        device_info: analysisData.deviceInfo,
        analysis_duration_ms: analysisData.analysisDuration
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to save analysis: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to save analysis: empty database response');
    }
    
    toast.success('✨ Your Glow Journey has begun! Your radiance story is being crafted.');
    
    return data;
    
  } catch (error) {
    console.error('Error saving full transformation data:', error);
    toast.error('Unable to start journey, please try again.');
    throw error;
  }
};

/**
 * Save metrics only (Privacy-First option) — legacy user_analyses path.
 * Does not write clinical_analyses or glow_journeys.
 */
export const saveMetricsOnly = async (
  userId: string,
  analysisData: Omit<SkinAnalysisData, 'faceImage'>
): Promise<SavedAnalysis> => {
  try {
    const { data, error } = await supabase
      .from('user_analyses')
      .insert({
        user_id: userId,
        image_url: null,
        metrics: analysisData.metrics,
        overall_score: analysisData.overallScore,
        skin_type: analysisData.skinType,
        is_glow_journey: false,
        session_id: analysisData.sessionId,
        device_info: analysisData.deviceInfo,
        analysis_duration_ms: analysisData.analysisDuration
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to save analysis: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to save analysis: empty database response');
    }
    
    toast.success('📊 Your beauty insights have been saved privately.');
    
    return data;
    
  } catch (error) {
    console.error('Error saving metrics only:', error);
    toast.error('Failed to save your beauty insights. Please try again.');
    throw error;
  }
};

/**
 * Get user's analysis history
 */
export const getUserAnalyses = async (
  userId: string,
  limit: number = 10
): Promise<SavedAnalysis[]> => {
  try {
    const { data, error } = await supabase
      .from('user_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw new Error(`Failed to fetch analyses: ${error.message}`);
    }
    
    return data || [];
    
  } catch (error) {
    console.error('Error fetching user analyses:', error);
    throw error;
  }
};

/**
 * Get user's Glow Journey analyses only
 */
export const getGlowJourneyAnalyses = async (
  userId: string,
  limit: number = 10
): Promise<SavedAnalysis[]> => {
  try {
    const { data, error } = await supabase
      .from('user_analyses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_glow_journey', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw new Error(`Failed to fetch Glow Journey analyses: ${error.message}`);
    }
    
    return data || [];
    
  } catch (error) {
    console.error('Error fetching Glow Journey analyses:', error);
    throw error;
  }
};

/**
 * Delete user analysis (GDPR compliance)
 */
export const deleteAnalysis = async (analysisId: string, userId: string): Promise<void> => {
  try {
    const { data: analysis, error: fetchError } = await supabase
      .from('user_analyses')
      .select('image_url, user_id')
      .eq('id', analysisId)
      .single();
    
    if (fetchError || !analysis) {
      throw new Error('Analysis not found');
    }
    
    if (analysis.user_id !== userId) {
      throw new Error('Unauthorized to delete this analysis');
    }
    
    if (analysis.image_url) {
      const filename = analysis.image_url.split('/').pop();
      if (filename) {
        await supabase.storage
          .from('skin-scans')
          .remove([`${userId}/${filename}`]);
      }
    }
    
    const { error } = await supabase
      .from('user_analyses')
      .delete()
      .eq('id', analysisId)
      .eq('user_id', userId);
    
    if (error) {
      throw new Error(`Failed to delete analysis: ${error.message}`);
    }
    
    toast.success('Analysis deleted successfully');
    
  } catch (error) {
    console.error('Error deleting analysis:', error);
    toast.error('Failed to delete analysis. Please try again.');
    throw error;
  }
};

/**
 * Determine skin type from metrics
 */
export const determineSkinType = (metrics: AnalysisMetrics): 'dry' | 'oily' | 'combination' | 'normal' | 'sensitive' => {
  const { moisture, pores, redness, texture } = metrics;
  
  if (typeof redness === 'number' && redness > 60) return 'sensitive';
  if (typeof moisture === 'number' && moisture < 40) return 'dry';
  if (typeof pores === 'number' && pores > 70) return 'oily';
  if (typeof texture === 'number' && texture > 60) return 'combination';
  
  return 'normal';
};

/**
 * Calculate overall score from metrics — no invented default when empty
 */
export const calculateOverallScore = (metrics: AnalysisMetrics): number => {
  const scores = Object.values(metrics).filter(value => 
    typeof value === 'number' && value >= 0 && value <= 100
  );
  
  if (scores.length === 0) {
    throw new Error('DATA_INTEGRITY_ERROR: No numeric metrics available for overall score');
  }
  
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.round(average);
};
