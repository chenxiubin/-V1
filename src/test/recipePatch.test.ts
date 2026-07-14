import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectStore } from '../store/projectStore';
import { SceneRecipe, MatchReport, RecipePatchOperation } from '../types/schemas';

const MOCK_RECIPE: any = {
  schemaVersion: '1.0',
  recipeId: 'test-recipe',
  version: 1,
  productAssetId: 'prod1',
  productProfileSnapshot: { 
      schemaVersion: '1.0', 
      productAssetId: 'prod1',
      productType: 'desk_calendar',
      bracketType: 'paper_base',
      subjectBounds: { x: 0, y: 0, width: 100, height: 100 },
      contactRegion: { xStart: 0, xEnd: 100, y: 50, confidence: 'high' },
      view: { class: 'front', visibleTop: 'none', visibleSide: 'none', perspectiveStrength: 'low' },
      materials: [],
      palette: { dominant: [], edgeBrightness: 'dark' },
      existingLighting: { direction: 'front', temperature: 'neutral', softness: 'medium', contrast: 'medium' },
      uncertainties: [],
      overallConfidence: 'high',
      analyzedAt: new Date().toISOString()
  },
  guidedAnswers: [],
  selectedDirectionId: 'dir1',
  task: { operation: 'generate_empty_scene_background', productRole: 'analysis_and_spatial_reference_only', backgroundOnly: true },
  scene: { spaceType: 'office', wallMaterial: 'wood', desktopMaterial: 'wood', desktopTone: 'light', backgroundBrightness: 'medium', style: 'minimalist', palette: [], furnitureDensity: 'low' },
  composition: { purpose: 'hero', productCount: 1, productPosition: 'center', productWidthPercent: 50, copySpace: 'none', cameraView: 'front', cameraHeight: 'near_eye_level', framing: 'medium', perspectiveStrength: 'medium', desktopVisiblePercent: 50 },
  lighting: { sourceType: 'window', sourcePosition: 'front', temperature: 'neutral', softness: 'medium', contrast: 'medium', shadowDirection: 'soft_diffuse' },
  decoration: { density: 'minimal', allowed: [], forbiddenNearProduct: [], foregroundOcclusion: false },
  output: { aspectRatio: '1:1', resolutionLabel: '1K', realism: 'real_commercial_interior_photography', exclude: [] },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('RecipePatch tests', () => {
  let store: ProjectStore;

  beforeEach(() => {
    store = new ProjectStore();
    const asset: any = {
      id: 'prod1',
      name: 'calendar.png',
      mimeType: 'image/png',
      width: 100,
      height: 100,
      hasAlpha: true,
      persistedAssetRef: 'ref1',
      createdAt: new Date().toISOString()
    };
    store.importProduct(asset);
    store.setProductProfile(MOCK_RECIPE.productProfileSnapshot);
    store.createInitialRecipe(MOCK_RECIPE);
  });

  it('1. 未确认时不能应用 Patch (缺少 confirmed)', () => {
    const report: MatchReport = {
        id: 'rep1',
        recipeVersion: 1,
        productSceneStatus: 'needs_adjustment',
        issues: [{
            id: 'issue1',
            type: 'perspective',
            severity: 'medium',
            confidence: 'high',
            evidence: '...',
            description: '...',
            suggestedPatch: [{ op: 'replace', path: '/scene/spaceType', value: 'home', reason: 'improve' }]
        }],
        strengths: [],
        analyzedAt: new Date().toISOString()
    };
    store.setMatchReport(report);
    
    // Missing confirmed entirely
    expect(() => store.applyConfirmedRecipePatch({ issueIds: ['issue1'] })).toThrow('缺少确认参数 (confirmed)');
    
    // Status must remain unchanged
    const state = store.getState();
    expect(state.activeVersion).toBe(1);
    expect(state.sceneRecipe?.scene.spaceType).toBe('office');
  });

  it('2. confirmed=false 时拒绝', () => {
    const report: MatchReport = {
        id: 'rep1',
        recipeVersion: 1,
        productSceneStatus: 'needs_adjustment',
        issues: [{
            id: 'issue1',
            type: 'perspective',
            severity: 'medium',
            confidence: 'high',
            evidence: '...',
            description: '...',
            suggestedPatch: [{ op: 'replace', path: '/scene/spaceType', value: 'home', reason: 'improve' }]
        }],
        strengths: [],
        analyzedAt: new Date().toISOString()
    };
    store.setMatchReport(report);
    
    // confirmed set to false
    expect(() => store.applyConfirmedRecipePatch({ issueIds: ['issue1'], confirmed: false })).toThrow('未确认应用 Patch (confirmed 必须为 true)');
    
    // Status must remain unchanged
    const state = store.getState();
    expect(state.activeVersion).toBe(1);
    expect(state.sceneRecipe?.scene.spaceType).toBe('office');
  });

  it('8. 合法单项 Patch 创建 V2 (confirmed=true)', () => {
    const report: MatchReport = {
        id: 'rep1',
        recipeVersion: 1,
        productSceneStatus: 'needs_adjustment',
        issues: [{
            id: 'issue1',
            type: 'perspective',
            severity: 'medium',
            confidence: 'high',
            evidence: '...',
            description: '...',
            suggestedPatch: [{ op: 'replace', path: '/scene/spaceType', value: 'home', reason: 'improve' }]
        }],
        strengths: [],
        analyzedAt: new Date().toISOString()
    };
    store.setMatchReport(report);
    store.applyConfirmedRecipePatch({ issueIds: ['issue1'], confirmed: true });
    
    const state = store.getState();
    expect(state.activeVersion).toBe(2);
    expect(state.sceneRecipe?.version).toBe(2);
    expect(state.sceneRecipe?.scene.spaceType).toBe('home');
  });

  it('4. 非白名单路径被拒绝', () => {
    const report: MatchReport = {
        id: 'rep1',
        recipeVersion: 1,
        productSceneStatus: 'needs_adjustment',
        issues: [{
            id: 'issue1',
            type: 'perspective',
            severity: 'medium',
            confidence: 'high',
            evidence: '...',
            description: '...',
            suggestedPatch: [{ op: 'replace', path: '/output/aspectRatio', value: '16:9', reason: 'improve' }]
        }],
        strengths: [],
        analyzedAt: new Date().toISOString()
    };
    store.setMatchReport(report);
    expect(() => store.applyConfirmedRecipePatch({ issueIds: ['issue1'], confirmed: true })).toThrow();
  });
});
