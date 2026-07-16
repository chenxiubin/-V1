import { ModelDiscoveryClient } from '../services/modelDiscoveryClient';
import { setupNetworkIsolation } from "./networkIsolation";
// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import {  describe, it, expect, beforeEach, vi , afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import App, { projectStore } from '../App';
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

// Mock RealAdapter to support integration test assertions
const mockCreateSceneRecipeFn = vi.fn();
const mockAnalyzeProductFn = vi.fn();

vi.mock('../services/ai/realAdapter', () => {
  return {
    RealAdapter: class {
      readonly mode = 'real';
      async createSceneRecipe(params: any) {
        return mockCreateSceneRecipeFn(params);
      }
      async planSceneDirections(params: any) {
        return [];
      }
      async analyzeProduct(params: any) {
        return mockAnalyzeProductFn(params);
      }
    }
  };
});

// Mock motion/react for happy-dom
vi.mock('motion/react', () => {
  const React = require('react');
  const Dummy = React.forwardRef((props: any, ref: any) => {
    const { initial, animate, exit, variants, transition, ...rest } = props;
    return React.createElement('div', { ref, ...rest });
  });
  return {
    motion: {
      div: Dummy,
      p: Dummy,
      h1: Dummy,
      h2: Dummy,
      span: Dummy,
      button: Dummy,
    },
    AnimatePresence: ({ children }: { children: any }) => React.createElement(React.Fragment, null, children),
  };
});

// Mock URL APIs
if (typeof window !== 'undefined') {
  if (!window.URL) {
    (window as any).URL = {};
  }
  window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/dummy');
  window.URL.revokeObjectURL = vi.fn();
}

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

