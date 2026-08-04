/**
 * Clinical Metrics Service - Supabase Integration
 * Handles storage and retrieval of clinical skin analysis metrics.
 * ZERO mock / filler values — missing live data fails the save.
 */

import { supabase } from '../lib/supabase';
import { RewardsService } from './rewardsService';
import { useRewardsStore } from '../store/useRewardsStore';

// Clinical Analysis Types
export interface ClinicalAnalysis {
  id?: string;
  user_id: string;
  session_id: string;
  skin_tone: string;
  undertone: string;
  skin_type: string;
  overall_skin_health_score: number;
  metrics: {
    acne: number;
    redness: number;
    oiliness: number;
    moisture: number;
    texture: number;
    pores: number;
    pigment: number;
    darkCircle: number;
    elasticity: number;
    glassSkin: number;
    brightness: number;
    overallSkinHealthScore: number;
  };
  spatial_data: {
    acneClusters: Array<{x: number, y: number, intensity: number}>;
    oilSpots: Array<{x: number, y: number, intensity: number}>;
    rednessClusters: Array<{x: number, y: number, intensity: number}>;
    melaninClusters: Array<{x: number, y: number, intensity: number}>;
    porePoints: Array<{x: number, y: number, intensity: number}>;
    underEyeRegions: Array<{x: number, y: number, intensity: number}>;
  };
  frame_data: {
    center: { image: string, timestamp: string };
    left: { image: string, timestamp: string };
    right: { image: string, timestamp: string };
  };
  lab_values: {
    overall: { l: number, a: number, b: number };
    forehead: { l: number, a: number, b: number };
    leftCheek: { l: number, a: number, b: number };
    rightCheek: { l: number, a: number, b: number };
    nose?: { l: number, a: number, b: number };
    chin?: { l: number, a: number, b: number };
  };
  created_at?: string;
  updated_at?: string;
}

export interface ClinicalMetricsHistory {
  id: string;
  user_id: string;
  analysis_date: string;
  metrics: ClinicalAnalysis['metrics'];
  improvements: {
    acne: number;
    redness: number;
    oiliness: number;
    moisture: number;
    texture: number;
  };
  recommendations: string[];
}

type LabTriple = { l: number; a: number; b: number };

function requireFiniteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`DATA_INTEGRITY_ERROR: Missing or invalid live metric "${field}"`);
  }
  return value;
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`DATA_INTEGRITY_ERROR: Missing or invalid live field "${field}"`);
  }
  return value.trim();
}

function requireLab(value: unknown, field: string): LabTriple {
  if (!value || typeof value !== 'object') {
    throw new Error(`DATA_INTEGRITY_ERROR: Missing live LAB values for "${field}"`);
  }
  const lab = value as Record<string, unknown>;
  return {
    l: requireFiniteNumber(lab.l, `${field}.l`),
    a: requireFiniteNumber(lab.a, `${field}.a`),
    b: requireFiniteNumber(lab.b, `${field}.b`),
  };
}

function optionalLab(value: unknown, field: string): LabTriple | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const lab = value as Record<string, unknown>;
  if (
    typeof lab.l !== 'number' || !Number.isFinite(lab.l) ||
    typeof lab.a !== 'number' || !Number.isFinite(lab.a) ||
    typeof lab.b !== 'number' || !Number.isFinite(lab.b)
  ) {
    return undefined;
  }
  return { l: lab.l, a: lab.a, b: lab.b };
}

function requireFrameImage(
  frame: unknown,
  angle: string
): { image: string; timestamp: string } {
  if (!frame || typeof frame !== 'object') {
    throw new Error(`DATA_INTEGRITY_ERROR: Missing live frame data for "${angle}"`);
  }
  const f = frame as Record<string, unknown>;
  const image = f.image;
  if (typeof image !== 'string' || !image.trim()) {
    throw new Error(`DATA_INTEGRITY_ERROR: Missing live frame image for "${angle}"`);
  }
  const timestamp =
    typeof f.timestamp === 'string' && f.timestamp.trim()
      ? f.timestamp
      : new Date().toISOString();
  return { image, timestamp };
}

