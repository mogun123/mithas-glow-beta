import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { supabase } from '../lib/supabase';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SkinProgressGraphProps {
  journeyId?: string;
  userId?: string;
  height?: number;
  showDetails?: boolean;
}

interface AnalysisData {
  id: string;
  scan_timestamp: string;
  skin_score: number;
  final_redness_score: number;
  final_texture_score: number;
  melanin_index: number;
  overall_skin_health_score: number;
  date_label: string;
}

interface TooltipContentProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<TooltipContentProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200" style={{ minWidth: '180px' }}>
        <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Skin Score:</span>
            <span className="text-xs font-bold text-purple-600">{data.skin_score.toFixed(1)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Redness:</span>
            <span className="text-xs font-medium text-red-600">{data.final_redness_score.toFixed(1)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Texture:</span>
            <span className="text-xs font-medium text-blue-600">{data.final_texture_score.toFixed(1)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Melanin:</span>
            <span className="text-xs font-medium text-amber-600">{data.melanin_index.toFixed(1)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const SkinProgressGraph: React.FC<SkinProgressGraphProps> = ({
  journeyId,
  userId,
  height = 250,
  showDetails = true
}) => {
  const [analyses, setAnalyses] = useState<AnalysisData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate skin score based on the formula provided
  const calculateSkinScore = useCallback((redness: number, texture: number, acne: number, melaninStability: number) => {
    return (
      (texture * 0.3) +
      ((100 - redness) * 0.3) +
      ((100 - acne) * 0.25) +
      (melaninStability * 0.15)
    );
  }, []);

  // Fetch journey analyses
  useEffect(() => {
    const fetchAnalyses = async () => {
      if (!journeyId && !userId) return;

      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('face_analyses')
          .select('*')
          .order('scan_timestamp', { ascending: true });

        if (journeyId) {
          query = query.eq('journey_id', journeyId);
        } else if (userId) {
          // Get all user's analyses ordered by date
          query = query.eq('user_id', userId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          throw fetchError;
        }

        if (data && data.length > 0) {
          const processedData: AnalysisData[] = data.map((analysis: any) => {
            // Extract acne severity from skin conditions
            const acneSeverity = analysis.skin_conditions_result?.conditions?.acne?.severity || 0;
            
            // Calculate melanin stability (inverse of melanin index variance)
            const melaninStability = Math.max(0, 100 - (analysis.melanin_index || 0));
            
            // Calculate skin score using the provided formula
            const skinScore = calculateSkinScore(
              analysis.final_redness_score || 0,
              analysis.final_texture_score || 0,
              acneSeverity,
              melaninStability
            );

            return {
              id: analysis.id,
              scan_timestamp: analysis.scan_timestamp,
              skin_score: skinScore,
              final_redness_score: analysis.final_redness_score || 0,
              final_texture_score: analysis.final_texture_score || 0,
              melanin_index: analysis.melanin_index || 0,
              overall_skin_health_score: analysis.overall_skin_health_score || skinScore,
              date_label: new Date(analysis.scan_timestamp).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })
            };
          });

          setAnalyses(processedData);
        } else {
          setAnalyses([]);
        }
      } catch (err: any) {
        console.error('Error fetching progress data:', err);
        setError(err.message || 'Failed to load progress data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
  }, [journeyId, userId, calculateSkinScore]);

  // Calculate trend and improvements
  const metrics = useMemo(() => {
    if (analyses.length < 2) return null;

    const first = analyses[0];
    const latest = analyses[analyses.length - 1];

    const skinScoreImprovement = latest.skin_score - first.skin_score;
    const rednessImprovement = first.final_redness_score - latest.final_redness_score;
    const textureImprovement = latest.final_texture_score - first.final_texture_score;

    return {
      skinScoreImprovement,
      rednessImprovement,
      textureImprovement,
      trend: skinScoreImprovement > 0 ? 'improving' : skinScoreImprovement < 0 ? 'declining' : 'stable',
      averageScore: analyses.reduce((sum, a) => sum + a.skin_score, 0) / analyses.length
    };
  }, [analyses]);

  // Render fallback UI when no data
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Loading progress data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-red-600 text-lg">!</span>
            </div>
            <p className="text-sm text-gray-600 mb-1">Unable to load progress</p>
            <p className="text-xs text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 mb-1">No progress data yet</p>
            <p className="text-xs text-gray-500">Complete more scans to see your progress</p>
          </div>
        </div>
      </div>
    );
  }

  const TrendIcon = metrics?.trend === 'improving' ? TrendingUp : 
                    metrics?.trend === 'declining' ? TrendingDown : Minus;
  const trendColor = metrics?.trend === 'improving' ? 'text-green-600' : 
                     metrics?.trend === 'declining' ? 'text-red-600' : 'text-gray-600';

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      {showDetails && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900">Skin Progress</h3>
            {metrics && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 ${trendColor}`}>
                <TrendIcon className="w-4 h-4" />
                <span className="text-xs font-medium capitalize">
                  {metrics.trend}
                </span>
              </div>
            )}
          </div>
          
          {metrics && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {metrics.averageScore.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500">Avg Score</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${metrics.skinScoreImprovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.skinScoreImprovement >= 0 ? '+' : ''}{metrics.skinScoreImprovement.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500">Score Change</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analyses.length}
                </div>
                <div className="text-xs text-gray-500">Total Scans</div>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ height: height - (showDetails ? 120 : 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={analyses} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="skinScoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis 
              dataKey="date_label" 
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="skin_score"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#skinScoreGradient)"
              dot={{ fill: '#8b5cf6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {showDetails && metrics && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Redness:</span>
              <span className={`font-medium ${metrics.rednessImprovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.rednessImprovement >= 0 ? '-' : '+'}{Math.abs(metrics.rednessImprovement).toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Texture:</span>
              <span className={`font-medium ${metrics.textureImprovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.textureImprovement >= 0 ? '+' : ''}{metrics.textureImprovement.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkinProgressGraph;
