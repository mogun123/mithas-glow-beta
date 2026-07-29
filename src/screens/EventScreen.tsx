import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Calendar, Award, Activity, Clock, Target, Zap, Heart, Star, ChevronRight, ArrowUp, ArrowDown, Camera, Lightbulb, BarChart3, CheckCircle, AlertCircle, ShoppingBag, Stethoscope, CalendarPlus, Home, TrendingUp as TrendingUpIcon } from 'lucide-react';
import { BeforeAfterComparison } from '../components/skin/BeforeAfterComparison';
import { BottomNav } from '../components/BottomNav';
import { ScheduleScanModal } from '../components/ScheduleScanModal';
import { supabase } from '../lib/supabase';
import { realtimeService } from '../lib/services/realtime.service';
import { ScheduledScansService, type ScheduledScan } from '../services/scheduledScansService';
import { toast } from 'sonner';

/** Normalize DB row → UI report shape. No filler defaults for missing live metrics. */
const normalizeSupabaseAnalysis = (row: any): any => {
  if (!row) return null;
  if (row.clinicalMetrics || row.skinType) {
    return {
      ...row,
      savedAnalysisId: row.savedAnalysisId ?? row.id,
      savedToDatabase: row.savedToDatabase === true || Boolean(row.id && row.metrics),
    };
  }

  const metrics = row.metrics;
  if (!metrics || typeof metrics !== 'object') {
    throw new Error('DATA_INTEGRITY_ERROR: clinical_analyses row missing metrics');
  }

  const requireMetric = (key: string): number => {
    const value = metrics[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`DATA_INTEGRITY_ERROR: clinical_analyses missing live metric "${key}"`);
    }
    return value;
  };

  const moisture = requireMetric('moisture');
  const texture = requireMetric('texture');
  const acne = requireMetric('acne');
  const redness = requireMetric('redness');
  const oiliness = requireMetric('oiliness');
  const pigment = requireMetric('pigment');
  const pores = requireMetric('pores');
  const darkCircle = requireMetric('darkCircle');
  const elasticity = requireMetric('elasticity');
  const glassSkin = requireMetric('glassSkin');
  const brightness = row.lab_values?.overall?.l ? 100 - row.metrics.pigment : requireMetric('moisture');

  const overallSkinHealthScore = Math.round(
    (moisture + elasticity + glassSkin + (100 - acne) + (100 - redness)) / 5
  );

  return {
    id: row.id,
    created_at: row.created_at,
    session_id: row.session_id,
    skinTone: row.skin_tone,
    undertone: row.undertone,
    skinType: row.skin_type,
    overallSkinHealthScore,
    acne: {
      score: acne,
      level: acne > 60 ? 'High' : acne > 30 ? 'Medium' : 'Low',
      spots: Array.isArray(row.spatial_data?.acneClusters) ? row.spatial_data.acneClusters : [],
    },
    redness: {
      score: redness,
      spots: Array.isArray(row.spatial_data?.rednessClusters) ? row.spatial_data.rednessClusters : [],
    },
    oiliness: {
      score: oiliness,
      spots: Array.isArray(row.spatial_data?.oilSpots) ? row.spatial_data.oilSpots : [],
    },
    pigment: {
      score: pigment,
      spots: Array.isArray(row.spatial_data?.melaninClusters) ? row.spatial_data.melaninClusters : [],
    },
    pores: {
      score: pores,
      spots: Array.isArray(row.spatial_data?.porePoints) ? row.spatial_data.porePoints : [],
    },
    darkCircle: {
      score: darkCircle,
      spots: Array.isArray(row.spatial_data?.underEyeRegions) ? row.spatial_data.underEyeRegions : [],
    },
    texture: {
      score: texture,
    },
    clinicalMetrics: {
      moisture,
      texture,
      elasticity,
      pores,
      glassSkin,
      oiliness,
      redness,
      pigment,
      darkCircle,
      acne,
      brightness: 100 - pigment,
    },
    labValues: row.lab_values,
    frameData: row.frame_data,
    savedAnalysisId: row.id,
    savedToDatabase: true,
    confidence:
      typeof row.confidence === 'number'
        ? row.confidence
        : typeof row.engineConfidence === 'number'
          ? row.engineConfidence
          : undefined,
  };
};

const getSkinTypeLabel = (report: any) => {
  if (!report?.skinType) return '—';
  if (typeof report.skinType === 'string') return report.skinType;
  return report.skinType.skinType ?? '—';
};

