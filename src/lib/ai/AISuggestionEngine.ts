// ═════════════════════════════════════════════════════════════════════════════
// 🤖 AI SUGGESTION ENGINE - IONTYX Glow Mirror (HUMAN FEEL)
// ═════════════════════════════════════════════════════════════════════════════

import { GlowScoreResult, FaceGeometry } from './GlowScoreEngine';

export type SuggestionType = "tone" | "structure" | "texture";

export interface AISuggestion {
  message: string;
  type: SuggestionType;
  priority: "low" | "medium" | "high";
  actionable: boolean;
}

export interface SuggestionContext {
  occasion: "Office/College" | "Party Glam" | "Wedding" | "Reception" | "Casual";
  category: "outfits" | "hair" | "beard" | "accessories";
  gender: "male";
}

export class AISuggestionEngine {
  
  // 🎯 MAIN SUGGESTION GENERATOR - PURE RULE MAPPING
  generateSuggestions(
    glowScoreResult: GlowScoreResult,
    faceGeometry: FaceGeometry,
    context: SuggestionContext
  ): AISuggestion[] {
    
    const suggestions: AISuggestion[] = [];
    const { score, components } = glowScoreResult;
    
    // 📊 GLOW SCORE BASED SUGGESTIONS
    if (score < 40) {
      suggestions.push({
        message: "Try brighter tones to enhance your skin's natural radiance",
        type: "tone",
        priority: "high",
        actionable: true
      });
      
      suggestions.push({
        message: "Consider a grooming routine to improve skin texture",
        type: "texture",
        priority: "medium",
        actionable: true
      });
    } else if (score >= 40 && score <= 70) {
      suggestions.push({
        message: "Balanced look suits your face structure well",
        type: "structure",
        priority: "medium",
        actionable: false
      });
    } else if (score > 70) {
      suggestions.push({
        message: "Your current look enhances your features perfectly",
        type: "structure",
        priority: "low",
        actionable: false
      });
    }
    
    // 🎨 COMPONENT-SPECIFIC SUGGESTIONS
    suggestions.push(...this.generateComponentSuggestions(components, faceGeometry));
    
    // 🎭 OCCASION-SPECIFIC SUGGESTIONS
    suggestions.push(...this.generateOccasionSuggestions(context, score));
    
    // 🧬 FACE GEOMETRY SUGGESTIONS
    suggestions.push(...this.generateGeometrySuggestions(faceGeometry, context));
    
    // Sort by priority and return top 3
    return suggestions
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 3);
  }

  // 🎨 COMPONENT-BASED SUGGESTIONS
  private generateComponentSuggestions(
    components: GlowScoreResult['components'],
    faceGeometry: FaceGeometry
  ): AISuggestion[] {
    const suggestions: AISuggestion[] = [];
    
    // 💡 LUMINANCE SUGGESTIONS
    if (components.luminance < 50) {
      suggestions.push({
        message: "Even out skin tone with brightening products",
        type: "tone",
        priority: "high",
        actionable: true
      });
    } else if (components.luminance > 80) {
      suggestions.push({
        message: "Your skin tone is beautifully consistent",
        type: "tone",
        priority: "low",
        actionable: false
      });
    }
    
    // 🌟 TEXTURE SUGGESTIONS
    if (components.texture < 40) {
      suggestions.push({
        message: "Try exfoliation to improve skin smoothness",
        type: "texture",
        priority: "medium",
        actionable: true
      });
    } else if (components.texture > 75) {
      suggestions.push({
        message: "Excellent skin texture detected",
        type: "texture",
        priority: "low",
        actionable: false
      });
    }
    
    // ⚖️ SYMMETRY SUGGESTIONS
    if (components.symmetry < 50) {
      suggestions.push({
        message: "Structured hairstyle can balance facial asymmetry",
        type: "structure",
        priority: "medium",
        actionable: true
      });
    } else if (components.symmetry > 80) {
      suggestions.push({
        message: "Great facial symmetry - experiment with bold styles",
        type: "structure",
        priority: "low",
        actionable: true
      });
    }
    
    // 🎭 TONE BALANCE SUGGESTIONS
    if (components.tone < 40) {
      suggestions.push({
        message: "Color correction products can enhance your natural tones",
        type: "tone",
        priority: "medium",
        actionable: true
      });
    } else if (components.tone > 80) {
      suggestions.push({
        message: "Perfect color balance - your skin is camera-ready",
        type: "tone",
        priority: "low",
        actionable: false
      });
    }
    
    return suggestions;
  }

  // 🎭 OCCASION-SPECIFIC SUGGESTIONS
  private generateOccasionSuggestions(
    context: SuggestionContext,
    glowScore: number
  ): AISuggestion[] {
    const suggestions: AISuggestion[] = [];
    const { occasion, category } = context;
    
    // 🏢 OFFICE/COLLEGE
    if (occasion === "Office/College") {
      if (category === "outfits") {
        suggestions.push({
          message: "Professional tailoring enhances your authoritative presence",
          type: "structure",
          priority: "medium",
          actionable: true
        });
      } else if (category === "hair") {
        suggestions.push({
          message: "Neat, controlled hairstyle projects confidence",
          type: "structure",
          priority: "medium",
          actionable: true
        });
      } else if (category === "beard") {
        suggestions.push({
          message: "Well-groomed facial hair adds sophistication",
          type: "structure",
          priority: "medium",
          actionable: true
        });
      }
    }
    
    // 🎉 PARTY GLAM
    if (occasion === "Party Glam") {
      if (glowScore > 60) {
        suggestions.push({
          message: "Your glow is perfect - go bold with dramatic styles",
          type: "structure",
          priority: "medium",
          actionable: true
        });
      } else {
        suggestions.push({
          message: "Enhance your look with statement pieces",
          type: "tone",
          priority: "medium",
          actionable: true
        });
      }
    }
    
    // 💒 WEDDING
    if (occasion === "Wedding") {
      suggestions.push({
        message: "Traditional elegance honors the occasion perfectly",
        type: "structure",
        priority: "high",
        actionable: true
      });
      
      if (category === "outfits") {
        suggestions.push({
          message: "Cultural authenticity creates memorable impact",
          type: "tone",
          priority: "high",
          actionable: true
        });
      }
    }
    
    // 🎂 RECEPTION
    if (occasion === "Reception") {
      suggestions.push({
        message: "Semi-formal balance keeps you comfortable and stylish",
        type: "structure",
        priority: "medium",
        actionable: true
      });
    }
    
    // 😊 CASUAL
    if (occasion === "Casual") {
      suggestions.push({
        message: "Natural comfort enhances your authentic charm",
        type: "texture",
        priority: "low",
        actionable: false
      });
    }
    
    return suggestions;
  }

  // 🧬 FACE GEOMETRY SUGGESTIONS
  private generateGeometrySuggestions(
    faceGeometry: FaceGeometry,
    context: SuggestionContext
  ): AISuggestion[] {
    const suggestions: AISuggestion[] = [];
    const { jawWidth, cheekboneRatio, faceLength, symmetryScore } = faceGeometry;
    
    // 😎 SYMMETRY-BASED SUGGESTIONS
    if (symmetryScore < 0.6) {
      suggestions.push({
        message: "Asymmetrical hairstyles can create visual balance",
        type: "structure",
        priority: "medium",
        actionable: true
      });
    }
    
    // 🦴 JAWLINE SUGGESTIONS
    if (jawWidth > 350) {
      suggestions.push({
        message: "Strong jawline - sharp beard styles enhance definition",
        type: "structure",
        priority: "medium",
        actionable: true
      });
    } else if (jawWidth < 250) {
      suggestions.push({
        message: "Narrow jaw - fuller beard creates balance",
        type: "structure",
        priority: "medium",
        actionable: true
      });
    }
    
    // 👁️ CHEEKBONE SUGGESTIONS
    if (cheekboneRatio > 0.7) {
      suggestions.push({
        message: "Prominent cheekbones - sleek hairstyles highlight structure",
        type: "structure",
        priority: "medium",
        actionable: true
      });
    }
    
    // 📏 FACE LENGTH SUGGESTIONS
    if (faceLength > 650) {
      suggestions.push({
        message: "Long face - volume on sides creates balance",
        type: "structure",
        priority: "medium",
        actionable: true
      });
    } else if (faceLength < 450) {
      suggestions.push({
        message: "Round face - height in elongates appearance",
        type: "structure",
        priority: "medium",
        actionable: true
      });
    }
    
    return suggestions;
  }

  // 🎯 CATEGORY-SPECIFIC DEEP SUGGESTIONS
  generateCategorySpecificSuggestions(
    category: "outfits" | "hair" | "beard" | "accessories",
    glowScoreResult: GlowScoreResult,
    faceGeometry: FaceGeometry,
    context: SuggestionContext
  ): AISuggestion[] {
    
    const suggestions: AISuggestion[] = [];
    const { score, components } = glowScoreResult;
    
    switch (category) {
      case "outfits":
        suggestions.push(...this.generateOutfitSuggestions(score, faceGeometry, context));
        break;
      case "hair":
        suggestions.push(...this.generateHairSuggestions(components, faceGeometry, context));
        break;
      case "beard":
        suggestions.push(...this.generateBeardSuggestions(components, faceGeometry, context));
        break;
      case "accessories":
        suggestions.push(...this.generateAccessorySuggestions(score, faceGeometry, context));
        break;
    }
    
    return suggestions.slice(0, 2); // Top 2 per category
  }

  // 👔 OUTFIT SUGGESTIONS
  private generateOutfitSuggestions(
    score: number,
    faceGeometry: FaceGeometry,
    context: SuggestionContext
  ): AISuggestion[] {
    const suggestions: AISuggestion[] = [];
    const { occasion } = context;
    
    if (score > 70) {
      suggestions.push({
        message: "Your glow allows for bolder color choices",
        type: "tone",
        priority: "medium",
        actionable: true
      });
    }
    
    if (faceGeometry.jawWidth > 300) {
      suggestions.push({
        message: "Structured shoulders complement strong jawline",
        type: "structure",
        priority: "medium",
        actionable: true
      });
    }
    
    if (occasion === "Office/College") {
      suggestions.push({
        message: "Tailored fit enhances professional appearance",
        type: "structure",
        priority: "high",
        actionable: true
      });
    }
    
    return suggestions;
  }

  // 💇 HAIR SUGGESTIONS
  private generateHairSuggestions(
    components: GlowScoreResult['components'],
    faceGeometry: FaceGeometry,
    context: SuggestionContext
  ): AISuggestion[] {
    const suggestions: AISuggestion[] = [];
    
    if (components.symmetry < 60) {
      suggestions.push({
        message: "Structured hairstyle balances facial features",
        type: "structure",
        priority: "medium",
        actionable: true
      });
    }
    
    if (faceGeometry.faceLength > 600) {
      suggestions.push({
        message: "Side volume creates proportional balance",
        type: "structure",
        priority: "medium",
        actionable: true
      });
    }
    
    if (components.texture < 50) {
      suggestions.push({
        message: "Hair products can enhance texture and control",
        type: "texture",
        priority: "medium",
        actionable: true
      });
    }
    
    return suggestions;
  }

  // 🧔 BEARD SUGGESTIONS
  private generateBeardSuggestions(
    components: GlowScoreResult['components'],
    faceGeometry: FaceGeometry,
    context: SuggestionContext
  ): AISuggestion[] {
    const suggestions: AISuggestion[] = [];
    
    if (faceGeometry.jawWidth < 280) {
      suggestions.push({
        message: "Fuller beard adds width to narrow jaw",
        type: "structure",
        priority: "medium",
        actionable: true
      });
    } else if (faceGeometry.jawWidth > 350) {
      suggestions.push({
        message: "Sharp beard lines enhance strong jaw",
        type: "structure",
        priority: "medium",
        actionable: true
      });
    }
    
    if (components.luminance < 50) {
      suggestions.push({
        message: "Beard grooming products can enhance definition",
        type: "tone",
        priority: "medium",
        actionable: true
      });
    }
    
    return suggestions;
  }

  // 💎 ACCESSORY SUGGESTIONS
  private generateAccessorySuggestions(
    score: number,
    faceGeometry: FaceGeometry,
    context: SuggestionContext
  ): AISuggestion[] {
    const suggestions: AISuggestion[] = [];
    const { occasion } = context;
    
    if (score > 60) {
      suggestions.push({
        message: "Your glow supports statement accessories",
        type: "tone",
        priority: "medium",
        actionable: true
      });
    }
    
    if (faceGeometry.cheekboneRatio > 0.7) {
      suggestions.push({
        message: "Minimal accessories highlight strong features",
        type: "structure",
        priority: "medium",
        actionable: true
      });
    }
    
    if (occasion === "Wedding") {
      suggestions.push({
        message: "Traditional pieces honor cultural significance",
        type: "tone",
        priority: "high",
        actionable: true
      });
    }
    
    return suggestions;
  }

  // 🎯 REAL-TIME SUGGESTION UPDATES
  updateRealTimeSuggestions(
    currentSuggestions: AISuggestion[],
    newGlowScore: GlowScoreResult,
    threshold: number = 10
  ): AISuggestion[] {
    
    // Check if glow score changed significantly
    const scoreChange = Math.abs(newGlowScore.score - this.extractScoreFromSuggestions(currentSuggestions));
    
    if (scoreChange < threshold) {
      return currentSuggestions; // No significant change
    }
    
    // Generate new suggestions based on updated score
    // This would be called with current context in real implementation
    return currentSuggestions; // Placeholder for real-time updates
  }

  // 📊 UTILITY: Extract score from suggestions (for comparison)
  private extractScoreFromSuggestions(suggestions: AISuggestion[]): number {
    // In real implementation, this would track the score that generated the suggestions
    return 50; // Placeholder
  }

  // 🎨 SUGGESTION PERSONALIZATION
  personalizeSuggestions(
    suggestions: AISuggestion[],
    userPreferences: {
      style: "conservative" | "modern" | "experimental";
      comfortLevel: "low" | "medium" | "high";
      priorityAreas: ("tone" | "structure" | "texture")[];
    }
  ): AISuggestion[] {
    
    return suggestions
      .filter(suggestion => {
        // Filter by user's priority areas
        return userPreferences.priorityAreas.includes(suggestion.type);
      })
      .map(suggestion => {
        // Adjust message based on comfort level
        if (userPreferences.comfortLevel === "low" && suggestion.priority === "high") {
          return {
            ...suggestion,
            message: suggestion.message.replace("Try", "Consider"),
            priority: "medium" as const
          };
        }
        return suggestion;
      })
      .slice(0, 2); // Return top personalized suggestions
  }
}

export default AISuggestionEngine;
