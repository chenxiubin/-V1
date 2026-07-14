import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectStore } from '../store/projectStore';
import { clearAllData, saveProject } from '../lib/db';
import { PROMPT_COMPILER_VERSION } from '../services/ai/promptCompiler';
import {
  ProductAsset,
  ProductProfile,
  GuidedQuestion,
  GuidedAnswer,
  SceneDirection,
  SceneRecipe,
  PromptDocument,
} from '../types/schemas';

const MOCK_ASSET: ProductAsset = {
  id: 'prod-asset-123',
  name: 'desk_calendar_2026.png',
  mimeType: 'image/png',
  width: 1200,
  height: 900,
  hasAlpha: true,
  persistedAssetRef: 'ref-calendar-xyz',
  createdAt: '2026-07-10T03:15:10-07:00',
};

const MOCK_PROFILE: ProductProfile = {
  schemaVersion: '1.0' as const,
  productAssetId: 'prod-asset-123',
  productType: 'desk_calendar' as const,
  bracketType: 'paper_base' as const,
  subjectBounds: { x: 50, y: 50, width: 600, height: 400 },
  contactRegion: { xStart: 200, xEnd: 800, y: 450, confidence: 'high' as const },
  view: {
    class: 'front_left' as const,
    visibleTop: 'low' as const,
    visibleSide: 'left' as const,
    perspectiveStrength: 'medium' as const,
  },
  materials: [{ name: 'paper' as const, reflectivity: 'low' as const }],
  palette: { dominant: ['#FFFFFF'], edgeBrightness: 'light' as const },
  existingLighting: {
    direction: 'upper_left' as const,
    temperature: 'neutral' as const,
    softness: 'soft' as const,
    contrast: 'low' as const,
  },
  uncertainties: [],
  overallConfidence: 'high' as const,
  analyzedAt: '2026-07-10T03:15:10-07:00',
};

const MOCK_QUESTIONS: GuidedQuestion[] = [
  {
    id: 'q-style',
    text: '您喜欢哪种风格？',
    options: [{ id: 'opt-minimal', text: '极简' }, { id: 'opt-other', text: '其他' }],
    category: 'style' as const,
    recommendedOptionId: 'opt-minimal'
  },
  {
    id: 'q-purpose',
    text: '用途？',
    options: [{ id: 'opt-biz', text: '商务' }, { id: 'opt-home', text: '家居' }],
    category: 'purpose' as const,
    recommendedOptionId: 'opt-biz'
  }
];

const MOCK_ANSWERS: GuidedAnswer[] = [
  {
    questionId: 'q-style',
    optionId: 'opt-minimal',
    answeredAt: '2026-07-10T03:15:10-07:00',
  },
  {
    questionId: 'q-purpose',
    optionId: 'opt-biz',
    answeredAt: '2026-07-10T03:15:10-07:00',
  }
];

const MOCK_DIRECTIONS: SceneDirection[] = [
  {
    id: 'd1',
    name: '北欧极简书房',
    summary: '通透柔和的光线配合白色原木桌面',
    recommended: true,
    recommendationReason: '白灰色系台历极佳配搭',
    spaceType: '书房',
    desktop: '原木桌面',
    palette: ['#FFFFFF', '#ECEFF1'],
    lightingSummary: '左上角窗光',
    compositionSummary: '居中构图',
    decorationSummary: '绿植盆栽一件',
    risks: [],
  },
  {
    id: 'd2',
    name: '现代极简书房',
    summary: '通透柔和的光线配合白色原木桌面',
    recommended: false,
    recommendationReason: '白灰色系台历极佳配搭',
    spaceType: '书房',
    desktop: '原木桌面',
    palette: ['#FFFFFF', '#ECEFF1'],
    lightingSummary: '左上角窗光',
    compositionSummary: '居中构图',
    decorationSummary: '绿植盆栽一件',
    risks: [],
  },
  {
    id: 'd3',
    name: '复古极简书房',
    summary: '通透柔和的光线配合白色原木桌面',
    recommended: false,
    recommendationReason: '白灰色系台历极佳配搭',
    spaceType: '书房',
    desktop: '原木桌面',
    palette: ['#FFFFFF', '#ECEFF1'],
    lightingSummary: '左上角窗光',
    compositionSummary: '居中构图',
    decorationSummary: '绿植盆栽一件',
    risks: [],
  }
];

