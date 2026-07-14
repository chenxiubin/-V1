import { describe, it, expect } from 'vitest';
import { ProductProfileSchema, SceneRecipeSchema } from '../types/schemas';

// ==========================================
// Standard Reference Mock Data
// ==========================================

const VALID_PRODUCT_PROFILE = {
  schemaVersion: '1.0',
  productAssetId: 'asset-123',
  productType: 'desk_calendar',
  bracketType: 'paper_base',
  subjectBounds: { x: 10, y: 15, width: 80, height: 70 },
  contactRegion: { xStart: 20, xEnd: 80, y: 85, confidence: 'high' },
  view: {
    class: 'front_left',
    visibleTop: 'none',
    visibleSide: 'left',
    perspectiveStrength: 'low',
  },
  materials: [
    { name: 'paper', reflectivity: 'low' },
    { name: 'metal', reflectivity: 'medium' }
  ],
  palette: {
    dominant: ['#FFFFFF', '#D3D3D3', '#000000'],
    edgeBrightness: 'mid',
  },
  existingLighting: {
    direction: 'upper_left',
    temperature: 'neutral_warm',
    softness: 'soft',
    contrast: 'low',
  },
  uncertainties: [
    { field: 'materials', reason: '可能覆盖了哑光塑料层', confidence: 'medium' }
  ],
  overallConfidence: 'high',
  analyzedAt: '2026-07-10T03:15:10-07:00',
};

const VALID_SCENE_RECIPE = {
  schemaVersion: '1.0',
  recipeId: 'recipe-abc',
  version: 1,
  productAssetId: 'asset-123',
  productProfileSnapshot: VALID_PRODUCT_PROFILE,
  guidedAnswers: [
    { questionId: 'q1', optionId: 'o1', answeredAt: '2026-07-10T03:15:10-07:00' }
  ],
  selectedDirectionId: 'direction-warm-cozy',
  task: {
    operation: 'generate_empty_scene_background',
    productRole: 'analysis_and_spatial_reference_only',
    backgroundOnly: true,
  },
  scene: {
    spaceType: 'living_room',
    wallMaterial: 'beige plaster wall',
    desktopMaterial: 'light oak wood',
    desktopTone: 'warm natural wood tone',
    backgroundBrightness: 'medium_light',
    style: 'warm minimalist japanese',
    palette: ['#F5F5DC', '#D2B48C', '#FFFDD0'],
    furnitureDensity: 'medium',
  },
  composition: {
    purpose: 'hero',
    productCount: 1,
    productPosition: 'center',
    productWidthPercent: 45,
    copySpace: 'right',
    cameraView: 'front_left',
    cameraHeight: 'near_eye_level',
    framing: 'medium',
    perspectiveStrength: 'low',
    desktopVisiblePercent: 30,
  },
  lighting: {
    sourceType: 'window',
    sourcePosition: 'upper_left',
    temperature: 'neutral_warm',
    softness: 'soft',
    contrast: 'low',
    shadowDirection: 'rear_right',
  },
  decoration: {
    density: 'moderate',
    allowed: ['ceramic vase', 'eucalyptus twig', 'soft warm sunlight beam'],
    forbiddenNearProduct: ['high gloss metal', 'cluttering books'],
    foregroundOcclusion: false,
  },
  output: {
    aspectRatio: '3:4',
    resolutionLabel: '2K',
    realism: 'real_commercial_interior_photography',
    exclude: ['deformed', 'blurry', 'realistic desk calendar'],
  },
  createdAt: '2026-07-10T03:15:10-07:00',
  updatedAt: '2026-07-10T03:15:10-07:00',
};

// ==========================================
// Schema Unit Tests
// ==========================================

describe('Zod Schema Verification Tests', () => {
  it('should successfully validate a complete, valid ProductProfile structure', () => {
    const parseResult = ProductProfileSchema.safeParse(VALID_PRODUCT_PROFILE);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.schemaVersion).toBe('1.0');
      expect(parseResult.data.productType).toBe('desk_calendar');
    }
  });

  it('should successfully validate a complete, valid SceneRecipe structure', () => {
    const parseResult = SceneRecipeSchema.safeParse(VALID_SCENE_RECIPE);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.recipeId).toBe('recipe-abc');
      expect(parseResult.data.composition.productWidthPercent).toBe(45);
    }
  });

  it('should robustly reject a ProductProfile with missing mandatory fields', () => {
    const invalidProfile = { ...VALID_PRODUCT_PROFILE };
    // testing invalid runtime payload
    delete invalidProfile.productType;

    const parseResult = ProductProfileSchema.safeParse(invalidProfile);
    expect(parseResult.success).toBe(false);
  });

  it('should robustly reject a ProductProfile with illegal enum values', () => {
    const invalidProfile = {
      ...VALID_PRODUCT_PROFILE,
      productType: 'spaceship_calendar', // Illegal enum value
    };

    const parseResult = ProductProfileSchema.safeParse(invalidProfile);
    expect(parseResult.success).toBe(false);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0].message;
      expect(errorMsg.toLowerCase()).toContain("invalid");
    }
  });

  it('should robustly reject a SceneRecipe with illegal backgroundOnly configuration', () => {
    const invalidRecipe = {
      ...VALID_SCENE_RECIPE,
      task: {
        operation: 'generate_empty_scene_background',
        productRole: 'analysis_and_spatial_reference_only',
        backgroundOnly: false, // Must be true according to z.literal(true)
      },
    };

    const parseResult = SceneRecipeSchema.safeParse(invalidRecipe);
    expect(parseResult.success).toBe(false);
  });
});
