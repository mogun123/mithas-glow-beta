import React, { useState, useEffect, useRef } from 'react';
import { X, Terminal, Activity, Cpu, Network, Eye, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useDebugConsole, usePipelineStatus, initializeDebugConsole, type DebugEntry, type PipelineStatus } from '../../hooks/useDebugConsole';

const DebugConsoleScreen: React.FC = () => {
  const { entries, clearEntries } = useDebugConsole();
  const pipelineStatus = usePipelineStatus();
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<'all' | 'mirror' | 'beard' | 'skin' | 'system'>('all');
  const [filterLevel, setFilterLevel] = useState<'all' | 'info' | 'warning' | 'error'>('all');
  const consoleRef = useRef<HTMLDivElement>(null);

  // Initialize debug console interceptors
  useEffect(() => {
    const cleanup = initializeDebugConsole();
    return cleanup;
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (consoleRef.current && !isMinimized) {
      consoleRef.current.scrollTop = 0;
    }
  }, [entries, isMinimized]);

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    const pipelineMatch = selectedPipeline === 'all' || entry.pipeline === selectedPipeline;
    const levelMatch = filterLevel === 'all' || entry.level === filterLevel;
    return pipelineMatch && levelMatch;
  });

  // Get level icon and color
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Terminal className="w-4 h-4 text-blue-500" />;
    }
  };

  // Get pipeline icon
  const getPipelineIcon = (pipeline: string) => {
    switch (pipeline) {
      case 'mirror': return <Eye className="w-4 h-4 text-purple-500" />;
      case 'beard': return <Cpu className="w-4 h-4 text-orange-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-700 p-3 cursor-pointer z-50"
           onClick={() => setIsMinimized(false)}>
        <div className="flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-green-400" />
          <span className="text-sm font-mono">Debug Console</span>
          <div className="flex space-x-1">
            <div className={`w-2 h-2 rounded-full ${pipelineStatus.mirror.faceDetected ? 'bg-green-400' : 'bg-red-400'}`} />
            <div className={`w-2 h-2 rounded-full ${pipelineStatus.beard.stage === 'completed' ? 'bg-green-400' : 'bg-yellow-400'}`} />
            <div className={`w-2 h-2 rounded-full ${pipelineStatus.system.networkStatus === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-4 bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-700 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <Terminal className="w-6 h-6 text-green-400" />
          <h2 className="text-lg font-bold font-mono">Debug Console</h2>
        </div>
        <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-gray-800 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Pipeline Status */}
      <div className="p-4 border-b border-gray-700">
        <div className="grid grid-cols-2 gap-4">
          {/* Mirror Pipeline */}
          <div className="bg-gray-800 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold">Mirror</span>
              </div>
              <div className={`w-2 h-2 rounded-full ${pipelineStatus.mirror.faceDetected ? 'bg-green-400' : 'bg-red-400'}`} />
            </div>
            <div className="text-xs space-y-1">
              <div>Stage: {pipelineStatus.mirror.stage}</div>
              <div>Face: {pipelineStatus.mirror.faceDetected ? 'Detected' : 'None'}</div>
              <div>Landmarks: {pipelineStatus.mirror.landmarksCount}</div>
              <div>FPS: {pipelineStatus.mirror.frameRate}</div>
            </div>
          </div>

          {/* Beard Pipeline */}
          <div className="bg-gray-800 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-semibold">Beard</span>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                pipelineStatus.beard.stage === 'completed' ? 'bg-green-400' : 
                pipelineStatus.beard.stage === 'error' ? 'bg-red-400' : 'bg-yellow-400'
              }`} />
            </div>
            <div className="text-xs space-y-1">
              <div>Stage: {pipelineStatus.beard.stage}</div>
              <div>API: {pipelineStatus.beard.apiLatency}ms</div>
              <div>Results: {pipelineStatus.beard.recommendationsCount}</div>
            </div>
          </div>

          {/* Skin Pipeline */}
          <div className="bg-gray-800 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Network className="w-4 h-4 text-green-400" />
                <span className="text-sm font-semibold">Skin</span>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                pipelineStatus.skin.stage === 'completed' ? 'bg-green-400' : 
                pipelineStatus.skin.stage === 'error' ? 'bg-red-400' : 'bg-yellow-400'
              }`} />
            </div>
            <div className="text-xs space-y-1">
              <div>Stage: {pipelineStatus.skin.stage}</div>
              <div>Frames: {pipelineStatus.skin.framesCaptured}</div>
              <div>Progress: {pipelineStatus.skin.analysisProgress}%</div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-gray-800 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold">System</span>
              </div>
              <div className={`w-2 h-2 rounded-full ${pipelineStatus.system.networkStatus === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
            </div>
            <div className="text-xs space-y-1">
              <div>Memory: {pipelineStatus.system.memoryUsage}%</div>
              <div>Network: {pipelineStatus.system.networkStatus}</div>
              <div>Entries: {filteredEntries.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm">Pipeline:</label>
            <select 
              value={selectedPipeline} 
              onChange={(e) => setSelectedPipeline(e.target.value as any)}
              className="bg-gray-800 text-sm rounded px-2 py-1 border border-gray-600"
            >
              <option value="all">All</option>
              <option value="mirror">Mirror</option>
              <option value="beard">Beard</option>
              <option value="skin">Skin</option>
              <option value="system">System</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm">Level:</label>
            <select 
              value={filterLevel} 
              onChange={(e) => setFilterLevel(e.target.value as any)}
              className="bg-gray-800 text-sm rounded px-2 py-1 border border-gray-600"
            >
              <option value="all">All</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
          <button 
            onClick={clearEntries}
            className="bg-red-600 hover:bg-red-700 text-sm px-3 py-1 rounded"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Console Output */}
      <div ref={consoleRef} className="flex-1 overflow-y-auto p-4 font-mono text-sm">
        {filteredEntries.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No debug entries yet. Start using the app to see debug output...
          </div>
        ) : (
          <div className="space-y-1">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="flex items-start space-x-2 py-1 border-b border-gray-800">
                <div className="flex items-center space-x-1 mt-0.5">
                  {getPipelineIcon(entry.pipeline)}
                  {getLevelIcon(entry.level)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-xs">{formatTime(entry.timestamp)}</span>
                    <span className="text-gray-500 text-xs">[{entry.pipeline.toUpperCase()}]</span>
                  </div>
                  <div className="text-white">{entry.message}</div>
                  {entry.duration && (
                    <div className="text-gray-400 text-xs">Duration: {entry.duration.toFixed(2)}ms</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugConsoleScreen;