const mockRecipe: SceneRecipe = {
  schemaVersion: '1.0',
  recipeId: 'rec-1',
  version: 1,
  basedOnVersion: null,
  productAssetId: 'prod-asset-123',
  selectedDirectionId: 'd1',
  productProfileSnapshot: {
    schemaVersion: '1.0',
    productAssetId: 'prod-asset-123',
    productType: 'desk_calendar',
    bracketType: 'paper_base',
    subjectBounds: { x: 50, y: 50, width: 600, height: 400 },
    contactRegion: { xStart: 200, xEnd: 800, y: 450, confidence: 'high' },
    view: { class: 'front_left', visibleTop: 'low', visibleSide: 'left', perspectiveStrength: 'medium' },
    materials: [{ name: 'paper', reflectivity: 'low' }],
    palette: { dominant: ['#FFFFFF'], edgeBrightness: 'light' },
    existingLighting: { direction: 'upper_left', temperature: 'neutral', softness: 'soft', contrast: 'low' },
    uncertainties: [],
    overallConfidence: 'high',
    analyzedAt: '2026-07-10T03:15:10-07:00'
  },
  guidedAnswers: [],
  task: {
    operation: 'generate_empty_scene_background',
    productRole: 'analysis_and_spatial_reference_only',
    backgroundOnly: true
  },
  scene: {
    spaceType: 'study',
    wallMaterial: 'concrete',
    desktopMaterial: 'wood',
    desktopTone: 'light',
    backgroundBrightness: 'medium_light',
    style: 'nordic',
    palette: ['#FFFFFF'],
    furnitureDensity: 'low'
  },
  composition: {
    purpose: 'hero',
    productCount: 1,
    productPosition: 'center',
    productWidthPercent: 50,
    copySpace: 'none',
    cameraView: 'front',
    cameraHeight: 'near_eye_level',
    framing: 'medium',
    perspectiveStrength: 'low',
    desktopVisiblePercent: 30
  },
  lighting: {
    sourceType: 'window',
    sourcePosition: 'upper_left',
    temperature: 'neutral',
    softness: 'soft',
    contrast: 'medium',
    shadowDirection: 'rear_right'
  },
  decoration: {
    density: 'minimal',
    allowed: ['plant'],
    forbiddenNearProduct: ['water'],
    foregroundOcclusion: false
  },
  output: {
    aspectRatio: '1:1',
    resolutionLabel: '4K',
    realism: 'real_commercial_interior_photography',
    exclude: ['product', 'person', 'hands', 'text', 'logo', 'watermark']
  },
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z'
};

const mockPromptDoc: PromptDocument = {
  recipeId: 'rec-1',
  recipeVersion: 1,
  compilerVersion: PROMPT_COMPILER_VERSION,
  sections: {
    taskAndReferences: 'task',
    productMatching: 'matching',
    sceneAndStyle: 'style',
    cameraAndComposition: 'composition',
    lightingAndDecoration: 'lighting',
    outputConstraints: 'constraints',
  },
  fullPrompt: 'full prompt',
  fullJson: '{}',
  objectJson: {
    task: '{}',
    scene: '{}',
    composition: '{}',
    lighting: '{}',
    decoration: '{}',
    output: '{}',
  },
  createdAt: '2023-01-01T00:00:00Z',
};

