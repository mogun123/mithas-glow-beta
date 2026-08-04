import { useEffect, useRef, useState, useCallback } from 'react';

// Debug console entry interface
export interface DebugEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'success' | 'warning' | 'error';
  pipeline: 'mirror' | 'beard' | 'system' | 'skin';
  message: string;
  details?: any;
  duration?: number;
}

// Debug console hook interface
export interface DebugConsoleHook {
  entries: DebugEntry[];
  addEntry: (entry: Omit<DebugEntry, 'id' | 'timestamp'>) => void;
  clearEntries: () => void;
  addMirrorEntry: (message: string, details?: any, level?: DebugEntry['level']) => void;
  addBeardEntry: (message: string, details?: any, level?: DebugEntry['level']) => void;
  addSkinEntry: (message: string, details?: any, level?: DebugEntry['level']) => void;
  addSystemEntry: (message: string, details?: any, level?: DebugEntry['level']) => void;
}

// Global debug console state
let globalEntries: DebugEntry[] = [];
let globalListeners: ((entries: DebugEntry[]) => void)[] = [];
let entryIdCounter = 0;

// Add entry to global state
const addGlobalEntry = (entry: Omit<DebugEntry, 'id' | 'timestamp'>) => {
  const newEntry: DebugEntry = {
    ...entry,
    id: `debug-${entryIdCounter++}`,
    timestamp: performance.now()
  };
  
  globalEntries.unshift(newEntry);
  
  // Keep only last 1000 entries to prevent memory issues
  if (globalEntries.length > 1000) {
    globalEntries = globalEntries.slice(0, 1000);
  }
  
  // Notify all listeners
  globalListeners.forEach(listener => listener([...globalEntries]));
};

// Subscribe to debug entries
export const subscribeToDebugEntries = (listener: (entries: DebugEntry[]) => void) => {
  globalListeners.push(listener);
  listener([...globalEntries]);
  
  return () => {
    const index = globalListeners.indexOf(listener);
    if (index > -1) {
      globalListeners.splice(index, 1);
    }
  };
};

// Clear all entries
export const clearDebugEntries = () => {
  globalEntries = [];
  globalListeners.forEach(listener => listener([]));
};

// Debug console hook
export const useDebugConsole = (): DebugConsoleHook => {
  const [entries, setEntries] = useState<DebugEntry[]>([]);
  
  // Subscribe to global entries
  useEffect(() => {
    const unsubscribe = subscribeToDebugEntries((newEntries) => {
      setEntries(newEntries);
    });
    
    return unsubscribe;
  }, [setEntries]);
  
  // Add entry function
  const addEntry = useCallback((entry: Omit<DebugEntry, 'id' | 'timestamp'>) => {
    addGlobalEntry(entry);
  }, []);
  
  // Clear entries function
  const clearEntries = useCallback(() => {
    clearDebugEntries();
  }, []);
  
  // Pipeline-specific entry functions
  const addMirrorEntry = useCallback((message: string, details?: any, level: DebugEntry['level'] = 'info') => {
    addEntry({ level, pipeline: 'mirror', message, details });
  }, [addEntry]);
  
  const addBeardEntry = useCallback((message: string, details?: any, level: DebugEntry['level'] = 'info') => {
    addEntry({ level, pipeline: 'beard', message, details });
  }, [addEntry]);
  
  const addSkinEntry = useCallback((message: string, details?: any, level: DebugEntry['level'] = 'info') => {
    addEntry({ level, pipeline: 'skin', message, details });
  }, [addEntry]);
  
  const addSystemEntry = useCallback((message: string, details?: any, level: DebugEntry['level'] = 'info') => {
    addEntry({ level, pipeline: 'system', message, details });
  }, [addEntry]);
  
  return {
    entries,
    addEntry,
    clearEntries,
    addMirrorEntry,
    addBeardEntry,
    addSkinEntry,
    addSystemEntry
  };
};

