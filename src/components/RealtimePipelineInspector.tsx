/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 🤖 BEARD AI PIPELINE - REALTIME PIPELINE INSPECTOR
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * PRODUCTION-GRADE REALTIME AI PIPELINE MONITOR
 * 
 * - Exact pipeline stage progression
 * - Exact stage currently running
 * - Exact error location
 * - Exact failure reason
 * - Exact worker/API/render state
 * - Exact timing and latency
 * - Real async lifecycle flow
 */

import React, { useState, useEffect, memo } from 'react';
import { DebugAIState, PipelineStage, PipelineStageState, APIError, PipelineEvent, RequestTrace } from '../lib/types/debugAI';

// Stage display configuration - Phase 1 Engine Architecture
const STAGE_CONFIG: Record<PipelineStage, { label: string; icon: string }> = {
  camera_engine_ready: { label: 'Camera Engine Ready', icon: '📷' },
  facemesh_worker_active: { label: 'FaceMesh Worker Active', icon: '�' },
  face_validation_check: { label: 'Face Validation Check', icon: '🔍' },
  stabilization_anchoring: { label: 'Stabilization & Anchoring', icon: '�' },
  threejs_render_pipeline: { label: 'Three.js Render Pipeline', icon: '🎮' },
};

// Stage state colors and animations
const STAGE_STATE_STYLES: Record<PipelineStageState, { color: string; icon: string; animate: boolean }> = {
  waiting: { color: 'text-gray-500', icon: '⚪', animate: false },
  processing: { color: 'text-yellow-400', icon: '🟡', animate: true },
  success: { color: 'text-green-400', icon: '🟢', animate: false },
  failed: { color: 'text-red-400', icon: '🔴', animate: false },
  blocked: { color: 'text-gray-600', icon: '⚫', animate: false },
};

// Initialize default DEBUG_AI state - Phase 1 Engine Architecture
const initializeDebugState = (): DebugAIState => ({
  currentStage: 'camera_engine_ready',
  completedStages: [],
  blockedStages: [],
  failedStage: null,
  pipelineState: 'idle',
  stages: Object.keys(STAGE_CONFIG).reduce((acc, stage) => ({
    ...acc,
    [stage]: { stage: stage as PipelineStage, state: 'waiting', timestamp: 0 }
  }), {}) as Record<PipelineStage, any>,
  faceGeometry: null,
  faceShape: null,
  normalizedFaceShape: null,
  occasion: null,
  normalizedOccasion: null,
  apiRequest: null,
  apiResponse: null,
  apiError: null,
  requestTrace: null,
  apiStatus: null,
  apiLatency: null,
  requestVersion: null,
  renderState: {
    type: 'unknown',
    status: 'idle',
    webglSupported: false,
    isLowEnd: false,
    fps: 0,
    lastRenderTime: 0,
    beardLoaded: false,
  },
  workerState: {
    status: 'idle',
    landmarksCount: 0,
    processingTime: 0,
  },
  webglState: {
    initialized: false,
    contextLost: false,
  },
  fps: 0,
  timings: {
    systemInitialize: 0,
    cameraReady: 0,
    geometryExtraction: 0,
    faceShapeAnalysis: 0,
    apiRequest: 0,
    apiResponse: 0,
    styleMatching: 0,
    beardOverlayBuild: 0,
    webglRender: 0,
    total: 0,
  },
  eventTimeline: [],
  lastError: null,
  recommendationsCount: 0,
  selectedStyleName: null,
  selectedStyleId: null,
  debugFlags: {},
  isLoading: false,
  loadingStage: null,
});

// Stage row component with flow indicator
const StageRow: React.FC<{
  stage: PipelineStage;
  state: PipelineStageState;
  isCurrent: boolean;
  isCompleted: boolean;
  timestamp?: number;
  error?: string;
  index: number;
  totalStages: number;
}> = memo(({ stage, state, isCurrent, isCompleted, timestamp, error, index, totalStages }) => {
  const config = STAGE_CONFIG[stage];
  const stateStyle = STAGE_STATE_STYLES[state];
  const showArrow = index < totalStages - 1;
  
  return (
    <div className="flex items-center">
      <div
        className={`flex items-center space-x-2 py-1 px-2 rounded transition-all duration-200 ${
          isCurrent ? 'bg-white/10 border border-white/20' : 'bg-transparent'
        }`}
      >
        <span className={`${stateStyle.color} ${stateStyle.animate ? 'animate-pulse' : ''}`}>
          {stateStyle.icon}
        </span>
        <span className={`text-xs ${stateStyle.color} flex-1`}>
          {config.icon} {config.label}
        </span>
        {timestamp && (
          <span className="text-xs text-gray-400 font-mono">
            {(timestamp % 1000).toFixed(0)}ms
          </span>
        )}
      </div>
      {showArrow && (
        <div className={`mx-1 transition-all duration-300 ${
          isCompleted ? 'text-green-400' : isCurrent ? 'text-yellow-400 animate-pulse' : 'text-gray-600'
        }`}>
          →
        </div>
      )}
    </div>
  );
});

