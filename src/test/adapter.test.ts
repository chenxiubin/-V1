import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../lib/db';
import { createAdapter } from '../services/ai/adapterFactory';
import { MockAdapter } from '../services/ai/mockAdapter';
import { RealAdapter, NotImplementedError } from '../services/ai/realAdapter';
import {
  ProductProfileSchema,
  GuidedQuestionSchema, SceneDirection,
  SceneDirectionSchema,
  SceneRecipeSchema,
  MatchReportSchema,
  RecipePatchOperationSchema,
  ProductAsset,
  ProductProfile,
  GuidedAnswer,
  SceneRecipe,
  SeriesProject
} from '../types/schemas';

// ==========================================
// Test Mock Inputs
// ==========================================

const TEST_PRODUCT_ASSET: ProductAsset = {
  id: 'test-asset-id',
  name: 'test_calendar.png',
  mimeType: 'image/png',
  width: 1024,
  height: 1024,
  hasAlpha: true,
  persistedAssetRef: 'ref-test-xyz',
  createdAt: new Date().toISOString(),
};

const TEST_PRODUCT_PROFILE: ProductProfile = {
  schemaVersion: '1.0',
  productAssetId: 'test-asset-id',
  productType: 'desk_calendar',
  bracketType: 'paper_base',
  subjectBounds: { x: 10, y: 10, width: 200, height: 200 },
  contactRegion: { xStart: 20, xEnd: 180, y: 190, confidence: 'high' },
  view: {
    class: 'front',
    visibleTop: 'none',
    visibleSide: 'none',
    perspectiveStrength: 'low',
  },
  materials: [{ name: 'paper', reflectivity: 'low' }],
  palette: { dominant: ['#FAFAFA'], edgeBrightness: 'light' },
  existingLighting: {
    direction: 'front',
    temperature: 'neutral',
    softness: 'soft',
    contrast: 'low',
  },
  uncertainties: [],
  overallConfidence: 'high',
  analyzedAt: new Date().toISOString(),
};


const TEST_SCENE_DIRECTION: SceneDirection = {
  id: 'dir-mock-nordic',
  name: '北欧暖阳书房',
  summary: '柔和视窗斜射光配合浅橡木桌面。',
  recommended: true,
  recommendationReason: '与淡色底座及纸质本色视觉高度契合。',
  spaceType: '书房',
  desktop: '浅橡木桌面',
  palette: ['#F5F5F7', '#E5E5EA'],
  lightingSummary: '左侧窗户斜光。',
  compositionSummary: '三分法产品偏右。',
  decorationSummary: '背景摆放一盆多肉。',
  risks: ['浅色桌面可能反光较强。']
};

const TEST_GUIDED_ANSWER: GuidedAnswer = {
  questionId: 'q-series-purpose',
  optionId: 'opt-editorial',
  answeredAt: new Date().toISOString(),
};