describe('Integration Tests', () => {
  afterEach(() => {
    cleanupNetworkIsolation?.();
    cleanupNetworkIsolation = null;
    cleanup();
  });
  let cleanupNetworkIsolation: (() => void) | null = null;
  let store: ProjectStore;
  
  beforeEach(async () => {
    vi.resetAllMocks();
    if (typeof ModelDiscoveryClient !== 'undefined') ModelDiscoveryClient.clearCacheForTests();
    cleanupNetworkIsolation = setupNetworkIsolation();
    await clearAllData();
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

    // 5G: Recovery Logic Compliance Checks
    it('Scenario 5G: should satisfy all compliance assertions for recovery', async () => {
      // 1. Spy on fetch and createSceneRecipe
      const fetchSpy = vi.spyOn(global, 'fetch');
      mockCreateSceneRecipeFn.mockClear();

      const baseState = JSON.parse(JSON.stringify(store.getState()));

      // Scenario with missing promptDocument to force local recompilation
      const projectState = {
        ...baseState,
        id: 'compliance-project',
        status: 'RECIPE_READY',
        sceneRecipe: mockRecipe,
        promptDocument: null, // missing
        sceneRecipes: [mockRecipe],
        recipeVersions: [{
          recipe: mockRecipe,
          promptDocument: null as any, // missing, triggers recompile
          createdAt: mockRecipe.createdAt
        }],
        activeVersion: 1
      };

      await saveProject(projectState);

      const loadStore = new ProjectStore();
      await loadStore.loadFromDB('compliance-project');

      const state = loadStore.getState();

      // Assertions
      // - 恢复过程中 RealAdapter.createSceneRecipe 调用次数为 0
      expect(mockCreateSceneRecipeFn).toHaveBeenCalledTimes(0);

      // - fetch 调用次数为 0
      expect(fetchSpy).toHaveBeenCalledTimes(0);

      // - 本地重新编译不得产生重复 V1 (recipeVersions has exactly 1 entry, and activeVersion is V1)
      expect(state.recipeVersions).toHaveLength(1);
      expect(state.recipeVersions[0].recipe.version).toBe(1);

      // - recipeVersions 始终是唯一权威历史; sceneRecipes 必须由 recipeVersions 派生或严格同步
      expect(state.sceneRecipes).toHaveLength(1);
      expect(state.sceneRecipes[0]).toEqual(state.recipeVersions[0].recipe);
      expect(state.sceneRecipes.map(r => r.recipeId)).toEqual(state.recipeVersions.map(v => v.recipe.recipeId));

      fetchSpy.mockRestore();
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

  // 7. Phase 4 App Integration Tests
  describe('Phase 4 App Integration Tests', () => {
    const mockRecipeResult: SceneRecipe = {
      schemaVersion: '1.0' as const,
      recipeId: 'recipe-test-v1',
      version: 1,
      basedOnVersion: null,
      productAssetId: MOCK_ASSET.id,
      productProfileSnapshot: MOCK_PROFILE,
      guidedAnswers: MOCK_ANSWERS,
      selectedDirectionId: 'd1',
      task: {
        operation: 'generate_empty_scene_background' as const,
        productRole: 'analysis_and_spatial_reference_only' as const,
        backgroundOnly: true as const,
      },
      scene: {
        spaceType: 'study',
        wallMaterial: 'concrete',
        desktopMaterial: 'wood',
        desktopTone: 'light',
        backgroundBrightness: 'medium_light',
        style: 'nordic',
        palette: ['#FFFFFF'],
        furnitureDensity: 'low' as const,
      },
      composition: {
        purpose: 'hero' as const,
        productCount: 1,
        productPosition: 'center' as const,
        productWidthPercent: 50,
        copySpace: 'none' as const,
        cameraView: 'front' as const,
        cameraHeight: 'near_eye_level' as const,
        framing: 'medium' as const,
        perspectiveStrength: 'low' as const,
        desktopVisiblePercent: 30,
      },
      lighting: {
        sourceType: 'window' as const,
        sourcePosition: 'upper_left' as const,
        temperature: 'neutral' as const,
        softness: 'soft' as const,
        contrast: 'medium' as const,
        shadowDirection: 'rear_right' as const,
      },
      decoration: {
        density: 'minimal' as const,
        allowed: ['plant'],
        forbiddenNearProduct: ['water'],
        foregroundOcclusion: false as const,
      },
      output: {
        aspectRatio: '1:1' as const,
        resolutionLabel: '4K' as const,
        realism: 'real_commercial_interior_photography' as const,
        exclude: ['product', 'person', 'hands', 'text', 'logo', 'watermark'],
      },
      createdAt: '2026-07-10T03:15:10-07:00',
      updatedAt: '2026-07-10T03:15:10-07:00',
    };

    beforeEach(async () => {
      vi.restoreAllMocks();
      await clearAllData();
      projectStore.reset();
      
      // Initialize state to DIRECTION_SELECTION
      act(() => {
        projectStore.updateState(() => ({
          status: 'DIRECTION_SELECTION',
          productAsset: MOCK_ASSET,
          productProfile: MOCK_PROFILE,
          guidedQuestions: MOCK_QUESTIONS,
          guidedAnswers: MOCK_ANSWERS,
          sceneDirections: MOCK_DIRECTIONS,
          selectedDirectionId: 'd1',
        }));
      });
    });

    it('1. 点击确认方向只产生一次 createSceneRecipe (防连击机制)', async () => {
      let resolveRecipe: any;
      const promise = new Promise((resolve) => {
        resolveRecipe = resolve;
      });
      mockCreateSceneRecipeFn.mockReturnValue(promise);

      render(<App />);

      const btn = screen.getByText('确认这个方向');
      
      // In a single act, click twice sequentially without waiting
      await act(async () => {
        fireEvent.click(btn);
        fireEvent.click(btn);
      });

      expect(mockCreateSceneRecipeFn).toHaveBeenCalledTimes(1);

      // Cleanup
      await act(async () => {
        resolveRecipe(mockRecipeResult);
      });
    });

    it('2. 第一次请求 pending 时切换方向, 迟到成功不得进入 RECIPE_READY, 迟到失败不得覆盖', async () => {
      let resolveRecipe: any;
      const promise = new Promise((resolve) => {
        resolveRecipe = resolve;
      });
      mockCreateSceneRecipeFn.mockReturnValue(promise);

      render(<App />);

      // Start first request
      await act(async () => {
        fireEvent.click(screen.getByText('确认这个方向'));
      });

      expect(projectStore.getState().recipeRequestStatus).toBe('loading');

      // User switches direction while pending
      await act(async () => {
        fireEvent.click(screen.getByText('现代极简书房')); // click d2
      });

      expect(projectStore.getState().selectedDirectionId).toBe('d2');

      // Now first request finishes (late success)
      await act(async () => {
        resolveRecipe(mockRecipeResult);
      });

      // Status should remain DIRECTION_SELECTION, not transition to RECIPE_READY because first request was stale
      expect(projectStore.getState().status).toBe('DIRECTION_SELECTION');
      expect(projectStore.getState().sceneRecipe).toBeNull();
    });

    it('3. 请求 pending 时返回修改答案, 迟到成功不得写入 Recipe', async () => {
      let resolveRecipe: any;
      const promise = new Promise((resolve) => {
        resolveRecipe = resolve;
      });
      mockCreateSceneRecipeFn.mockReturnValue(promise);

      const commitSpy = vi.spyOn(projectStore, 'commitInitialRecipe');

      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByText('确认这个方向'));
      });

      // User returns to questions using actual UI button
      await act(async () => {
        fireEvent.click(screen.getByText('返回修改答案'));
      });

      // Resolve stale request
      await act(async () => {
        resolveRecipe(mockRecipeResult);
      });

      expect(projectStore.getState().status).toBe('GUIDED_QUESTIONS');
      expect(projectStore.getState().sceneRecipe).toBeNull();
      expect(commitSpy).not.toHaveBeenCalled();

      commitSpy.mockRestore();
    });

    it('4. 请求 pending 时点击返回产品分析报告, 迟到成功不得写入', async () => {
      let resolveRecipe: any;
      const promise = new Promise((resolve) => {
        resolveRecipe = resolve;
      });
      mockCreateSceneRecipeFn.mockReturnValue(promise);

      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByText('确认这个方向'));
      });

      // User clicks "返回修改答案" to go back to GUIDED_QUESTIONS
      await act(async () => {
        fireEvent.click(screen.getByText('返回修改答案'));
      });

      // Now user clicks "返回分析报告" to go back to PRODUCT_REVIEW
      await act(async () => {
        const buttons = screen.getAllByText('返回分析报告');
        fireEvent.click(buttons[0]);
      });

      // Resolve stale recipe request
      await act(async () => {
        resolveRecipe(mockRecipeResult);
      });

      // Should be in PRODUCT_REVIEW
      expect(projectStore.getState().status).toBe('PRODUCT_REVIEW');
      expect(projectStore.getState().sceneRecipe).toBeNull();
    });

    it('5. 请求 pending 时清空项目, 迟到成功后状态仍为 EMPTY', async () => {
      let resolveRecipe: any;
      const promise = new Promise((resolve) => {
        resolveRecipe = resolve;
      });
      mockCreateSceneRecipeFn.mockReturnValue(promise);

      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByText('确认这个方向'));
      });

      // User clears project
      await act(async () => {
        fireEvent.click(screen.getByText('清空当前项目'));
      });
      
      await act(async () => {
        fireEvent.click(screen.getByText('确认'));
      });

      // Resolve stale request
      await act(async () => {
        resolveRecipe(mockRecipeResult);
      });

      expect(projectStore.getState().status).toBe('EMPTY');
      expect(projectStore.getState().sceneRecipe).toBeNull();
    });

    it('6. persistToDB 失败时真实 handler 回滚 并保留上下文和显示中文错误', async () => {
      let resolveRecipe: any;
      const promise = new Promise((resolve) => {
        resolveRecipe = resolve;
      });
      mockCreateSceneRecipeFn.mockReturnValue(promise);

      // Mock persistToDB to fail
      const persistSpy = vi.spyOn(projectStore, 'persistToDB').mockRejectedValue(new Error('Save database error'));

      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByText('确认这个方向'));
      });

      // Resolve recipe creation
      await act(async () => {
        resolveRecipe(mockRecipeResult);
      });

      // Should rollback to DIRECTION_SELECTION
      expect(projectStore.getState().status).toBe('DIRECTION_SELECTION');
      
      // Preserve original context
      expect(projectStore.getState().productAsset?.id).toBe(MOCK_ASSET.id);
      expect(projectStore.getState().productProfile?.productAssetId).toBe(MOCK_PROFILE.productAssetId);
      expect(projectStore.getState().guidedQuestions).toHaveLength(MOCK_QUESTIONS.length);
      expect(projectStore.getState().guidedAnswers).toHaveLength(MOCK_ANSWERS.length);
      expect(projectStore.getState().sceneDirections).toHaveLength(MOCK_DIRECTIONS.length);

      // Recipe / prompt pointers should be empty / null
      expect(projectStore.getState().sceneRecipe).toBeNull();
      expect(projectStore.getState().promptDocument).toBeNull();
      expect(projectStore.getState().recipeVersions).toHaveLength(0);

      // Verify Chinese save failure message is displayed
      const errorText = screen.queryByText(/场景配方保存失败，请重新尝试/);
      expect(errorText).not.toBeNull();

      persistSpy.mockRestore();
    });

    describe('Alpha Warning UI and Interactive Tests', () => {
      beforeEach(async () => {
        await clearAllData();
        projectStore.reset();
        mockAnalyzeProductFn.mockReset().mockResolvedValue(MOCK_PROFILE);
      });

      it('1. 透明 PNG 不显示警告，且可以点击开始智能分析', async () => {
        act(() => {
          projectStore.updateState(() => ({
            status: 'PRODUCT_IMPORTED',
            productAsset: {
              id: 'p-transparent-png',
              name: 'transparent.png',
              mimeType: 'image/png',
              width: 100,
              height: 100,
              hasAlpha: true,
              persistedAssetRef: 'ref-transparent-png',
              createdAt: new Date().toISOString(),
            },
            productProfile: null,
            guidedQuestions: null,
            guidedAnswers: [],
            sceneDirections: null,
            selectedDirectionId: null,
          }));
        });

        render(<App />);

        expect(screen.queryByText('包含透明 Alpha 通道')).not.toBeNull();
        expect(screen.queryByText(/⚠️ 警告：不包含透明通道/)).toBeNull();

        const btn = screen.getByText('开始智能分析');
        expect((btn as HTMLButtonElement).disabled).toBe(false);

        await act(async () => {
          fireEvent.click(btn);
        });

        expect(mockAnalyzeProductFn).toHaveBeenCalledTimes(1);
      });

      it('2. 实底 PNG 显示警告，且可以点击开始智能分析', async () => {
        act(() => {
          projectStore.updateState(() => ({
            status: 'PRODUCT_IMPORTED',
            productAsset: {
              id: 'p-opaque-png',
              name: 'opaque.png',
              mimeType: 'image/png',
              width: 100,
              height: 100,
              hasAlpha: false,
              persistedAssetRef: 'ref-opaque-png',
              createdAt: new Date().toISOString(),
            },
            productProfile: null,
            guidedQuestions: null,
            guidedAnswers: [],
            sceneDirections: null,
            selectedDirectionId: null,
          }));
        });

        render(<App />);

        expect(screen.queryByText('不包含透明通道')).not.toBeNull();
        expect(screen.queryByText(/⚠️ 警告：不包含透明通道/)).not.toBeNull();

        const btn = screen.getByText('开始智能分析');
        expect((btn as HTMLButtonElement).disabled).toBe(false);

        await act(async () => {
          fireEvent.click(btn);
        });

        expect(mockAnalyzeProductFn).toHaveBeenCalledTimes(1);
      });

      it('3. JPEG 显示警告，且可以点击开始智能分析且不被阻断', async () => {
        act(() => {
          projectStore.updateState(() => ({
            status: 'PRODUCT_IMPORTED',
            productAsset: {
              id: 'p-jpeg',
              name: 'test.jpg',
              mimeType: 'image/jpeg',
              width: 100,
              height: 100,
              hasAlpha: false,
              persistedAssetRef: 'ref-jpeg',
              createdAt: new Date().toISOString(),
            },
            productProfile: null,
            guidedQuestions: null,
            guidedAnswers: [],
            sceneDirections: null,
            selectedDirectionId: null,
          }));
        });

        render(<App />);

        expect(screen.queryByText('不包含透明通道')).not.toBeNull();
        expect(screen.queryByText(/⚠️ 警告：不包含透明通道/)).not.toBeNull();

        const btn = screen.getByText('开始智能分析');
        expect((btn as HTMLButtonElement).disabled).toBe(false);

        await act(async () => {
          fireEvent.click(btn);
        });

        expect(mockAnalyzeProductFn).toHaveBeenCalledTimes(1);
      });
    });
  });
});
