// 🎨 MAKEUP PROMPT GENERATOR FOR STABLE DIFFUSION
// Generates professional makeup prompts for ControlNet integration

export interface MakeupLook {
  name: string;
  style: 'natural' | 'glam' | 'dramatic' | 'professional' | 'trendy';
  products: {
    lips: string;
    eyes: string;
    cheeks: string;
    foundation?: string;
  };
  colors: {
    lips: string;
    eyes: string;
    cheeks: string;
  };
}

export interface PromptComponents {
  base: string;
  lighting: string;
  quality: string;
  style: string;
  negative: string;
}

class MakeupPromptGenerator {
  private static readonly STYLE_MODIFIERS = {
    natural: {
      base: 'natural makeup, subtle enhancement',
      lighting: 'soft natural lighting, daylight',
      quality: 'high quality, realistic, 8k'
    },
    glam: {
      base: 'glamorous makeup, bold colors',
      lighting: 'studio lighting, ring light, professional photography',
      quality: 'ultra high quality, 8k, detailed, sharp focus'
    },
    dramatic: {
      base: 'dramatic makeup, artistic, high contrast',
      lighting: 'dramatic lighting, high contrast, shadows',
      quality: 'cinematic quality, 8k, professional photography'
    },
    professional: {
      base: 'professional makeup, office appropriate',
      lighting: 'office lighting, neutral lighting',
      quality: 'business portrait, 8k, professional photography'
    },
    trendy: {
      base: 'trendy makeup, fashion magazine style',
      lighting: 'fashion photography lighting, softbox',
      quality: 'vogue quality, 8k, fashion magazine style'
    }
  };

  private static readonly COLOR_PROMPTS = {
    lips: {
      red: 'bold red lipstick, matte finish, precise lip line',
      pink: 'soft pink lipstick, glossy finish, natural lips',
      nude: 'nude lipstick, satin finish, natural lip color',
      berry: 'berry lipstick, velvety finish, rich color',
      coral: 'coral lipstick, cream finish, vibrant color',
      natural: 'natural lipstick, subtle enhancement, lip tint'
    },
    eyes: {
      brown: 'brown eyeshadow, natural blend, subtle shimmer',
      gold: 'golden eyeshadow, metallic finish, shimmer',
      smoky: 'smoky eyeshadow, blended, dramatic eye makeup',
      blue: 'blue eyeshadow, vibrant, winged eyeliner',
      natural: 'natural eyeshadow, earth tones, soft blend'
    },
    cheeks: {
      pink: 'rosy blush, natural flush, cream blush',
      peach: 'peach blush, warm tone, subtle glow',
      bronze: 'bronze contour, warm tones, natural definition',
      highlight: 'highlighter, dewy finish, subtle glow',
      natural: 'natural blush, subtle definition, healthy glow'
    }
  };

  private static readonly NEGATIVE_PROMPTS = [
    'blurry, low quality, distorted, bad anatomy',
    'bad makeup, smudged, uneven application',
    'cartoon, anime, unrealistic',
    'oversaturated, washed out, poor lighting',
    'double face, multiple faces, face distortion',
    'bad skin texture, acne, blemishes (unless intentional)',
    'unrealistic proportions, bad perspective'
  ];

  // 🎨 Generate Base Prompt for Makeup Look
  static generatePrompt(
    look: MakeupLook,
    faceShape: string,
    skinTone: string,
    controlType: 'canny' | 'depth' | 'pose' = 'canny'
  ): PromptComponents {
    const styleModifier = this.STYLE_MODIFIERS[look.style];
    
    // Build color-specific prompts
    const colorPrompts = [
      this.COLOR_PROMPTS.lips[look.colors.lips as keyof typeof this.COLOR_PROMPTS.lips] || this.COLOR_PROMPTS.lips.natural,
      this.COLOR_PROMPTS.eyes[look.colors.eyes as keyof typeof this.COLOR_PROMPTS.eyes] || this.COLOR_PROMPTS.eyes.natural,
      this.COLOR_PROMPTS.cheeks[look.colors.cheeks as keyof typeof this.COLOR_PROMPTS.cheeks] || this.COLOR_PROMPTS.cheeks.natural
    ];

    // Face shape specific modifiers
    const faceShapeModifiers = this.getFaceShapeModifiers(faceShape);
    
    // Skin tone specific modifiers
    const skinToneModifiers = this.getSkinToneModifiers(skinTone);

    // ControlNet specific modifiers
    const controlNetModifiers = this.getControlNetModifiers(controlType);

    // Combine all components
    const base = [
      styleModifier.base,
      ...colorPrompts,
      faceShapeModifiers,
      skinToneModifiers,
      controlNetModifiers,
      'perfect makeup application',
      'flawless skin texture'
    ].filter(Boolean).join(', ');

    return {
      base,
      lighting: styleModifier.lighting,
      quality: styleModifier.quality,
      style: `makeup style: ${look.style}, face shape: ${faceShape}, skin tone: ${skinTone}`,
      negative: this.NEGATIVE_PROMPTS.join(', ')
    };
  }