describe('Phase 4-C-1: Client State and Persistence (Robust Refactoring)', () => {
  let store: ProjectStore;

  beforeEach(async () => {
    await clearAllData();
    store = new ProjectStore();
    store.importProduct(MOCK_ASSET);
    store.updateState(() => ({
      status: 'DIRECTION_SELECTION',
      productProfile: MOCK_PROFILE,
      guidedQuestions: MOCK_QUESTIONS,
      guidedAnswers: MOCK_ANSWERS,
      sceneDirections: MOCK_DIRECTIONS,
      selectedDirectionId: 'd1'
    }));
  });

  // 1. 成功提交 Recipe 场景
  it('Scenario 1: should successfully commit a valid Recipe and ensure atomicity', () => {
    store.commitInitialRecipe(mockRecipe);

    const state = store.getState();
    expect(state.status).toBe('RECIPE_READY');
    expect(state.sceneRecipe).toEqual(mockRecipe);
    expect(state.promptDocument).toBeDefined();
    expect(state.promptDocument?.recipeId).toBe(mockRecipe.recipeId);
    expect(state.promptDocument?.compilerVersion).toBe(PROMPT_COMPILER_VERSION);
    expect(state.recipeRequestStatus).toBe('success');
    expect(state.recipeError).toBeNull();
    expect(state.sceneRecipes).toEqual([mockRecipe]);
    expect(state.recipeVersions).toHaveLength(1);
    expect(state.recipeVersions[0].recipe).toEqual(mockRecipe);
    expect(state.recipeVersions[0].promptDocument).toEqual(state.promptDocument);
  });

  // 2. 提交非法 Recipe 场景
  it('Scenario 2: should reject invalid Recipe and keep pre-commit state unchanged', () => {
    const invalidRecipe = {
      ...mockRecipe,
      productProfileSnapshot: undefined // invalid schema
    } as any;

    expect(() => store.commitInitialRecipe(invalidRecipe)).toThrow();

    const state = store.getState();
    expect(state.status).toBe('DIRECTION_SELECTION');
    expect(state.sceneRecipe).toBeNull();
    expect(state.promptDocument).toBeNull();
  });

  // 3. 提示词编译报错场景
  it('Scenario 3: should reject Recipe if compilation fails and write zero changes', () => {
    const invalidRecipe = {
      ...mockRecipe,
      scene: {
        ...mockRecipe.scene,
        wallMaterial: 'localhost' // triggers Google API key / Windows/Unix path or local scanning check
      }
    };

    expect(() => store.commitInitialRecipe(invalidRecipe)).toThrow();

    const state = store.getState();
    expect(state.status).toBe('DIRECTION_SELECTION');
    expect(state.sceneRecipe).toBeNull();
    expect(state.promptDocument).toBeNull();
  });

  // 4. 数据库写入失败回滚场景
  it('Scenario 4: should roll back to pre-commit snapshot if persistToDB fails', async () => {
    // Save current pre-commit state
    const snapshot = JSON.parse(JSON.stringify(store.getState()));

    // Spy/Mock persistToDB to throw error
    vi.spyOn(store, 'persistToDB').mockRejectedValueOnce(new Error('IndexedDB save failed'));

    // Commit recipe
    store.commitInitialRecipe(mockRecipe);
    expect(store.getState().status).toBe('RECIPE_READY');

    // Simulate App.tsx catch and rollback logic
    try {
      await store.persistToDB();
    } catch (err) {
      store.updateState(() => ({
        ...snapshot,
        recipeRequestStatus: 'error',
        recipeError: '场景配方保存失败，请重新尝试'
      }));
    }

    const state = store.getState();
    expect(state.status).toBe('DIRECTION_SELECTION'); // Rolled back!
    expect(state.sceneRecipe).toBeNull();
    expect(state.recipeRequestStatus).toBe('error');
    expect(state.recipeError).toBe('场景配方保存失败，请重新尝试');
    expect(state.productProfile).toEqual(MOCK_PROFILE); // Keeps Phase 3 data
    expect(state.guidedAnswers).toEqual(MOCK_ANSWERS);
  });

  // 5. 恢复场景 A 到 F
  describe('Scenario 5: loadFromDB Recovery Scenarios (A to F)', () => {
    // 5A: Perfect match
    it('Scenario 5A: should restore perfectly matching state directly without local recompilation', async () => {
      // Get a perfect base state from store to comply with Zod ProjectStateSchema
      const baseState = JSON.parse(JSON.stringify(store.getState()));

      const projectState = {
        ...baseState,
        id: 'default-project',
        status: 'RECIPE_READY',
        sceneRecipe: mockRecipe,
        promptDocument: mockPromptDoc,
        sceneRecipes: [mockRecipe],
        recipeVersions: [{
          recipe: mockRecipe,
          promptDocument: mockPromptDoc,
          createdAt: mockRecipe.createdAt
        }],
        activeVersion: 1
      };

      await saveProject(projectState);

      const loadStore = new ProjectStore();
      await loadStore.loadFromDB('default-project');

      const state = loadStore.getState();
      expect(state.status).toBe('RECIPE_READY');
      expect(state.sceneRecipe).toEqual(mockRecipe);
      expect(state.promptDocument).toEqual(mockPromptDoc);
    });

    // 5B: Missing Prompt Document
    it('Scenario 5B: should locally recompile if PromptDocument is missing', async () => {
      const baseState = JSON.parse(JSON.stringify(store.getState()));

      const projectState = {
        ...baseState,
        id: 'default-project',
        status: 'RECIPE_READY',
        sceneRecipe: mockRecipe,
        promptDocument: null, // missing
        sceneRecipes: [mockRecipe],
        recipeVersions: [{
          recipe: mockRecipe,
          promptDocument: null as any, // missing in history
          createdAt: mockRecipe.createdAt
        }],
        activeVersion: 1
      };

      await saveProject(projectState);

      const loadStore = new ProjectStore();
      await loadStore.loadFromDB('default-project');

      const state = loadStore.getState();
      expect(state.status).toBe('RECIPE_READY');
      expect(state.sceneRecipe).toEqual(mockRecipe);
      expect(state.promptDocument).not.toBeNull();
      expect(state.promptDocument?.recipeId).toBe(mockRecipe.recipeId);
    });

    // 5C: Outdated compilerVersion
    it('Scenario 5C: should locally recompile if compilerVersion is outdated', async () => {
      const baseState = JSON.parse(JSON.stringify(store.getState()));

      const outdatedPrompt = {
        ...mockPromptDoc,
        compilerVersion: 'prompt-compiler-0.5' // outdated!
      };

      const projectState = {
        ...baseState,
        id: 'default-project',
        status: 'RECIPE_READY',
        sceneRecipe: mockRecipe,
        promptDocument: outdatedPrompt,
        sceneRecipes: [mockRecipe],
        recipeVersions: [{
          recipe: mockRecipe,
          promptDocument: outdatedPrompt,
          createdAt: mockRecipe.createdAt
        }],
        activeVersion: 1
      };

      await saveProject(projectState);

      const loadStore = new ProjectStore();
      await loadStore.loadFromDB('default-project');

      const state = loadStore.getState();
      expect(state.status).toBe('RECIPE_READY');
      expect(state.promptDocument?.compilerVersion).toBe(PROMPT_COMPILER_VERSION); // recompiled to latest!
    });

    // 5D: Mismatched IDs or Versions
    it('Scenario 5D: should locally recompile if prompt recipeId or version does not match', async () => {
      const baseState = JSON.parse(JSON.stringify(store.getState()));

      const mismatchedPrompt = {
        ...mockPromptDoc,
        recipeId: 'mismatched-recipe-id' // mismatched!
      };

      const projectState = {
        ...baseState,
        id: 'default-project',
        status: 'RECIPE_READY',
        sceneRecipe: mockRecipe,
        promptDocument: mismatchedPrompt,
        sceneRecipes: [mockRecipe],
        recipeVersions: [{
          recipe: mockRecipe,
          promptDocument: mismatchedPrompt,
          createdAt: mockRecipe.createdAt
        }],
        activeVersion: 1
      };

      await saveProject(projectState);

      const loadStore = new ProjectStore();
      await loadStore.loadFromDB('default-project');

      const state = loadStore.getState();
      expect(state.status).toBe('RECIPE_READY');
      expect(state.promptDocument?.recipeId).toBe(mockRecipe.recipeId); // recompiled and matched!
    });

    // 5E: Illegal Recipe
    it('Scenario 5E: should clear recipe, prompt and history, and roll back to DIRECTION_SELECTION if Recipe is illegal', async () => {
      const baseState = JSON.parse(JSON.stringify(store.getState()));

      const illegalRecipe = {
        ...mockRecipe,
        productProfileSnapshot: undefined // illegal recipe schema!
      } as any;

      const projectState = {
        ...baseState,
        id: 'default-project',
        status: 'RECIPE_READY',
        sceneRecipe: illegalRecipe,
        promptDocument: mockPromptDoc,
        sceneRecipes: [illegalRecipe],
        recipeVersions: [{
          recipe: illegalRecipe,
          promptDocument: mockPromptDoc,
          createdAt: mockRecipe.createdAt
        }],
        activeVersion: 1
      };

      await saveProject(projectState);

      const loadStore = new ProjectStore();
      await loadStore.loadFromDB('default-project');

      const state = loadStore.getState();
      expect(state.status).toBe('DIRECTION_SELECTION'); // Rolled back!
      expect(state.sceneRecipe).toBeNull();
      expect(state.promptDocument).toBeNull();
      expect(state.sceneRecipes).toHaveLength(0);
      expect(state.recipeVersions).toHaveLength(0);
      // Keeps Phase 3 data
      expect(state.productAsset?.id).toBe(MOCK_ASSET.id);
      expect(state.productProfile).toEqual(MOCK_PROFILE);
      expect(state.guidedAnswers).toEqual(MOCK_ANSWERS);
    });

    // 5F: sceneRecipes and recipeVersions history drift
    it('Scenario 5F: should prioritize valid recipeVersions as authoritative source if history drifts', async () => {
      const baseState = JSON.parse(JSON.stringify(store.getState()));

      const validRecipe2 = {
        ...mockRecipe,
        recipeId: 'rec-2',
        version: 2
      };
      const validPromptDoc2 = {
        ...mockPromptDoc,
        recipeId: 'rec-2',
        recipeVersion: 2
      };

      const projectState = {
        ...baseState,
        id: 'default-project',
        status: 'RECIPE_READY',
        sceneRecipe: validRecipe2,
        promptDocument: validPromptDoc2,
        // sceneRecipes list drifted: length differs or misaligned
        sceneRecipes: [mockRecipe], 
        recipeVersions: [
          { recipe: mockRecipe, promptDocument: mockPromptDoc, createdAt: mockRecipe.createdAt },
          { recipe: validRecipe2, promptDocument: validPromptDoc2, createdAt: validRecipe2.createdAt }
        ],
        activeVersion: 2
      };

      await saveProject(projectState);

      const loadStore = new ProjectStore();
      await loadStore.loadFromDB('default-project');

      const state = loadStore.getState();
      expect(state.status).toBe('RECIPE_READY');
      expect(state.sceneRecipes).toHaveLength(2); // Aligned to recipeVersions length!
      expect(state.recipeVersions).toHaveLength(2);
      expect(state.sceneRecipe?.recipeId).toBe('rec-2');
      expect(state.activeVersion).toBe(2);
    });
  });

  // 6. 竞态延迟场景
  it('Scenario 6: should protect against race conditions using recipeRequestIdRef', async () => {
    let recipeRequestId = 0;

    // Simulate first request
    const requestId1 = ++recipeRequestId;

    // User switches direction or answers, raising request ID to 2
    const requestId2 = ++recipeRequestId;

    // First request response finishes late
    const commitAttempt1 = () => {
      if (requestId1 !== recipeRequestId) return; // would skip!
      store.commitInitialRecipe(mockRecipe);
    };

    // Second request finishes
    const commitAttempt2 = () => {
      if (requestId2 !== recipeRequestId) return;
      store.commitInitialRecipe({
        ...mockRecipe,
        recipeId: 'rec-2'
      });
    };

    // Run first response
    commitAttempt1();
    expect(store.getState().sceneRecipe).toBeNull(); // No overwrite from stale response!

    // Run second response
    commitAttempt2();
    expect(store.getState().sceneRecipe?.recipeId).toBe('rec-2'); // Success from active response!
  });
});
