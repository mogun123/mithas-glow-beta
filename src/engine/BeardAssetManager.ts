// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Beard Asset Manager (Refactored)
// Event-driven asset loading
// ═══════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { TextureLoader } from 'three';
import { BeardStyle, LoadedBeardAsset } from '../types/engine.types';
import { EventBus } from '../core/EventBus';
import { globalEventBus } from '../core/EventBus';
import { AREvents, BeardLoadedEvent, BeardLoadFailedEvent, FaceLostEvent } from '../core/EventTypes';
import { supabase } from '@/lib/supabase';

export class BeardAssetManager {
  private eventBus: EventBus;
  private gltfLoader: GLTFLoader;
  private textureLoader: TextureLoader;
  private assetCache: Map<string, LoadedBeardAsset>;
  private preloadQueue: string[];
  private maxCacheSize: number = 10;
  private isPreloading: boolean = false;
  private loadingAssets: Set<string> = new Set();

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus || globalEventBus;
    this.gltfLoader = new GLTFLoader();
    // Configure DRACO loader for compressed models
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    this.gltfLoader.setDRACOLoader(dracoLoader);
    this.textureLoader = new TextureLoader();
    this.assetCache = new Map();
    this.preloadQueue = [];
    this.setupEventListeners();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  private setupEventListeners(): void {
    // Listen for face lost to clear cache
    this.eventBus.on<FaceLostEvent>(AREvents.FACE_LOST, () => {
      // Optional: clear cache on face lost to free memory
      // this.clearCache();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD BEARD ASSET
  // ═══════════════════════════════════════════════════════════════════════════

  async loadBeardAsset(style: BeardStyle): Promise<LoadedBeardAsset | null> {
    const startTime = performance.now();

    // Check cache first
    const cached = this.assetCache.get(style.id);
    if (cached) {
      console.log(`✅ Beard asset loaded from cache: ${style.name}`);
      
      this.eventBus.emit<BeardLoadedEvent>(AREvents.BEARD_LOADED, {
        style,
        timestamp: performance.now(),
        loadTime: 0,
      });
      
      return cached;
    }

    // Check if currently loading (deduplication)
    if (this.loadingAssets.has(style.id)) {
      console.log(`[BeardAssetManager] Asset ${style.name} already loading, waiting...`);
      // Wait for existing load to complete (simple polling)
      let attempts = 0;
      while (this.loadingAssets.has(style.id) && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      // Check cache again after waiting
      const retryCached = this.assetCache.get(style.id);
      if (retryCached) {
        return retryCached;
      }
    }

    // Mark as loading
    this.loadingAssets.add(style.id);

    // ═══════════════════════════════════════════════════════════════════════════
    // STRICT: Generate signed URL from Supabase using model_path only
    // ═══════════════════════════════════════════════════════════════════════════
    if (!style.model_path) {
      throw new Error(`FATAL: style.model_path is missing for ${style.name}`);
    }

    console.log(`[BeardAssetManager] Generating signed URL for: ${style.model_path}`);
    
    const { data, error } = await supabase.storage
      .from('beard-assets')
      .createSignedUrl(style.model_path, 300);

    if (error || !data?.signedUrl) {
      throw new Error(`FATAL: Failed to generate signed URL for ${style.model_path}: ${error?.message || 'No signed URL returned'}`);
    }

    const glbUrl = data.signedUrl;
    console.log(`[BeardAssetManager] ✅ Signed URL generated: ${glbUrl}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // DEBUG: Log asset info before load
    // ═════════════════════════════════════════════════════════════════════════
    console.log('[BeardAssetManager] 🔍 ASSET LOAD INFO:');
    console.log('[BeardAssetManager] - style.id:', style.id);
    console.log('[BeardAssetManager] - style.name:', style.name);
    console.log('[BeardAssetManager] - style.model_path:', style.model_path);
    console.log('[BeardAssetManager] - Final GLB URL:', glbUrl);
    console.log('[BeardAssetManager] - style.texture_urls:', style.texture_urls);
    
    // Check for GLB path reuse as texture path (corruption detection)
    if (style.texture_urls) {
      const textureValues = Object.values(style.texture_urls).filter(v => v && typeof v === 'string');
      if (textureValues.includes(style.model_3d_url)) {
        console.error('[BeardAssetManager] ❌ CORRUPTION DETECTED: model_3d_url reused as texture path!');
        console.error('[BeardAssetManager] - model_3d_url:', style.model_3d_url);
        console.error('[BeardAssetManager] - texture_urls:', style.texture_urls);
      }
    }

    try {
      console.log(`[BeardAssetManager] Loading GLB: ${glbUrl}`);
      
      // ═══════════════════════════════════════════════════════════════════════════
      // PRODUCTION: Verify URL starts with http(s) before using
      // ═══════════════════════════════════════════════════════════════════════════
      if (!glbUrl || !glbUrl.startsWith('http')) {
        throw new Error(`Invalid GLB URL: ${glbUrl} - must start with http/https`);
      }
      
      // Load GLB model using signed URL
      const glb = await this.gltfLoader.loadAsync(glbUrl);

      // ═══════════════════════════════════════════════════════════════════════════
      // FIX MODEL PIVOT: Wrap mesh in Group and center origin using Box3
      // This fixes displaced baked-in origins from 3D designers
      // ═══════════════════════════════════════════════════════════════════════════
      console.log('[BeardAssetManager] 🔧 FIXING MODEL PIVOT (Group wrapping + Box3 centering)...');

      // Create a new Group to hold the beard mesh
      const beardGroup = new THREE.Group();
      beardGroup.name = 'BeardGroup';

      // Calculate bounding box of the loaded model
      const boundingBox = new THREE.Box3().setFromObject(glb.scene);
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);

      console.log('[BeardAssetManager] - Original bounding box center:', center.x.toFixed(4), center.y.toFixed(4), center.z.toFixed(4));
      console.log('[BeardAssetManager] - Original bounding box min:', boundingBox.min.x.toFixed(4), boundingBox.min.y.toFixed(4), boundingBox.min.z.toFixed(4));
      console.log('[BeardAssetManager] - Original bounding box max:', boundingBox.max.x.toFixed(4), boundingBox.max.y.toFixed(4), boundingBox.max.z.toFixed(4));

      // Shift the raw mesh inside the group by -center so Group's origin becomes true center
      glb.scene.position.set(-center.x, -center.y, -center.z);

      // Add the shifted mesh to the group
      beardGroup.add(glb.scene);

      // Verify the new center is at (0,0,0) in the group's local space
      const newBoundingBox = new THREE.Box3().setFromObject(beardGroup);
      const newCenter = new THREE.Vector3();
      newBoundingBox.getCenter(newCenter);

      console.log('[BeardAssetManager] - New bounding box center (in Group):', newCenter.x.toFixed(4), newCenter.y.toFixed(4), newCenter.z.toFixed(4));
      console.log('[BeardAssetManager] ✅ MODEL PIVOT FIXED (Group origin = true beard center)');

      // Store the wrapped group for direct return
      const centeredBeardGroup = beardGroup;

      console.log(`[BeardAssetManager] Loading textures for: ${style.name}`);
      console.log(`[BeardAssetManager] Albedo: ${style.texture_urls.albedo}`);
      console.log(`[BeardAssetManager] Alpha: ${style.texture_urls.alpha}`);
      console.log(`[BeardAssetManager] Density: ${style.texture_urls.density}`);
      console.log(`[BeardAssetManager] Strand: ${style.texture_urls.strand}`);
      console.log(`[BeardAssetManager] Normal: ${style.texture_urls.normal}`);

      // Load textures conditionally - skip empty URLs
      const texturePromises: Promise<any>[] = [];
      
      if (style.texture_urls.albedo) {
        texturePromises.push(this.textureLoader.loadAsync(style.texture_urls.albedo));
      } else {
        texturePromises.push(Promise.resolve(null));
      }
      
      if (style.texture_urls.alpha) {
        texturePromises.push(this.textureLoader.loadAsync(style.texture_urls.alpha));
      } else {
        texturePromises.push(Promise.resolve(null));
      }
      
      if (style.texture_urls.density) {
        texturePromises.push(this.textureLoader.loadAsync(style.texture_urls.density));
      } else {
        texturePromises.push(Promise.resolve(null));
      }
      
      if (style.texture_urls.strand) {
        texturePromises.push(this.textureLoader.loadAsync(style.texture_urls.strand));
      } else {
        texturePromises.push(Promise.resolve(null));
      }
      
      if (style.texture_urls.normal) {
        texturePromises.push(this.textureLoader.loadAsync(style.texture_urls.normal));
      } else {
        texturePromises.push(Promise.resolve(null));
      }
      
      if (style.texture_urls.occlusion) {
        texturePromises.push(this.textureLoader.loadAsync(style.texture_urls.occlusion));
      } else {
        texturePromises.push(Promise.resolve(null));
      }

      const [albedo, alpha, density, strand, normal, occlusion] = await Promise.all(texturePromises);

      const loadTime = performance.now() - startTime;

      const asset: LoadedBeardAsset = {
        style,
        glb: centeredBeardGroup, // Return the centered Group directly
        textures: {
          albedo: albedo || null,
          alpha: alpha || null,
          density: density || null,
          strand: strand || null,
          normal: normal || null,
          occlusion: occlusion || undefined,
        },
        loadTime,
      };

      // Cache the asset
      this.cacheAsset(style.id, asset);

      // Remove from loading set
      this.loadingAssets.delete(style.id);

      console.log(`✅ Beard asset loaded: ${style.name} (${loadTime.toFixed(2)}ms)`);
      
      this.eventBus.emit<BeardLoadedEvent>(AREvents.BEARD_LOADED, {
        style,
        timestamp: performance.now(),
        loadTime,
      });
      
      return asset;
    } catch (error) {
      // Remove from loading set
      this.loadingAssets.delete(style.id);

      console.error(`❌ Failed to load beard asset: ${style.name}`);
      console.error(`❌ GLB URL: ${style.model_3d_url}`);
      console.error(`❌ Texture URLs:`, style.texture_urls);
      console.error(`❌ Error type:`, error instanceof Error ? error.constructor.name : typeof error);
      console.error(`❌ Error message:`, error instanceof Error ? error.message : String(error));
      console.error(`❌ Error stack:`, error instanceof Error ? error.stack : 'no stack');
      
      // Check for specific GLTF loader errors
      if (error instanceof Error) {
        if (error.message.includes('Unexpected token')) {
          console.error('❌ GLTF parse error: Response is not valid GLB binary (likely HTML or JSON)');
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
          console.error('❌ GLTF not found: URL returns 404');
        } else if (error.message.includes('CORS')) {
          console.error('❌ CORS error: GLB URL blocked by cross-origin policy');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          console.error('❌ Network error: Failed to fetch GLB');
        }
      }
      
      this.eventBus.emit<BeardLoadFailedEvent>(AREvents.BEARD_LOAD_FAILED, {
        style,
        timestamp: performance.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CACHE ASSET
  // ═══════════════════════════════════════════════════════════════════════════

  private cacheAsset(id: string, asset: LoadedBeardAsset): void {
    // Remove oldest asset if cache is full
    if (this.assetCache.size >= this.maxCacheSize) {
      const firstKey = this.assetCache.keys().next().value;
      if (firstKey) {
        this.disposeAsset(this.assetCache.get(firstKey));
        this.assetCache.delete(firstKey);
      }
    }

    this.assetCache.set(id, asset);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET CACHED ASSET
  // ═══════════════════════════════════════════════════════════════════════════

  getCachedAsset(id: string): LoadedBeardAsset | null {
    return this.assetCache.get(id) || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRELOAD ASSETS
  // ═══════════════════════════════════════════════════════════════════════════

  async preloadAssets(styles: BeardStyle[]): Promise<void> {
    if (this.isPreloading) return;

    this.isPreloading = true;
    this.preloadQueue = styles.slice(0, 3).map(s => s.id); // Preload first 3

    console.log(`🔄 Preloading ${this.preloadQueue.length} beard assets...`);

    for (const style of styles.slice(0, 3)) {
      if (!this.assetCache.has(style.id)) {
        await this.loadBeardAsset(style);
      }
    }

    this.isPreloading = false;
    console.log('✅ Preloading complete');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRELOAD ADJACENT ASSETS
  // ═══════════════════════════════════════════════════════════════════════════

  async preloadAdjacentAssets(currentIndex: number, styles: BeardStyle[]): Promise<void> {
    const adjacentIndices = [
      currentIndex - 1,
      currentIndex + 1,
      currentIndex - 2,
      currentIndex + 2,
    ].filter(i => i >= 0 && i < styles.length);

    const adjacentStyles = adjacentIndices.map(i => styles[i]);

    for (const style of adjacentStyles) {
      if (!this.assetCache.has(style.id)) {
        await this.loadBeardAsset(style);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPOSE ASSET
  // ═══════════════════════════════════════════════════════════════════════════

  private disposeAsset(asset: LoadedBeardAsset | null | undefined): void {
    if (!asset) return;

    // Dispose GLB
    asset.glb.traverse((child: any) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });

    // Dispose textures
    Object.values(asset.textures).forEach(texture => {
      if (texture) {
        texture.dispose();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEAR CACHE
  // ═══════════════════════════════════════════════════════════════════════════

  clearCache(): void {
    this.assetCache.forEach((asset) => {
      this.disposeAsset(asset);
    });
    this.assetCache.clear();
    console.log('✅ Asset cache cleared');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET CACHE STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  getCacheStatus(): {
    size: number;
    maxSize: number;
    cachedIds: string[];
    totalLoadTime: number;
  } {
    const cachedIds = Array.from(this.assetCache.keys());
    const totalLoadTime = Array.from(this.assetCache.values()).reduce(
      (sum, asset) => sum + asset.loadTime,
      0
    );

    return {
      size: this.assetCache.size,
      maxSize: this.maxCacheSize,
      cachedIds,
      totalLoadTime,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPOSE
  // ═══════════════════════════════════════════════════════════════════════════

  dispose(): void {
    this.eventBus.off(AREvents.FACE_LOST);
    this.clearCache();
    this.preloadQueue = [];
    this.isPreloading = false;
    this.loadingAssets.clear();
    console.log('✅ BeardAssetManager disposed');
  }
}