// Error inspector component
const ErrorInspector: React.FC<{ error: any; apiError: APIError | null }> = memo(({ error, apiError }) => {
  if (!error && !apiError) return null;

  return (
    <div className="mt-3">
      <div className="text-red-400 text-xs mb-1 font-semibold">ERROR:</div>
      <div className="bg-red-950/50 border border-red-900/50 rounded p-2 space-y-1">
        {error && (
          <>
            <div className="text-red-300 text-xs font-bold">
              {error.subsystem}
            </div>
            <div className="text-red-200 text-xs">
              {error.message}
            </div>
          </>
        )}
        {apiError && (
          <>
            <div className="text-red-400 text-xs mt-2">
              Type: {apiError.errorType}
            </div>
            {apiError.sqlError && (
              <div className="text-red-300 text-xs mt-1 font-mono text-xs">
                SQL: {apiError.sqlError}
              </div>
            )}
            {apiError.body && (
              <details className="mt-1">
                <summary className="text-red-400 text-xs cursor-pointer hover:text-red-300">
                  Response Body
                </summary>
                <pre className="text-red-300 text-xs mt-1 overflow-x-auto">
                  {apiError.body}
                </pre>
              </details>
            )}
          </>
        )}
        {error && error.stack && (
          <details className="mt-1">
            <summary className="text-red-400 text-xs cursor-pointer hover:text-red-300">
              Stack Trace
            </summary>
            <pre className="text-red-300 text-xs mt-1 overflow-x-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
});

// Event timeline component
const EventTimeline: React.FC<{ events: PipelineEvent[] }> = memo(({ events }) => {
  const recentEvents = events.slice(-8); // Show last 8 events
  
  return (
    <div className="mt-3">
      <div className="text-gray-300 text-xs mb-1 font-semibold">TIMELINE:</div>
      <div className="space-y-1 max-h-28 overflow-y-auto">
        {recentEvents.length === 0 ? (
          <div className="text-gray-500 text-xs italic">No events yet</div>
        ) : (
          recentEvents.map((event, index) => {
            const time = new Date(event.timestamp).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            return (
              <div key={index} className="text-xs space-y-0.5">
                <div className="text-gray-500 font-mono">[{time}]</div>
                <div className={
                  event.type === 'error' ? 'text-red-400' :
                  event.type === 'warning' ? 'text-yellow-400' :
                  event.type === 'stage_complete' ? 'text-green-400' :
                  'text-blue-400'
                }>
                  {event.message}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

// Route inspector component
const RouteInspector: React.FC<{ requestTrace: any; routeComparison: any }> = memo(({ requestTrace, routeComparison }) => {
  if (!requestTrace && !routeComparison) return null;
  return (
    <div className="mt-3">
      <div className="text-yellow-400 text-xs mb-1 font-semibold">ROUTE INSPECTOR:</div>
      <div className="bg-yellow-950/50 border border-yellow-900/50 rounded p-2 space-y-1">
        {requestTrace && <div className="text-yellow-300 text-xs">Requested: {requestTrace.method} {requestTrace.endpoint}</div>}
        {requestTrace && <div className="text-yellow-400 text-xs">Proxy Target: {requestTrace.proxyTarget}</div>}
        {routeComparison && !routeComparison.exactMatch && (
          <div className="text-yellow-200 text-xs mt-1">Suggested: {routeComparison.closestMatch || 'none'}</div>
        )}
        {routeComparison && routeComparison.suggestions && routeComparison.suggestions.length > 0 && (
          <div className="text-yellow-300 text-xs">Available: {routeComparison.suggestions.join(', ')}</div>
        )}
      </div>
    </div>
  );
});

// Metrics panel component
const MetricsPanel: React.FC<{ state: DebugAIState }> = memo(({ state }) => {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <div className="bg-white/5 p-2 rounded">
        <div className="text-gray-400 text-xs">FPS</div>
        <div className="text-green-400 text-sm font-bold">{state.fps.toFixed(0)}</div>
      </div>
      <div className="bg-white/5 p-2 rounded">
        <div className="text-gray-400 text-xs">API Latency</div>
        <div className="text-blue-400 text-sm font-bold">
          {state.apiLatency ? `${state.apiLatency.toFixed(0)}ms` : 'N/A'}
        </div>
      </div>
      <div className="bg-white/5 p-2 rounded">
        <div className="text-gray-400 text-xs">Worker Time</div>
        <div className="text-purple-400 text-sm font-bold">
          {state.workerState.processingTime ? `${state.workerState.processingTime.toFixed(0)}ms` : 'N/A'}
        </div>
      </div>
      <div className="bg-white/5 p-2 rounded">
        <div className="text-gray-400 text-xs">Total Time</div>
        <div className="text-yellow-400 text-sm font-bold">
          {state.timings.total ? `${state.timings.total.toFixed(0)}ms` : 'N/A'}
        </div>
      </div>
    </div>
  );
});

// Main RealtimePipelineInspector component
const RealtimePipelineInspector: React.FC = () => {
  const [debugState, setDebugState] = useState<DebugAIState>(() => {
    // Preserve existing DEBUG_AI state if available
    if (typeof window !== 'undefined' && window.DEBUG_AI) {
      return { ...window.DEBUG_AI };
    }
    return initializeDebugState();
  });
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Initialize global debug state - only if not already set
  useEffect(() => {
    if (!window.DEBUG_AI) {
      window.DEBUG_AI = debugState;
    }
  }, []);

  // Auto-refresh every 100ms for realtime updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.DEBUG_AI) {
        setDebugState({ ...window.DEBUG_AI });
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const pipelineStateColor = ((): string => {
    const colors: Record<string, string> = {
      idle: 'text-gray-400',
      running: 'text-blue-400',
      completed: 'text-green-400',
      failed: 'text-red-400',
      blocked: 'text-gray-600',
    };
    return colors[debugState.pipelineState] || 'text-gray-400';
  })();

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const stages = Object.keys(STAGE_CONFIG) as PipelineStage[];
  const totalStages = stages.length;

  return (
    <div
      className="fixed bg-black/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl z-[9999] font-mono text-xs"
      style={{
        fontSize: '10px',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? 'auto' : '320px',
        maxHeight: isMinimized ? 'auto' : '45vh',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-white/20 cursor-pointer hover:bg-white/5 transition-colors select-none"
        onClick={() => !isDragging && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">🤖</span>
          <span className="text-white font-bold text-xs">AI PIPELINE</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`${pipelineStateColor} text-xs`}>
            {debugState.pipelineState.toUpperCase()}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            className="text-gray-400 hover:text-white text-xs"
          >
            {isMinimized ? '□' : '−'}
          </button>
          <span className="text-gray-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
        </div>
      </div>

      {isExpanded && !isMinimized && (
        <div className="p-3 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(45vh - 50px)' }}>
          {/* Pipeline State */}
          <div>
            <div className="text-gray-300 text-xs mb-1 font-semibold">CURRENT:</div>
            <div className={`font-bold ${pipelineStateColor} text-sm`}>
              {debugState.currentStage ? STAGE_CONFIG[debugState.currentStage].label : 'Unknown'}
            </div>
          </div>

          {/* Pipeline Stages with Flow */}
          <div>
            <div className="text-gray-300 text-xs mb-1 font-semibold">FLOW:</div>
            <div className="space-y-0.5">
              {stages.map((stage, index) => {
                const stageState = debugState.stages[stage];
                const isCompleted = stageState?.state === 'success';
                return (
                  <StageRow
                    key={stage}
                    stage={stage}
                    state={stageState?.state || 'waiting'}
                    isCurrent={debugState.currentStage === stage}
                    isCompleted={isCompleted}
                    timestamp={stageState?.timestamp}
                    error={stageState?.error}
                    index={index}
                    totalStages={totalStages}
                  />
                );
              })}
            </div>
          </div>

          {/* Error Inspector */}
          <ErrorInspector error={debugState.lastError} apiError={debugState.apiError} />

          {/* Route Inspector */}
          <RouteInspector requestTrace={debugState.requestTrace} routeComparison={(debugState as any).routeComparison} />

          {/* Metrics Panel */}
          <MetricsPanel state={debugState} />

          {/* Event Timeline */}
          <EventTimeline events={debugState.eventTimeline} />

          {/* Face & Occasion Info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 p-2 rounded">
              <div className="text-gray-400 text-xs">Face</div>
              <div className="text-green-400 text-xs font-bold">
                {debugState.normalizedFaceShape || 'N/A'}
              </div>
            </div>
            <div className="bg-white/5 p-2 rounded">
              <div className="text-gray-400 text-xs">Occasion</div>
              <div className="text-blue-400 text-xs font-bold">
                {debugState.normalizedOccasion || 'N/A'}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white/5 p-2 rounded">
            <div className="text-gray-400 text-xs">Recommendations</div>
            <div className={`text-xs font-bold ${debugState.recommendationsCount > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {debugState.recommendationsCount} styles
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealtimePipelineInspector;
