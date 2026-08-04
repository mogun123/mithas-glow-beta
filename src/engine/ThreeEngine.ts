// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Three.js Render Engine (Refactored)
// Single render loop owner - event-driven architecture
// ═══════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BeardTransform, ThreeSceneConfig, RenderMetrics } from '../types/engine.types';
import { BeardStyle } from '../types/engine.types';
import { EventBus } from '../core/EventBus';
import { globalEventBus } from '../core/EventBus';
import { AREvents, AttachmentUpdatedEvent, RenderFrameEvent, FaceLostEvent } from '../core/EventTypes';

export class ThreeEngine {
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private beardModel: THREE.Group | null = null;
  private gltfLoader: GLTFLoader;
  private config: ThreeSceneConfig;
  private isInitialized: boolean = false;
  private isRendering: boolean = false;
  private animationFrameId: number | null = null;
  private metrics: RenderMetrics;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private eventBus: EventBus;
  private currentTransform: BeardTransform | null = null;
  private pipelineState: string = 'BOOT';

  constructor(config?: Partial<ThreeSceneConfig>, eventBus?: EventBus) {
    this.config = {
      antialias: config?.antialias !== false,
      alpha: config?.alpha !== false,
      powerPreference: config?.powerPreference || 'default',
    };

    this.eventBus = eventBus || globalEventBus;
    this.gltfLoader = new GLTFLoader();
    this.metrics = {
      fps: 0,
      frameTime: 0,
      drawCalls: 0,
      triangles: 0,
      memory: 0,
    };

    this.setupEventListeners();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  private setupEventListeners(): void {
    // Listen for attachment updates
    this.eventBus.on<AttachmentUpdatedEvent>(AREvents.ATTACHMENT_UPDATED, (data) => {
      this.currentTransform = data.transform;
    });

    // Listen for face lost - hide beard
    this.eventBus.on<FaceLostEvent>(AREvents.FACE_LOST, () => {
      if (this.beardModel) {
        this.beardModel.visible = false;
      }
    });

    // Listen for pipeline state changes
    this.eventBus.on(AREvents.PIPELINE_STATE_CHANGE, (data: any) => {
      this.pipelineState = data.toState;
      console.log('[PIPELINE][THREE] 🔄 Pipeline state change:', data.fromState, '→', data.toState);
      
      // Show beard only in ACTIVE_AR
      if (this.beardModel) {
        const shouldBeVisible = data.toState === 'ACTIVE_AR';
        console.log('[PIPELINE][THREE] - Setting beardModel.visible =', shouldBeVisible, '(state:', data.toState, ')');
        this.beardModel.visible = shouldBeVisible;
        
        if (data.toState === 'ACTIVE_AR') {
          console.log('[PIPELINE][THREE] ✅ ACTIVE_AR reached - beard should be visible');
          // Force visibility in ACTIVE_AR
          this.beardModel.visible = true;
          this.beardModel.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.visible = true;
            }
          });
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZE THREE.JS SCENE
  // ═══════════════════════════════════════════════════════════════════════════

  async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
    try {
      this.canvas = canvas;

      // Create scene
      this.scene = new THREE.Scene();

      // Create camera
      const aspect = canvas.width / canvas.height;
      this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
      this.camera.position.z = 5;

      // Create renderer with mobile optimizations
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: this.config.antialias,
        alpha: this.config.alpha,
        powerPreference: this.config.powerPreference,
        preserveDrawingBuffer: false, // Mobile optimization
        stencil: false, // Mobile optimization
        depth: true,
      });

      // Store renderer reference for perspective calculations (after renderer is created)
      this.camera.userData = { renderer: this.renderer };

      this.renderer.setSize(canvas.width, canvas.height, false); // false = don't resize canvas
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Mobile optimization
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;

      // Enable shadow map for depth
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // Add lighting
      this.setupLighting();

      this.isInitialized = true;
      console.log('[PIPELINE][THREE] ✅ ThreeEngine initialized');
      return true;
    } catch (error) {
      console.error('[PIPELINE][THREE] ❌ ThreeEngine initialization failed:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP LIGHTING
  // ═══════════════════════════════════════════════════════════════════════════

  private setupLighting(): void {
    if (!this.scene) return;

    // PRODUCTION: Optimized lighting for beard rendering
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Increased intensity
    this.scene.add(ambientLight);

    // Main directional light for shadows and definition
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0); // Increased intensity
    directionalLight.position.set(0, 2, 5); // New position: slightly above and in front of the face
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    this.scene.add(directionalLight);

    // Fill light to reduce harsh shadows
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-5, 0, 5);
    this.scene.add(fillLight);

    // Rim light for edge definition (important for beard visibility)
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 5, -5);
    this.scene.add(rimLight);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD BEARD MODEL
  // ═══════════════════════════════════════════════════════════════════════════

  async loadBeardModel(asset: any): Promise<boolean> {
    if (!this.scene) {
      console.error('[PIPELINE][THREE] ❌ Scene not initialized');
      return false;
    }

    try {
      const style = asset.style;
      console.log('[PIPELINE][THREE] ⏳ Loading beard model:', style.name);
      console.log('[PIPELINE][THREE] Model path:', style.model_path);
      console.log('[PIPELINE][THREE] Model URL (legacy):', style.model_3d_url);
      console.log('[PIPELINE][THREE] ✅ Using pre-loaded asset from BeardAssetManager');

      // Remove existing model
      if (this.beardModel) {
        this.scene.remove(this.beardModel);
        this.disposeModel(this.beardModel);
        this.beardModel = null;
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // STRICT: Validate GLB integrity BEFORE cloning
      // ═══════════════════════════════════════════════════════════════════════════
      console.log('[PIPELINE][THREE] 🔍 GLB Integrity Validation (BEFORE clone):');
      console.log('[PIPELINE][THREE] - Scene children count:', asset.glb?.children.length || 0);

      let sourceMeshCount = 0;
      let hasValidGeometry = false;
      let hasValidMaterial = false;

      asset.glb?.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          sourceMeshCount++;
          console.log('[PIPELINE][THREE] - Source Mesh found:', child.name || 'unnamed');
          console.log('[PIPELINE][THREE]   - Geometry:', child.geometry ? child.geometry.type : 'none');
          console.log('[PIPELINE][THREE]   - Material:', child.material ? child.material.type : 'none');

          if (child.geometry) {
            hasValidGeometry = true;
            // Validate geometry has vertices
            if (child.geometry instanceof THREE.BufferGeometry) {
              const position = child.geometry.attributes.position;
              if (!position || position.count === 0) {
                console.error('[PIPELINE][THREE] ❌ GLB mesh has invalid geometry (no vertices)');
                throw new Error('FATAL: GLB mesh has invalid geometry (no vertices)');
              }
            }
          }

          if (child.material) {
            hasValidMaterial = true;
          }
        }
      });

      console.log('[PIPELINE][THREE] - Total source mesh count:', sourceMeshCount);

      // STRICT: Throw hard error if validation fails
      if (sourceMeshCount === 0) {
        console.error('[PIPELINE][THREE] ❌ GLB contains no meshes - empty scene');
        throw new Error('FATAL: GLB contains no meshes - empty scene');
      }

      if (!hasValidGeometry) {
        console.error('[PIPELINE][THREE] ❌ GLB meshes have no valid geometry');
        throw new Error('FATAL: GLB meshes have no valid geometry');
      }

      if (!hasValidMaterial) {
        console.error('[PIPELINE][THREE] ❌ GLB meshes have no valid material');
        throw new Error('FATAL: GLB meshes have no valid material');
      }

      console.log('[PIPELINE][THREE] ✅ GLB integrity validation passed');

      // PRODUCTION: Clone the centered Group directly
      // The asset.glb is already the centered Group from BeardAssetManager
      this.beardModel = asset.glb.clone();

      console.log('[PIPELINE][THREE] ✅ Beard model assigned to this.beardModel:', this.beardModel ? 'SUCCESS' : 'NULL');
      console.log('[PIPELINE][THREE] - Model type:', this.beardModel?.constructor.name);
      console.log('[PIPELINE][THREE] - Model name:', this.beardModel?.name);

      // ═══════════════════════════════════════════════════════════════════════════
      // PRODUCTION: Validate cloned GLB content
      // ═══════════════════════════════════════════════════════════════════════════
      console.log('[PIPELINE][THREE] 🔍 Cloned GLB Content Inspection:');
      console.log('[PIPELINE][THREE] - Scene children count:', this.beardModel?.children.length || 0);

      let clonedMeshCount = 0;
      this.beardModel?.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          clonedMeshCount++;
          console.log('[PIPELINE][THREE] - Cloned Mesh found:', child.name || 'unnamed');
          console.log('[PIPELINE][THREE]   - Geometry:', child.geometry ? child.geometry.type : 'none');
          console.log('[PIPELINE][THREE]   - Material:', child.material ? child.material.type : 'none');
        }
      });
      console.log('[PIPELINE][THREE] - Total cloned mesh count:', clonedMeshCount);

      if (clonedMeshCount === 0) {
        console.error('[PIPELINE][THREE] ❌ Cloned GLB contains no meshes - clone failed');
        throw new Error('FATAL: Cloned GLB contains no meshes - clone failed');
      }

      if (clonedMeshCount !== sourceMeshCount) {
        console.error('[PIPELINE][THREE] ❌ Mesh count mismatch after clone:', sourceMeshCount, '->', clonedMeshCount);
        throw new Error('FATAL: Mesh count mismatch after clone');
      }

      // Apply production materials with transparency
      // TEMPORARY: Convert to MeshBasicMaterial for visibility without environment lighting
      this.beardModel?.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          const oldMat = child.material;
          child.material = new THREE.MeshBasicMaterial({
            map: (oldMat as any).map || null,
            alphaMap: (oldMat as any).alphaMap || null,
            transparent: true,
            color: 0xffffff
          });
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      if (this.beardModel) {
        this.scene.add(this.beardModel);
        this.beardModel.visible = true;
      }
      
      console.log('[PIPELINE][THREE] ✅ Beard model loaded successfully');
      return true;
    } catch (error) {
      console.error('[PIPELINE][THREE] ❌ Failed to load beard model:', error);
      console.error('[PIPELINE][THREE] - This indicates either:');
      console.error('[PIPELINE][THREE]   1. Backend GLB URL is invalid/unreachable');
      console.error('[PIPELINE][THREE]   2. CORS blocking the request');
      console.error('[PIPELINE][THREE]   3. Signed URL generation failed');
      // PRODUCTION: No fallback - fail explicitly
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPOSE MODEL
  // ═══════════════════════════════════════════════════════════════════════════

  private disposeModel(model: THREE.Group): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE BEARD TRANSFORM
  // ═══════════════════════════════════════════════════════════════════════════

  updateBeardTransform(transform: BeardTransform): void {
    if (!this.beardModel) {
      console.warn('[PIPELINE][THREE] ⚠️ updateBeardTransform called but beardModel is null');
      return;
    }

    // UNIFIED COORDINATE SYSTEM: Use world space coordinates directly from BeardAttachmentEngine
    // No manual conversion - BeardAttachmentEngine uses camera unproject() for accurate world space
    const position = new THREE.Vector3(
      transform.position.x,
      transform.position.y,
      transform.position.z
    );

    const rotation = new THREE.Euler(
      transform.rotation.x,
      transform.rotation.y,
      transform.rotation.z
    );

    const scale = new THREE.Vector3(
      transform.scale.x,
      transform.scale.y,
      transform.scale.z
    );

    this.beardModel.position.copy(position);
    this.beardModel.rotation.copy(rotation);
    this.beardModel.scale.copy(scale);

    // Ensure visibility after transform update
    if (this.pipelineState === 'ACTIVE_AR') {
      this.beardModel.visible = true;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // START RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  startRendering(): void {
    if (this.isRendering) return;

    this.isRendering = true;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;

    console.log('[PIPELINE][THREE] 🎬 Starting render loop');
    this.renderLoop();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER LOOP
  // ═══════════════════════════════════════════════════════════════════════════

  private renderLoop = (): void => {
    if (!this.isRendering) return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;

    // Apply transform from event (if available)
    if (this.currentTransform && this.beardModel && this.pipelineState === 'ACTIVE_AR') {
      this.updateBeardTransform(this.currentTransform);
    }

    // Render scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    // Emit render frame event
    this.eventBus.emit<RenderFrameEvent>(AREvents.RENDER_FRAME, {
      timestamp: now,
      frameId: now,
    });

    // Update metrics
    this.frameCount++;
    if (now - this.lastFrameTime >= 1000) {
      this.metrics.fps = this.frameCount;
      this.metrics.frameTime = delta;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }

    // Request next frame
    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STOP RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  stopRendering(): void {
    this.isRendering = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    console.log('✅ ThreeEngine stopped rendering');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESIZE
  // ═══════════════════════════════════════════════════════════════════════════

  resize(width: number, height: number): void {
    if (!this.camera || !this.renderer) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height, false);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPOSE
  // ═══════════════════════════════════════════════════════════════════════════

  dispose(): void {
    this.stopRendering();

    // Unsubscribe from events
    this.eventBus.off(AREvents.ATTACHMENT_UPDATED);
    this.eventBus.off(AREvents.FACE_LOST);
    this.eventBus.off(AREvents.PIPELINE_STATE_CHANGE);

    if (this.beardModel) {
      this.disposeModel(this.beardModel);
      this.beardModel = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    this.scene = null;
    this.camera = null;
    this.canvas = null;
    this.isInitialized = false;

    console.log('✅ ThreeEngine disposed');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  getCamera(): THREE.PerspectiveCamera | null {
    return this.camera;
  }

  getBeardModel(): THREE.Group | null {
    console.log('[PIPELINE][THREE] 🔍 getBeardModel called - returning:', this.beardModel ? 'MODEL' : 'NULL');
    console.log('[PIPELINE][THREE] - this.beardModel type:', this.beardModel?.constructor.name);
    console.log('[PIPELINE][THREE] - this.beardModel name:', this.beardModel?.name);
    return this.beardModel;
  }

  getMetrics(): RenderMetrics {
    return { ...this.metrics };
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  hasBeardModel(): boolean {
    return this.beardModel !== null;
  }
}
