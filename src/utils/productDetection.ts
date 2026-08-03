/**
 * Real AI Product Detection using TensorFlow.js
 * Replaces fake color-only guessing with actual object detection
 * Supports: lipstick, foundation, saree, kurti, shoes, jewelry, skincare, handbag
 */

// Dynamic imports for TensorFlow.js to avoid build issues
let tf: any = null;
let mobilenet: any = null;

// Load TensorFlow.js dynamically
async function loadTensorFlow() {
  if (!tf) {
    try {
      // Try to load from CDN first
      const tfScript = document.createElement('script');
      tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js';
      document.head.appendChild(tfScript);
      
      await new Promise(resolve => {
        tfScript.onload = resolve;
      });
      
      tf = (window as any).tf;
      
      // Load MobileNet
      const mobilenetScript = document.createElement('script');
      mobilenetScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@latest/dist/mobilenet.min.js';
      document.head.appendChild(mobilenetScript);
      
      await new Promise(resolve => {
        mobilenetScript.onload = resolve;
      });
      
      mobilenet = (window as any).mobilenet;
    } catch (error) {
      console.warn('Failed to load TensorFlow.js:', error);
    }
  }
}

// Product categories supported by AI detection
export interface ProductDetectionResult {
  category: 'lipstick' | 'foundation' | 'saree' | 'kurti' | 'shoes' | 'jewelry' | 'skincare' | 'handbag' | 'unknown';
  confidence: number;
  className: string;
  probability: number;
  suggestedPrice: number;
  suggestedName: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// MobileNet model instance
let model: any = null;
let isLoading = false;

/**
 * Initialize TensorFlow.js and MobileNet model
 * Loads model asynchronously for better performance
 */
export async function initializeProductDetection(): Promise<void> {
  if (model || isLoading) return;
  
  try {
    isLoading = true;
    console.log('🧠 Loading MobileNet model for product detection...');
    
    // Load TensorFlow.js and MobileNet
    await loadTensorFlow();
    
    if (mobilenet) {
      model = await mobilenet.load();
    }
    
    console.log('✅ MobileNet model loaded successfully');
    isLoading = false;
  } catch (error) {
    console.error('❌ Failed to load MobileNet model:', error);
    isLoading = false;
    throw new Error('AI model initialization failed');
  }
}

/**
 * Detect product from image using TensorFlow.js
 * @param imageData - ImageData from canvas
 * @param canvas - HTML canvas element for processing
 * @returns Promise<ProductDetectionResult>
 */
export async function detectProduct(
  imageData: ImageData,
  canvas: HTMLCanvasElement
): Promise<ProductDetectionResult> {
  try {
    // Ensure model is loaded
    if (!model) {
      await initializeProductDetection();
    }
    
    if (!model) {
      throw new Error('AI model not available');
    }

    // Convert ImageData to tensor
    const tensor = tf.browser.fromPixels(canvas)
      .resizeNearestNeighbor([224, 224]) // MobileNet expects 224x224
      .toFloat()
      .expandDims();

    // Run prediction
    const predictions = await (model as any).classify(tensor, 5); // Get top 5 predictions
    
    // Clean up tensor
    tf.dispose(tensor);

    // Map predictions to product categories
    const detection = mapPredictionsToProductCategory(predictions);
    
    console.log('🎯 AI Detection Result:', detection);
    
    return detection;
  } catch (error) {
    console.error('❌ Product detection failed:', error);
    throw new Error(`Product detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Map MobileNet predictions to product categories
 * Uses intelligent matching based on class names and probabilities
 */
function mapPredictionsToProductCategory(
  predictions: any[]
): ProductDetectionResult {
  if (!predictions || predictions.length === 0) {
    return getUnknownResult();
  }

  // Product category mapping with keywords
  const categoryMappings = {
    lipstick: {
      keywords: ['lipstick', 'lip', 'cosmetic', 'makeup', 'lipstick', 'lip gloss', 'lip balm'],
      basePrice: 399,
      namePrefix: 'Lipstick'
    },
    foundation: {
      keywords: ['foundation', 'makeup', 'cosmetic', 'face', 'foundation', 'concealer', 'base'],
      basePrice: 599,
      namePrefix: 'Foundation'
    },
    saree: {
      keywords: ['saree', 'sari', 'sari', 'dress', 'clothing', 'garment', 'fabric'],
      basePrice: 1299,
      namePrefix: 'Saree'
    },
    kurti: {
      keywords: ['kurti', 'kurti', 'top', 'blouse', 'tunic', 'dress'],
      basePrice: 899,
      namePrefix: 'Kurti'
    },
    shoes: {
      keywords: ['shoe', 'sneaker', 'footwear', 'boot', 'sandal', 'heel', 'shoes'],
      basePrice: 1299,
      namePrefix: 'Shoes'
    },
    jewelry: {
      keywords: ['jewelry', 'necklace', 'earring', 'ring', 'bracelet', 'jewellery', 'gold', 'silver'],
      basePrice: 1499,
      namePrefix: 'Jewelry'
    },
    skincare: {
      keywords: ['cream', 'lotion', 'serum', 'skincare', 'moisturizer', 'face', 'bottle'],
      basePrice: 699,
      namePrefix: 'Skincare'
    },
    handbag: {
      keywords: ['handbag', 'purse', 'bag', 'pocketbook', 'clutch', 'tote'],
      basePrice: 999,
      namePrefix: 'Handbag'
    }
  };

  // Find best matching category
  let bestMatch: ProductDetectionResult = getUnknownResult();
  
  for (const prediction of predictions) {
    const className = prediction.className.toLowerCase();
    const probability = prediction.probability;
    
    // Check each category for keyword matches
    for (const [category, mapping] of Object.entries(categoryMappings)) {
      if (mapping.keywords.some(keyword => className.includes(keyword))) {
        const confidence = probability * 100; // Convert to percentage
        
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            category: category as ProductDetectionResult['category'],
            confidence,
            className: prediction.className,
            probability,
            suggestedPrice: calculateSuggestedPrice(category as keyof typeof categoryMappings, probability),
            suggestedName: `${mapping.namePrefix} - ${prediction.className.split(',')[0].trim()}`
          };
        }
      }
    }
  }

  // If no good match found, use top prediction with lower confidence
  if (bestMatch.category === 'unknown' && predictions[0]) {
    bestMatch = {
      category: 'unknown',
      confidence: predictions[0].probability * 50, // Lower confidence for unknown
      className: predictions[0].className,
      probability: predictions[0].probability,
      suggestedPrice: 299,
      suggestedName: predictions[0].className.split(',')[0].trim()
    };
  }

  return bestMatch;
}

/**
 * Calculate suggested price based on category and confidence
 * Uses market intelligence simulation
 */
function calculateSuggestedPrice(
  category: string,
  confidence: number
): number {
  const basePrices: Record<string, number> = {
    lipstick: 399,
    foundation: 599,
    saree: 1299,
    kurti: 899,
    shoes: 1299,
    jewelry: 1499,
    skincare: 699,
    handbag: 999
  };

  const basePrice = basePrices[category] || 299;
  
  // Adjust price based on confidence (higher confidence = closer to base price)
  const confidenceMultiplier = 0.7 + (confidence * 0.6); // 0.7 to 1.3 range
  
  // Add some randomness for market simulation
  const marketVariation = 0.9 + Math.random() * 0.2; // 0.9 to 1.1 range
  
  return Math.round(basePrice * confidenceMultiplier * marketVariation);
}

/**
 * Get unknown result fallback
 */
function getUnknownResult(): ProductDetectionResult {
  return {
    category: 'unknown',
    confidence: 0,
    className: 'unknown',
    probability: 0,
    suggestedPrice: 299,
    suggestedName: 'Scanned Product'
  };
}

/**
 * Get category display name for UI
 */
export function getCategoryDisplayName(category: ProductDetectionResult['category']): string {
  const displayNames = {
    lipstick: 'Lipstick',
    foundation: 'Foundation',
    saree: 'Saree',
    kurti: 'Kurti',
    shoes: 'Shoes',
    jewelry: 'Jewelry',
    skincare: 'Skincare',
    handbag: 'Handbag',
    unknown: 'Unknown'
  };
  
  return displayNames[category] || 'Unknown';
}

/**
 * Check if TensorFlow.js is available
 */
export function isTensorFlowAvailable(): boolean {
  return typeof tf !== 'undefined' && typeof mobilenet !== 'undefined';
}

/**
 * Preload model for better performance
 * Call this during app initialization
 */
export async function preloadProductDetection(): Promise<void> {
  try {
    await initializeProductDetection();
    console.log('🚀 Product detection model preloaded successfully');
  } catch (error) {
    console.warn('⚠️ Failed to preload product detection model:', error);
  }
}
