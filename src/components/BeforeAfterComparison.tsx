import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, ArrowRight, Calendar, TrendingUp, TrendingDown, Minus, Image as ImageIcon } from 'lucide-react';

interface BeforeAfterComparisonProps {
  journeyId?: string;
  userId?: string;
  height?: number;
  showDetails?: boolean;
}

interface AnalysisData {
  id: string;
  created_at: string;
  updated_at: string;
  last_updated?: string;
  metrics: {
    redness: number;
    texture: number;
    acne: number;
    moisture: number;
    pores: number;
    pigment: number;
    darkCircle: number;
    elasticity: number;
    glassSkin: number;
  };
  lab_values: {
    overall: { l: number; a: number; b: number };
    forehead: { l: number; a: number; b: number };
    leftCheek: { l: number; a: number; b: number };
    rightCheek: { l: number; a: number; b: number };
    nose: { l: number; a: number; b: number };
    chin: { l: number; a: number; b: number };
  };
  frame_data: {
    center: { image: string; timestamp: string };
    left: { image: string; timestamp: string };
    right: { image: string; timestamp: string };
  };
  skin_tone: string;
  undertone: string;
  skin_type: string;
}

interface ComparisonMetrics {
  rednessImprovement: number;
  textureImprovement: number;
  acneReduction: number;
  overallImprovement: number;
  trend: 'improving' | 'declining' | 'stable';
}

