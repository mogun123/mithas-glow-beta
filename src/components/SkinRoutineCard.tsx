import React, { useState, useEffect } from 'react';
import { Clock, Target, Sparkles, ChevronDown, ChevronUp, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { aiRoutineEngine, SkinRoutine } from '../features/skinRoutine/aiRoutineEngine';

interface SkinRoutineCardProps {
  userId?: string;
  journeyId?: string;
  latestAnalysisId?: string;
  compact?: boolean;
  showActions?: boolean;
}

const SkinRoutineCard: React.FC<SkinRoutineCardProps> = ({
  userId,
  journeyId,
  latestAnalysisId,
  compact = false,
  showActions = true
}) => {
  const [routine, setRoutine] = useState<SkinRoutine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [adherenceRate, setAdherenceRate] = useState<number>(0);

  useEffect(() => {
    if (userId && latestAnalysisId) {
      loadRoutine();
    }
  }, [userId, latestAnalysisId]);

  const loadRoutine = async () => {
    if (!userId || !latestAnalysisId) return;

    try {
      setLoading(true);
      setError(null);

      // Get latest analysis data
      const { data: analysis } = await supabase
        .from('face_analyses')
        .select('*')
        .eq('id', latestAnalysisId)
        .single();

      if (!analysis) {
        throw new Error('Analysis not found');
      }

      // Get historical data for trend analysis
      const { data: historicalAnalyses } = await supabase
        .from('face_analyses')
        .select('*')
        .eq('user_id', userId)
        .eq('journey_id', journeyId)
        .order('scan_timestamp', { ascending: false })
        .limit(5);

      const historicalData = historicalAnalyses || [];

      // Generate AI routine
      const metrics = {
        final_redness_score: analysis.final_redness_score,
        final_texture_score: analysis.final_texture_score,
        melanin_index: analysis.melanin_index,
        overall_skin_health_score: analysis.overall_skin_health_score,
        skin_conditions: analysis.skin_conditions_result?.conditions || {},
        skin_tone: analysis.skin_tone_result?.skinTone || 'Medium',
        undertone: analysis.undertone_result?.undertone || 'Neutral',
        skin_age: analysis.skin_age_result?.estimatedAge || 30
      };

      const generatedRoutine = await aiRoutineEngine.generateSkinRoutine(
        metrics,
        historicalData,
        {
          user_id: userId,
          journey_id: journeyId,
          budget_tier: 'medium',
          lifestyle_factors: {
            time_available: 15,
            preference_natural: true,
            sensitivity_level: 'medium',
            climate: 'temperate'
          }
        }
      );

      setRoutine(generatedRoutine);
      
      // Calculate adherence rate (mock data for demo)
      const mockAdherence = Math.floor(Math.random() * 30) + 60; // 60-90%
      setAdherenceRate(mockAdherence);

    } catch (err: any) {
      console.error('Error loading routine:', err);
      setError(err.message || 'Failed to load routine');
    } finally {
      setLoading(false);
    }
  };

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getStepIcon = (category: string) => {
    switch (category) {
      case 'cleanse':
        return 'wash';
      case 'treat':
        return 'droplet';
      case 'moisturize':
        return 'cream';
      case 'protect':
        return 'shield';
      default:
        return 'sparkles';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="text-center py-4">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={loadRoutine}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!routine) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="text-center py-4">
          <Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Complete a scan to get your AI routine</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-xl'}`}>
              AI {routine.routine_type.charAt(0).toUpperCase() + routine.routine_type.slice(1)} Routine
            </h3>
          </div>
          
          <p className="text-sm text-gray-600 mb-2">
            {routine.primary_concern.charAt(0).toUpperCase() + routine.primary_concern.replace('_', ' ')} Focus
          </p>
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{routine.total_time_minutes} min</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              <span>{routine.estimated_cost_range}</span>
            </div>
            {adherenceRate > 0 && (
              <div className="flex items-center gap-1">
                <span className={`font-medium ${adherenceRate >= 80 ? 'text-green-600' : adherenceRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {adherenceRate}% adherence
                </span>
              </div>
            )}
          </div>
        </div>
        
        {showActions && (
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Key Benefits */}
      {!compact && routine.key_benefits && routine.key_benefits.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Key Benefits</h4>
          <div className="flex flex-wrap gap-1">
            {routine.key_benefits.slice(0, 3).map((benefit, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
              >
                {benefit}
              </span>
            ))}
            {routine.key_benefits.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                +{routine.key_benefits.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Routine Steps */}
      <div className="space-y-3">
        {routine.steps.slice(0, compact ? 3 : routine.steps.length).map((step, index) => (
          <div key={step.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.priority === 'high' ? 'bg-red-100 text-red-600' :
                    step.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {index + 1}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{step.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(step.priority)}`}>
                      {step.priority}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{step.reason}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                    <span>{step.product_type}</span>
                    <span>{step.duration_minutes} min</span>
                    <span>{step.time_of_day}</span>
                  </div>

                  {/* Ingredients */}
                  {!compact && step.ingredients && step.ingredients.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-1">Key Ingredients:</p>
                      <div className="flex flex-wrap gap-1">
                        {step.ingredients.slice(0, 3).map((ingredient, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {ingredient}
                          </span>
                        ))}
                        {step.ingredients.length > 3 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            +{step.ingredients.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  {!compact && step.instructions && step.instructions.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleStepExpansion(step.id)}
                        className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 mb-1"
                      >
                        {expandedSteps.has(step.id) ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                        Instructions
                      </button>
                      
                      {expandedSteps.has(step.id) && (
                        <ol className="text-xs text-gray-600 space-y-1 ml-4">
                          {step.instructions.map((instruction, idx) => (
                            <li key={idx}>{instruction}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Reasoning */}
      {!compact && routine.ai_reasoning && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="bg-purple-50 p-3 rounded-lg">
            <h4 className="text-sm font-semibold text-purple-900 mb-2">AI Analysis</h4>
            <div className="space-y-1 text-xs text-purple-700">
              <p><strong>Condition:</strong> {routine.ai_reasoning.condition_detected}</p>
              <p><strong>Trend:</strong> {routine.ai_reasoning.trend_analysis}</p>
              <p><strong>Rationale:</strong> {routine.ai_reasoning.product_rationale}</p>
            </div>
          </div>
        </div>
      )}

      {/* Adherence Tips */}
      {!compact && routine.adherence_tips && routine.adherence_tips.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Tips for Success</h4>
          <ul className="space-y-1">
            {routine.adherence_tips.slice(0, 3).map((tip, index) => (
              <li key={index} className="text-xs text-gray-600 flex items-start gap-1">
                <Check className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      {showActions && !compact && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex gap-2">
            <button className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors">
              Mark Complete
            </button>
            <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Remind Me
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkinRoutineCard;