  // 🎯 Generate Inpainting Mask Prompts
  static generateInpaintPrompt(
    area: 'lips' | 'eyes' | 'cheeks' | 'all',
    look: MakeupLook,
    intensity: number = 0.8
  ): string {
    const intensityModifier = intensity > 0.7 ? 'bold' : intensity > 0.4 ? 'medium' : 'subtle';
    
    switch (area) {
      case 'lips':
        return `${intensityModifier} ${look.products.lips}, ${look.colors.lips} lipstick, perfect lip line, smooth application`;
      
      case 'eyes':
        return `${intensityModifier} ${look.products.eyes}, ${look.colors.eyes} eyeshadow, blended, winged eyeliner, defined`;
      
      case 'cheeks':
        return `${intensityModifier} ${look.products.cheeks}, ${look.colors.cheeks} blush, natural contour, healthy glow`;
      
      case 'all':
        return `complete makeup look: ${look.products.lips}, ${look.products.eyes}, ${look.products.cheeks}, ${look.style} style, professional application`;
      
      default:
        return 'natural makeup enhancement';
    }
  }

  // 🎭 Face Shape Specific Modifiers
  private static getFaceShapeModifiers(faceShape: string): string {
    const modifiers = {
      oval: 'flattering for oval face shape, balanced proportions',
      round: 'contouring for round face, definition, angular balance',
      square: 'softening for square face, rounded edges, gentle contours',
      heart: 'balancing for heart face, wider lower face, soft jawline',
      diamond: 'highlighting for diamond face, soft temples, balanced features',
      triangle: 'enhancing for triangle face, defined cheekbones, balanced proportions'
    };
    
    return modifiers[faceShape as keyof typeof modifiers] || '';
  }

  // 🎨 Skin Tone Specific Modifiers
  private static getSkinToneModifiers(skinTone: string): string {
    const modifiers = {
      fair: 'suitable for fair skin, subtle colors, natural enhancement',
      light: 'complementary for light skin, warm undertones, natural blend',
      medium: 'perfect for medium skin, rich colors, warm tones',
      tan: 'ideal for tan skin, vibrant colors, sun-kissed look',
      deep: 'designed for deep skin, rich pigments, bold colors'
    };
    
    return modifiers[skinTone as keyof typeof modifiers] || '';
  }

  // 🎛️ ControlNet Specific Modifiers
  private static getControlNetModifiers(controlType: string): string {
    const modifiers = {
      canny: 'precise edge detection, sharp lines, accurate facial structure',
      depth: 'accurate depth perception, 3D structure, realistic contours',
      pose: 'correct facial pose, proper angles, natural positioning',
      scribble: 'artistic interpretation, creative application, stylized look'
    };
    
    return modifiers[controlType as keyof typeof modifiers] || '';
  }

  // 🔄 Generate Refinement Prompt
  static generateRefinementPrompt(
    previousPrompt: string,
    adjustments: {
      lipstickIntensity: number;
      eyeShadowIntensity: number;
      blushIntensity: number;
    }
  ): string {
    const adjustments_text = [];
    
    if (adjustments.lipstickIntensity > 0.6) {
      adjustments_text.push('bolder lipstick, more defined lips');
    } else if (adjustments.lipstickIntensity < 0.4) {
      adjustments_text.push('softer lipstick, natural lips');
    }
    
    if (adjustments.eyeShadowIntensity > 0.6) {
      adjustments_text.push('more dramatic eyeshadow, defined eyes');
    } else if (adjustments.eyeShadowIntensity < 0.4) {
      adjustments_text.push('subtle eyeshadow, natural eyes');
    }
    
    if (adjustments.blushIntensity > 0.6) {
      adjustments_text.push('more prominent blush, healthy glow');
    } else if (adjustments.blushIntensity < 0.4) {
      adjustments_text.push('lighter blush, subtle contour');
    }
    
    return `${previousPrompt}, ${adjustments_text.join(', ')}, refined, polished, professional finish`;
  }

  // 📊 Generate Quality Score Prompt
  static generateQualityPrompt(quality: 'draft' | 'medium' | 'high' | 'ultra'): string {
    const qualitySettings = {
      draft: 'quick generation, 10 steps, basic quality',
      medium: 'balanced generation, 15 steps, good quality',
      high: 'detailed generation, 20 steps, high quality',
      ultra: 'premium generation, 25 steps, ultra high quality, 8k'
    };
    
    return qualitySettings[quality];
  }
}

export default MakeupPromptGenerator;
