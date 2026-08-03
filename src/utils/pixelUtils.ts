// src/lib/utils/pixelUtils.ts
import { LAB, ColorConversion } from '../lib/ai/computer-vision/colorConversion';


/**
 * 👁️ CLINICAL CORE: Ray-casting algorithm for precise polygon masking
 * Ensures we only extract pixels strictly inside the landmark points (e.g., Lips only).
 */
function isInside(x: number, y: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * 👁️ CV CORE: Extracts raw LAB pixels strictly from a landmark polygon.
 * ZERO FALLBACKS. ZERO MOCK DATA. STRICT SIGNAL ENFORCEMENT.
 */
export function extractPixelsFromLandmarks(
  imageData: ImageData,
  landmarks: any[],
  indices: number[],
  step?: number,
  regionName?: string,
  frameAngle?: string
): { pixels: any[] } {
  // 🚫 STRICT GATE: Crash if signal is missing.
  if (!imageData) throw new Error(`STRICT_SIGNAL_LOSS: Missing imageData for ${regionName || 'unknown_region'}`);
  if (!landmarks || landmarks.length === 0) throw new Error(`STRICT_SIGNAL_LOSS: Missing landmarks for ${regionName || 'unknown_region'}`);
  if (!indices || indices.length === 0) throw new Error(`STRICT_SIGNAL_LOSS: Missing indices for ${regionName || 'unknown_region'}`);

  const canvasWidth = imageData.width;
  const canvasHeight = imageData.height;

  // 1. Map landmarks to pixel coordinates
  const regionPoints = indices.map((idx) => {
    const lm = landmarks[idx];

    // 🚫 ZERO MOCK DATA: Crash if a specific landmark point is missing
    if (!lm) throw new Error(`STRICT_SIGNAL_LOSS: Landmark missing at index ${idx} for ${regionName || 'unknown_region'}`);

    const px = lm.x <= 1 ? lm.x * canvasWidth : lm.x;
    const py = lm.y <= 1 ? lm.y * canvasHeight : lm.y;
    return { x: px, y: py };
  });

  const xs = regionPoints.map(p => p.x);
  const ys = regionPoints.map(p => p.y);

  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const maxX = Math.min(canvasWidth - 1, Math.ceil(Math.max(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxY = Math.min(canvasHeight - 1, Math.ceil(Math.max(...ys)));

  // 🚫 ZERO FALLBACK: Crash if geometry is invalid
  if (maxX <= minX || maxY <= minY) {
    throw new Error(`STRICT_SIGNAL_LOSS: Invalid geometry bounding box for ${regionName || 'unknown_region'}`);
  }

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const extractedPixels: any[] = [];
  const imgDataArray = imageData.data;

  // DEBUG: Add logging for forehead region
  if (regionName === "forehead") {
    console.log(`FOREHEAD_DEBUG: Bounding box - minX: ${minX}, maxX: ${maxX}, minY: ${minY}, maxY: ${maxY}`);
    console.log(`FOREHEAD_DEBUG: Region points count: ${regionPoints.length}`);
    console.log(`FOREHEAD_DEBUG: Canvas size: ${canvasWidth}x${canvasHeight}`);
    console.log(`FOREHEAD_DEBUG: Scan area: ${w}x${h} pixels`);
  }

  // 3. Scan pixels and apply Polygon Masking
  let pixelsInsidePolygon = 0;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const globalX = minX + dx;
      const globalY = minY + dy;

      if (isInside(globalX, globalY, regionPoints)) {
        pixelsInsidePolygon++;
        const offset = (globalY * canvasWidth + globalX) * 4;
        const r = imgDataArray[offset];
        const g = imgDataArray[offset + 1];
        const b = imgDataArray[offset + 2];

        // This is a pure black pixel skip for bounds, not a mock.
        if (r === 0 && g === 0 && b === 0) continue;

        // 🛡️ FIX: Pass it as an RGB object!
        const lab = ColorConversion.rgbToLAB({ r: r, g: g, b: b });


        // ✅ BUG FIX: Removed Key Collision! Separated RGB and LAB names properly.
        extractedPixels.push({
          x: globalX,
          y: globalY,
          r: r,        // Strict RGB Red
          g: g,        // Strict RGB Green
          b: b,        // Strict RGB Blue (Proper Integer 0-255, no more collision!)
          labL: lab.l, // Safely renamed to prevent overwriting
          labA: lab.a,
          labB: lab.b,
          intensity: lab.l,
          angle: frameAngle || 'center'  // 🎯 Angle-specific tagging
        });
      }
    }
  }

  // DEBUG: Log final results for forehead region
  if (regionName === "forehead") {
    console.log(`FOREHEAD_DEBUG: Pixels inside polygon: ${pixelsInsidePolygon}`);
    console.log(`FOREHEAD_DEBUG: Valid pixels extracted: ${extractedPixels.length}`);
    console.log(`FOREHEAD_DEBUG: Black pixels skipped: ${pixelsInsidePolygon - extractedPixels.length}`);
  }

  // 🚫 ZERO FALLBACK: Crash if the polygon yielded absolutely zero valid pixels
  if (extractedPixels.length === 0) {
    if (regionName === "forehead") {
      console.error(`FOREHEAD_DEBUG: Zero pixels extracted - polygon may be invalid or all pixels are black`);
    }
    throw new Error(`STRICT_SIGNAL_LOSS: Region extraction yielded zero pixels for ${regionName || 'unknown_region'}`);
  }

  return { pixels: extractedPixels };
}



/**
 * 🧮 MATH: Spatial Clustering for spot detection.
 * Logic is 100% identical to original, with squared-distance optimization.
 */
export function clusterPixels(pixels: any[], threshold: number, minClusterSize: number = 5) {
  if (!pixels || pixels.length === 0) return [];

  const filtered = pixels.filter(p => p.intensity > threshold);
  if (filtered.length === 0) return [];

  const clusters: any[][] = [];
  const visited = new Uint8Array(filtered.length);

  for (let i = 0; i < filtered.length; i++) {
    if (visited[i]) continue;

    const cluster: any[] = [];
    const queue = [i];
    visited[i] = 1;

    let head = 0;
    while (head < queue.length) {
      const currIdx = queue[head++];
      const currP = filtered[currIdx];
      cluster.push(currP);

      for (let j = 0; j < filtered.length; j++) {
        if (visited[j]) continue;

        const otherP = filtered[j];
        const dx = currP.x - otherP.x;
        const dy = currP.y - otherP.y;
        const distSq = dx * dx + dy * dy;

        // Using squared threshold (3px^2 = 9) to avoid Math.sqrt()
        if (distSq < 9) {
          visited[j] = 1;
          queue.push(j);
        }
      }
    }

    if (cluster.length >= minClusterSize) {
      clusters.push(cluster);
    }
  }

  return clusters;
}


