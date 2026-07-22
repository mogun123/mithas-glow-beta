/**
 * Mobile Debug Panel for DEBUG_AI State Visualization
 * 
 * Provides mobile-friendly access to DEBUG_AI state for debugging on mobile devices
 * where browser console access is limited or unavailable.
 */

import React, { useState, useEffect } from 'react';

interface MobileDebugPanelProps {
  visible?: boolean;
  onClose?: () => void;
}

export const MobileDebugPanel: React.FC<MobileDebugPanelProps> = ({ 
  visible = false, 
  onClose 
}) => {
  const [debugState, setDebugState] = useState<any>(null);
  const [expandedSection, setExpandedSection] = useState<string>('renderer');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.DEBUG_AI) {
      setDebugState(window.DEBUG_AI);
    }
  }, [visible]);

  // Refresh debug state every 500ms when visible
  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && window.DEBUG_AI) {
        setDebugState({ ...window.DEBUG_AI });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible || !debugState) return null;

  const sections = [
    { id: 'renderer', title: '🎨 Renderer', icon: '🖥️' },
    { id: 'pipeline', title: '📊 Pipeline', icon: '⚙️' },
    { id: 'beard', title: '🧔 Beard Model', icon: '💇' },
    { id: 'errors', title: '❌ Errors', icon: '⚠️' },
    { id: 'performance', title: '⚡ Performance', icon: '📈' },
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? '' : sectionId);
  };

  const renderRendererSection = () => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-white/70 text-xs">Type:</span>
        <span className="text-green-400 font-mono text-xs font-bold">
          {debugState.renderState?.type || debugState.rendererType || '—'}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-white/70 text-xs">WebGL Supported:</span>
        <span className={`font-mono text-xs font-bold ${debugState.webglSupported ? 'text-green-400' : 'text-red-400'}`}>
          {debugState.webglSupported ? '✓' : '✗'}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-white/70 text-xs">Low-End Device:</span>
        <span className={`font-mono text-xs font-bold ${debugState.isLowEnd ? 'text-yellow-400' : 'text-green-400'}`}>
          {debugState.isLowEnd ? '⚠' : '✓'}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-white/70 text-xs">Initialized:</span>
        <span className={`font-mono text-xs font-bold ${debugState.webglState?.initialized ? 'text-green-400' : 'text-red-400'}`}>
          {debugState.webglState?.initialized ? '✓' : '✗'}
        </span>
      </div>
      {debugState.rendererSwitch && (
        <div className="mt-2 p-2 bg-yellow-500/20 rounded border border-yellow-500/30">
          <span className="text-yellow-400 text-[10px] font-mono">
            Switched: {debugState.rendererSwitch}
          </span>
        </div>
      )}
    </div>
  );

  const renderPipelineSection = () => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-white/70 text-xs">Current Stage:</span>
        <span className="text-blue-400 font-mono text-xs font-bold truncate max-w-[120px]">
          {debugState.currentStage || '—'}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-white/70 text-xs">Pipeline State:</span>
        <span className={`font-mono text-xs font-bold ${
          debugState.pipelineState === 'running' ? 'text-green-400' :
          debugState.pipelineState === 'failed' ? 'text-red-400' :
          debugState.pipelineState === 'completed' ? 'text-blue-400' : 'text-white/50'
        }`}>
          {debugState.pipelineState || '—'}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-white/70 text-xs">Completed Stages:</span>
        <span className="text-white/50 font-mono text-xs">
          {debugState.completedStages?.length || 0}
        </span>
      </div>
      {debugState.currentStage && (
        <div className="mt-2 p-2 bg-blue-500/20 rounded border border-blue-500/30">
          <span className="text-blue-400 text-[10px] font-mono">
            Stage: {debugState.currentStage}
          </span>
        </div>
      )}
    </div>
  );

  const renderBeardSection = () => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-white/70 text-xs">Beard Loaded:</span>
        <span className={`font-mono text-xs font-bold ${debugState.beardModelLoaded ? 'text-green-400' : 'text-red-400'}`}>
          {debugState.beardModelLoaded ? '✓' : '✗'}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-white/70 text-xs">Model Name:</span>
        <span className="text-white/50 font-mono text-[10px] truncate max-w-[120px]">
          {debugState.renderState?.beardModelName || debugState.loadedBeardModel || '—'}
        </span>
      </div>
      {debugState.beardModelUrl && (
        <div className="mt-2">
          <span className="text-white/70 text-xs block mb-1">GLB URL:</span>
          <span className="text-white/50 font-mono text-[9px] break-all">
            {debugState.beardModelUrl}
          </span>
        </div>
      )}
      {debugState.glbLoaded && (
        <div className="mt-2 p-2 bg-green-500/20 rounded border border-green-500/30">
          <span className="text-green-400 text-[10px] font-mono">
            GLB: {debugState.glbLoaded.modelName}
          </span>
          <span className="text-white/50 text-[9px] block mt-1">
            Shader: {debugState.glbLoaded.shaderName}
          </span>
        </div>
      )}
    </div>
  );

  const renderErrorsSection = () => {
    const errors = [
      debugState.lastError,
      debugState.renderError,
      debugState.beardModelLoadError,
      debugState.glbLoadError,
      debugState.glbDownloadError,
      debugState.rendererManagerInitError,
    ].filter(Boolean);

    if (errors.length === 0) {
      return (
        <div className="p-3 bg-green-500/10 rounded border border-green-500/30">
          <span className="text-green-400 text-xs font-mono">✓ No errors detected</span>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {errors.map((error, idx) => (
          <div key={idx} className="p-2 bg-red-500/20 rounded border border-red-500/30">
            <span className="text-red-400 text-[10px] font-mono break-all">
              {typeof error === 'string' ? error : error?.message || JSON.stringify(error)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderPerformanceSection = () => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-white/70 text-xs">FPS:</span>
        <span className="text-white/50 font-mono text-xs font-bold">
          {debugState.fps || debugState.renderState?.fps || 0}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-white/70 text-xs">Loading:</span>
        <span className={`font-mono text-xs font-bold ${debugState.isLoading ? 'text-yellow-400' : 'text-green-400'}`}>
          {debugState.isLoading ? '⏳' : '✓'}
        </span>
      </div>
      {debugState.timings && (
        <div className="mt-2 space-y-1">
          <span className="text-white/70 text-xs block mb-1">Timings (ms):</span>
          {Object.entries(debugState.timings).slice(0, 5).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center">
              <span className="text-white/50 text-[9px] font-mono">{key}:</span>
              <span className="text-white/50 text-[9px] font-mono">{Math.round(value as number)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'renderer': return renderRendererSection();
      case 'pipeline': return renderPipelineSection();
      case 'beard': return renderBeardSection();
      case 'errors': return renderErrorsSection();
      case 'performance': return renderPerformanceSection();
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center pointer-events-none">
      <div className="bg-black/95 backdrop-blur-lg rounded-t-2xl w-full max-w-md border-t border-x border-white/10 pointer-events-auto max-h-[70vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-3 border-b border-white/10 bg-black/50">
          <span className="text-white font-bold text-sm flex items-center gap-2">
            <span className="text-lg">🐛</span>
            <span>Mobile Debug</span>
          </span>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {sections.map((section) => (
            <div key={section.id} className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex justify-between items-center p-3 hover:bg-white/10 transition-colors"
              >
                <span className="text-white text-sm font-medium flex items-center gap-2">
                  <span>{section.icon}</span>
                  <span>{section.title}</span>
                </span>
                <svg
                  className={`w-4 h-4 text-white/50 transition-transform ${
                    expandedSection === section.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSection === section.id && (
                <div className="p-3 border-t border-white/10">
                  {renderSectionContent(section.id)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-black/50">
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.DEBUG_AI) {
                console.log('DEBUG_AI State:', window.DEBUG_AI);
                alert('DEBUG_AI state logged to console. Connect via USB debugging to view.');
              }
            }}
            className="w-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium py-2 px-4 rounded transition-colors"
          >
            Log to Console
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to initialize debug AI state
export function initializeDebugAI() {
  if (typeof window === 'undefined') return;

  if (!window.DEBUG_AI) {
    window.DEBUG_AI = {
      currentStage: 'system_initialize',
      completedStages: [],
      blockedStages: [],
      failedStage: null,
      pipelineState: 'idle',
      stages: {},
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
        type: 'none',
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
    };
  }

  return window.DEBUG_AI;
}

declare global {
  interface Window {
    DEBUG_AI: any;
  }
}
