import { describe, it, expect } from 'vitest';
import { SceneMatchReportSchema, ProductAsset, SceneRecipe, PromptDocument, ImportedSceneImage } from '../types/schemas';
import { analyzeSceneMatch } from '../services/matchAnalyzer';
import { ProjectStore } from '../store/projectStore';

const MOCK_PRODUCT_ASSET: ProductAsset = {
  id: 'prod-123',
  name: 'Standard Desk Calendar',
  mimeType: 'image/png',
  width: 1024,
  height: 768,
  hasAlpha: false,
  persistedAssetRef: 'ref-prod-123',
  createdAt: new Date().toISOString()
};

const MOCK_SCENE_RECIPE: SceneRecipe = {
  schemaVersion: '1.0',
  recipeId: 'recipe-456',
  version: 1,
  productAssetId: 'prod-123',
  productProfileSnapshot: {
    schemaVersion: '1.0',
    productAssetId: 'prod-123',
    productType: 'desk_calendar',
    bracketType: 'paper_base',
    subjectBounds: { x: 100, y: 150, width: 800, height: 600 },
    contactRegion: { xStart: 200, xEnd: 800, y: 750, confidence: 'high' },
    view: { class: 'front', visibleTop: 'none', visibleSide: 'none', perspectiveStrength: 'medium' },
    materials: [],
    palette: { dominant: ['#FFFFFF'], edgeBrightness: 'light' },
    existingLighting: { direction: 'upper_left', temperature: 'neutral', softness: 'soft', contrast: 'low' },
    uncertainties: [],
    overallConfidence: 'high',
    analyzedAt: new Date().toISOString()
  },
  guidedAnswers: [],
  selectedDirectionId: 'dir-nordic',
  task: {
    operation: 'generate_empty_scene_background',
    productRole: 'analysis_and_spatial_reference_only',
    backgroundOnly: true
  },
  scene: {
    spaceType: '书房',
    wallMaterial: '石膏墙',
    desktopMaterial: '木质桌面',
    desktopTone: '原木色',
    backgroundBrightness: 'light',
    style: '北欧简约',
    palette: ['#FFFFFF'],
    furnitureDensity: 'low'
  },
  composition: {
    purpose: 'hero',
    productCount: 1,
    productPosition: 'center',
    productWidthPercent: 40,
    copySpace: 'none',
    cameraView: 'front',
    cameraHeight: 'near_eye_level',
    framing: 'medium',
    perspectiveStrength: 'medium',
    desktopVisiblePercent: 30
  },
  lighting: {
    sourceType: 'large_softbox',
    sourcePosition: 'upper_left',
    temperature: 'neutral_warm',
    softness: 'soft',
    contrast: 'low',
    shadowDirection: 'rear_right'
  },
  decoration: {
    density: 'minimal',
    allowed: [],
    forbiddenNearProduct: [],
    foregroundOcclusion: false
  },
  output: {
    aspectRatio: '4:3',
    resolutionLabel: '1K',
    realism: 'real_commercial_interior_photography',
    exclude: []
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const MOCK_PROMPT_DOCUMENT: PromptDocument = {
  recipeId: 'recipe-456',
  recipeVersion: 1,
  compilerVersion: '1.0',
  sections: {
    taskAndReferences: 'Section 1 text',
    productMatching: 'Section 2 text',
    sceneAndStyle: 'Section 3 text',
    cameraAndComposition: 'Section 4 text',
    lightingAndDecoration: 'Section 5 text',
    outputConstraints: 'Section 6 text'
  },
  fullPrompt: 'Full generated prompt',
  fullJson: '{}',
  objectJson: {
    task: 'task prompt',
    scene: 'scene prompt',
    composition: 'composition prompt',
    lighting: 'lighting prompt',
    decoration: 'decoration prompt',
    output: 'output prompt'
  },
  createdAt: new Date().toISOString()
};

const MOCK_IMPORTED_IMAGE: ImportedSceneImage = {
  id: 'img-789',
  fileName: 'good_render.png',
  mimeType: 'image/png',
  width: 1024,
  height: 768,
  persistedAssetRef: 'ref-img-789',
  createdAt: new Date().toISOString()
};

describe('Phase 4-C-3: Scene Match Analyzer Tests', () => {
  it('1. Legitimate MatchReport can pass Zod validation', async () => {
    const report = await analyzeSceneMatch({
      productAsset: MOCK_PRODUCT_ASSET,
      sceneImage: MOCK_IMPORTED_IMAGE,
      recipe: MOCK_SCENE_RECIPE,
      promptDocument: MOCK_PROMPT_DOCUMENT
    }, 'mock');

    const parsed = SceneMatchReportSchema.safeParse(report);
    expect(parsed.success).toBe(true);
  });

  it('2. Mock Analyzer returns correct data structure', async () => {
    const report = await analyzeSceneMatch({
      productAsset: MOCK_PRODUCT_ASSET,
      sceneImage: MOCK_IMPORTED_IMAGE,
      recipe: MOCK_SCENE_RECIPE,
      promptDocument: MOCK_PROMPT_DOCUMENT
    }, 'mock');

    expect(report.recipeId).toBe(MOCK_SCENE_RECIPE.recipeId);
    expect(report.sourceImageId).toBe(MOCK_IMPORTED_IMAGE.id);
    expect(report.overallScore).toBeGreaterThanOrEqual(80);
    expect(report.productMatch).toBeDefined();
    expect(report.sceneMatch).toBeDefined();
    expect(report.compositionMatch).toBeDefined();
    expect(report.lightingMatch).toBeDefined();
  });

  it('3. Low score report contains improvement suggestions', async () => {
    const lowScoreImage: ImportedSceneImage = {
      ...MOCK_IMPORTED_IMAGE,
      fileName: 'low-score.png'
    };

    const report = await analyzeSceneMatch({
      productAsset: MOCK_PRODUCT_ASSET,
      sceneImage: lowScoreImage,
      recipe: MOCK_SCENE_RECIPE,
      promptDocument: MOCK_PROMPT_DOCUMENT
    }, 'mock');

    expect(report.overallScore).toBeLessThan(80);
    expect(report.improvementSuggestions.length).toBeGreaterThan(0);
    expect(report.improvementSuggestions[0].suggestion).toBeTruthy();
  });

  it('4. Product mismatch triggers productMatch.passed = false', async () => {
    const inconsistentProduct: ProductAsset = {
      ...MOCK_PRODUCT_ASSET,
      name: 'inconsistent-product'
    };

    const report = await analyzeSceneMatch({
      productAsset: inconsistentProduct,
      sceneImage: MOCK_IMPORTED_IMAGE,
      recipe: MOCK_SCENE_RECIPE,
      promptDocument: MOCK_PROMPT_DOCUMENT
    }, 'mock');

    expect(report.productMatch.passed).toBe(false);
    expect(report.overallScore).toBeLessThan(80);
    expect(report.productMatch.issues.length).toBeGreaterThan(0);
  });

  it('5. Recipe ID mismatch refuses to save', async () => {
    const store = new ProjectStore({
      schemaVersion: '1.0',
      id: 'default-project',
      name: '台历智能场景规划项目',
      status: 'RECIPE_READY',
      productAsset: MOCK_PRODUCT_ASSET,
      productProfile: {
        schemaVersion: '1.0',
        productAssetId: 'prod-123',
        productType: 'desk_calendar',
        bracketType: 'paper_base',
        subjectBounds: { x: 100, y: 150, width: 800, height: 600 },
        contactRegion: { xStart: 200, xEnd: 800, y: 750, confidence: 'high' },
        view: { class: 'front', visibleTop: 'none', visibleSide: 'none', perspectiveStrength: 'medium' },
        materials: [],
        palette: { dominant: ['#FFFFFF'], edgeBrightness: 'light' },
        existingLighting: { direction: 'upper_left', temperature: 'neutral', softness: 'soft', contrast: 'low' },
        uncertainties: [],
        overallConfidence: 'high',
        analyzedAt: new Date().toISOString()
      },
      guidedQuestions: null,
      guidedAnswers: [],
      sceneDirections: null,
      selectedDirectionId: 'dir-nordic',
      sceneRecipes: [MOCK_SCENE_RECIPE],
      recipeVersions: [],
      sceneRecipe: MOCK_SCENE_RECIPE,
      promptDocument: MOCK_PROMPT_DOCUMENT,
      recipeRequestStatus: 'idle',
      recipeError: null,
      activeVersion: 1,
      sceneAsset: null,
      matchReport: null,
      matchRequestStatus: 'idle',
      matchError: null,
      matchRequestId: null,
      seriesProject: null,
      ignoredMatchIssueIds: [],
      importedSceneImages: [MOCK_IMPORTED_IMAGE],
      currentMatchReport: null,
      templateLibrary: [],
      selectedTemplateSuiteId: null,
      selectedTemplateVariantId: null,
      templateInstances: [],
      templateInstance: null,
      canvasDocument: null,
      selectedLayerId: null,
      canvasEditingMode: 'select',
      renderSnapshots: [],
      activeRenderSnapshotId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const report = await analyzeSceneMatch({
      productAsset: MOCK_PRODUCT_ASSET,
      sceneImage: MOCK_IMPORTED_IMAGE,
      recipe: {
        ...MOCK_SCENE_RECIPE,
        recipeId: 'mismatching-recipe-id' // mismatching recipe ID
      },
      promptDocument: MOCK_PROMPT_DOCUMENT
    }, 'mock');

    expect(() => store.setCurrentMatchReport(report)).toThrow('配方 ID 不一致，拒绝保存');
  });
});