const getReportMetricCards = (report: any) => {
  if (!report) return [];

  return [
    { label: 'Moisture', value: report.clinicalMetrics?.moisture },
    { label: 'Brightness', value: report.clinicalMetrics?.brightness },
    { label: 'Texture', value: report.clinicalMetrics?.texture ?? report.texture?.score },
    { label: 'Elasticity', value: report.clinicalMetrics?.elasticity },
    { label: 'Glass Skin', value: report.clinicalMetrics?.glassSkin },
    { label: 'Acne', value: report.acne?.score ?? report.clinicalMetrics?.acne },
    { label: 'Redness', value: report.redness?.score ?? report.clinicalMetrics?.redness },
    { label: 'Oiliness', value: report.oiliness?.score ?? report.clinicalMetrics?.oiliness },
    { label: 'Pigment', value: report.pigment?.score ?? report.clinicalMetrics?.pigment },
    { label: 'Pores', value: report.pores?.score ?? report.clinicalMetrics?.pores },
    { label: 'Dark Circle', value: report.darkCircle?.score ?? report.clinicalMetrics?.darkCircle },
  ].filter((metric) => typeof metric.value === 'number' && Number.isFinite(metric.value));
};

interface EventScreenProps {
  onNavigateHome: () => void;
  onNavigateToMirror?: () => void;
  onNavigateToProfile?: () => void;
  latestScanReport?: any;
  setLatestScanReport?: (report: any) => void;
}

interface EventData {
  id: string;
  type: 'journey' | 'scan' | 'milestone' | 'achievement' | 'appointment' | 'recommendation' | 'product' | 'trend';
  title: string;
  description: string;
  timestamp: Date;
  data?: any;
  status?: 'completed' | 'pending' | 'upcoming';
  priority?: 'high' | 'medium' | 'low';
}