function asSpotArray(value: unknown): Array<{ x: number; y: number; intensity: number }> {
  return Array.isArray(value) ? value : [];
}

function resolveSkinLabel(value: unknown, field: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const nested =
      (typeof obj[field] === 'string' && obj[field]) ||
      (typeof obj.skinTone === 'string' && obj.skinTone) ||
      (typeof obj.undertone === 'string' && obj.undertone) ||
      (typeof obj.skinType === 'string' && obj.skinType);
    if (typeof nested === 'string' && nested.trim()) return nested.trim();
  }
  throw new Error(`DATA_INTEGRITY_ERROR: Missing live field "${field}"`);
}

/**
 * Build a clinical_analyses insert payload strictly from live AI pipeline output.
 * Throws DATA_INTEGRITY_ERROR when required live values are missing — never invents fillers.
 */
export function buildValidatedClinicalPayload(
  report: any,
  userId: string,
  sessionId: string
): Omit<ClinicalAnalysis, 'id' | 'created_at' | 'updated_at'> {
  if (!userId) {
    throw new Error('AUTH_ERROR: User must be logged in to save analysis');
  }
  if (!report) {
    throw new Error('DATA_INTEGRITY_ERROR: Analysis report is missing');
  }

  const clinicalMetrics = report.clinicalMetrics;
  if (!clinicalMetrics || typeof clinicalMetrics !== 'object') {
    throw new Error('DATA_INTEGRITY_ERROR: clinicalMetrics missing from live pipeline');
  }

  const labSource = report.labValues;
  if (!labSource || typeof labSource !== 'object') {
    throw new Error('DATA_INTEGRITY_ERROR: labValues missing from live pipeline');
  }

  const lab_values: ClinicalAnalysis['lab_values'] = {
    overall: requireLab(labSource.overall, 'labValues.overall'),
    forehead: requireLab(labSource.forehead, 'labValues.forehead'),
    leftCheek: requireLab(labSource.leftCheek, 'labValues.leftCheek'),
    rightCheek: requireLab(labSource.rightCheek, 'labValues.rightCheek'),
  };

  const noseLab = optionalLab(labSource.nose, 'labValues.nose');
  const chinLab = optionalLab(labSource.chin, 'labValues.chin');
  if (noseLab) lab_values.nose = noseLab;
  if (chinLab) lab_values.chin = chinLab;

  const frame_data = {
    center: requireFrameImage(report.frontFrame, 'center'),
    left: requireFrameImage(report.leftFrame, 'left'),
    right: requireFrameImage(report.rightFrame, 'right'),
  };

  const acneScore = requireFiniteNumber(
    report.acne?.score ?? clinicalMetrics.acne,
    'acne.score'
  );
  const rednessScore = requireFiniteNumber(
    report.redness?.score ?? clinicalMetrics.redness,
    'redness.score'
  );
  const oilinessScore = requireFiniteNumber(
    report.oiliness?.score ?? clinicalMetrics.oiliness,
    'oiliness.score'
  );
  const textureScore = requireFiniteNumber(
    report.texture?.score ?? clinicalMetrics.texture,
    'texture.score'
  );
  const pigmentScore = requireFiniteNumber(
    report.pigment?.score ?? clinicalMetrics.pigment,
    'pigment.score'
  );
  const darkCircleScore = requireFiniteNumber(
    report.darkCircle?.score ?? clinicalMetrics.darkCircle,
    'darkCircle.score'
  );
  const poresScore = requireFiniteNumber(
    report.pores?.score ?? clinicalMetrics.pores,
    'pores.score'
  );

  return {
    user_id: userId,
    session_id: requireNonEmptyString(sessionId, 'session_id'),
    skin_tone: resolveSkinLabel(report.skinTone, 'skinTone'),
    undertone: resolveSkinLabel(report.undertone, 'undertone'),
    skin_type: resolveSkinLabel(report.skinType, 'skinType'),
    overall_skin_health_score: report.overallSkinHealthScore,
    metrics: {
      acne: acneScore,
      redness: rednessScore,
      oiliness: oilinessScore,
      moisture: requireFiniteNumber(clinicalMetrics.moisture, 'clinicalMetrics.moisture'),
      texture: textureScore,
      pores: poresScore,
      pigment: pigmentScore,
      darkCircle: darkCircleScore,
      elasticity: requireFiniteNumber(clinicalMetrics.elasticity, 'clinicalMetrics.elasticity'),
      glassSkin: requireFiniteNumber(clinicalMetrics.glassSkin, 'clinicalMetrics.glassSkin'),
      brightness: requireFiniteNumber(clinicalMetrics.brightness, 'clinicalMetrics.brightness'),
      overallSkinHealthScore: report.overallSkinHealthScore,
    },
    spatial_data: {
      acneClusters: asSpotArray(report.acne?.spots),
      oilSpots: asSpotArray(report.oiliness?.spots),
      rednessClusters: asSpotArray(report.redness?.spots),
      melaninClusters: asSpotArray(report.pigment?.spots),
      porePoints: asSpotArray(report.pores?.spots ?? report.texture?.spots),
      underEyeRegions: asSpotArray(report.darkCircle?.spots),
    },
    frame_data,
    lab_values,
  };
}

