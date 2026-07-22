// ═════════════════════════════════════════════════════════════════════════════
// 🧠 AI OCCASION BRAIN - IONTYX Glow Mirror (MALE ONLY)
// ═════════════════════════════════════════════════════════════════════════════

import { FaceMesh } from '@mediapipe/face_mesh';
import { Pose } from '@mediapipe/pose';
import { apiClient } from '../api';
import { FaceShapeAnalyzer, FaceShapeResult } from './analysis/faceShapeAnalyzer';

export type Gender = "male"; // STRICT: male only
export type Occasion = "Office/College" | "Party Glam" | "Wedding" | "Reception" | "Casual";

export interface FaceGeometry {
  jawWidth: number;
  cheekboneRatio: number;
  faceLength: number;
  symmetryScore: number;
  faceShape: string; // DYNAMIC face shape from analyzer
  faceShapeConfidence: number; // Confidence score from analyzer
}

export interface BodyGeometry {
  shoulderWidth: number;
  torsoRatio: number;
}

export interface Asset {
  id: string;
  name: string;
  type: "outfit" | "hair" | "beard" | "accessory";
  culturalType?: "hindu" | "muslim" | "christian" | "modern";
  parameters?: any;
}

export interface AIOccasionResult {
  categories: {
    outfits: Asset[];
    hair: Asset[];
    beard: Asset[];
    accessories: Asset[];
  };
  aiPerfectMatchIndex: 0;
}

export interface BridalContext {
  bridalType: "hindu" | "muslim" | "christian" | "modern";
}

export class AIOccasionStylist {
  private faceMesh: FaceMesh;
  private pose: Pose;

