import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectStore } from '../store/projectStore';
import { clearAllData, saveProject } from '../lib/db';
import {
  ProductAsset,
  ProductProfile,
  GuidedQuestion,
  GuidedAnswer,
  SceneDirection,
  SceneRecipe,
  MatchReport,
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

const MOCK_PROMPT_DOCUMENT: PromptDocument = {
  recipeId: 'rec-1',
  recipeVersion: 1,
  compilerVersion: '1.0',
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

describe('Phase 4-C-1: Client State and Persistence', () => {
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

  it('should initialize with correct default recipe state', () => {
    const state = store.getState();
    expect(state.sceneRecipe).toBeNull();
    expect(state.promptDocument).toBeNull();
    expect(state.recipeRequestStatus).toBe('idle');
    expect(state.recipeError).toBeNull();
  });

  it('should allow setting recipe state manually (simulating successful fetch)', () => {


    store.updateState(() => ({
      sceneRecipe: mockRecipe,
      status: 'RECIPE_READY',
      recipeRequestStatus: 'success',
      sceneRecipes: [mockRecipe],
      recipeVersions: [{
        recipe: mockRecipe,
        promptDocument: MOCK_PROMPT_DOCUMENT,
        createdAt: mockRecipe.createdAt
      }],
      activeVersion: 1
    }));

    const updatedState = store.getState();
    expect(updatedState.status).toBe('RECIPE_READY');
    expect(updatedState.sceneRecipe?.recipeId).toBe('rec-1');
    expect(updatedState.recipeRequestStatus).toBe('success');
  });

  it('should persist and load recipe state successfully', async () => {
    store.updateState(() => ({
      sceneRecipe: mockRecipe,
      sceneRecipes: [mockRecipe],
      recipeVersions: [{
        recipe: mockRecipe,
        promptDocument: MOCK_PROMPT_DOCUMENT,
        createdAt: mockRecipe.createdAt
      }],
      activeVersion: 1,
      recipeRequestStatus: 'success',
      status: 'RECIPE_READY'
    }));

    await store.persistToDB();

    const newStore = new ProjectStore();
    await newStore.loadFromDB('default-project');
    const loadedState = newStore.getState();

    expect(loadedState.status).toBe('RECIPE_READY');
    expect(loadedState.sceneRecipe?.recipeId).toBe('rec-1');
  });
});
