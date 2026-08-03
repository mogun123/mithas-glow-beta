import React, { useState, useEffect, useRef } from 'react';
import { useLogger } from '../../hooks/useLogger';
import { DebugState, LogEntry, LogLevel } from '../../types/debug';

interface DebugOverlayProps {
  debugState: DebugState;
  logs: LogEntry[];
  onClearLogs?: () => void;
  className?: string;
}

const DebugOverlay: React.FC<DebugOverlayProps> = ({
  debugState,
  logs,
  onClearLogs,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest log
  useEffect(() => {
    if (logContainerRef.current && isExpanded) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isExpanded]);

  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      case 'debug': return 'text-blue-400';
      default: return 'text-gray-300';
    }
  };

  const getStatusColor = (status: string): string => {
    if (status.includes('ERROR') || status.includes('MISSING')) return 'text-red-400';
    if (status.includes('FALLBACK') || status.includes('WARNING')) return 'text-yellow-400';
    if (status.includes('SUCCESS') || status.includes('OK')) return 'text-green-400';
    return 'text-gray-300';
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-4 right-4 z-50 px-3 py-2 bg-blue-600 text-white rounded-lg shadow-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        🐛 Debug
      </button>
    );
  }

  return (
    <div className={`fixed top-4 right-4 z-50 bg-black/90 backdrop-blur-sm rounded-lg shadow-2xl text-white font-mono text-xs max-w-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h3 className="text-sm font-bold text-blue-400">🔍 AI Debug Panel</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
          >
            {isExpanded ? '▼' : '▲'}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Debug Info */}
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Landmarks:</span>
            <span className={`ml-2 font-bold ${debugState.landmarksCount > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {debugState.landmarksCount}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Forehead:</span>
            <span className={`ml-2 font-bold ${debugState.foreheadPointsPresent ? 'text-green-400' : 'text-red-400'}`}>
              {debugState.foreheadPointsPresent ? '✓' : '✗'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Pixels:</span>
            <span className={`ml-2 font-bold ${debugState.regionPixelCount > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {debugState.regionPixelCount}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Status:</span>
            <span className={`ml-1 font-bold ${getStatusColor(debugState.currentFallbackStatus)}`}>
              {debugState.currentFallbackStatus.substring(0, 8)}...
            </span>
          </div>
        </div>

        {/* Processing Indicator */}
        {debugState.isProcessing && (
          <div className="flex items-center gap-2 text-yellow-400">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-xs">Processing...</span>
          </div>
        )}

        {/* Last Error */}
        {debugState.lastError && (
          <div className="p-2 bg-red-900/50 border border-red-700 rounded text-red-300 text-xs">
            <div className="font-bold mb-1">Last Error:</div>
            <div className="break-words">{debugState.lastError}</div>
          </div>
        )}

        {/* Last Update */}
        <div className="text-gray-500 text-xs">
          Updated: {new Date(debugState.lastUpdate).toLocaleTimeString()}
        </div>
      </div>

      {/* Expanded Logs Section */}
      {isExpanded && (
        <div className="border-t border-gray-700">
          <div className="p-2 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-400">Recent Logs ({logs.length})</span>
            {onClearLogs && (
              <button
                onClick={onClearLogs}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          
          <div
            ref={logContainerRef}
            className="max-h-48 overflow-y-auto p-2 space-y-1"
          >
            {logs.slice(-20).reverse().map((log) => (
              <div key={log.id} className="text-xs border-b border-gray-800 pb-1">
                <div className="flex items-start gap-2">
                  <span className={`font-bold ${getLevelColor(log.level)}`}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className="text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-1 text-gray-300 break-words">{log.message}</div>
                {log.context && (
                  <div className="mt-1 text-gray-500 text-xs">
                    {Object.entries(log.context).map(([key, value]) => (
                      <span key={key} className="mr-2">
                        {key}: {JSON.stringify(value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugOverlay;