  constructor() {
    // Initialize MediaPipe FaceMesh for geometry extraction
    this.faceMesh = new FaceMesh({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    
    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.75,
      minTrackingConfidence: 0.75,
      selfieMode: false,
    });

    // Initialize MediaPipe Pose for body geometry
    this.pose = new Pose({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    
    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  //  BEARD RECOMMENDATION API CALL
  public async getBeardRecommendations(
    faceGeometry: FaceGeometry,
    occasion: string
  ): Promise<Asset[]> {
    try {
      const request = {
        faceGeometry: {
          jawWidth: faceGeometry.jawWidth,
          cheekboneRatio: faceGeometry.cheekboneRatio,
          symmetryScore: faceGeometry.symmetryScore,
          faceShape: faceGeometry.faceShape, // DYNAMIC face shape from analyzer
          faceShapeConfidence: faceGeometry.faceShapeConfidence
        },
        userContext: {
          occasion: occasion === "Office/College" ? "office" : 
                   occasion === "Party Glam" ? "party" : 
                   occasion === "Casual" ? "casual" : "wedding",
          premiumUser: false
        }
      };

      // 📊 STEP 3: API REQUEST LOGGING
      console.log(`[IONTYX PIPELINE] STEP 3: API REQUEST - POST /ai/beard/recommendation`);
      console.log(`[IONTYX PIPELINE] STEP 3: PAYLOAD - ${JSON.stringify(request, null, 2)}`);

      const response = await apiClient.post('/ai/beard/recommendation', request);
      
      // 📊 STEP 4: API RESPONSE LOGGING
      console.log(`[IONTYX PIPELINE] STEP 4: API RESPONSE - Status: ${response.status}`);
      console.log(`[IONTYX PIPELINE] STEP 4: RAW DATA - ${JSON.stringify(response.data, null, 2)}`);
      
      if (response.status !== 200) {
        throw new Error(`Beard API failed with status ${response.status}`);
      }

      const apiResponse = response.data;

      // ═══════════════════════════════════════════════════════════════════════════
      // DEBUG: Log raw API response to trace field corruption
      // ═══════════════════════════════════════════════════════════════════════════
      console.log('[AIOccasionStylist] 🔍 Raw API Response:');
      console.log('[AIOccasionStylist] - Styles count:', apiResponse.styles?.length);
      apiResponse.styles?.forEach((style: any, idx: number) => {
        console.log(`[AIOccasionStylist] - Style ${idx}:`, JSON.stringify({
          id: style.id,
          name: style.name,
          model_3d_url: style.model_3d_url,
          alpha_mask_url: style.alpha_mask_url,
          density_map_url: style.density_map_url,
          strand_map_url: style.strand_map_url,
          beard_texture_url: style.beard_texture_url,
          normal_map_url: style.normal_map_url,
        }, null, 2));
      });

      // Flat canonical contract — all fields at top level.
      // Consumers MUST read style.model_3d_url directly (no .parameters indirection).
      // Runtime validation: warn loudly if model_3d_url is missing.
      return apiResponse.styles.map((style: any) => {
        if (!style.model_3d_url) {
          console.warn(
            `[AIOccasionStylist] WARNING: style '${style.id}' (${style.name}) ` +
            `has no model_3d_url. Beard AR will not render for this style.`
          );
        }
        return {
          id:               style.id                 ?? '',
          name:             style.name               ?? '',
          type:             "beard" as const,
          // ── Canonical flat fields (authoritative) ──────────────────────────
          category:         style.category           ?? '',
          density_level:    style.density_level      ?? 3,
          tone:             style.tone               ?? 'medium',
          model_3d_url:     style.model_3d_url       ?? '',
          alpha_mask_url:   style.alpha_mask_url     ?? '',
          density_map_url:  style.density_map_url    ?? '',
          strand_map_url:   style.strand_map_url     ?? '',
          beard_texture_url: style.beard_texture_url ?? '',
          normal_map_url:   style.normal_map_url     ?? '',
          premium:          style.premium            ?? false,
          weighted_score:   style.weighted_score     ?? 0,
          // ── Legacy nested parameters (deprecated — kept for backward compat) ─
          parameters: {
            category:       style.category           ?? '',
            density_level:  style.density_level      ?? 3,
            premium:        style.premium            ?? false,
            weighted_score: style.weighted_score     ?? 0,
            model_3d_url:   style.model_3d_url       ?? '',
          },
        };
      });

    } catch (error: any) {
      console.error("API FAILURE DETAILS:", error?.response?.data || error?.message || error);
      
      // STEP 5: NO FALLBACK - Return empty array
      return [];
    }
  }

  
  // 🧬 EXTRACT FACE GEOMETRY FROM MEDIAPINE LANDMARKS
  extractFaceGeometry(landmarks: any[]): FaceGeometry | null {
    if (!landmarks || landmarks.length !== 478) {
      console.warn("INVALID_FACE_GEOMETRY: Expected 478 landmarks, returning null");
      return null;
    }

    // Jaw width (landmarks 234-454: left-right jaw edges)
    const jawLeft = landmarks[234]; // Left Jaw Edge
    const jawRight = landmarks[454]; // Right Jaw Edge
    const jawWidth = Math.sqrt(
      Math.pow(jawRight.x - jawLeft.x, 2) + 
      Math.pow(jawRight.y - jawLeft.y, 2)
    );

    // Cheekbone ratio (landmarks 50, 280)
    const cheekLeft = landmarks[50];
    const cheekRight = landmarks[280];
    const cheekboneWidth = Math.sqrt(
      Math.pow(cheekRight.x - cheekLeft.x, 2) + 
      Math.pow(cheekRight.y - cheekLeft.y, 2)
    );
    const cheekboneRatio = cheekboneWidth / jawWidth;

    // Face length (forehead to chin)
    const forehead = landmarks[10]; // Top of forehead
    const chin = landmarks[152]; // Chin
    const faceLength = Math.sqrt(
      Math.pow(chin.x - forehead.x, 2) + 
      Math.pow(chin.y - forehead.y, 2)
    );

    // Symmetry score (left vs right face)
    let symmetrySum = 0;
    const symmetryPairs = [
      [234, 152], // Jaw corners
      [50, 280],  // Cheekbones
      [70, 300],  // Eyebrow ends
      [338, 133], // Eye corners
      [172, 397], // Nose sides
    ];
    
    for (const [left, right] of symmetryPairs) {
      const leftPoint = landmarks[left];
      const rightPoint = landmarks[right];
      const centerPoint = landmarks[1]; // Nose tip
      
      const leftDist = Math.sqrt(
        Math.pow(leftPoint.x - centerPoint.x, 2) + 
        Math.pow(leftPoint.y - centerPoint.y, 2)
      );
      const rightDist = Math.sqrt(
        Math.pow(rightPoint.x - centerPoint.x, 2) + 
        Math.pow(rightPoint.y - centerPoint.y, 2)
      );
      
      symmetrySum += 1 - Math.abs(leftDist - rightDist) / Math.max(leftDist, rightDist);
    }
    
    const symmetryScore = symmetrySum / symmetryPairs.length;

    return {
      jawWidth: jawWidth * 1000, // Scale for precision
      cheekboneRatio,
      faceLength: faceLength * 1000,
      symmetryScore,
      faceShape: 'oval', // Default face shape
      faceShapeConfidence: 0.5 // Default confidence
    };
  }

  // 🧍 EXTRACT BODY GEOMETRY FROM POSE LANDMARKS
  extractBodyGeometry(poseLandmarks: any[]): BodyGeometry | null {
    if (!poseLandmarks || poseLandmarks.length < 33) {
      console.warn("INVALID_BODY_GEOMETRY: Expected pose landmarks, returning null");
      return null;
    }

    const leftShoulder = poseLandmarks[11];
    const rightShoulder = poseLandmarks[12];
    const leftHip = poseLandmarks[23];
    const rightHip = poseLandmarks[24];

    // Shoulder width
    const shoulderWidth = Math.sqrt(
      Math.pow(rightShoulder.x - leftShoulder.x, 2) + 
      Math.pow(rightShoulder.y - leftShoulder.y, 2)
    ) * 1000;

    // Torso ratio (shoulder width to hip width)
    const hipWidth = Math.sqrt(
      Math.pow(rightHip.x - leftHip.x, 2) + 
      Math.pow(rightHip.y - leftHip.y, 2)
    ) * 1000;
    const torsoRatio = shoulderWidth / hipWidth;

    return {
      shoulderWidth,
      torsoRatio
    };
  }

  // 🎯 CORE AI STYLING ENGINE - DETERMINISTIC RULES ONLY
  async generateStyleRecommendations(
    gender: Gender,
    occasion: Occasion,
    faceGeometry: FaceGeometry,
    bodyGeometry?: BodyGeometry,
    bridalContext?: BridalContext
  ): Promise<AIOccasionResult> {
    
    // STRICT VALIDATION
    if (gender !== "male") {
      throw new Error("GENDER_RESTRICTION: Only male styling supported");
    }

    // 🏢 OFFICE/COLLEGE LOGIC
    if (occasion === "Office/College") {
      return {
        categories: {
          outfits: this.generateOfficeOutfits(bodyGeometry),
          hair: this.generateOfficeHair(faceGeometry),
          beard: await this.generateOfficeBeard(faceGeometry),
          accessories: this.generateOfficeAccessories(faceGeometry)
        },
        aiPerfectMatchIndex: 0
      };
    }

    // 🎉 PARTY GLAM LOGIC
    if (occasion === "Party Glam") {
      return {
        categories: {
          outfits: this.generatePartyOutfits(bodyGeometry),
          hair: this.generatePartyHair(faceGeometry),
          beard: await this.generatePartyBeard(faceGeometry),
          accessories: this.generatePartyAccessories(faceGeometry)
        },
        aiPerfectMatchIndex: 0
      };
    }

    // 💒 WEDDING LOGIC (WITH CULTURAL ROUTING)
    if (occasion === "Wedding") {
      if (bridalContext && bodyGeometry) {
        return this.generateBridalLook(faceGeometry, bodyGeometry, bridalContext);
      }
      return {
        categories: {
          outfits: await this.generateWeddingOutfits(bodyGeometry),
          hair: this.generateWeddingHair(faceGeometry),
          beard: this.generateWeddingBeard(faceGeometry),
          accessories: this.generateWeddingAccessories(faceGeometry)
        },
        aiPerfectMatchIndex: 0
      };
    }

    // 🎂 RECEPTION LOGIC
    if (occasion === "Reception") {
      return {
        categories: {
          outfits: await this.generateReceptionOutfits(bodyGeometry),
          hair: this.generateReceptionHair(faceGeometry),
          beard: this.generateReceptionBeard(faceGeometry),
          accessories: this.generateReceptionAccessories(faceGeometry)
        },
        aiPerfectMatchIndex: 0
      };
    }

    // 😊 CASUAL LOGIC
    if (occasion === "Casual") {
      return {
        categories: {
          outfits: await this.generateCasualOutfits(bodyGeometry),
          hair: this.generateCasualHair(faceGeometry),
          beard: this.generateCasualBeard(faceGeometry),
          accessories: this.generateCasualAccessories(faceGeometry)
        },
        aiPerfectMatchIndex: 0
      };
    }

    throw new Error("INVALID_OCCASION: Unsupported occasion type");
  }

  // 🏢 OFFICE/COLLEGE ASSET GENERATION
  private generateOfficeOutfits(bodyGeometry?: BodyGeometry): Asset[] {
    // Return empty array if no body geometry available (face-only mode)
    if (!bodyGeometry) {
      console.log(`[IONTYX PIPELINE] OFFICE OUTFITS: No body geometry - returning empty array`);
      return [];
    }
    
    const { shoulderWidth, torsoRatio } = bodyGeometry;
    
    const baseAssets: Asset[] = [
      {
        id: "formal-shirt-navy",
        name: "Navy Formal Shirt",
        type: "outfit",
        parameters: {
          fit: torsoRatio > 1.2 ? "slim" : "regular",
          shoulderAdjustment: shoulderWidth > 400 ? "broad" : "standard"
        }
      },
      {
        id: "polo-white",
        name: "White Polo Shirt",
        type: "outfit",
        parameters: {
          collarStyle: "classic",
          fit: "regular"
        }
      },
      {
        id: "blazer-charcoal",
        name: "Charcoal Blazer",
        type: "outfit",
        parameters: {
          shoulderPadding: shoulderWidth > 400 ? "minimal" : "light",
          length: torsoRatio > 1.1 ? "regular" : "long"
        }
      }
    ];

    // AI Perfect Match at index 0
    return [
      {
        id: "ai-perfect-office",
        name: "✨ AI Perfect Match",
        type: "outfit",
        parameters: {
          baseAsset: torsoRatio > 1.2 ? baseAssets[0] : baseAssets[1],
          optimization: "professional_fit",
          colorHarmony: "neutral_tones"
        }
      },
      ...baseAssets
    ];
  }

  private generateOfficeHair(faceGeometry: FaceGeometry): Asset[] {
    const { faceLength, symmetryScore } = faceGeometry;
    
    const baseAssets: Asset[] = [
      {
        id: "fade-neat",
        name: "Neat Side Fade",
        type: "hair",
        parameters: {
          fadeHeight: "medium",
          sidePart: symmetryScore > 0.8 ? "center" : "side"
        }
      },
      {
        id: "combed-classic",
        name: "Classic Combed",
        type: "hair",
        parameters: {
          volume: faceLength > 600 ? "low" : "medium",
          hold: "strong"
        }
      }
    ];

    return [
      {
        id: "ai-perfect-office-hair",
        name: "✨ AI Perfect Match",
        type: "hair",
        parameters: {
          baseAsset: symmetryScore > 0.8 ? baseAssets[1] : baseAssets[0],
          faceAdaptation: "professional_contour",
          maintenance: "easy"
        }
      },
      ...baseAssets
    ];
  }

  private async generateOfficeBeard(faceGeometry: FaceGeometry): Promise<Asset[]> {
    return await this.getBeardRecommendations(faceGeometry, "Office/College");
  }

  private generateOfficeAccessories(faceGeometry: FaceGeometry): Asset[] {
    const { symmetryScore } = faceGeometry;
    
    const baseAssets: Asset[] = [
      {
        id: "spectacles-modern",
        name: "Modern Spectacles",
        type: "accessory",
        parameters: {
          frameStyle: symmetryScore > 0.8 ? "rectangular" : "round",
          bridgeFit: "standard"
        }
      },
      {
        id: "watch-classic",
        name: "Classic Watch",
        type: "accessory",
        parameters: {
          strap: "leather",
          face: "minimal"
        }
      }
    ];

    return [
      {
        id: "ai-perfect-office-accessories",
        name: "✨ AI Perfect Match",
        type: "accessory",
        parameters: {
          baseAsset: baseAssets[0],
          coordination: "professional_set",
          subtlety: "elegant"
        }
      },
      ...baseAssets
    ];
  }

  // 🎉 PARTY GLAM ASSET GENERATION (beard uses real API)
  private generatePartyOutfits(bodyGeometry?: BodyGeometry): Asset[] {
    // Return empty array if no body geometry available (face-only mode)
    if (!bodyGeometry) {
      console.log(`[IONTYX PIPELINE] PARTY OUTFITS: No body geometry - returning empty array`);
      return [];
    }
    
    const { shoulderWidth, torsoRatio } = bodyGeometry;
    
    const baseAssets: Asset[] = [
      {
        id: "leather-jacket-black",
        name: "Black Leather Jacket",
        type: "outfit",
        parameters: {
          fit: torsoRatio > 1.1 ? "slim" : "regular",
          shoulderStructure: "enhanced"
        }
      },
      {
        id: "streetwear-hoodie",
        name: "Designer Hoodie",
        type: "outfit",
        parameters: {
          drop: shoulderWidth > 400 ? "minimal" : "standard",
          graphics: "subtle"
        }
      }
    ];

    return [
      {
        id: "ai-perfect-party-outfit",
        name: "✨ AI Perfect Match",
        type: "outfit",
        parameters: {
          baseAsset: baseAssets[0],
          nightOptimized: true,
          attitude: "confident"
        }
      },
      ...baseAssets
    ];
  }

  private generatePartyHair(faceGeometry: FaceGeometry): Asset[] {
    const { faceLength } = faceGeometry;
    
    const baseAssets: Asset[] = [
      {
        id: "messy-textured",
        name: "Messy Textured",
        type: "hair",
        parameters: {
          volume: faceLength > 600 ? "high" : "medium",
          texture: "piecey"
        }
      },
      {
        id: "spiky-modern",
        name: "Modern Spiky",
        type: "hair",
        parameters: {
          height: faceLength > 550 ? "tall" : "medium",
          hold: "extra_strong"
        }
      }
    ];

    return [
      {
        id: "ai-perfect-party-hair",
        name: "✨ AI Perfect Match",
        type: "hair",
        parameters: {
          baseAsset: baseAssets[0],
          nightReady: true,
          movement: "dynamic"
        }
      },
      ...baseAssets
    ];
  }

  private async generatePartyBeard(faceGeometry: FaceGeometry): Promise<Asset[]> {
    return await this.getBeardRecommendations(faceGeometry, "Party Glam");
  }

  private generatePartyAccessories(faceGeometry: FaceGeometry): Asset[] {
    const baseAssets: Asset[] = [
      {
        id: "chain-silver",
        name: "Silver Chain",
        type: "accessory",
        parameters: {
          length: "medium",
          style: "urban"
        }
      },
      {
        id: "sunglasses-wayfarer",
        name: "Wayfarer Sunglasses",
        type: "accessory",
        parameters: {
          tint: "dark",
          frame: "black"
        }
      }
    ];

    return [
      {
        id: "ai-perfect-party-accessories",
        name: "✨ AI Perfect Match",
        type: "accessory",
        parameters: {
          baseAsset: baseAssets[0],
          coordination: "street_luxury",
          impact: "statement"
        }
      },
      ...baseAssets
    ];
  }

  // 💒 WEDDING ASSET GENERATION
  private generateWeddingOutfits(bodyGeometry?: BodyGeometry): Asset[] {
    // Return empty array if no body geometry available (face-only mode)
    if (!bodyGeometry) {
      console.log(`[IONTYX PIPELINE] WEDDING OUTFITS: No body geometry - returning empty array`);
      return [];
    }
    
    const { shoulderWidth, torsoRatio } = bodyGeometry;
    
    const baseAssets: Asset[] = [
      {
        id: "sherwani-royal",
        name: "Royal Sherwani",
        type: "outfit",
        parameters: {
          fit: torsoRatio > 1.1 ? "tailored" : "regular",
          embroidery: "premium"
        }
      },
      {
        id: "suit-tuxedo",
        name: "Classic Tuxedo",
        type: "outfit",
        parameters: {
          lapel: "peak",
          fit: "slim"
        }
      }
    ];

    return [
      {
        id: "ai-perfect-wedding-outfit",
        name: "✨ AI Perfect Match",
        type: "outfit",
        parameters: {
          baseAsset: baseAssets[0],
          ceremonial: true,
          elegance: "timeless"
        }
      },
      ...baseAssets
    ];
  }

  private generateWeddingHair(faceGeometry: FaceGeometry): Asset[] {
    const { faceLength } = faceGeometry;
    
    const baseAssets: Asset[] = [
      {
        id: "volume-styled",
        name: "Volume Styled",
        type: "hair",
        parameters: {
          volume: faceLength > 600 ? "high" : "medium",
          hold: "maximum"
        }
      },
      {
        id: "slick-back",
        name: "Slick Back",
        type: "hair",
        parameters: {
          shine: "high",
          control: "strong"
        }
      }
    ];

    return [
      {
        id: "ai-perfect-wedding-hair",
        name: "✨ AI Perfect Match",
        type: "hair",
        parameters: {
          baseAsset: baseAssets[0],
          formal: true,
          longevity: "all_day"
        }
      },
      ...baseAssets
    ];
  }

  private async generateWeddingBeard(faceGeometry: FaceGeometry): Promise<Asset[]> {
    return await this.getBeardRecommendations(faceGeometry, "Wedding");
  }

  private generateWeddingAccessories(faceGeometry: FaceGeometry): Asset[] {
    const baseAssets: Asset[] = [
      {
        id: "traditional-set",
        name: "Traditional Set",
        type: "accessory",
        parameters: {
          cultural: "mixed",
          formality: "maximum"
        }
      }
    ];

    return [
      {
        id: "ai-perfect-wedding-accessories",
        name: "✨ AI Perfect Match",
        type: "accessory",
        parameters: {
          baseAsset: baseAssets[0],
          coordination: "ceremonial_complete",
          heritage: "respected"
        }
      },
      ...baseAssets
    ];
  }

  // 🎂 RECEPTION ASSET GENERATION
  private generateReceptionOutfits(bodyGeometry?: BodyGeometry): Asset[] {
    // Return empty array if no body geometry available (face-only mode)
    if (!bodyGeometry) {
      console.log(`[IONTYX PIPELINE] RECEPTION OUTFITS: No body geometry - returning empty array`);
      return [];
    }
    
    const { shoulderWidth, torsoRatio } = bodyGeometry;
    
    const baseAssets: Asset[] = [
      {
        id: "blazer-navy",
        name: "Navy Blazer",
        type: "outfit",
        parameters: {
          fit: torsoRatio > 1.1 ? "slim" : "regular",
          occasion: "semi_formal"
        }
      }
    ];

    return [
      {
        id: "ai-perfect-reception-outfit",
        name: "✨ AI Perfect Match",
        type: "outfit",
        parameters: {
          baseAsset: baseAssets[0],
          versatile: true,
          comfort: "extended_wear"
        }
      },
      ...baseAssets
    ];
  }

  private generateReceptionHair(faceGeometry: FaceGeometry): Asset[] {
    const { faceLength } = faceGeometry;
    
    const baseAssets: Asset[] = [
      {
        id: "controlled-volume",
        name: "Controlled Volume",
        type: "hair",
        parameters: {
          volume: faceLength > 600 ? "medium" : "low",
          control: "medium"
        }
      }
    ];

    return [
      {
        id: "ai-perfect-reception-hair",
        name: "✨ AI Perfect Match",
        type: "hair",
        parameters: {
          baseAsset: baseAssets[0],
          endurance: "long_event",
          touch_up: "minimal"
        }
      },
      ...baseAssets
    ];
  }

  private async generateReceptionBeard(faceGeometry: FaceGeometry): Promise<Asset[]> {
    return await this.getBeardRecommendations(faceGeometry, "Reception");
  }

  private generateReceptionAccessories(faceGeometry: FaceGeometry): Asset[] {
    const baseAssets: Asset[] = [
      {
        id: "watch-minimal",
        name: "Minimal Watch",
        type: "accessory",
        parameters: {
          style: "understated",
          metal: "silver"
        }
      }
    ];

    return [
      {
        id: "ai-perfect-reception-accessories",
        name: "✨ AI Perfect Match",
        type: "accessory",
        parameters: {
          baseAsset: baseAssets[0],
          subtlety: "elegant",
          function: "timeless"
        }
      },
      ...baseAssets
    ];
  }

  // 😊 CASUAL ASSET GENERATION
  private generateCasualOutfits(bodyGeometry?: BodyGeometry): Asset[] {
    // Return empty array if no body geometry available (face-only mode)
    if (!bodyGeometry) {
      console.log(`[IONTYX PIPELINE] CASUAL OUTFITS: No body geometry - returning empty array`);
      return [];
    }
    
    const { torsoRatio } = bodyGeometry;
    
    const baseAssets: Asset[] = [
      {
        id: "t-shirt-cotton",
        name: "Cotton T-Shirt",
        type: "outfit",
        parameters: {
          fit: torsoRatio > 1.2 ? "slim" : "regular",
          material: "soft_cotton"
        }
      },
      {
        id: "hoodie-comfort",
        name: "Comfort Hoodie",
        type: "outfit",
        parameters: {
          weight: "medium",
          comfort: "maximum"
        }
      }
    ];

    return [
      {
        id: "ai-perfect-casual-outfit",
        name: "✨ AI Perfect Match",
        type: "outfit",
        parameters: {
          baseAsset: baseAssets[0],
          comfort: "everyday",
          versatility: "high"
        }
      },
      ...baseAssets
    ];
  }

  private generateCasualHair(faceGeometry: FaceGeometry): Asset[] {
    const baseAssets: Asset[] = [
      {
        id: "natural-flow",
        name: "Natural Flow",
        type: "hair",
        parameters: {
          intervention: "minimal",
          natural: true
        }
      }
    ];

    return [
      {
        id: "ai-perfect-casual-hair",
        name: "✨ AI Perfect Match",
        type: "hair",
        parameters: {
          baseAsset: baseAssets[0],
          effort: "low",
          authenticity: "high"
        }
      },
      ...baseAssets
    ];
  }

  private async generateCasualBeard(faceGeometry: FaceGeometry): Promise<Asset[]> {
    return await this.getBeardRecommendations(faceGeometry, "Casual");
  }

  private generateCasualAccessories(faceGeometry: FaceGeometry): Asset[] {
    const baseAssets: Asset[] = [
      {
        id: "optional-watch",
        name: "Optional Watch",
        type: "accessory",
        parameters: {
          requirement: "optional",
          style: "versatile"
        }
      }
    ];

    return [
      {
        id: "ai-perfect-casual-accessories",
        name: "✨ AI Perfect Match",
        type: "accessory",
        parameters: {
          baseAsset: baseAssets[0],
          philosophy: "minimal",
          function: "practical"
        }
      },
      ...baseAssets
    ];
  }

  // 🕉️ BRIDAL FULL SET ENGINE - CULTURAL ROUTING
  private generateBridalLook(
    faceGeometry: FaceGeometry,
    bodyGeometry: BodyGeometry,
    bridalContext: BridalContext
  ): AIOccasionResult {
    
    switch (bridalContext.bridalType) {
      case "hindu":
        return this.generateHinduBridalLook(faceGeometry, bodyGeometry);
      case "muslim":
        return this.generateMuslimBridalLook(faceGeometry, bodyGeometry);
      case "christian":
        return this.generateChristianBridalLook(faceGeometry, bodyGeometry);
      case "modern":
        return this.generateModernBridalLook(faceGeometry, bodyGeometry);
      default:
        throw new Error("INVALID_BRIDAL_TYPE: Unsupported cultural type");
    }
  }

  // 🕉️ HINDU BRIDAL LOOK
  private generateHinduBridalLook(faceGeometry: FaceGeometry, bodyGeometry: BodyGeometry): AIOccasionResult {
    return {
      categories: {
        outfits: [
          {
            id: "ai-perfect-hindu-outfit",
            name: "✨ AI Perfect Match",
            type: "outfit",
            culturalType: "hindu",
            parameters: {
              baseAsset: "sherwani-royal-silk",
              embroidery: "zari_gold",
              color: "ivory_cream",
              culturalAuthenticity: "traditional"
            }
          },
          {
            id: "sherwani-royal-silk",
            name: "Royal Silk Sherwani",
            type: "outfit",
            culturalType: "hindu",
            parameters: {
              fabric: "silk",
              embroidery: "gold_thread",
              fit: "traditional_tailored"
            }
          },
          {
            id: "veshti-silk-set",
            name: "Silk Veshti Set",
            type: "outfit",
            culturalType: "hindu",
            parameters: {
              dhoti: "silk_gold_border",
              shirt: "ivory_kurta"
            }
          }
        ],
        hair: [
          {
            id: "ai-perfect-hindu-hair",
            name: "✨ AI Perfect Match",
            type: "hair",
            culturalType: "hindu",
            parameters: {
              style: "traditional_volume",
              control: "strong_hold",
              ceremonial: true
            }
          },
          {
            id: "hindu-traditional-styled",
            name: "Traditional Styled",
            type: "hair",
            culturalType: "hindu",
            parameters: {
              volume: "medium_high",
              part: "center",
              culturalAuthenticity: true
            }
          }
        ],
        beard: [
          {
            id: "ai-perfect-hindu-beard",
            name: "✨ AI Perfect Match",
            type: "beard",
            culturalType: "hindu",
            parameters: {
              style: "full_groomed_sharp",
              edges: "crisp",
              ceremonial: true
            }
          },
          {
            id: "hindu-full-groomed",
            name: "Full Groomed",
            type: "beard",
            culturalType: "hindu",
            parameters: {
              length: 4,
              shape: "square_jaw",
              maintenance: "ceremonial_grade"
            }
          }
        ],
        accessories: [
          {
            id: "ai-perfect-hindu-accessories",
            name: "✨ AI Perfect Match",
            type: "accessory",
            culturalType: "hindu",
            parameters: {
              set: "complete_traditional",
              coordination: "ceremonial_perfect"
            }
          },
          {
            id: "safa-royal-turban",
            name: "Royal Safa Turban",
            type: "accessory",
            culturalType: "hindu",
            parameters: {
              color: "ivory_gold",
              style: "rajasthani_royal",
              brooch: "precious"
            }
          },
          {
            id: "mala-bridal-garland",
            name: "Bridal Mala",
            type: "accessory",
            culturalType: "hindu",
            parameters: {
              material: "fresh_flowers",
              length: "ceremonial"
            }
          },
          {
            id: "gold-chain-traditional",
            name: "Traditional Gold Chain",
            type: "accessory",
            culturalType: "hindu",
            parameters: {
              purity: "22k",
              design: "traditional_pattern"
            }
          }
        ]
      },
      aiPerfectMatchIndex: 0
    };
  }

  // 🌙 MUSLIM BRIDAL LOOK
  private generateMuslimBridalLook(faceGeometry: FaceGeometry, bodyGeometry: BodyGeometry): AIOccasionResult {
    return {
      categories: {
        outfits: [
          {
            id: "ai-perfect-muslim-outfit",
            name: "✨ AI Perfect Match",
            type: "outfit",
            culturalType: "muslim",
            parameters: {
              baseAsset: "sherwani-elegant",
              kurta: "flowing_white",
              pants: "churidar",
              culturalAuthenticity: "islamic_traditional"
            }
          },
          {
            id: "sherwani-elegant-muslim",
            name: "Elegant Sherwani",
            type: "outfit",
            culturalType: "muslim",
            parameters: {
              length: "long",
              embroidery: "subtle_gold",
              modesty: "appropriate"
            }
          }
        ],
        hair: [
          {
            id: "ai-perfect-muslim-hair",
            name: "✨ AI Perfect Match",
            type: "hair",
            culturalType: "muslim",
            parameters: {
              style: "clean_styled",
              neatness: "impeccable",
              culturalModesty: true
            }
          },
          {
            id: "muslim-clean-styled",
            name: "Clean Styled",
            type: "hair",
            culturalType: "muslim",
            parameters: {
              volume: "low_medium",
              control: "strong",
              neatness: "high"
            }
          }
        ],
        beard: [
          {
            id: "ai-perfect-muslim-beard",
            name: "✨ AI Perfect Match",
            type: "beard",
            culturalType: "muslim",
            parameters: {
              style: "dense_shaped",
              length: "medium_full",
              islamicStyling: true
            }
          },
          {
            id: "muslim-dense-beard",
            name: "Dense Shaped Beard",
            type: "beard",
            culturalType: "muslim",
            parameters: {
              density: 0.8,
              shape: "natural_oval",
              grooming: "precise"
            }
          }
        ],
        accessories: [
          {
            id: "ai-perfect-muslim-accessories",
            name: "✨ AI Perfect Match",
            type: "accessory",
            culturalType: "muslim",
            parameters: {
              set: "islamic_elegant",
              modesty: "cultural_appropriate"
            }
          },
          {
            id: "topi-traditional",
            name: "Traditional Topi",
            type: "accessory",
            culturalType: "muslim",
            parameters: {
              color: "white_black",
              style: "cultural_traditional"
            }
          },
          {
            id: "minimal-chain-muslim",
            name: "Minimal Chain",
            type: "accessory",
            culturalType: "muslim",
            parameters: {
              subtlety: "high",
              culturalAppropriate: true
            }
          }
        ]
      },
      aiPerfectMatchIndex: 0
    };
  }

  // ✝️ CHRISTIAN BRIDAL LOOK
  private generateChristianBridalLook(faceGeometry: FaceGeometry, bodyGeometry: BodyGeometry): AIOccasionResult {
    return {
      categories: {
        outfits: [
          {
            id: "ai-perfect-christian-outfit",
            name: "✨ AI Perfect Match",
            type: "outfit",
            culturalType: "christian",
            parameters: {
              baseAsset: "tuxedo-classic",
              tie: "bowtie_elegant",
              vest: "matching",
              westernFormal: true
            }
          },
          {
            id: "suit-tuxedo-christian",
            name: "Classic Tuxedo",
            type: "outfit",
            culturalType: "christian",
            parameters: {
              lapel: "peak",
              material: "wool",
              fit: "tailored"
            }
          }
        ],
        hair: [
          {
            id: "ai-perfect-christian-hair",
            name: "✨ AI Perfect Match",
            type: "hair",
            culturalType: "christian",
            parameters: {
              style: "side_part_formal",
              control: "strong",
              westernFormal: true
            }
          },
          {
            id: "christian-side-part",
            name: "Side Part Formal",
            type: "hair",
            culturalType: "christian",
            parameters: {
              part: "deep_side",
              volume: "low",
              shine: "medium"
            }
          }
        ],
        beard: [
          {
            id: "ai-perfect-christian-beard",
            name: "✨ AI Perfect Match",
            type: "beard",
            culturalType: "christian",
            parameters: {
              style: "clean_shave_elegant",
              grooming: "impeccable",
              westernStandard: true
            }
          },
          {
            id: "christian-clean-shave",
            name: "Clean Shave",
            type: "beard",
            culturalType: "christian",
            parameters: {
              maintenance: "perfect",
              smoothness: "high"
            }
          },
          {
            id: "christian-light-stubble",
            name: "Light Stubble",
            type: "beard",
            culturalType: "christian",
            parameters: {
              density: 0.2,
              grooming: "precise"
            }
          }
        ],
        accessories: [
          {
            id: "ai-perfect-christian-accessories",
            name: "✨ AI Perfect Match",
            type: "accessory",
            culturalType: "christian",
            parameters: {
              set: "western_formal_complete",
              elegance: "classic"
            }
          },
          {
            id: "tie-bowtie-elegant",
            name: "Elegant Bowtie",
            type: "accessory",
            culturalType: "christian",
            parameters: {
              material: "silk",
              color: "black_ivory",
              style: "classic_butterfly"
            }
          },
          {
            id: "blazer-styling-christian",
            name: "Blazer Styling",
            type: "accessory",
            culturalType: "christian",
            parameters: {
              pocket_square: "white",
              boutonniere: "subtle"
            }
          }
        ]
      },
      aiPerfectMatchIndex: 0
    };
  }

  // ✨ MODERN BRIDAL LOOK
  private generateModernBridalLook(faceGeometry: FaceGeometry, bodyGeometry: BodyGeometry): AIOccasionResult {
    return {
      categories: {
        outfits: [
          {
            id: "ai-perfect-modern-outfit",
            name: "✨ AI Perfect Match",
            type: "outfit",
            culturalType: "modern",
            parameters: {
              baseAsset: "indo_western_designer",
              fusion: "contemporary_traditional",
              designer: "luxury"
            }
          },
          {
            id: "indo-western-blazer",
            name: "Indo-Western Designer Blazer",
            type: "outfit",
            culturalType: "modern",
            parameters: {
              cut: "modern_tailored",
              fusion: "asian_european",
              designer: "premium"
            }
          }
        ],
        hair: [
          {
            id: "ai-perfect-modern-hair",
            name: "✨ AI Perfect Match",
            type: "hair",
            culturalType: "modern",
            parameters: {
              style: "textured_modern_volume",
              product: "premium",
              contemporary: true
            }
          },
          {
            id: "modern-textured-volume",
            name: "Textured Modern Volume",
            type: "hair",
            culturalType: "modern",
            parameters: {
              volume: "medium_high",
              texture: "piecey_modern",
              movement: "natural"
            }
          }
        ],
        beard: [
          {
            id: "ai-perfect-modern-beard",
            name: "✨ AI Perfect Match",
            type: "beard",
            culturalType: "modern",
            parameters: {
              style: "styled_medium_density",
              grooming: "designer_grade",
              contemporary: true
            }
          },
          {
            id: "modern-styled-beard",
            name: "Styled Medium Density",
            type: "beard",
            culturalType: "modern",
            parameters: {
              length: 3,
              density: 0.6,
              shape: "designer_contoured"
            }
          }
        ],
        accessories: [
          {
            id: "ai-perfect-modern-accessories",
            name: "✨ AI Perfect Match",
            type: "accessory",
            culturalType: "modern",
            parameters: {
              set: "luxury_minimalist",
              contemporary: true,
              designer: "premium"
            }
          },
          {
            id: "chain-modern-luxury",
            name: "Modern Luxury Chain",
            type: "accessory",
            culturalType: "modern",
            parameters: {
              design: "minimalist_elegant",
              material: "premium_metals"
            }
          },
          {
            id: "watch-designer",
            name: "Designer Watch",
            type: "accessory",
            culturalType: "modern",
            parameters: {
              style: "minimal_luxury",
              brand: "designer"
            }
          }
        ]
      },
      aiPerfectMatchIndex: 0
    };
  }

  // 🚀 AI STYLING PIPELINE - MAIN ENTRY POINT
  async runAIStylistPipeline({
    gender,
    occasion,
    category,
    faceLandmarks,
    poseLandmarks,
    bridalContext
  }: {
    gender: Gender;
    occasion: string; // Accept string input, validate internally
    category: string; // Selected category (e.g., "beard", "outfits", "hair", "accessories")
    faceLandmarks: any[];
    poseLandmarks: any[];
    bridalContext?: BridalContext;
  }): Promise<AIOccasionResult> {
    
    // Validate and convert occasion string to Occasion type
    const validOccasions: Occasion[] = ["Office/College", "Party Glam", "Wedding", "Reception", "Casual"];
    const validatedOccasion = validOccasions.find(occ => occ === occasion) as Occasion;
    
    if (!validatedOccasion) {
      throw new Error(`INVALID_OCCASION: "${occasion}" is not a supported occasion`);
    }

    // 📊 STEP 1: INPUT LOGGING
    console.log(`[IONTYX PIPELINE] STEP 1: INPUT - Mode: ${occasion}, Category: ${category}, Gender: ${gender}`);

    // Extract face geometry from landmarks
    const faceGeometry = this.extractFaceGeometry(faceLandmarks);
    
    // 📊 STEP 2: GEOMETRY LOGGING
    console.log(`[IONTYX PIPELINE] STEP 2: FACE GEOMETRY - jawWidth: ${faceGeometry.jawWidth.toFixed(3)}, cheekboneRatio: ${faceGeometry.cheekboneRatio.toFixed(3)}, faceLength: ${faceGeometry.faceLength.toFixed(3)}, symmetryScore: ${faceGeometry.symmetryScore.toFixed(3)}`);
    
    // Conditional body geometry extraction - only for outfit categories
    let bodyGeometry: BodyGeometry | undefined;
    const faceOnlyCategories = ['beard', 'hair', 'accessories'];
    
    if (faceOnlyCategories.includes(category.toLowerCase())) {
      console.log(`[IONTYX PIPELINE] STEP 2: BODY GEOMETRY - SKIPPED (face-only category: ${category})`);
      bodyGeometry = undefined;
    } else {
      console.log(`[IONTYX PIPELINE] STEP 2: BODY GEOMETRY - EXTRACTING (outfit category: ${category})`);
      bodyGeometry = this.extractBodyGeometry(poseLandmarks);
      console.log(`[IONTYX PIPELINE] STEP 2: BODY GEOMETRY - shoulderWidth: ${bodyGeometry?.shoulderWidth.toFixed(3)}, torsoRatio: ${bodyGeometry?.torsoRatio.toFixed(3)}`);
    }

    // Generate style recommendations
    const recommendations = await this.generateStyleRecommendations(
      gender,
      validatedOccasion,
      faceGeometry,
      bodyGeometry,
      bridalContext
    );

    return recommendations;
  }

  // 🧹 CLEANUP
  cleanup(): void {
    if (this.faceMesh) {
      this.faceMesh.close();
    }
    if (this.pose) {
      this.pose.close();
    }
  }
}

export default AIOccasionStylist;