function buildActivityFromDatabase(params: {
  analyses: any[];
  glowJourney: any | null;
  journeyStats: any | null;
  scheduledScans: ScheduledScan[];
}): EventData[] {
  const { analyses, glowJourney, journeyStats, scheduledScans } = params;
  const events: EventData[] = [];

  analyses.forEach((report) => {
    events.push({
      id: `scan-${report.savedAnalysisId ?? report.id}`,
      type: 'scan',
      title: 'Skin Analysis Saved',
      description: typeof report.overallSkinHealthScore === 'number'
        ? `Health Score: ${Math.round(report.overallSkinHealthScore)}%`
        : `Session ${report.session_id}`,
      timestamp: new Date(report.created_at),
      data: report,
      status: 'completed',
      priority: 'high',
    });
  });

  if (glowJourney) {
    events.push({
      id: `journey-${glowJourney.id}`,
      type: 'journey',
      title: '30-Day Glow Journey',
      description: `Day ${journeyStats?.currentDay ?? 1} of 30`,
      timestamp: new Date(glowJourney.start_date || glowJourney.created_at),
      data: glowJourney,
      status: glowJourney.status === 'active' ? 'pending' : 'completed',
      priority: 'medium',
    });

    if (typeof journeyStats?.streakDays === 'number' && journeyStats.streakDays > 0) {
      events.push({
        id: `streak-${glowJourney.id}-${journeyStats.streakDays}`,
        type: 'achievement',
        title: `${journeyStats.streakDays} Day Streak`,
        description: 'Recorded from glow journey progress',
        timestamp: new Date(glowJourney.updated_at || glowJourney.start_date),
        status: 'completed',
        priority: 'medium',
      });
    }

    if (typeof journeyStats?.totalScans === 'number' && journeyStats.totalScans >= 5) {
      events.push({
        id: `milestone-scans-${glowJourney.id}-${journeyStats.totalScans}`,
        type: 'milestone',
        title: `${journeyStats.totalScans} Scans Completed`,
        description: 'Journey scan count from database',
        timestamp: new Date(glowJourney.updated_at),
        status: 'completed',
        priority: 'medium',
      });
    }
  }

  scheduledScans.forEach((scan) => {
    events.push({
      id: `scheduled-${scan.id}`,
      type: 'appointment',
      title: 'Scheduled Skin Scan',
      description: `Scan scheduled for ${new Date(scan.scheduled_at).toLocaleDateString()} at ${scan.scheduled_time}`,
      timestamp: new Date(scan.scheduled_at),
      data: scan,
      status: scan.status === 'upcoming' ? 'upcoming' : 'completed',
      priority: 'high',
    });
  });

  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/** Insights derived only from comparing live saved analyses — not invented activity. */
function computeTrendInsights(currentReport: any, previousReports: any[]) {
  const trends: Array<{
    title: string;
    description: string;
    improvement: boolean;
  }> = [];

  const previous = previousReports.find(
    (r) => (r.savedAnalysisId ?? r.id) !== (currentReport.savedAnalysisId ?? currentReport.id)
  );
  if (!previous || !currentReport) return trends;

  const currentScore = currentReport.overallSkinHealthScore;
  const previousScore = previous.overallSkinHealthScore;
  if (typeof currentScore === 'number' && typeof previousScore === 'number') {
    const delta = currentScore - previousScore;
    if (Math.abs(delta) >= 5) {
      trends.push({
        title: delta > 0 ? 'Skin Health Improving' : 'Skin Health Declining',
        description: `Health score changed by ${Math.round(delta)}% vs previous saved scan`,
        improvement: delta > 0,
      });
    }
  }

  const currentMoisture = currentReport.clinicalMetrics?.moisture;
  const previousMoisture = previous.clinicalMetrics?.moisture;
  if (typeof currentMoisture === 'number' && typeof previousMoisture === 'number') {
    const delta = currentMoisture - previousMoisture;
    if (Math.abs(delta) >= 10) {
      trends.push({
        title: delta > 0 ? 'Moisture Improved' : 'Moisture Decreased',
        description: `Moisture changed by ${Math.round(delta)}% vs previous saved scan`,
        improvement: delta > 0,
      });
    }
  }

  return trends;
}

function computeActionableInsights(report: any) {
  const insights: Array<{
    type: string;
    title: string;
    description: string;
    icon: React.ReactNode;
  }> = [];

  if (typeof report.overallSkinHealthScore === 'number' && report.overallSkinHealthScore > 80) {
    insights.push({
      type: 'success',
      title: 'Strong Skin Health Score',
      description: 'Your latest saved analysis shows a high overall health score.',
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
    });
  }

  if (typeof report.confidence === 'number' && report.confidence < 80) {
    insights.push({
      type: 'warning',
      title: 'Improve Scan Conditions',
      description: 'Latest scan confidence is below 80%. Retry in better lighting.',
      icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
    });
  }

  if (typeof report.acne?.score === 'number' && report.acne.score > 40) {
    insights.push({
      type: 'warning',
      title: 'Elevated Acne Score',
      description: `Saved acne score is ${Math.round(report.acne.score)}. Consider clinical follow-up.`,
      icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
    });
  }

  return insights;
}

export const EventScreen: React.FC<EventScreenProps> = ({
  onNavigateHome,
  onNavigateToMirror,
  onNavigateToProfile,
  latestScanReport,
  setLatestScanReport
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'journey' | 'scans' | 'achievements' | 'insights'>('overview');
  const [events, setEvents] = useState<EventData[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scanReport, setScanReport] = useState<any>(null);
  const [journeyStats, setJourneyStats] = useState<any>(null);
  const [glowJourney, setGlowJourney] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [previousReports, setPreviousReports] = useState<any[]>([]);
  const [scheduledScans, setScheduledScans] = useState<ScheduledScan[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const scanHistory = [
    scanReport,
    ...previousReports.filter(
      (report) =>
        report?.savedAnalysisId !== scanReport?.savedAnalysisId &&
        report?.id !== scanReport?.id
    ),
  ].filter(Boolean);

  const rebuildEvents = useCallback((
    analyses: any[],
    journey: any | null,
    stats: any | null,
    schedules: ScheduledScan[]
  ) => {
    setEvents(buildActivityFromDatabase({
      analyses,
      glowJourney: journey,
      journeyStats: stats,
      scheduledScans: schedules,
    }));
  }, []);

  const loadDashboard = useCallback(async (preferredReport?: any) => {
    setIsLoading(true);
    setLoadError(null);

    // Clear existing state before fetching to prevent ghost data
    setPreviousReports([]);
    setScanReport(null);
    setGlowJourney(null);
    setJourneyStats(null);
    setEvents([]);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        setLoadError('Please log in to view your events.');
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: previous, error: historyError } = await supabase
        .from('clinical_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (historyError) throw historyError;

      const normalizedHistory = (previous ? previous : []).flatMap((row) => {
        try {
          return [normalizeSupabaseAnalysis(row)];
        } catch (rowError) {
          console.warn('Skipping invalid clinical_analyses row on Events load:', row?.id, rowError);
          return [];
        }
      });
      setPreviousReports(normalizedHistory);
      
      console.log('📊 Scan history loaded:', normalizedHistory.length, 'analyses');

      let nextScanReport: any = null;
      if (preferredReport?.savedToDatabase && preferredReport?.id) {
        try {
          const { data: freshRow, error: fetchError } = await supabase
            .from('clinical_analyses')
            .select('*')
            .eq('id', preferredReport.id)
            .single();
          
          if (fetchError) throw fetchError;
          
          nextScanReport = normalizeSupabaseAnalysis(freshRow);
          console.log('📊 Using fresh preferred scan report from DB:', nextScanReport.savedAnalysisId);
        } catch (preferredError) {
          console.warn('Failed to load preferred scan report from DB; not using fallback to prevent ghost data', preferredError);
          // Don't fall back to DB history to prevent ghost data
          nextScanReport = null;
        }
      } else if (normalizedHistory.length > 0) {
        nextScanReport = normalizedHistory[0];
        console.log('📊 Using latest from DB history:', nextScanReport.savedAnalysisId);
      }

      setScanReport(nextScanReport);
      console.log('📊 Current scan report set:', nextScanReport?.savedAnalysisId, 'Available history:', normalizedHistory.length);
      // Do not write back to parent here — avoids navigate/load feedback loops

      const { data: journeyRows, error: journeyError } = await supabase
        .rpc('get_active_glow_journey', { p_user_id: user.id });

      if (journeyError && !String(journeyError.message || '').includes('no rows')) {
        throw journeyError;
      }

      let nextJourney: any = null;
      let nextStats: any = null;

      if (journeyRows && journeyRows.length > 0) {
        const j = journeyRows[0];
        nextJourney = j;
        setGlowJourney(j);

        const today = new Date();
        const startDate = new Date(j.start_date);
        const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        const { data: analyses, error: faceError } = await supabase
          .from('face_analyses')
          .select('id')
          .eq('journey_id', j.id);

        if (faceError) throw faceError;

        nextStats = {
          currentDay: diffDays + 1,
          totalScans: analyses?.length ?? 0,
          streakDays: typeof j.streak_days === 'number' ? j.streak_days : 0,
          glowPoints: typeof j.glow_points === 'number' ? j.glow_points : 0,
          xpEarned: typeof j.xp_earned === 'number' ? j.xp_earned : 0,
        };
        setJourneyStats(nextStats);
      } else {
        setGlowJourney(null);
        setJourneyStats(null);
      }

      const schedules = await ScheduledScansService.listUpcoming(user.id);
      setScheduledScans(schedules);

      rebuildEvents(normalizedHistory, nextJourney, nextStats, schedules);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load events dashboard';
      console.error('EventScreen load failed:', error);
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [rebuildEvents]);

  useEffect(() => {
    void loadDashboard(latestScanReport);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when parent passes a newly saved report
  }, [latestScanReport?.savedAnalysisId, latestScanReport?.id]);

  // Also load dashboard on mount to ensure scan history is always available
  useEffect(() => {
    if (!latestScanReport) {
      void loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on mount when no latest report
  }, []);

  // Explicit refresh after Done & Apply (and any external trigger)
  useEffect(() => {
    const handleRefreshEvents = (event: Event) => {
      const custom = event as CustomEvent;
      const detail = custom.detail ?? {};
      
      // Force immediate refresh if requested
      if (detail.forceRefresh) {
        console.log('Force refreshing EventSection after Done & Apply');
        void loadDashboard(detail.scanReport);
        
        // Also trigger realtime subscription refresh
        if (userId) {
          const refresh = () => {
            void loadDashboard(detail.scanReport);
          };
          
          // Re-subscribe to ensure immediate update
          realtimeService.unsubscribe(`clinical_analyses_${userId}`);
          realtimeService.subscribeToClinicalAnalyses(userId, refresh);
        }
      } else {
        void loadDashboard(detail.scanReport);
      }
    };

    window.addEventListener('refreshEventSection', handleRefreshEvents as EventListener);
    return () => {
      window.removeEventListener('refreshEventSection', handleRefreshEvents as EventListener);
    };
  }, [loadDashboard, userId]);

  // Realtime: clinical_analyses + glow_journeys + scheduled_scans
  useEffect(() => {
    if (!userId) return;

    const refresh = () => {
      void loadDashboard();
    };

    // Re-subscribe cleanly so feed updates immediately after inserts
    realtimeService.unsubscribe(`clinical_analyses_${userId}`);
    realtimeService.unsubscribe(`glow_journeys_${userId}`);
    realtimeService.unsubscribe(`scheduled_scans_${userId}`);

    realtimeService.subscribeToClinicalAnalyses(userId, refresh);
    realtimeService.subscribeToGlowJourneys(userId, refresh);
    realtimeService.subscribeToScheduledScans(userId, refresh);

    return () => {
      realtimeService.unsubscribe(`clinical_analyses_${userId}`);
      realtimeService.unsubscribe(`glow_journeys_${userId}`);
      realtimeService.unsubscribe(`scheduled_scans_${userId}`);
    };
  }, [userId, loadDashboard]);

  const handleScheduleScan = useCallback(async (date: Date, time: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        throw new Error('Please log in to schedule a scan');
      }

      const created = await ScheduledScansService.create({
        user_id: user.id,
        scheduled_at: date,
        scheduled_time: time,
      });

      const nextSchedules = [...scheduledScans, created].sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      );
      setScheduledScans(nextSchedules);
      rebuildEvents(previousReports, glowJourney, journeyStats, nextSchedules);
      toast.success('Scan scheduled');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to schedule scan';
      toast.error(message);
    }
  }, [scheduledScans, previousReports, glowJourney, journeyStats, rebuildEvents]);

  const calculateTimeRemaining = useCallback((scheduledDate: Date) => {
    const now = new Date();
    const diff = scheduledDate.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
      return `${days} days and ${remainingHours} hours`;
    } else if (hours > 0) {
      return `${hours} hours`;
    } else {
      return 'Less than 1 hour';
    }
  }, []);

  const getEventIcon = (type: EventData['type']) => {
    switch (type) {
      case 'journey': return <Calendar className="w-5 h-5" />;
      case 'scan': return <Activity className="w-5 h-5" />;
      case 'milestone': return <Target className="w-5 h-5" />;
      case 'achievement': return <Award className="w-5 h-5" />;
      case 'appointment': return <Clock className="w-5 h-5" />;
      case 'recommendation': return <Stethoscope className="w-5 h-5" />;
      case 'product': return <ShoppingBag className="w-5 h-5" />;
      case 'trend': return <BarChart3 className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getEventColor = (type: EventData['type'], priority?: EventData['priority']) => {
    const baseColors = {
      journey: 'text-blue-600 bg-blue-100',
      scan: 'text-green-600 bg-green-100',
      milestone: 'text-purple-600 bg-purple-100',
      achievement: 'text-yellow-600 bg-yellow-100',
      appointment: 'text-red-600 bg-red-100',
      recommendation: 'text-indigo-600 bg-indigo-100',
      product: 'text-pink-600 bg-pink-100',
      trend: 'text-cyan-600 bg-cyan-100'
    };
    
    if (priority === 'high') {
      return 'text-red-600 bg-red-100';
    }
    return baseColors[type] ?? 'text-gray-600 bg-gray-100';
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderOverview = () => (
    <div className="space-y-4 sm:space-y-6">
      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError}
          <button
            onClick={() => loadDashboard()}
            className="mt-2 block font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading && !scanReport && (
        <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-500 text-sm">
          Loading live clinical data…
        </div>
      )}

      {/* Latest Scan Report */}
      {scanReport && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-bold text-gray-900">Latest Scan Report</h3>
          </div>
          
          {typeof scanReport.overallSkinHealthScore === 'number' && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-700">Skin Health Score</span>
                <span className="text-xl font-bold text-purple-700">
                  {Math.round(scanReport.overallSkinHealthScore)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round(scanReport.overallSkinHealthScore))}%` }}
                />
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            {scanReport.skinType && (
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <span className="text-xs font-semibold text-gray-600 block">Skin Type</span>
                <span className="text-sm font-bold text-gray-900">{getSkinTypeLabel(scanReport)}</span>
              </div>
            )}
            {typeof scanReport.clinicalMetrics?.moisture === 'number' && (
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <span className="text-xs font-semibold text-gray-600 block">Moisture</span>
                <span className="text-sm font-bold text-gray-900">{Math.round(scanReport.clinicalMetrics.moisture)}%</span>
              </div>
            )}
            {scanReport.acne?.level && (
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <span className="text-xs font-semibold text-gray-600 block">Acne Level</span>
                <span className="text-sm font-bold text-gray-900">{scanReport.acne.level}</span>
              </div>
            )}
            {typeof scanReport.clinicalMetrics?.texture === 'number' && (
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <span className="text-xs font-semibold text-gray-600 block">Texture</span>
                <span className="text-sm font-bold text-gray-900">{Math.round(scanReport.clinicalMetrics.texture)}%</span>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setActiveTab('scans')}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
          >
            View Full Scan History
          </button>
        </div>
      )}

      {/* Quick Stats - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs opacity-75">Health</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold">
            {typeof scanReport?.overallSkinHealthScore === 'number'
              ? `${Math.round(scanReport.overallSkinHealthScore)}%`
              : '—'}
          </div>
          <div className="text-xs opacity-75">Skin Score</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs opacity-75">Day</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold">{journeyStats?.currentDay ?? 0}/30</div>
          <div className="text-xs opacity-75">Journey</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs opacity-75">Streak</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold">{journeyStats?.streakDays ?? 0}🔥</div>
          <div className="text-xs opacity-75">Days</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs opacity-75">Points</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold">{journeyStats?.glowPoints ?? 0}</div>
          <div className="text-xs opacity-75">Glow</div>
        </div>
      </div>

      
      {/* Recent Activity — database-backed only */}
      <div>
        <h3 className="text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recent Activity & Updates
        </h3>
        <div className="space-y-2 sm:space-y-3">
          {events.length === 0 && !isLoading && (
            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500 text-center">
              No database activity yet. Complete and save a skin scan.
            </div>
          )}
          {events.slice(0, 6).map((event) => (
            <div key={event.id} className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl ${
              event.priority === 'high' ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
            }`}>
              <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${getEventColor(event.type, event.priority)}`}>
                <div className="w-3 h-3 sm:w-4 sm:h-4">
                  {getEventIcon(event.type)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs sm:text-sm flex items-center gap-2 truncate">
                  {event.title}
                  {event.priority === 'high' && (
                    <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full flex-shrink-0">High</span>
                  )}
                </div>
                <div className="text-xs text-gray-600 truncate">{event.description}</div>
                <div className="text-xs text-gray-500 mt-0.5 sm:mt-1">{formatDate(event.timestamp)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          <button
              onClick={() => setShowScheduleModal(true)}
              className="p-2 sm:p-3 bg-green-500 text-white rounded-lg sm:rounded-xl font-medium hover:bg-green-600 transition-colors text-xs sm:text-sm"
            >
              📅 Schedule Next Scan
            </button>
                  </div>
      </div>
    </div>
  );

  const renderJourney = () => {
    const upcomingScan = scheduledScans.find(
      (scan) => scan.status === 'upcoming' && new Date(scan.scheduled_at) > new Date()
    );

    return (
    <div className="space-y-4 sm:space-y-6">
      {/* Journey Progress */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white">
        <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">30-Day Glow Journey</h3>
        
        <div className="mb-4 sm:mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span>{journeyStats?.currentDay ?? 0}/30 days</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 sm:h-3">
            <div 
              className="bg-white rounded-full h-2 sm:h-3 transition-all duration-500"
              style={{ width: `${((journeyStats?.currentDay ?? 0) / 30) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
          <div className="text-center">
            <div className="text-lg sm:text-2xl font-bold">{journeyStats?.totalScans ?? 0}</div>
            <div className="text-xs opacity-75">Total Scans</div>
          </div>
          <div className="text-center">
            <div className="text-lg sm:text-2xl font-bold">{journeyStats?.streakDays ?? 0}🔥</div>
            <div className="text-xs opacity-75">Current Streak</div>
          </div>
          <div className="text-center">
            <div className="text-lg sm:text-2xl font-bold">{journeyStats?.glowPoints ?? 0}</div>
            <div className="text-xs opacity-75">Glow Points</div>
          </div>
        </div>
      </div>

      {/* Upcoming Scheduled Scan */}
      {upcomingScan && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white">
          <h4 className="text-base sm:text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            Next Scheduled Scan
          </h4>
          <div className="text-sm sm:text-base">
            <div className="mb-2">
              <strong>Date:</strong> {new Date(upcomingScan.scheduled_at).toLocaleDateString()}
            </div>
            <div className="mb-2">
              <strong>Time:</strong> {upcomingScan.scheduled_time}
            </div>
            <div className="text-xs sm:text-sm bg-white/20 rounded-lg p-2 sm:p-3">
              {calculateTimeRemaining(new Date(upcomingScan.scheduled_at))} remaining
            </div>
          </div>
        </div>
      )}

      {/* Journey Actions */}
      <div className="space-y-2 sm:space-y-3">
        <button 
          onClick={() => setActiveTab('insights')}
          className="w-full p-3 sm:p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium flex items-center justify-between group hover:shadow-lg transition-all"
        >
          <span>📊 View Progress</span>
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
        </button>
        <button 
          onClick={() => setActiveTab('achievements')}
          className="w-full p-3 sm:p-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium flex items-center justify-between group hover:shadow-lg transition-all"
        >
          <span>🏆 View Achievements</span>
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
  };

  const renderScans = () => (
    <div className="space-y-6">
      {/* Latest Scan Results */}
      {scanReport ? (
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
          <h3 className="text-xl font-bold mb-4">Latest Scan Results</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-3xl font-bold mb-1">
                {typeof scanReport.overallSkinHealthScore === 'number'
                  ? `${Math.round(scanReport.overallSkinHealthScore)}%`
                  : '—'}
              </div>
              <div className="text-sm opacity-75">Overall Health</div>
            </div>
            <div>
              <div className="text-2xl font-bold mb-1">{getSkinTypeLabel(scanReport)}</div>
              <div className="text-sm opacity-75">Skin Type</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {getReportMetricCards(scanReport).map((metric) => (
              <div key={metric.label} className="rounded-xl bg-white/15 p-3 backdrop-blur-sm border border-white/10">
                <div className="text-xs uppercase tracking-wide opacity-75">{metric.label}</div>
                <div className="text-lg font-bold">{Math.round(metric.value)}%</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-500">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No scan data available yet. Complete a skin analysis to see your results.</p>
        </div>
      )}

      {/* Scan History */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Scan History</h3>
        <div className="space-y-3">
          {scanHistory.length > 0 ? (
            scanHistory.map((report, index) => (
              <div key={report.savedAnalysisId ?? report.id ?? index} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">Skin Analysis #{index + 1}</span>
                  <span className="text-xs text-gray-500">{formatDate(new Date(report.created_at))}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="text-xs text-gray-500">Health</div>
                    <div className="font-semibold text-gray-900">
                      {typeof report.overallSkinHealthScore === 'number'
                        ? `${Math.round(report.overallSkinHealthScore)}%`
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Skin Type</div>
                    <div className="font-semibold text-gray-900">{getSkinTypeLabel(report)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Moisture</div>
                    <div className="font-semibold text-gray-900">
                      {typeof report.clinicalMetrics?.moisture === 'number'
                        ? `${Math.round(report.clinicalMetrics.moisture)}%`
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Texture</div>
                    <div className="font-semibold text-gray-900">
                      {typeof report.clinicalMetrics?.texture === 'number'
                        ? `${Math.round(report.clinicalMetrics.texture)}%`
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-500">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No saved scan history found yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderInsights = () => {
    if (!scanReport) {
      return (
        <div className="text-center py-8">
          <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Complete a skin analysis to see insights</p>
        </div>
      );
    }

    const insights = computeActionableInsights(scanReport);
    const trends = computeTrendInsights(scanReport, previousReports);

    return (
      <div className="space-y-6">
        {/* Actionable Insights */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Actionable Insights
          </h3>
          <div className="space-y-3">
            {insights.length === 0 && (
              <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-500">
                No insight thresholds met for the latest saved scan.
              </div>
            )}
            {insights.map((insight, index) => (
              <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  {insight.icon}
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-1">{insight.title}</div>
                    <div className="text-xs text-gray-600">{insight.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Before/After Comparison */}
        {previousReports.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Before/After Comparison
            </h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <BeforeAfterComparison 
                userId={userId}
                height={300}
                showDetails={true}
              />
            </div>
          </div>
        )}

        {/* Trend Analysis */}
        {trends.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Trend Analysis
            </h3>
            <div className="space-y-3">
              {trends.map((trend, index) => (
                <div key={`trend-${index}`} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{trend.title}</span>
                    {trend.improvement ? (
                      <ArrowUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className="text-xs text-gray-600">{trend.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CalendarPlus className="w-5 h-5" />
            Next Steps
          </h3>
          <div className="space-y-3">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="font-medium text-sm mb-2">📅 Schedule Next Scan</div>
              <div className="text-xs text-gray-600 mb-3">Recommended: Scan again in 7 days to track progress</div>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="w-full p-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
              >
                Schedule Next Scan
              </button>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="font-medium text-sm mb-2">📊 Track 30-Day Progress</div>
              <div className="text-xs text-gray-600">Monitor your skin health journey over time</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAchievements = () => (
    <div className="space-y-6">
      {/* Achievements Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-4 text-white text-center">
          <div className="text-3xl mb-2">🔥</div>
          <div className="font-bold">{journeyStats?.streakDays ?? 0} Days</div>
          <div className="text-xs opacity-75">Current Streak</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl p-4 text-white text-center">
          <div className="text-3xl mb-2">📸</div>
          <div className="font-bold">{journeyStats?.totalScans ?? 0}</div>
          <div className="text-xs opacity-75">Total Scans</div>
        </div>

        <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-4 text-white text-center">
          <div className="text-3xl mb-2">⭐</div>
          <div className="font-bold">{journeyStats?.glowPoints ?? 0}</div>
          <div className="text-xs opacity-75">Glow Points</div>
        </div>

        <div className="bg-gradient-to-br from-pink-400 to-red-500 rounded-2xl p-4 text-white text-center">
          <div className="text-3xl mb-2">🎯</div>
          <div className="font-bold">{journeyStats?.currentDay ?? 0}/30</div>
          <div className="text-xs opacity-75">Day Progress</div>
        </div>
      </div>

      {/* Achievement List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Recent Achievements</h3>
        <div className="space-y-3">
          {events.filter(e => e.type === 'achievement' || e.type === 'milestone').length === 0 && (
            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500 text-center">
              No journey achievements recorded yet.
            </div>
          )}
          {events.filter(e => e.type === 'achievement' || e.type === 'milestone').map((event) => (
            <div key={event.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className={`p-2 rounded-full ${getEventColor(event.type)}`}>
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{event.title}</div>
                <div className="text-xs text-gray-500">{event.description}</div>
              </div>
              <div className="text-xs text-gray-400">{formatDate(event.timestamp)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="glass-header sticky top-0 z-30">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 text-white flex items-center gap-3">
          <button
            onClick={onNavigateHome}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <Home className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold">Event Dashboard</h2>
        </div>
        
        {/* Tabs - Responsive Design */}
        <div className="bg-white/10 p-1">
          {/* Desktop: Horizontal tabs */}
          <div className="hidden sm:flex gap-2">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'journey', label: 'Journey', icon: Calendar },
              { id: 'scans', label: 'Scans', icon: TrendingUp },
              { id: 'insights', label: 'Insights', icon: Lightbulb },
              { id: 'achievements', label: 'Achievements', icon: Award }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  activeTab === id
                    ? 'bg-white text-purple-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
          
          {/* Mobile: Scrollable tabs */}
          <div className="sm:hidden flex gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'journey', label: 'Journey', icon: Calendar },
              { id: 'scans', label: 'Scans', icon: TrendingUp },
              { id: 'insights', label: 'Insights', icon: Lightbulb },
              { id: 'achievements', label: 'Achievements', icon: Award }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg transition-all whitespace-nowrap min-w-0 flex-shrink-0 ${
                  activeTab === id
                    ? 'bg-white text-purple-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-3 h-3 flex-shrink-0" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content - Proper Scroll */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'journey' && renderJourney()}
        {activeTab === 'scans' && renderScans()}
        {activeTab === 'insights' && renderInsights()}
        {activeTab === 'achievements' && renderAchievements()}
      </div>

      {/* Bottom Nav */}
      <div className="glass-nav sticky bottom-0 z-30">
        <BottomNav
          onNavigateHome={onNavigateHome}
          onNavigateToMirror={onNavigateToMirror}
          onNavigateToProfile={onNavigateToProfile}
        />
      </div>

      {/* Schedule Scan Modal */}
      {showScheduleModal && (
        <ScheduleScanModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          onSchedule={handleScheduleScan}
        />
      )}
    </div>
  );
};
