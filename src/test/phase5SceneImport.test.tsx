import { describe, it, expect, vi } from 'vitest';
import { ProjectStore } from '../store/projectStore';
import { ProjectState } from '../types/schemas';

describe('Phase 5-A-1: Scene Import', () => {
  it('should transition to AWAITING_EXTERNAL_GENERATION from RECIPE_READY', () => {
    const store = new ProjectStore();
    // Simulate setup up to RECIPE_READY
    store.updateState(() => ({ 
        status: 'RECIPE_READY', 
        sceneRecipes: [{
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
        }], 
        activeVersion: 1, 
        productAsset: {id: 'p1', name: 'p1', mimeType: 'image/png', width: 100, height: 100, hasAlpha: false, persistedAssetRef: '', createdAt: new Date().toISOString()}, 
        productProfile: {schemaVersion: '1.0', productAssetId: 'p1', productType: 'unknown', bracketType: 'unknown', subjectBounds: {x:0,y:0,width:1,height:1}, contactRegion: {xStart:0,xEnd:1,y:0,confidence:'high'}, view: {class:'front',visibleTop:'none',visibleSide:'none',perspectiveStrength:'low'}, materials: [], palette: {dominant:[],edgeBrightness:'mid'}, existingLighting: {direction:'front',temperature:'neutral',softness:'soft',contrast:'low'}, uncertainties: [], overallConfidence: 'high', analyzedAt: '' } 
    } as any));
    
    store.goToExternalGeneration();
    expect(store.getState().status).toBe('AWAITING_EXTERNAL_GENERATION');
  });

  it('should persist scene asset on import', () => {
    const store = new ProjectStore();
    // Simulate valid RECIPE_READY state
    store.updateState(() => ({ 
        status: 'RECIPE_READY', 
        sceneRecipes: [{
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
        }], 
        activeVersion: 1, 
        productAsset: {id: 'p1', name: 'p1', mimeType: 'image/png', width: 100, height: 100, hasAlpha: false, persistedAssetRef: '', createdAt: new Date().toISOString()}, 
        productProfile: {schemaVersion: '1.0', productAssetId: 'p1', productType: 'unknown', bracketType: 'unknown', subjectBounds: {x:0,y:0,width:1,height:1}, contactRegion: {xStart:0,xEnd:1,y:0,confidence:'high'}, view: {class:'front',visibleTop:'none',visibleSide:'none',perspectiveStrength:'low'}, materials: [], palette: {dominant:[],edgeBrightness:'mid'}, existingLighting: {direction:'front',temperature:'neutral',softness:'soft',contrast:'low'}, uncertainties: [], overallConfidence: 'high', analyzedAt: '' } 
    } as any));

    store.goToExternalGeneration();
    
    const mockAsset = {
        id: 'a1', productAssetId: 'p1', recipeId: 'r1', recipeVersion: 1, size: 100, contentHash: 'h',
        name: 'test.png',
        mimeType: 'image/png',
        width: 100,
        height: 100,
        persistedAssetRef: 'data:image/png;base64,mock',
        createdAt: new Date().toISOString()
    } as any;
    
    store.importSceneAsset(mockAsset);
    expect(store.getState().sceneAsset).toEqual(mockAsset);
    expect(store.getState().status).toBe('PREVIEW_IMPORTED');
  });

  it('should clear scene asset on product replacement', () => {
    const store = new ProjectStore();
    // Simulate valid AWAITING_EXTERNAL_GENERATION state
    store.updateState(() => ({ 
        status: 'AWAITING_EXTERNAL_GENERATION', 
        sceneRecipes: [{
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
        }], 
        activeVersion: 1, 
        productAsset: {id: 'p1', name: 'p1', mimeType: 'image/png', width: 100, height: 100, hasAlpha: false, persistedAssetRef: '', createdAt: new Date().toISOString()}, 
        productProfile: {schemaVersion: '1.0', productAssetId: 'p1', productType: 'unknown', bracketType: 'unknown', subjectBounds: {x:0,y:0,width:1,height:1}, contactRegion: {xStart:0,xEnd:1,y:0,confidence:'high'}, view: {class:'front',visibleTop:'none',visibleSide:'none',perspectiveStrength:'low'}, materials: [], palette: {dominant:[],edgeBrightness:'mid'}, existingLighting: {direction:'front',temperature:'neutral',softness:'soft',contrast:'low'}, uncertainties: [], overallConfidence: 'high', analyzedAt: '' },
        sceneAsset: { 
            id: 'a1', productAssetId: 'p1', recipeId: 'r1', recipeVersion: 1, size: 100, contentHash: 'h', 
            name: 'test.png',
            mimeType: 'image/png',
            width: 100,
            height: 100,
            persistedAssetRef: 'data:image/png;base64,mock',
            createdAt: new Date().toISOString()
        } 
    } as any));
    
    store.importProduct({ id: 'p2', name: 'p2', mimeType: 'image/png', width: 100, height: 100, hasAlpha: false, persistedAssetRef: '', createdAt: new Date().toISOString() });
    expect(store.getState().sceneAsset).toBeNull();
  });
});