const TEST_RECIPE: SceneRecipe = {
  schemaVersion: '1.0',
  recipeId: 'test-recipe-id',
  version: 1,
  productAssetId: 'test-asset-id',
  productProfileSnapshot: TEST_PRODUCT_PROFILE,
  guidedAnswers: [TEST_GUIDED_ANSWER],
  selectedDirectionId: 'dir-mock-nordic',
  task: {
    operation: 'generate_empty_scene_background',
    productRole: 'analysis_and_spatial_reference_only',
    backgroundOnly: true,
  },
  scene: {
    spaceType: 'study',
    wallMaterial: 'concrete',
    desktopMaterial: 'wood',
    desktopTone: 'light oak',
    backgroundBrightness: 'medium_light',
    style: 'nordic minimalist',
    palette: ['#F5F5F7', '#E5E5EA'],
    furnitureDensity: 'low',
  },
  composition: {
    purpose: 'hero',
    productCount: 1,
    productPosition: 'center',
    productWidthPercent: 50,
    copySpace: 'none',
    cameraView: 'front_left',
    cameraHeight: 'near_eye_level',
    framing: 'medium',
    perspectiveStrength: 'low',
    desktopVisiblePercent: 30,
  },
  lighting: {
    sourceType: 'window',
    sourcePosition: 'upper_left',
    temperature: 'neutral',
    softness: 'soft',
    contrast: 'low',
    shadowDirection: 'rear_right',
  },
  decoration: {
    density: 'minimal',
    allowed: ['small succulent'],
    forbiddenNearProduct: [],
    foregroundOcclusion: false,
  },
  output: {
    aspectRatio: '1:1',
    resolutionLabel: '2K',
    realism: 'real_commercial_interior_photography',
    exclude: [],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const TEST_SERIES_PROJECT: SeriesProject = {
  id: 'series-test-999',
  name: '测试台历系列',
  version: 1,
  mode: 'same_style',
  masterShotId: 'recipe-mock-1',
  masterReferenceImageRef: 'ref-scene-master',
  styleLock: {
    palette: ['#F5F5F7'],
    materialLanguage: ['wood'],
    photographyStyle: 'nordic minimalist',
    whiteBalance: 'neutral',
    contrast: 'low',
    depthOfField: 'medium',
    decorationLanguage: 'minimalist',
  },
  sceneGroups: [],
  shotIds: ['recipe-mock-1'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ==========================================
// Adapter Test Suite
// ==========================================

describe('SceneIntelligenceAdapter Integration & Verification Tests (Phase 1-C)', () => {
  beforeEach(() => {
    // Intercept/Spy on global fetch to ensure zero network activity
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
  });

  describe('Factory Instantiation Constraints', () => {
    it('should create MockAdapter explicitly with "mock" mode', () => {
      const adapter = createAdapter('mock');
      expect(adapter).toBeInstanceOf(MockAdapter);
      expect(adapter.mode).toBe('mock');
    });

    it('should create RealAdapter explicitly with "real" mode', () => {
      const adapter = createAdapter('real');
      expect(adapter).toBeInstanceOf(RealAdapter);
      expect(adapter.mode).toBe('real');
    });

    it('should completely reject any invalid or unsupported modes', () => {
      expect(() => createAdapter('invalid' as any)).toThrow('未知的 Adapter 模式');
    });
  });

  describe('MockAdapter Zero-Network Deterministic Contract Execution', () => {
    const adapter = createAdapter('mock');

    it('should correctly analyze product asset, returning a valid ProductProfile and calling no fetch APIs', async () => {
      const profile = await adapter.analyzeProduct({ productAsset: TEST_PRODUCT_ASSET });
      
      // Zero-Network assertion
      expect(globalThis.fetch).not.toHaveBeenCalled();
      
      // Correct validation structure
      const parsed = ProductProfileSchema.safeParse(profile);
      expect(parsed.success).toBe(true);
      expect(profile.productAssetId).toBe(TEST_PRODUCT_ASSET.id);
    });

    it('should generate guided questions matching the contract guidelines', async () => {
      const questions = await adapter.generateGuidedQuestions({ productProfile: TEST_PRODUCT_PROFILE });
      
      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(questions.length).toBeGreaterThan(0);
      
      questions.forEach((q) => {
        expect(GuidedQuestionSchema.safeParse(q).success).toBe(true);
      });
    });

    it('should propose scene directions adhering to space layout contracts without "完美匹配" terminology', async () => {
      const directions = await adapter.planSceneDirections({
        productProfile: TEST_PRODUCT_PROFILE,
        guidedAnswers: [TEST_GUIDED_ANSWER],
      });

      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(directions.length).toBeGreaterThan(0);

      directions.forEach((d) => {
        expect(SceneDirectionSchema.safeParse(d).success).toBe(true);
        // Ensure no "完美匹配" terminology
        expect(d.summary).not.toContain('完美匹配');
        expect(d.recommendationReason).not.toContain('完美匹配');
      });
    });

    it('should create a SceneRecipe recipe snapshot correctly', async () => {
      const recipe = await adapter.createSceneRecipe({
        productAssetId: TEST_PRODUCT_PROFILE.productAssetId,
        productProfileSnapshot: TEST_PRODUCT_PROFILE,
        guidedQuestions: [],
        guidedAnswers: [TEST_GUIDED_ANSWER],
        sceneDirections: [TEST_SCENE_DIRECTION],
        selectedDirectionId: 'dir-mock-nordic',
      });

      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(SceneRecipeSchema.safeParse(recipe).success).toBe(true);
      expect(recipe.productAssetId).toBe(TEST_PRODUCT_PROFILE.productAssetId);
    });

    it('should analyze real physical matching alignment, emitting pass state cleanly and with zero subjective fluff', async () => {
      const report = await adapter.analyzeMatch({
        productProfile: TEST_PRODUCT_PROFILE,
        sceneAsset: {
          id: 'test-scene-asset-id',
          name: 'generated_bg_test.jpg',
          mimeType: 'image/jpeg',
          width: 1024,
          height: 1024,
productAssetId: 'prod-1', recipeId: 'rec-1', recipeVersion: 1, size: 1024, contentHash: 'hash',
          persistedAssetRef: 'ref-scene-xyz',
          createdAt: new Date().toISOString(),
        },
        sceneRecipe: TEST_RECIPE,
        productAsset: TEST_PRODUCT_ASSET,
        overlayPreviewRef: 'test-overlay-ref',
      promptDocument: { fullPrompt: 'test', sections: {}, objectJson: {} } as any,
      });

      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(MatchReportSchema.safeParse(report).success).toBe(true);
      expect(report.recipeVersion).toBe(TEST_RECIPE.version);
      expect(report.productSceneStatus).toBe('pass');

      // Verify no "完美匹配" in strengths
      report.strengths.forEach((strength) => {
        expect(strength).not.toContain('完美匹配');
      });
    });

    it('should propose local safe recipe patches matching schema limits', async () => {
      const patches = await adapter.proposeRecipePatch({
        sceneRecipe: TEST_RECIPE,
        matchReport: {
          id: 'report-test-id',
          recipeVersion: 1,
          productSceneStatus: 'needs_adjustment',
          issues: [],
          strengths: [],
          analyzedAt: new Date().toISOString(),
        },
      });

      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(patches.length).toBeGreaterThan(0);
      patches.forEach((p) => {
        expect(RecipePatchOperationSchema.safeParse(p).success).toBe(true);
      });
    });

    it('should generate next shot plan for styling lock continuity in same-style mode', async () => {
      const nextPlan = await adapter.planNextSeriesShot({
        seriesProject: TEST_SERIES_PROJECT,
        activeRecipe: TEST_RECIPE,
      });

      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(nextPlan.nextShotId).toBeDefined();
      expect(nextPlan.reasoning).toBeDefined();

      // Recommended recipe should validate against SceneRecipe Zod contract
      const recipeParsed = SceneRecipeSchema.safeParse(nextPlan.recommendedRecipe);
      expect(recipeParsed.success).toBe(true);
    });
  });

  describe('RealAdapter NotImplemented Guard Constraints', () => {
    const adapter = createAdapter('real');

    it('should have correct "real" mode declared on instance', () => {
      expect(adapter.mode).toBe('real');
    });

    it('should call fetch on /api/ai/guided-questions and return valid questions when generateGuidedQuestions is called', async () => {
      const mockQuestions = [
        {
          id: 'q-1',
          text: '您期望的拍摄风格是什么？',
          options: [
            { id: 'opt-minimal', text: '极简北欧风', recommendationReason: '与您的纸质底座非常契合' },
            { id: 'opt-dark', text: '暗黑商务风' }
          ],
          recommendedOptionId: 'opt-minimal',
          category: 'style'
        }
      ];

      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockQuestions
      });

      const result = await adapter.generateGuidedQuestions({ productProfile: TEST_PRODUCT_PROFILE });
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/ai/guided-questions', expect.any(Object));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('q-1');
    });

    it('should call fetch on /api/ai/scene-directions and return valid directions when planSceneDirections is called', async () => {
      const mockDirections = [
        {
          id: 'dir-nordic',
          name: '北欧暖阳书房',
          summary: '柔和视窗斜射光配合浅橡木桌面。',
          recommended: true,
          recommendationReason: '与淡色底座及纸质本色视觉高度契合。',
          spaceType: '书房',
          desktop: '浅橡木桌面',
          palette: ['#F5F5F7', '#E5E5EA'],
          lightingSummary: '左侧窗户斜光。',
          compositionSummary: '三分法产品偏右。',
          decorationSummary: '背景摆放一盆多肉。',
          risks: ['浅色桌面可能反光较强。']
        }
      ];

      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockDirections
      });

      const result = await adapter.planSceneDirections({
        productProfile: TEST_PRODUCT_PROFILE,
        guidedAnswers: [TEST_GUIDED_ANSWER],
      });

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/ai/scene-directions', expect.any(Object));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('dir-nordic');
    });

    

    it('should successfully analyze match and validate with schema', async () => {
      const mockReport = {
        id: 'r-1',
        recipeVersion: 1,
        productSceneStatus: 'pass',
        issues: [],
        strengths: ['匹配度高'],
        analyzedAt: new Date().toISOString()
      };

      const blob = new Blob(['test'], { type: 'image/png' });
      vi.spyOn(db, 'getAsset').mockResolvedValue(blob);

      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockReport
      });

      const result = await adapter.analyzeMatch({
        productProfile: TEST_PRODUCT_PROFILE,
        sceneAsset: {
          id: 'test-scene-asset-id',
          name: 'generated_bg_test.jpg',
          mimeType: 'image/jpeg',
          width: 1024,
          height: 1024,
productAssetId: 'prod-1', recipeId: 'rec-1', recipeVersion: 1, size: 1024, contentHash: 'hash',
          persistedAssetRef: 'ref-scene-xyz',
          createdAt: new Date().toISOString(),
        },
        sceneRecipe: TEST_RECIPE,
        productAsset: TEST_PRODUCT_ASSET,
        overlayPreviewRef: 'test-overlay-ref',
      promptDocument: { fullPrompt: 'test', sections: {}, objectJson: {} } as any,
      });

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/ai/analyze-match', expect.any(Object));
      expect(result.id).toBe('r-1');
    });

    it('should throw error when server returns invalid schema', async () => {
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'data' })
      });

      await expect(adapter.analyzeMatch({
        productProfile: TEST_PRODUCT_PROFILE,
        sceneAsset: {
          id: 'test-scene-asset-id',
          name: 'generated_bg_test.jpg',
          mimeType: 'image/jpeg',
          width: 1024,
          height: 1024,
productAssetId: 'prod-1', recipeId: 'rec-1', recipeVersion: 1, size: 1024, contentHash: 'hash',
          persistedAssetRef: 'ref-scene-xyz',
          createdAt: new Date().toISOString(),
        },
        sceneRecipe: TEST_RECIPE,
        productAsset: TEST_PRODUCT_ASSET,
        overlayPreviewRef: 'test-overlay-ref',
      promptDocument: { fullPrompt: 'test', sections: {}, objectJson: {} } as any,
      })).rejects.toThrow('服务端匹配分析数据校验失败');
    });

    it('should fail with NotImplementedError when proposeRecipePatch is called', async () => {
      await expect(adapter.proposeRecipePatch({
        sceneRecipe: TEST_RECIPE,
        matchReport: {
          id: 'report-test-id',
          recipeVersion: 1,
          productSceneStatus: 'needs_adjustment',
          issues: [],
          strengths: [],
          analyzedAt: new Date().toISOString(),
        },
      })).rejects.toThrowError(NotImplementedError);

      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('should fail with NotImplementedError when planNextSeriesShot is called', async () => {
      await expect(adapter.planNextSeriesShot({
        seriesProject: TEST_SERIES_PROJECT,
        activeRecipe: TEST_RECIPE,
      })).rejects.toThrowError(NotImplementedError);

      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });
});