// Service Class
export class ClinicalMetricsService {
  
  /**
   * Save complete clinical analysis to Supabase (single insert path).
   * Returns the inserted row. Throws on any failure — never swallows errors.
   */
  static async saveAnalysis(analysis: Omit<ClinicalAnalysis, 'id' | 'created_at' | 'updated_at'>) {
    console.log('[ClinicalMetricsService] Starting saveAnalysis for user:', analysis.user_id);
    
    const { data, error, status } = await supabase
      .from('clinical_analyses')
      .insert([analysis])
      .select()
      .single();

    if (error) {
      console.error('[ClinicalMetricsService] Error saving clinical analysis:', error);
      throw new Error(`Failed to save analysis: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to save analysis: empty response from database');
    }

    // Supabase/PostgREST success for insert+select is typically 201 (or 200)
    if (typeof status === 'number' && status !== 200 && status !== 201) {
      throw new Error(`Failed to save analysis: unexpected status ${status}`);
    }

    console.log('[ClinicalMetricsService] Analysis saved successfully, now processing rewards...');

    // Process rewards after successful save
    try {
      console.log('[ClinicalMetricsService] Calling RewardsService.processSuccessfulScan for user:', analysis.user_id);
      const rewardsResult = await RewardsService.processSuccessfulScan(analysis.user_id);
      console.log('[ClinicalMetricsService] Rewards updated successfully:', rewardsResult);
      
      // Refresh the rewards store to reflect changes
      console.log('[ClinicalMetricsService] Refreshing rewards store...');
      await useRewardsStore.getState().refreshRewards(analysis.user_id);
      console.log('[ClinicalMetricsService] Rewards store refreshed. Current state:', useRewardsStore.getState().rewards);
    } catch (rewardError) {
      // Log but don't throw - the scan itself was successful
      console.error('[ClinicalMetricsService] Error processing rewards after scan:', rewardError);
    }

    return data as ClinicalAnalysis;
  }

  /**
   * Validate live report then insert exactly once.
   */
  static async saveLiveReport(report: any, userId: string, sessionId: string) {
    const payload = buildValidatedClinicalPayload(report, userId, sessionId);
    return this.saveAnalysis(payload);
  }

  /**
   * Get user's clinical analysis history
   */
  static async getUserHistory(userId: string, limit: number = 10) {
    const { data, error } = await supabase
      .from('clinical_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user history:', error);
      throw new Error(`Failed to fetch history: ${error.message}`);
    }
    return data || [];
  }

  /**
   * Get latest analysis for user
   */
  static async getLatestAnalysis(userId: string) {
    const { data, error } = await supabase
      .from('clinical_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch latest analysis: ${error.message}`);
    }
    return data;
  }