// Enhanced console interceptors for debug flows
export const setupDebugConsoleInterceptors = () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.log = (...args) => {
    originalLog(...args);
    
    const message = args.join(' ');
    
    // Parse debug messages from our pipelines
    if (message.includes('[MIRROR-PIPELINE]')) {
      addGlobalEntry({
        level: 'info',
        pipeline: 'mirror',
        message: message.replace('[MIRROR-PIPELINE] ', ''),
        details: args[1]
      });
    } else if (message.includes('[OVERLAY-PIPELINE]')) {
      addGlobalEntry({
        level: 'info',
        pipeline: 'mirror',
        message: message.replace('[OVERLAY-PIPELINE] ', ''),
        details: args[1]
      });
    } else if (message.includes('[BEARD-PIPELINE]')) {
      addGlobalEntry({
        level: 'info',
        pipeline: 'beard',
        message: message.replace('[BEARD-PIPELINE] ', ''),
        details: args[1]
      });
    } else if (message.includes('[SKIN-PIPELINE]')) {
      addGlobalEntry({
        level: 'info',
        pipeline: 'skin',
        message: message.replace('[SKIN-PIPELINE] ', ''),
        details: args[1]
      });
    } else if (message.includes('✅')) {
      addGlobalEntry({
        level: 'success',
        pipeline: 'system',
        message: message,
        details: args[1]
      });
    } else if (message.includes('⚠️')) {
      addGlobalEntry({
        level: 'warning',
        pipeline: 'system',
        message: message,
        details: args[1]
      });
    } else if (message.includes('❌') || message.includes('🚨')) {
      addGlobalEntry({
        level: 'error',
        pipeline: 'system',
        message: message,
        details: args[1]
      });
    }
  };
  
  console.warn = (...args) => {
    originalWarn(...args);
    addGlobalEntry({
      level: 'warning',
      pipeline: 'system',
      message: args.join(' '),
      details: args[1]
    });
  };
  
  console.error = (...args) => {
    originalError(...args);
    addGlobalEntry({
      level: 'error',
      pipeline: 'system',
      message: args.join(' '),
      details: args[1]
    });
  };
  
  return () => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  };
};

// Pipeline status monitoring
export interface PipelineStatus {
  mirror: {
    stage: 'idle' | 'initializing' | 'tracking' | 'error';
    faceDetected: boolean;
    landmarksCount: number;
    frameRate: number;
    lastUpdate: number;
  };
  beard: {
    stage: 'idle' | 'analyzing' | 'fetching' | 'completed' | 'error';
    apiLatency: number;
    recommendationsCount: number;
    lastUpdate: number;
  };
  skin: {
    stage: 'idle' | 'capturing' | 'analyzing' | 'completed' | 'error';
    framesCaptured: number;
    analysisProgress: number;
    lastUpdate: number;
  };
  system: {
    memoryUsage: number;
    cpuUsage: number;
    networkStatus: 'online' | 'offline' | 'slow';
    lastUpdate: number;
  };
}

export const usePipelineStatus = (): PipelineStatus => {
  const [status, setStatus] = useState<PipelineStatus>({
    mirror: { stage: 'idle', faceDetected: false, landmarksCount: 0, frameRate: 0, lastUpdate: 0 },
    beard: { stage: 'idle', apiLatency: 0, recommendationsCount: 0, lastUpdate: 0 },
    skin: { stage: 'idle', framesCaptured: 0, analysisProgress: 0, lastUpdate: 0 },
    system: { memoryUsage: 0, cpuUsage: 0, networkStatus: 'online', lastUpdate: 0 }
  });
  
  useEffect(() => {
    const updateStatus = () => {
      if (typeof window !== 'undefined' && window.DEBUG_AI) {
        const debugAI = window.DEBUG_AI as any;
        
        const newStatus: PipelineStatus = {
          mirror: {
            stage: debugAI.pipelineStage || 'idle',
            faceDetected: debugAI.faceDetected || false,
            landmarksCount: debugAI.landmarksCount || 0,
            frameRate: debugAI.overlayFrameCount ? Math.round(debugAI.overlayFrameCount / ((performance.now() - (debugAI.faceDetectionTime || 0)) / 1000)) : 0,
            lastUpdate: performance.now()
          },
          beard: {
            stage: debugAI.beardPipelineStatus || 'idle',
            apiLatency: debugAI.apiLatency || 0,
            recommendationsCount: debugAI.lastApiCall?.recommendationsCount || 0,
            lastUpdate: debugAI.lastApiCall?.timestamp || 0
          },
          skin: {
            stage: debugAI.skinPipelineStatus || 'idle',
            framesCaptured: debugAI.framesCaptured || 0,
            analysisProgress: debugAI.analysisProgress || 0,
            lastUpdate: debugAI.lastAnalysisTime || 0
          },
          system: {
            memoryUsage: performance.memory ? Math.round((performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize) * 100) : 0,
            cpuUsage: 0, // Not directly available in browser
            networkStatus: 'online',
            lastUpdate: performance.now()
          }
        };
        
        // Only update if status actually changed
        if (JSON.stringify(newStatus) !== JSON.stringify(status)) {
          Object.assign(status, newStatus);
        }
      }
    };
    
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [status]);
  
  return status;
};

// Initialize debug console on app start
export const initializeDebugConsole = () => {
  // Setup console interceptors
  const cleanup = setupDebugConsoleInterceptors();
  
  // Initialize global DEBUG_AI if not exists
  if (typeof window !== 'undefined' && !window.DEBUG_AI) {
    window.DEBUG_AI = {
      pipelineStage: 'idle',
      faceDetected: false,
      landmarksCount: 0,
      overlayFrameCount: 0,
      beardPipelineStatus: 'idle',
      skinPipelineStatus: 'idle',
      framesCaptured: 0,
      analysisProgress: 0
    };
  }
  
  return cleanup;
};

export default useDebugConsole;
