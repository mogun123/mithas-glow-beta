import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

interface DebugInfo {
  missingLandmarks: number[];
  landmarkCount: number;
  boundingBox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  regionPoints: number;
  canvasSize: { width: number; height: number };
  scanArea: { width: number; height: number };
  pixelsInsidePolygon: number;
  validPixelsExtracted: number;
  blackPixelsSkipped: number;
  lastError?: string;
  currentFrame?: number;
}

interface ForeheadDebugScreenProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ForeheadDebugScreen: React.FC<ForeheadDebugScreenProps> = ({ isVisible, onClose }) => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    missingLandmarks: [],
    landmarkCount: 0,
    boundingBox: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
    regionPoints: 0,
    canvasSize: { width: 0, height: 0 },
    scanArea: { width: 0, height: 0 },
    pixelsInsidePolygon: 0,
    validPixelsExtracted: 0,
    blackPixelsSkipped: 0,
    currentFrame: 0
  });

  const debugLogRef = useRef<string[]>([]);
  const maxLogEntries = 50;

  // Capture console logs for forehead debug
  useEffect(() => {
    if (!isVisible) return;

    const originalConsoleError = console.error;
    const originalConsoleLog = console.log;

    console.error = (...args: any[]) => {
      originalConsoleError.apply(console, args);
      const message = args.join(' ');
      if (message.includes('FOREHEAD_DEBUG')) {
        addLogEntry(`ERROR: ${message}`);
        if (message.includes('Missing landmarks')) {
          const matches = message.match(/Missing landmarks at indices: \[(.*?)\]/);
          if (matches) {
            const indices = matches[1].split(', ').map(i => parseInt(i.trim()));
            setDebugInfo(prev => ({ ...prev, missingLandmarks: indices }));
          }
        }
        if (message.includes('Available landmarks count')) {
          const matches = message.match(/Available landmarks count: (\d+)/);
          if (matches) {
            setDebugInfo(prev => ({ ...prev, landmarkCount: parseInt(matches[1]) }));
          }
        }
      }
    };

    console.log = (...args: any[]) => {
      originalConsoleLog.apply(console, args);
      const message = args.join(' ');
      if (message.includes('FOREHEAD_DEBUG')) {
        addLogEntry(message);
        parseDebugMessage(message);
      }
    };

    return () => {
      console.error = originalConsoleError;
      console.log = originalConsoleLog;
    };
  }, [isVisible]);

  const addLogEntry = (message: string) => {
    debugLogRef.current = [...debugLogRef.current.slice(-maxLogEntries + 1), message];
  };

  const parseDebugMessage = (message: string) => {
    // Parse bounding box
    if (message.includes('Bounding box')) {
      const matches = message.match(/minX: (\d+), maxX: (\d+), minY: (\d+), maxY: (\d+)/);
      if (matches) {
        setDebugInfo(prev => ({
          ...prev,
          boundingBox: {
            minX: parseInt(matches[1]),
            maxX: parseInt(matches[2]),
            minY: parseInt(matches[3]),
            maxY: parseInt(matches[4])
          }
        }));
      }
    }

    // Parse region points
    if (message.includes('Region points count')) {
      const matches = message.match(/Region points count: (\d+)/);
      if (matches) {
        setDebugInfo(prev => ({ ...prev, regionPoints: parseInt(matches[1]) }));
      }
    }

    // Parse canvas size
    if (message.includes('Canvas size')) {
      const matches = message.match(/Canvas size: (\d+)x(\d+)/);
      if (matches) {
        setDebugInfo(prev => ({
          ...prev,
          canvasSize: { width: parseInt(matches[1]), height: parseInt(matches[2]) }
        }));
      }
    }

    // Parse scan area
    if (message.includes('Scan area')) {
      const matches = message.match(/Scan area: (\d+)x(\d+) pixels/);
      if (matches) {
        setDebugInfo(prev => ({
          ...prev,
          scanArea: { width: parseInt(matches[1]), height: parseInt(matches[2]) }
        }));
      }
    }

    // Parse pixel results
    if (message.includes('Pixels inside polygon')) {
      const matches = message.match(/Pixels inside polygon: (\d+)/);
      if (matches) {
        setDebugInfo(prev => ({ ...prev, pixelsInsidePolygon: parseInt(matches[1]) }));
      }
    }

    if (message.includes('Valid pixels extracted')) {
      const matches = message.match(/Valid pixels extracted: (\d+)/);
      if (matches) {
        setDebugInfo(prev => ({ ...prev, validPixelsExtracted: parseInt(matches[1]) }));
      }
    }

    if (message.includes('Black pixels skipped')) {
      const matches = message.match(/Black pixels skipped: (\d+)/);
      if (matches) {
        setDebugInfo(prev => ({ ...prev, blackPixelsSkipped: parseInt(matches[1]) }));
      }
    }
  };

  const clearLogs = () => {
    debugLogRef.current = [];
  };

  const getStatusColor = () => {
    if (debugInfo.validPixelsExtracted === 0) return 'text-red-600';
    if (debugInfo.validPixelsExtracted < 20) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusText = () => {
    if (debugInfo.validPixelsExtracted === 0) return 'FAILED - No pixels extracted';
    if (debugInfo.validPixelsExtracted < 20) return 'WARNING - Low pixel count';
    if (debugInfo.validPixelsExtracted < 50) return 'MARGINAL - Below minimum';
    return 'GOOD - Sufficient pixels';
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold">🔍 Forehead Extraction Debug Screen</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={clearLogs}>
              Clear Logs
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📊 Extraction Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className={`text-2xl font-bold ${getStatusColor()}`}>
                    {getStatusText()}
                  </div>
                  <div className="text-sm text-gray-600">
                    Pixels Extracted: {debugInfo.validPixelsExtracted} / 50 minimum
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Landmarks:</span>
                    <span className={`text-sm ${debugInfo.missingLandmarks.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {debugInfo.landmarkCount}/478 ({debugInfo.missingLandmarks.length} missing)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Polygon Valid:</span>
                    <span className={`text-sm ${debugInfo.regionPoints >= 3 ? 'text-green-600' : 'text-red-600'}`}>
                      {debugInfo.regionPoints} points
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🎯 Bounding Box</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>X Range:</span>
                  <span>{debugInfo.boundingBox.minX} → {debugInfo.boundingBox.maxX}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Y Range:</span>
                  <span>{debugInfo.boundingBox.minY} → {debugInfo.boundingBox.maxY}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Canvas Size:</span>
                  <span>{debugInfo.canvasSize.width}×{debugInfo.canvasSize.height}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Scan Area:</span>
                  <span>{debugInfo.scanArea.width}×{debugInfo.scanArea.height}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">🔢 Pixel Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Inside Polygon:</span>
                  <span>{debugInfo.pixelsInsidePolygon}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Valid Pixels:</span>
                  <span className={debugInfo.validPixelsExtracted > 0 ? 'text-green-600' : 'text-red-600'}>
                    {debugInfo.validPixelsExtracted}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Black Skipped:</span>
                  <span>{debugInfo.blackPixelsSkipped}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Success Rate:</span>
                  <span>{debugInfo.pixelsInsidePolygon > 0 ? 
                    `${((debugInfo.validPixelsExtracted / debugInfo.pixelsInsidePolygon) * 100).toFixed(1)}%` : 
                    '0%'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Missing Landmarks */}
          {debugInfo.missingLandmarks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-red-600">⚠️ Missing Landmarks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {debugInfo.missingLandmarks.map((index) => (
                    <span key={index} className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                      {index}
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  These landmark indices are not detected by MediaPipe FaceMesh
                </div>
              </CardContent>
            </Card>
          )}

          {/* Debug Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">📝 Debug Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs h-64 overflow-y-auto">
                {debugLogRef.current.length === 0 ? (
                  <div className="text-gray-500">Waiting for debug output...</div>
                ) : (
                  debugLogRef.current.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </div>
    </div>
  );
};

export default ForeheadDebugScreen;
