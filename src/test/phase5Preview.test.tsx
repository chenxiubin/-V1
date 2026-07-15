import { describe, it, expect } from 'vitest';
import { ProjectStore } from '../store/projectStore';
import { ProjectState } from '../types/schemas';

describe('Phase 5-A-2: Preview', () => {
  const validRecipe = {
    schemaVersion: '1.0',
    recipeId: 'r1',
    version: 1,
    productAssetId: 'p1',
    productProfileSnapshot: { schemaVersion: '1.0', productAssetId: 'p1', productType: 'unknown', bracketType: 'unknown', subjectBounds: {x:0,y:0,width:1,height:1}, contactRegion: {xStart:0,xEnd:1,y:0,confidence:'high'}, view: {class:'front',visibleTop:'none',visibleSide:'none',perspectiveStrength:'low'}, materials: [], palette: {dominant:[],edgeBrightness:'mid'}, existingLighting: {direction:'front',temperature:'neutral',softness:'soft',contrast:'low'}, uncertainties: [], overallConfidence: 'high', analyzedAt: '' },
    guidedAnswers: [],
    selectedDirectionId: 'd1',
    task: {operation: 'generate_empty_scene_background', productRole: 'analysis_and_spatial_reference_only', backgroundOnly: true},
    scene: {spaceType: 'room', wallMaterial: 'paint', desktopMaterial: 'wood', desktopTone: 'light', backgroundBrightness: 'medium', style: 'minimal', palette: [], furnitureDensity: 'low'},
    composition: {purpose: 'hero', productCount: 1, productPosition: 'center', productWidthPercent: 50, copySpace: 'none', cameraView: 'front', cameraHeight: 'low', framing: 'medium', perspectiveStrength: 'low', desktopVisiblePercent: 100},
    lighting: {sourceType: 'window', sourcePosition: 'front', temperature: 'neutral', softness: 'soft', contrast: 'low', shadowDirection: 'soft_diffuse'},
    decoration: {density: 'minimal', allowed: [], forbiddenNearProduct: [], foregroundOcclusion: false},
    output: {aspectRatio: '1:1', resolutionLabel: '1K', realism: 'real_commercial_interior_photography', exclude: []},
    createdAt: new Date().toISOString(),
    updatedAt: ''
  } as any;

  const validProduct = {id: 'p1', name: 'p1', mimeType: 'image/png', width: 100, height: 100, hasAlpha: false, persistedAssetRef: 'ref1', createdAt: new Date().toISOString()} as any;
  const validProfile = { schemaVersion: '1.0', productAssetId: 'p1', productType: 'unknown', bracketType: 'unknown', subjectBounds: {x:0,y:0,width:1,height:1}, contactRegion: {xStart:0,xEnd:1,y:0,confidence:'high'}, view: {class:'front',visibleTop:'none',visibleSide:'none',perspectiveStrength:'low'}, materials: [], palette: {dominant:[],edgeBrightness:'mid'}, existingLighting: {direction:'front',temperature:'neutral',softness:'soft',contrast:'low'}, uncertainties: [], overallConfidence: 'high', analyzedAt: '' } as any;
  const validScene = {id: 'a1', productAssetId: 'p1', recipeId: 'r1', recipeVersion: 1, size: 100, contentHash: 'h', name: 's1', mimeType: 'image/png', width: 100, height: 100, persistedAssetRef: 'ref2', createdAt: new Date().toISOString()} as any;

  it('should transition to PREVIEW_IMPORTED on scene import', () => {
    const store = new ProjectStore();
    store.updateState(() => ({ 
        status: 'AWAITING_EXTERNAL_GENERATION', 
        sceneRecipe: validRecipe,
        sceneRecipes: [validRecipe],
        productAsset: validProduct,
        productProfile: validProfile,
        activeVersion: 1
    } as any));
    
    store.importSceneAsset(validScene);
    expect(store.getState().status).toBe('PREVIEW_IMPORTED');
    expect(store.getState().sceneAsset).toEqual(validScene);
  });
});