const BeforeAfterComparison: React.FC<BeforeAfterComparisonProps> = ({
  journeyId,
  userId,
  height = 400,
  showDetails = true
}) => {
  const [analyses, setAnalyses] = useState<AnalysisData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch clinical analyses
  useEffect(() => {
    const fetchAnalyses = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('clinical_analyses')
          .select('id, created_at, updated_at, last_updated, metrics, lab_values, frame_data, skin_tone, undertone, skin_type')
          .eq('user_id', userId)
          .order('updated_at', { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        if (data && data.length > 0) {
          setAnalyses(data);
        } else {
          setAnalyses([]);
        }
      } catch (err: any) {
        console.error('Error fetching comparison data:', err);
        setError(err.message || 'Failed to load comparison data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
  }, [userId]);

  // Get first and latest scans for comparison
  const comparisonData = useMemo(() => {
    if (analyses.length < 2) return null;

    const first = analyses[0];
    const latest = analyses[analyses.length - 1];

    // Extract metrics from clinical data
    const firstAcne = first.metrics?.acne || 0;
    const latestAcne = latest.metrics?.acne || 0;
    
    // Calculate overall skin health score from metrics
    const calculateOverallScore = (analysis: AnalysisData) => {
      const metrics = analysis.metrics;
      return (
        (100 - metrics.redness) * 0.2 +
        (100 - metrics.acne) * 0.25 +
        metrics.texture * 0.2 +
        metrics.moisture * 0.15 +
        metrics.elasticity * 0.2
      );
    };

    const firstOverallScore = calculateOverallScore(first);
    const latestOverallScore = calculateOverallScore(latest);

    // Calculate improvements
    const rednessImprovement = first.metrics.redness - latest.metrics.redness;
    const textureImprovement = latest.metrics.texture - first.metrics.texture;
    const acneReduction = firstAcne - latestAcne;
    const overallImprovement = latestOverallScore - firstOverallScore;

    return {
      first,
      latest,
      improvements: {
        rednessImprovement,
        textureImprovement,
        acneReduction,
        overallImprovement,
        trend: overallImprovement > 5 ? 'improving' : overallImprovement < -5 ? 'declining' : 'stable'
      }
    };
  }, [analyses]);

  // Handle slider drag
  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  }, [isDragging]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  }, [isDragging]);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    const handleGlobalTouchEnd = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchend', handleGlobalTouchEnd);
    }

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging]);

  // Render loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Loading comparison data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-red-600 text-lg">!</span>
            </div>
            <p className="text-sm text-gray-600 mb-1">Unable to load comparison</p>
            <p className="text-xs text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Render insufficient data state
  if (!comparisonData) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ImageIcon className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Need more scans for comparison</p>
            <p className="text-xs text-gray-500">Complete at least 2 scans to see before/after</p>
          </div>
        </div>
      </div>
    );
  }

  const { first, latest, improvements } = comparisonData;
  const TrendIcon = improvements.trend === 'improving' ? TrendingUp : 
                    improvements.trend === 'declining' ? TrendingDown : Minus;
  const trendColor = improvements.trend === 'improving' ? 'text-green-600' : 
                     improvements.trend === 'declining' ? 'text-red-600' : 'text-gray-600';

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      {showDetails && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900">Before & After</h3>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-xs font-medium capitalize">
                {improvements.trend}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-600">
                {(() => {
                  const score = (100 - first.metrics.redness) * 0.2 + 
                               (100 - first.metrics.acne) * 0.25 + 
                               first.metrics.texture * 0.2 + 
                               first.metrics.moisture * 0.15 + 
                               first.metrics.elasticity * 0.2;
                  return score.toFixed(1);
                })()}
              </div>
              <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(first.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${trendColor}`}>
                {(() => {
                  const score = (100 - latest.metrics.redness) * 0.2 + 
                               (100 - latest.metrics.acne) * 0.25 + 
                               latest.metrics.texture * 0.2 + 
                               latest.metrics.moisture * 0.15 + 
                               latest.metrics.elasticity * 0.2;
                  return score.toFixed(1);
                })()}
              </div>
              <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(latest.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Comparison Slider */}
      <div 
        className="relative rounded-lg overflow-hidden bg-gray-100 cursor-ew-resize select-none"
        style={{ height: height - (showDetails ? 120 : 40) }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Before Image */}
        <div className="absolute inset-0">
          {first.frame_data?.center?.image ? (
            <img 
              src={first.frame_data.center.image} 
              alt="Before" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xODAgMTgwQzE4MCAxNjIuNjg2IDE5NC42ODYgMTQ4IDIxMiAxNDhDMjI5LjMxNCAxNDggMjQ0IDE2Mi42ODYgMjQ0IDE4MEMyNDQgMTk3LjMxNCAyMjkuMzE0IDIxMiAyMTIgMjEyQzE5NC42ODYgMjEyIDE4MCAxOTcuMzE0IDE4MCAxODBaIiBmaWxsPSIjRDRENEY2Ii8+CjxwYXRoIGQ9Ik0xNjAgMjIwQzE2MCAyMDIuNjg2IDE3NC42ODYgMTg4IDE5MiAxODhDMjA5LjMxNCAxODggMjI0IDIwMi42ODYgMjI0IDIyMEMyMjQgMjM3LjMxNCAyMDkuMzE0IDI1MiAxOTIgMjUyQzE3NC42ODYgMjUyIDE2MCAyMzcuMzE0IDE2MCAyMjBaIiBmaWxsPSIjRTBFMEUwIi8+CjxwYXRoIGQ9Ik0yMDAgMTYwQzIwMCAxNDIuNjg2IDIxNC42ODYgMTI4IDIzMiAxMjhDMjQ5LjMxNCAxMjggMjY0IDE0Mi42ODYgMjY0IDE2MEMyNjQgMTc3LjMxNCAyNDkuMzE0IDE5MiAyMzIgMTkyQzIxNC42ODYgMTkyIDIwMCAxNzcuMzE0IDIwMCAxNjBaIiBmaWxsPSIjRjJGMkYyIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUNBM0FGIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCI+QmVmb3JlPC90ZXh0Pgo8L3N2Zz4=';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <div className="text-center">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Before image not available</p>
              </div>
            </div>
          )}
        </div>

        {/* After Image (clipped) */}
        <div 
          className="absolute inset-0"
          style={{ 
            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
          }}
        >
          {latest.frame_data?.center?.image ? (
            <img 
              src={latest.frame_data.center.image} 
              alt="After" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xODAgMTgwQzE4MCAxNjIuNjg2IDE5NC42ODYgMTQ4IDIxMiAxNDhDMjI5LjMxNCAxNDggMjQ0IDE2Mi42ODYgMjQ0IDE4MEMyNDQgMTk3LjMxNCAyMjkuMzE0IDIxMiAyMTIgMjEyQzE5NC42ODYgMjEyIDE4MCAxOTcuMzE0IDE4MCAxODBaIiBmaWxsPSIjRDRENEY2Ii8+CjxwYXRoIGQ9Ik0xNjAgMjIwQzE2MCAyMDIuNjg2IDE3NC42ODYgMTg4IDE5MiAxODhDMjA5LjMxNCAxODggMjI0IDIwMi42ODYgMjI0IDIyMEMyMjQgMjM3LjMxNCAyMDkuMzE0IDI1MiAxOTIgMjUyQzE3NC42ODYgMjUyIDE2MCAyMzcuMzE0IDE2MCAyMjBaIiBmaWxsPSIjRTBFMEUwIi8+CjxwYXRoIGQ9Ik0yMDAgMTYwQzIwMCAxNDIuNjg2IDIxNC42ODYgMTI4IDIzMiAxMjhDMjQ5LjMxNCAxMjggMjY0IDE0Mi42ODYgMjY0IDE2MEMyNjQgMTc3LjMxNCAyNDkuMzE0IDE5MiAyMzIgMTkyQzIxNC42ODYgMTkyIDIwMCAxNzcuMzE0IDIwMCAxNjBaIiBmaWxsPSIjRjJGMkYyIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUNBM0FGIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCI+QWZ0ZXI8L3RleHQ+Cjwvc3ZnPg==';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <div className="text-center">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">After image not available</p>
              </div>
            </div>
          )}
        </div>

        {/* Slider Handle */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
            <div className="flex gap-0.5">
              <ArrowLeft className="w-3 h-3 text-gray-600" />
              <ArrowRight className="w-3 h-3 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs font-medium">
          Before
        </div>
        <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs font-medium">
          After
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">Improvements</h4>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Redness:</span>
                  <span className={`font-medium ${improvements.rednessImprovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {improvements.rednessImprovement >= 0 ? '-' : '+'}{Math.abs(improvements.rednessImprovement).toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Texture:</span>
                  <span className={`font-medium ${improvements.textureImprovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {improvements.textureImprovement >= 0 ? '+' : ''}{improvements.textureImprovement.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Acne:</span>
                  <span className={`font-medium ${improvements.acneReduction >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {improvements.acneReduction >= 0 ? '-' : '+'}{Math.abs(improvements.acneReduction).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">Overall Change</h4>
              <div className="text-center">
                <div className={`text-2xl font-bold ${trendColor}`}>
                  {improvements.overallImprovement >= 0 ? '+' : ''}{improvements.overallImprovement.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500">Skin Health Score</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BeforeAfterComparison;
