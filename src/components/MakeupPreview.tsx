import React, { useRef, useEffect, useState, useCallback } from 'react';
import { WebGLRenderer, MakeupLayer, RenderConfig } from '../rendering/webglRenderer';
import { FaceDetectionResult } from '../lib/ai/computer-vision/faceDetection';
import { SkinToneResult } from '../lib/ai/skin-analysis/skinToneAnalysis';
import { UndertoneResult } from '../lib/ai/skin-analysis/undertoneDetection';

export interface MakeupProduct {
  id: string;
  name: string;
  type: 'foundation' | 'blush' | 'lipstick' | 'contour' | 'highlighter' | 'eyeshadow';
  color: [number, number, number]; // RGB
  intensity: number; // 0-1
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
}

export interface MakeupPreviewProps {
  videoElement: HTMLVideoElement | null;
  faceDetection: FaceDetectionResult | null;
  skinTone: SkinToneResult | null;
  undertone: UndertoneResult | null;
  activeProducts: MakeupProduct[];
  onProductToggle?: (product: MakeupProduct) => void;
  onIntensityChange?: (productId: string, intensity: number) => void;
  className?: string;
  enableInteraction?: boolean;
}

export const MakeupPreview: React.FC<MakeupPreviewProps> = ({
  videoElement,
  faceDetection,
  skinTone,
  undertone,
  activeProducts,
  onProductToggle,
  onIntensityChange,
  className = '',
  enableInteraction = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [renderQuality, setRenderQuality] = useState<'low' | 'medium' | 'high'>('medium');

  // Initialize WebGL renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const config: RenderConfig = {
        width: 640,
        height: 480,
        enableSmoothing: true,
        enableBlending: true,
        quality: renderQuality,
      };

      const renderer = new WebGLRenderer(canvasRef.current, config);
      rendererRef.current = renderer;
      setIsInitialized(true);

      return () => {
        renderer.cleanup();
      };
    } catch (error) {
      console.error('Failed to initialize WebGL renderer:', error);
    }
  }, [renderQuality]);

  // Get recommended makeup colors based on skin analysis
  const getRecommendedProducts = useCallback((): MakeupProduct[] => {
    if (!skinTone || !undertone) return [];

    const baseProducts: MakeupProduct[] = [
      {
        id: 'foundation',
        name: 'Foundation',
        type: 'foundation',
        color: [255, 224, 189], // Base foundation color
        intensity: 0.6,
        blendMode: 'normal',
      },
      {
        id: 'blush',
        name: 'Blush',
        type: 'blush',
        color: undertone.undertone === 'Warm' ? [255, 182, 193] : [255, 160, 180],
        intensity: 0.4,
        blendMode: 'normal',
      },
      {
        id: 'lipstick',
        name: 'Lipstick',
        type: 'lipstick',
        color: undertone.undertone === 'Warm' ? [220, 80, 100] : [200, 60, 120],
        intensity: 0.7,
        blendMode: 'normal',
      },
      {
        id: 'contour',
        name: 'Contour',
        type: 'contour',
        color: [139, 90, 43],
        intensity: 0.3,
        blendMode: 'multiply',
      },
      {
        id: 'highlighter',
        name: 'Highlighter',
        type: 'highlighter',
        color: [255, 223, 186],
        intensity: 0.5,
        blendMode: 'screen',
      },
      {
        id: 'eyeshadow',
        name: 'Eyeshadow',
        type: 'eyeshadow',
        color: undertone.undertone === 'Warm' ? [205, 133, 63] : [147, 112, 219],
        intensity: 0.4,
        blendMode: 'normal',
      },
    ];

    return baseProducts;
  }, [skinTone, undertone]);

  // Get landmark indices for each makeup type
  const getLandmarksForProduct = useCallback((productType: MakeupProduct['type'], landmarks: number[][]): number[][] => {
    switch (productType) {
      case 'foundation':
        // Full face coverage
        return landmarks.filter((_, idx) => 
          idx >= 0 && idx < 468 // Use all face landmarks for foundation
        );
      
      case 'blush':
        // Cheek areas
        return [
          landmarks[234], landmarks[93], landmarks[132], // Left cheek
          landmarks[454], landmarks[323], landmarks[361], // Right cheek
        ].filter(Boolean);
      
      case 'lipstick':
        // Lip area
        return [
          landmarks[61], landmarks[84], landmarks[17], landmarks[314], landmarks[405],
          landmarks[291], landmarks[375], landmarks[321], landmarks[308], landmarks[324],
          landmarks[318], landmarks[402], landmarks[317], landmarks[14], landmarks[87],
          landmarks[178], landmarks[88], landmarks[95], landmarks[78], landmarks[191],
          landmarks[80], landmarks[81], landmarks[82], landmarks[13], landmarks[312],
          landmarks[311], landmarks[310], landmarks[415], landmarks[308],
        ].filter(Boolean);
      
      case 'contour':
        // Jawline and cheek hollows
        return [
          landmarks[172], landmarks[136], landmarks[150], landmarks[172], // Jawline
          landmarks[234], landmarks[127], // Left cheek hollow
          landmarks[454], landmarks[280], // Right cheek hollow
        ].filter(Boolean);
      
      case 'highlighter':
        // High points of face
        return [
          landmarks[10], // Forehead center
          landmarks[151], // Nose bridge
          landmarks[6], // Nose tip
          landmarks[234], landmarks[93], // Left cheek high point
          landmarks[454], landmarks[323], // Right cheek high point
        ].filter(Boolean);
      
      case 'eyeshadow':
        // Eye area
        return [
          landmarks[33], landmarks[7], landmarks[163], landmarks[144], landmarks[145],
          landmarks[153], landmarks[154], landmarks[155], landmarks[133], landmarks[173],
          landmarks[157], landmarks[158], landmarks[159], landmarks[160], landmarks[161],
          landmarks[246], // Left eye
          landmarks[362], landmarks[398], landmarks[384], landmarks[385], landmarks[386],
          landmarks[387], landmarks[388], landmarks[466], landmarks[263], landmarks[249],
          landmarks[390], landmarks[373], landmarks[374], landmarks[380], landmarks[381],
          landmarks[382], // Right eye
        ].filter(Boolean);
      
      default:
        return [];
    }
  }, []);

  // Convert products to makeup layers
  const createMakeupLayers = useCallback((products: MakeupProduct[], landmarks: number[][]): MakeupLayer[] => {
    return products.map(product => ({
      type: product.type,
      color: [...product.color, 1] as [number, number, number, number], // Add alpha
      intensity: product.intensity,
      blendMode: product.blendMode,
      landmarks: getLandmarksForProduct(product.type, landmarks),
    }));
  }, [getLandmarksForProduct]);

  // Render loop
  const render = useCallback(() => {
    if (!rendererRef.current || !videoElement || !faceDetection || !isInitialized) return;

    try {
      // Create makeup layers from active products
      const makeupLayers = createMakeupLayers(activeProducts, faceDetection.landmarks);
      
      // Render makeup
      rendererRef.current.renderMakeup(videoElement, makeupLayers, faceDetection.landmarks);
    } catch (error) {
      console.error('Render error:', error);
    }

    // Continue render loop
    animationFrameRef.current = requestAnimationFrame(render);
  }, [videoElement, faceDetection, activeProducts, isInitialized, createMakeupLayers]);

  // Start/stop rendering
  useEffect(() => {
    if (isInitialized && videoElement && faceDetection) {
      render();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render, isInitialized, videoElement, faceDetection]);

  // Handle canvas resize
  useEffect(() => {
    if (!canvasRef.current || !rendererRef.current) return;

    const resizeCanvas = () => {
      if (videoElement) {
        canvasRef.current!.width = videoElement.videoWidth;
        canvasRef.current!.height = videoElement.videoHeight;
        rendererRef.current!.resize(videoElement.videoWidth, videoElement.videoHeight);
      }
    };

    resizeCanvas();
    
    // Handle video resize
    if (videoElement) {
      videoElement.addEventListener('resize', resizeCanvas);
      return () => videoElement.removeEventListener('resize', resizeCanvas);
    }
  }, [videoElement]);

  const recommendedProducts = getRecommendedProducts();

  return (
    <div className={`makeup-preview ${className}`}>
      {/* Makeup canvas */}
      <div className="preview-container">
        <canvas
          ref={canvasRef}
          className="makeup-canvas"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: enableInteraction ? 'auto' : 'none',
          }}
        />
        
        {/* Loading indicator */}
        {!isInitialized && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <p>Initializing makeup renderer...</p>
          </div>
        )}
      </div>

      {/* Makeup controls */}
      {enableInteraction && (
        <div className="makeup-controls">
          <div className="controls-header">
            <h4>Makeup Preview</h4>
            <div className="quality-selector">
              <label>Quality:</label>
              <select 
                value={renderQuality} 
                onChange={(e) => setRenderQuality(e.target.value as 'low' | 'medium' | 'high')}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="product-grid">
            {recommendedProducts.map(product => {
              const isActive = activeProducts.some(p => p.id === product.id);
              const activeProduct = activeProducts.find(p => p.id === product.id);
              
              return (
                <div key={product.id} className="product-card">
                  <div className="product-header">
                    <div 
                      className="color-swatch"
                      style={{
                        backgroundColor: `rgb(${product.color.join(',')})`,
                        border: isActive ? '2px solid #007bff' : '2px solid #ddd',
                      }}
                    />
                    <span className="product-name">{product.name}</span>
                  </div>
                  
                  <div className="product-controls">
                    <button
                      className={`toggle-btn ${isActive ? 'active' : ''}`}
                      onClick={() => onProductToggle?.(product)}
                    >
                      {isActive ? 'Remove' : 'Apply'}
                    </button>
                    
                    {isActive && onIntensityChange && (
                      <div className="intensity-control">
                        <label>Intensity:</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={(activeProduct?.intensity || 0) * 100}
                          onChange={(e) => onIntensityChange(product.id, Number(e.target.value) / 100)}
                        />
                        <span>{Math.round((activeProduct?.intensity || 0) * 100)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick presets */}
          <div className="preset-section">
            <h5>Quick Looks</h5>
            <div className="preset-buttons">
              <button className="preset-btn">Natural</button>
              <button className="preset-btn">Business</button>
              <button className="preset-btn">Evening</button>
              <button className="preset-btn">Party</button>
            </div>
          </div>
        </div>
      )}

      {/* Performance info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="performance-info" style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace',
        }}>
          <div>Quality: {renderQuality}</div>
          <div>Products: {activeProducts.length}</div>
          <div>Face: {faceDetection ? 'Detected' : 'Not detected'}</div>
        </div>
      )}
    </div>
  );
};