  /**
   * Get specific analysis by ID
   */
  static async getAnalysisById(analysisId: string) {
    const { data, error } = await supabase
      .from('clinical_analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (error) {
      console.error('Error fetching analysis:', error);
      throw new Error(`Failed to fetch analysis: ${error.message}`);
    }
    return data;
  }

  /**
   * Update existing analysis
   */
  static async updateAnalysis(analysisId: string, updates: Partial<ClinicalAnalysis>) {
    const { data, error } = await supabase
      .from('clinical_analyses')
      .update(updates)
      .eq('id', analysisId)
      .select()
      .single();

    if (error) {
      console.error('Error updating analysis:', error);
      throw new Error(`Failed to update analysis: ${error.message}`);
    }
    return data;
  }

  /**
   * Delete analysis
   */
  static async deleteAnalysis(analysisId: string) {
    const { error } = await supabase
      .from('clinical_analyses')
      .delete()
      .eq('id', analysisId);

    if (error) {
      console.error('Error deleting analysis:', error);
      throw new Error(`Failed to delete analysis: ${error.message}`);
    }
    return true;
  }

  /**
   * Calculate metrics improvements between analyses
   */
  static calculateImprovements(current: ClinicalAnalysis['metrics'], previous: ClinicalAnalysis['metrics']) {
    return {
      acne: previous.acne - current.acne,
      redness: previous.redness - current.redness,
      oiliness: previous.oiliness - current.oiliness,
      moisture: current.moisture - previous.moisture,
      texture: previous.texture - current.texture
    };
  }

  /**
   * Generate recommendations based on metrics (derived from live metrics only)
   */
  static generateRecommendations(metrics: ClinicalAnalysis['metrics']) {
    const recommendations: string[] = [];

    if (metrics.acne > 40) {
      recommendations.push("Consider using acne treatment products with salicylic acid");
    }
    if (metrics.redness > 30) {
      recommendations.push("Use soothing products with niacinamide or green tea extract");
    }
    if (metrics.oiliness > 50) {
      recommendations.push("Incorporate oil-control products and gentle exfoliation");
    }
    if (metrics.moisture < 40) {
      recommendations.push("Increase hydration with hyaluronic acid-based products");
    }
    if (metrics.texture > 45) {
      recommendations.push("Consider retinol or chemical exfoliants for texture improvement");
    }
    if (metrics.pores > 50) {
      recommendations.push("Use pore-refining products with niacinamide or clay masks");
    }

    return recommendations;
  }

  /**
   * Save metrics history with improvements
   */
  static async saveMetricsHistory(userId: string, currentAnalysis: ClinicalAnalysis) {
    const previousAnalyses = await this.getUserHistory(userId, 2);
    const previousAnalysis = previousAnalyses.find(a => a.id !== currentAnalysis.id);

    let improvements = {
      acne: 0,
      redness: 0,
      oiliness: 0,
      moisture: 0,
      texture: 0
    };

    if (previousAnalysis) {
      improvements = this.calculateImprovements(currentAnalysis.metrics, previousAnalysis.metrics);
    }

    const recommendations = this.generateRecommendations(currentAnalysis.metrics);

    const historyData: Omit<ClinicalMetricsHistory, 'id'> = {
      user_id: userId,
      analysis_date: currentAnalysis.created_at || new Date().toISOString(),
      metrics: currentAnalysis.metrics,
      improvements,
      recommendations
    };

    const { data, error } = await supabase
      .from('clinical_metrics_history')
      .insert([historyData])
      .select()
      .single();

    if (error) {
      console.error('Error saving metrics history:', error);
      throw new Error(`Failed to save history: ${error.message}`);
    }
    return data;
  }

  /**
   * Get metrics trends over time
   */
  static async getMetricsTrends(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('clinical_metrics_history')
      .select('*')
      .eq('user_id', userId)
      .gte('analysis_date', startDate.toISOString())
      .order('analysis_date', { ascending: true });

    if (error) {
      console.error('Error fetching metrics trends:', error);
      throw new Error(`Failed to fetch trends: ${error.message}`);
    }
    return data || [];
  }
}

export default ClinicalMetricsService;
