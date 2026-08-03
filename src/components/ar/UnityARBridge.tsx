/**
 * Unity AR Bridge Component
 * 
 * Bridges React frontend with Unity WebGL AR module.
 * Handles communication, message passing, and state synchronization.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';

interface UnityARBridgeProps {
  onUnityInitialized?: () => void;
  onStyleApplied?: (styleId: string) => void;
  onTrackingState?: (isTracking: boolean, confidence: number) => void;
  onRendererMetrics?: (metrics: UnityRendererMetrics) => void;
  selectedStyle?: {
    id:               string;
    name:             string;
    category:         string;
    density_level:    number;
    tone:             string;
    model_3d_url:     string;
    alpha_mask_url:   string;
    density_map_url:  string;
    strand_map_url:   string;
    beard_texture_url: string;
    normal_map_url?:  string;
  };
  faceShape?: {
    shape: string;
    jawWidth: number;
    chinDepth: number;
    cheekFullness: number;
  };
  // Phase 10: Growth Journey slider (Day 1-30 normalised to 0-1)
  growthDay?: number;
  // Phase 11: Lighting Mode (0=Daylight 1=Office 2=Night 3=Studio 4=Outdoor)
  lightingMode?: number;
}

interface UnityRendererMetrics {
  fps: number;
  trackingConfidence: number;
  meshState: string;
  timestamp: number;
}

interface UnityLogEntry {
  level: 'log' | 'warning' | 'error';
  message: string;
  stackTrace: string;
  timestamp: number;
}

interface UnityMessage {
  type: string;
  success?: boolean;
  error?: string;
  styleId?: string;
  isTracking?: boolean;
  confidence?: number;
  fps?: number;
  meshState?: string;
  timestamp?: number;
  logs?: UnityLogEntry[];
  // GLB loading properties
  modelName?: string;
  shaderName?: string;
  url?: string;
  details?: string;
  statusCode?: number;
  // Pipeline observability properties
  stageIndex?: number;
  stageName?: string;
  status?: string;
  message?: string;
  stage?: string;
  subsystem?: string;
  detail?: string;
}

const MAX_UNITY_LOGS = 200;

function pushUnityLogsToDebugAI(logs: UnityLogEntry[]): void {
  if (typeof window === 'undefined') return;
  const debug = (window as any).DEBUG_AI;
  if (!debug) return;

  if (!Array.isArray(debug.unityLogs)) {
    debug.unityLogs = [];
  }

  for (const entry of logs) {
    debug.unityLogs.push({
      level:      entry.level,
      message:    entry.message,
      stackTrace: entry.stackTrace || '',
      timestamp:  entry.timestamp,
      source:     'MithasGlow/Unity',
    });
  }

  // Cap to MAX_UNITY_LOGS — keep the most recent entries
  if (debug.unityLogs.length > MAX_UNITY_LOGS) {
    debug.unityLogs = debug.unityLogs.slice(-MAX_UNITY_LOGS);
  }

  // Surface the last error/warning at the top-level for quick triage
  const lastError = [...logs].reverse().find(l => l.level === 'error');
  if (lastError) {
    debug.lastUnityError = {
      message:   lastError.message,
      stack:     lastError.stackTrace,
      timestamp: lastError.timestamp,
    };
  }
}

export const UnityARBridge: React.FC<UnityARBridgeProps> = ({
  onUnityInitialized,
  onStyleApplied,
  onTrackingState,
  onRendererMetrics,
  selectedStyle,
  faceShape,
  growthDay,
  lightingMode,
}) => {
  const unityContainerRef = useRef<HTMLDivElement>(null);
  const unityInstanceRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Handle messages from Unity
  const handleUnityMessage = useCallback((message: string) => {
    try {
      const data: UnityMessage = JSON.parse(message);
      
      switch (data.type) {
        case 'unity_initialized':
          if (data.success) {
            setIsInitialized(true);
            setIsLoading(false);
            onUnityInitialized?.();
            if (typeof window !== 'undefined' && (window as any).DEBUG_AI) {
              (window as any).DEBUG_AI.unityInitStatus = 'ready';
            }
          }
          break;
          
        case 'style_applied':
          if (data.success && data.styleId) {
            onStyleApplied?.(data.styleId);
          }
          break;
          
        case 'tracking_state':
          if (data.isTracking !== undefined && data.confidence !== undefined) {
            onTrackingState?.(data.isTracking, data.confidence);
          }
          break;

        case 'renderer_metrics':
          if (data.fps !== undefined && data.trackingConfidence !== undefined && data.meshState) {
            onRendererMetrics?.({
              fps: data.fps,
              trackingConfidence: data.trackingConfidence,
              meshState: data.meshState,
              timestamp: data.timestamp || Date.now(),
            });
          }
          break;

        case 'unity_log':
          if (Array.isArray(data.logs) && data.logs.length > 0) {
            pushUnityLogsToDebugAI(data.logs);
          }
          break;

        case 'glb_loaded':
          if (data.modelName && data.shaderName) {
            if (typeof window !== 'undefined' && (window as any).DEBUG_AI) {
              const debug = (window as any).DEBUG_AI;
              debug.glbLoaded = {
                modelName: data.modelName,
                shaderName: data.shaderName,
                styleId: data.styleId,
                timestamp: Date.now()
              };
            }
          }
          break;

        case 'glb_download_error':
          if (data.error && data.details) {
            if (typeof window !== 'undefined' && (window as any).DEBUG_AI) {
              const debug = (window as any).DEBUG_AI;
              debug.glbDownloadError = {
                url: data.url,
                styleId: data.styleId,
                error: data.error,
                details: data.details,
                statusCode: data.statusCode,
                timestamp: data.timestamp || Date.now()
              };
            }
          }
          break;

        case 'glb_url_missing':
          if (data.error && data.styleId) {
            if (typeof window !== 'undefined' && (window as any).DEBUG_AI) {
              const debug = (window as any).DEBUG_AI;
              debug.glbUrlMissing = {
                styleId: data.styleId,
                error: data.error,
                timestamp: data.timestamp || Date.now()
              };
              console.error(`[UnityARBridge] GLB URL Missing for style '${data.styleId}': ${data.error}`);
            }
          }
          break;

        case 'pipeline_stage':
          if (typeof window !== 'undefined' && (window as any).DEBUG_AI) {
            const debug = (window as any).DEBUG_AI;
            if (!Array.isArray(debug.pipelineStages)) debug.pipelineStages = [];
            debug.pipelineStages.push({
              stageIndex: data.stageIndex,
              stageName:  data.stageName,
              status:     data.status,
              message:    data.message,
              timestamp:  data.timestamp || Date.now()
            });
            // Keep last 50 stage entries
            if (debug.pipelineStages.length > 50) {
              debug.pipelineStages = debug.pipelineStages.slice(-50);
            }
            console.log(
              `[UnityARBridge][Pipeline][${String(data.stageIndex).padStart(2,'0')}][${data.stageName}]` +
              `[${data.status}] ${data.message}`
            );
          }
          break;

        case 'pipeline_failure':
          if (typeof window !== 'undefined' && (window as any).DEBUG_AI) {
            const debug = (window as any).DEBUG_AI;
            if (!Array.isArray(debug.pipelineFailures)) debug.pipelineFailures = [];
            const failure = {
              stage:     data.stage,
              subsystem: data.subsystem,
              error:     data.error,
              detail:    data.detail,
              timestamp: data.timestamp || Date.now()
            };
            debug.pipelineFailures.push(failure);
            debug.lastPipelineFailure = failure;
            console.error(
              `[UnityARBridge][PIPELINE FAILURE]\n` +
              `  Stage:     ${data.stage}\n` +
              `  Subsystem: ${data.subsystem}\n` +
              `  Error:     ${data.error}\n` +
              `  Detail:    ${data.detail}`
            );
          }
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('[UnityARBridge] Error parsing Unity message:', error);
    }
  }, [onUnityInitialized, onStyleApplied, onTrackingState, onRendererMetrics]);

  // Send beard style to Unity
  useEffect(() => {
    if (!isInitialized || !selectedStyle || !unityInstanceRef.current) return;

    const message = {
      type:              'set_beard_style',
      styleId:           selectedStyle.id,
      styleName:         selectedStyle.name,
      category:          selectedStyle.category,
      density:           selectedStyle.density_level / 5,
      tone:              selectedStyle.tone,
      model_3d_url:      selectedStyle.model_3d_url,
      alpha_mask_url:    selectedStyle.alpha_mask_url,
      density_map_url:   selectedStyle.density_map_url,
      strand_map_url:    selectedStyle.strand_map_url,
      beard_texture_url: selectedStyle.beard_texture_url,
      normal_map_url:    selectedStyle.normal_map_url ?? '',
    };

    try {
      unityInstanceRef.current.SendMessage(
        'ReactBridge',
        'SetBeardStyle',
        JSON.stringify(message)
      );
      if (typeof window !== 'undefined' && (window as any).DEBUG_AI) {
        (window as any).DEBUG_AI.lastUnityMessage = { ...message, sentAt: Date.now() };
      }
    } catch (error) {
      if (typeof window !== 'undefined' && (window as any).DEBUG_AI) {
        (window as any).DEBUG_AI.lastPipelineFailure = {
          stage: 'UnityBridge', subsystem: 'SendMessage',
          error: error instanceof Error ? error.message : String(error),
          detail: 'Failed to send set_beard_style to Unity ReactBridge',
          timestamp: Date.now()
        };
      }
    }
  }, [isInitialized, selectedStyle]);

  // Send face shape to Unity
  useEffect(() => {
    if (!isInitialized || !faceShape || !unityInstanceRef.current) return;

    const message = {
      shape: faceShape.shape,
      jawWidth: faceShape.jawWidth,
      chinDepth: faceShape.chinDepth,
      cheekFullness: faceShape.cheekFullness,
    };

    try {
      unityInstanceRef.current.SendMessage(
        'ReactBridge',
        'SetFaceShape',
        JSON.stringify(message)
      );
    } catch (error) {
      if (typeof window !== 'undefined' && (window as any).DEBUG_AI) {
        (window as any).DEBUG_AI.lastPipelineFailure = {
          stage: 'UnityBridge', subsystem: 'SetFaceShape',
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now()
        };
      }
    }
  }, [isInitialized, faceShape]);

  // Send Growth Day to Unity (Phase 10 — Growth Timeline)
  useEffect(() => {
    if (!isInitialized || growthDay === undefined || !unityInstanceRef.current) return;
    try {
      unityInstanceRef.current.SendMessage(
        'ReactBridge',
        'SetGrowthDay',
        JSON.stringify({ growthDay: Math.max(0, Math.min(1, growthDay)) })
      );
    } catch { /* errors surfaced via pipeline_failure */ }
  }, [isInitialized, growthDay]);

  // Send Lighting Mode to Unity (Phase 11 — Lighting System)
  useEffect(() => {
    if (!isInitialized || lightingMode === undefined || !unityInstanceRef.current) return;
    try {
      unityInstanceRef.current.SendMessage(
        'ReactBridge',
        'SetLightingMode',
        JSON.stringify({ mode: Math.max(0, Math.min(4, lightingMode)) })
      );
    } catch { /* errors surfaced via pipeline_failure */ }
  }, [isInitialized, lightingMode]);

  // Initialize Unity WebGL
  useEffect(() => {
    // Load Unity WebGL build
    const loadUnity = async () => {
      try {
        // This would load the Unity WebGL build
        // In production, this would use the Unity WebGL loader
        if (typeof window !== 'undefined' && (window as any).DEBUG_AI) {
          (window as any).DEBUG_AI.unityInitStatus = 'loading';
        }
        
        // Placeholder for Unity WebGL initialization
        // Actual implementation would use Unity's WebGL loader
        setIsInitialized(true);
        setIsLoading(false);
        onUnityInitialized?.();
      } catch (error) {
        if (typeof window !== 'undefined' && (window as any).DEBUG_AI) {
          (window as any).DEBUG_AI.lastPipelineFailure = {
            stage: 'UnityBridge', subsystem: 'UnityWebGLLoad',
            error: error instanceof Error ? error.message : String(error),
            timestamp: Date.now()
          };
        }
        setIsLoading(false);
      }
    };

    loadUnity();

    // Cleanup
    return () => {
      if (unityInstanceRef.current) {
        // Unload Unity instance
        unityInstanceRef.current = null;
      }
    };
  }, [onUnityInitialized]);

  // Expose message handler to window for Unity to call
  useEffect(() => {
    (window as any).unityMessageHandler = handleUnityMessage;
    
    return () => {
      delete (window as any).unityMessageHandler;
    };
  }, [handleUnityMessage]);

  return (
    <div
      ref={unityContainerRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 5 }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-white font-medium">Loading Unity AR...</div>
          </div>
        </div>
      )}
      
      {/* Unity WebGL canvas will be mounted here */}
      <div id="unity-canvas-container" className="w-full h-full" />
    </div>
  );
};

// Global function for Unity to call
declare global {
  interface Window {
    unityMessageHandler?: (message: string) => void;
  }
}
