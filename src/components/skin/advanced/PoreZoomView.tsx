/**
 * PoreZoomView.tsx — Ultra-Pro Pore Zoom Visualization
 * Provides micro-level pore structure analysis with real data
 * 
 * STRICT RULES:
 * - NO mock data
 * - NO fallback logic
 * - ONLY real texture points
 * - Missing data → THROW ERROR
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

// 🔬 PORE ZOOM VIEW INTERFACE
interface PoreZoomViewProps {
  texturePoints: any[];
  imageRef: React.RefObject<HTMLCanvasElement>;
  onClose: () => void;
  initialZoomPoint: any;
}

// 🔬 ULTRA-PRO PORE ZOOM VIEW
export const PoreZoomView: React.FC<PoreZoomViewProps> = ({
  texturePoints,
  imageRef,
  onClose,
  initialZoomPoint
}) => {
  const [zoomLevel, setZoomLevel] = useState(3);
  const [selectedPoint, setSelectedPoint] = useState(initialZoomPoint);
  const [enhancementLevel, setEnhancementLevel] = useState(1.2);
  const [showMicroDetails, setShowMicroDetails] = useState(true);

  const zoomCanvasRef = useRef<HTMLCanvasElement>(null);
  const detailCanvasRef = useRef<HTMLCanvasElement>(null);

  // 🔍 FIND NEAREST TEXTURE POINT
  const findNearestTexturePoint = useCallback((x: number, y: number) => {
    if (!texturePoints || texturePoints.length === 0) {
      throw new Error("CLINICAL_ERROR: No texture points available for zoom");
    }

    return texturePoints.reduce((nearest: any, point: any) => {
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        throw new Error("CLINICAL_ERROR: Invalid texture point coordinates");
      }
      
      const dist = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
      const nearestDist = Math.sqrt(Math.pow(nearest.x - x, 2) + Math.pow(nearest.y - y, 2));
      return dist < nearestDist ? point : nearest;
    });
  }, [texturePoints]);

  // 🔍 HANDLE CANVAS CLICK FOR ZOOM SELECTION
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = imageRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const nearestPoint = findNearestTexturePoint(x, y);
    setSelectedPoint(nearestPoint);
  }, [imageRef, findNearestTexturePoint]);

  // 🔍 RENDER ZOOMED PORE STRUCTURE
  const renderZoomedPore = useCallback(() => {
    const sourceCanvas = imageRef.current;
    const zoomCanvas = zoomCanvasRef.current;
    const detailCanvas = detailCanvasRef.current;

    if (!sourceCanvas || !zoomCanvas || !detailCanvas) return;

    const sourceCtx = sourceCanvas.getContext('2d');
    const zoomCtx = zoomCanvas.getContext('2d');
    const detailCtx = detailCanvas.getContext('2d');

    if (!sourceCtx || !zoomCtx || !detailCtx) return;

    // Set zoom canvas dimensions
    zoomCanvas.width = 400;
    zoomCanvas.height = 400;
    detailCanvas.width = 400;
    detailCanvas.height = 200;

    // Clear canvases
    zoomCtx.clearRect(0, 0, 400, 400);
    detailCtx.clearRect(0, 0, 400, 200);

    if (!selectedPoint) return;

    // Extract pore region (50x50px around selected point)
    const sourceSize = 50 / zoomLevel;
    const sourceX = Math.max(0, selectedPoint.x - sourceSize / 2);
    const sourceY = Math.max(0, selectedPoint.y - sourceSize / 2);

    // Draw zoomed region
    zoomCtx.save();
    zoomCtx.imageSmoothingEnabled = false;
    zoomCtx.imageSmoothingQuality = 'high';
    zoomCtx.drawImage(
      sourceCanvas,
      sourceX, sourceY, sourceSize, sourceSize,
      0, 0, 400, 400
    );
    zoomCtx.restore();

    // Apply micro contrast enhancement
    const imageData = zoomCtx.getImageData(0, 0, 400, 400);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Enhance contrast for pore visibility
      data[i] = Math.min(255, Math.max(0, (r - 128) * enhancementLevel + 128));
      data[i + 1] = Math.min(255, Math.max(0, (g - 128) * enhancementLevel + 128));
      data[i + 2] = Math.min(255, Math.max(0, (b - 128) * enhancementLevel + 128));
    }

    zoomCtx.putImageData(imageData, 0, 0);

    // Draw micro details overlay
    if (showMicroDetails) {
      detailCtx.save();
      detailCtx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
      detailCtx.lineWidth = 2;
      detailCtx.font = '12px monospace';
      detailCtx.fillStyle = 'rgba(0, 255, 0, 0.9)';

      // Draw pore analysis grid
      for (let x = 0; x < 400; x += 40) {
        detailCtx.beginPath();
        detailCtx.moveTo(x, 0);
        detailCtx.lineTo(x, 200);
        detailCtx.stroke();
      }

      for (let y = 0; y < 200; y += 40) {
        detailCtx.beginPath();
        detailCtx.moveTo(0, y);
        detailCtx.lineTo(400, y);
        detailCtx.stroke();
      }

      // Calculate pore metrics from REAL data
      const poreRegionData = zoomCtx.getImageData(150, 150, 100, 100);
      const poreData = poreRegionData.data;
      
      let totalVariance = 0;
      let poreCount = 0;
      
      for (let i = 0; i < poreData.length; i += 4) {
        const r = poreData[i];
        const g = poreData[i + 1];
        const b = poreData[i + 2];
        
        const gray = (r + g + b) / 3;
        const localVariance = Math.pow(gray - 128, 2);
        
        if (gray < 80) poreCount++; // Dark spots = pores
        totalVariance += localVariance;
      }

      const avgVariance = totalVariance / (poreData.length / 4);
      const poreDensity = (poreCount / (poreData.length / 4)) * 100;

      // Display REAL metrics
      detailCtx.fillText(`PORE DENSITY: ${poreDensity.toFixed(1)}%`, 10, 20);
      detailCtx.fillText(`TEXTURE VARIANCE: ${avgVariance.toFixed(2)}`, 10, 40);
      detailCtx.fillText(`ZOOM LEVEL: ${zoomLevel}x`, 10, 60);
      detailCtx.fillText(`ENHANCEMENT: ${enhancementLevel.toFixed(1)}x`, 10, 80);
      detailCtx.fillText(`COORD: (${selectedPoint.x.toFixed(0)}, ${selectedPoint.y.toFixed(0)})`, 10, 100);
      detailCtx.fillText(`QUALITY: ${avgVariance < 500 ? 'SMOOTH' : 'ROUGH'}`, 10, 120);
      detailCtx.fillText(`PATTERN: ${poreDensity > 15 ? 'POROUS' : poreDensity > 8 ? 'NORMAL' : 'TIGHT'}`, 10, 140);
      detailCtx.fillText(`ANALYSIS: ${poreCount > 200 ? 'ACTIVE' : poreCount > 100 ? 'MODERATE' : 'MINIMAL'}`, 10, 160);

      detailCtx.restore();
    }
  }, [selectedPoint, zoomLevel, enhancementLevel, showMicroDetails]);

  // 🔄 UPDATE ZOOM RENDER
  useEffect(() => {
    renderZoomedPore();
  }, [renderZoomedPore]);

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center">
      <div className="bg-gray-900 rounded-2xl shadow-2xl border border-green-500/30 max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* 🔍 ZOOM HEADER */}
        <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-green-400 font-mono text-sm">
              🔍 PORE ZOOM ANALYSIS
            </div>
            <div className="text-white font-mono text-xs">
              {selectedPoint && `COORD: (${selectedPoint.x.toFixed(0)}, ${selectedPoint.y.toFixed(0)})`}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-mono text-sm transition-colors"
          >
            CLOSE
          </button>
        </div>

        {/* 🔬 ZOOM CONTROLS */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-gray-400 font-mono text-xs block mb-2">ZOOM LEVEL</label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setZoomLevel(Math.max(1, zoomLevel - 1))}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded font-mono text-sm"
                >
                  -
                </button>
                <span className="text-white font-mono text-sm w-12 text-center">{zoomLevel}x</span>
                <button
                  onClick={() => setZoomLevel(Math.min(10, zoomLevel + 1))}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded font-mono text-sm"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="text-gray-400 font-mono text-xs block mb-2">ENHANCEMENT</label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={enhancementLevel}
                onChange={(e) => setEnhancementLevel(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-white font-mono text-xs text-center">{enhancementLevel.toFixed(1)}x</div>
            </div>

            <div>
              <label className="text-gray-400 font-mono text-xs block mb-2">MICRO DETAILS</label>
              <button
                onClick={() => setShowMicroDetails(!showMicroDetails)}
                className={`px-3 py-1 rounded font-mono text-sm ${
                  showMicroDetails 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {showMicroDetails ? 'ON' : 'OFF'}
              </button>
            </div>

            <div>
              <label className="text-gray-400 font-mono text-xs block mb-2">SELECT POINT</label>
              <button
                onClick={() => {
                  if (texturePoints && texturePoints.length > 0) {
                    const randomPoint = texturePoints[Math.floor(Math.random() * texturePoints.length)];
                    setSelectedPoint(randomPoint);
                  }
                }}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-mono text-sm"
              >
                RANDOM
              </button>
            </div>
          </div>
        </div>

        {/* 🔬 ZOOM DISPLAY */}
        <div className="p-4 bg-gray-900">
          <div className="grid grid-cols-2 gap-4">
            {/* MAIN ZOOM VIEW */}
            <div className="relative">
              <h3 className="text-white font-mono text-sm mb-2">ENLARGED PORE STRUCTURE</h3>
              <canvas
                ref={zoomCanvasRef}
                className="w-full border border-gray-600 rounded cursor-crosshair"
                style={{ imageRendering: 'crisp-edges' }}
                onClick={handleCanvasClick}
              />
              
              {/* CROSSHAIR */}
              <div className="absolute top-1/2 left-1/2 w-8 h-0.5 bg-green-400 pointer-events-none"
                   style={{ transform: 'translate(-50%, -50%)' }} />
              <div className="absolute top-1/2 left-1/2 w-0.5 h-8 bg-green-400 pointer-events-none"
                   style={{ transform: 'translate(-50%, -50%)' }} />
            </div>

            {/* MICRO ANALYSIS */}
            <div>
              <h3 className="text-white font-mono text-sm mb-2">MICRO ANALYSIS</h3>
              <canvas
                ref={detailCanvasRef}
                className="w-full border border-gray-600 rounded"
                style={{ imageRendering: 'auto' }}
              />
            </div>
          </div>
        </div>

        {/* 🔍 TEXTURE POINTS LIST */}
        <div className="bg-gray-800 border-t border-gray-700 p-4 max-h-48 overflow-y-auto">
          <h3 className="text-white font-mono text-sm mb-3">AVAILABLE TEXTURE POINTS</h3>
          <div className="space-y-2">
            {texturePoints?.map((point: any, index: number) => (
              <div
                key={index}
                onClick={() => setSelectedPoint(point)}
                className={`p-2 rounded cursor-pointer transition-colors ${
                  selectedPoint === point 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm">
                    POINT {index + 1}
                  </span>
                  <span className="font-mono text-xs">
                    ({point.x.toFixed(0)}, {point.y.toFixed(0)})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
