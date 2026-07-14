import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectStore } from '../store/projectStore';
import { CanvasDocument, ProductAsset, RenderSnapshot, SceneRecipe, AssetReference, ProductProfile } from '../types/schemas';
import { clearAllData } from '../lib/db';

describe('Phase 7-E-1: RenderSnapshot System Tests', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  const mockProductAsset: ProductAsset = {
    id: 'prod-test-123',
    name: 'test_product.png',
    mimeType: 'image/png',
    width: 400,
    height: 400,
    hasAlpha: true,
    persistedAssetRef: 'https://assets.example.com/product.png',
    createdAt: new Date().toISOString(),
  };

  const mockProductProfile: ProductProfile = {
    schemaVersion: '1.0',
    productAssetId: 'prod-test-123',
    productType: 'desk_calendar',
    bracketType: 'paper_base',
    subjectBounds: { x: 50, y: 50, width: 600, height: 400 },
    contactRegion: { xStart: 200, xEnd: 800, y: 450, confidence: 'high' },
    view: {
      class: 'front_left',
      visibleTop: 'low',
      visibleSide: 'left',
      perspectiveStrength: 'medium',
    },
    materials: [{ name: 'paper', reflectivity: 'low' }],
    palette: { dominant: ['#FFFFFF'], edgeBrightness: 'light' },
    existingLighting: {
      direction: 'upper_left',
      temperature: 'neutral',
      softness: 'soft',
      contrast: 'low',
    },
    uncertainties: [],
    overallConfidence: 'high',
    analyzedAt: new Date().toISOString(),
  };

  const mockSceneRecipe: SceneRecipe = {
    schemaVersion: '1.0',
    recipeId: 'recipe-test-456',
    version: 3,
    productAssetId: 'prod-test-123',
    productProfileSnapshot: mockProductProfile,
    guidedAnswers: [],
    selectedDirectionId: 'dir-nordic',
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
      palette: ['#FFFFFF', '#ECEFF1'],
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

  const mockCanvasDoc: CanvasDocument = {
    width: 800,
    height: 800,
    templateInstanceId: 'inst-test-1',
    version: 2,
    layers: [
      {
        id: 'layer-bg-123',
        type: 'scene_background',
        source: {
          assetId: 'scene-1',
          assetType: 'scene_background',
          sourceType: 'scene_image',
          version: 1,
        },
        transform: { x: 0, y: 0, scale: 1.0, rotate: 0 },
        visible: true,
        locked: true,
        zIndex: 0,
        content: 'AI Background',
      },
      {
        id: 'layer-product-456',
        type: 'product',
        source: {
          assetId: 'prod-1',
          assetType: 'product',
          sourceType: 'product_png',
          version: 1,
        },
        transform: { x: 15, y: 20, scale: 1.2, rotate: 15 },
        visible: true,
        locked: false,
        zIndex: 10,
        content: 'Product Hero',
      },
    ],
  };

  it('1. Create RenderSnapshot successfully under correct states', () => {
    const store = new ProjectStore();
    
    // Set up state
    store.updateState(() => ({
      productAsset: mockProductAsset,
      sceneRecipe: mockSceneRecipe,
      canvasDocument: mockCanvasDoc,
      templateInstance: {
        id: 'inst-test-1',
        suiteId: 'suite-1',
        variantId: 'variant-1',
        variantSnapshot: {
          id: 'variant-1',
          aspectRatio: '1:1',
          canvasSize: { width: 800, height: 800 },
          slots: [],
          previewUrl: '',
        },
        slotValues: [],
        createdAt: new Date().toISOString(),
      },
      selectedTemplateSuiteId: 'suite-1',
    }));

    const snapshot = store.createRenderSnapshot();

    expect(snapshot).toBeDefined();
    expect(snapshot.id).toContain('snapshot-');
    expect(snapshot.projectId).toBe(store.getState().id);
    expect(snapshot.canvasDocumentSnapshot).toEqual(mockCanvasDoc);
    expect(snapshot.recipeId).toBe('recipe-test-456');
    expect(snapshot.recipeVersion).toBe(3);
    expect(snapshot.productAssetId).toBe('prod-test-123');
    expect(snapshot.productAssetVersion).toBe(1);
    expect(snapshot.layerAssetReferences).toHaveLength(2);
    expect(snapshot.layerAssetReferences[0].assetId).toBe('scene-1');
    expect(snapshot.layerAssetReferences[1].assetId).toBe('prod-1');

    // State should have snapshot saved
    const state = store.getState();
    expect(state.renderSnapshots).toHaveLength(1);
    expect(state.renderSnapshots[0].id).toBe(snapshot.id);
    expect(state.activeRenderSnapshotId).toBe(snapshot.id);
  });

  it('2. Deep copy isolation: modifying original canvas document after snapshot creation does not affect snapshot', () => {
    const store = new ProjectStore();
    
    store.updateState(() => ({
      canvasDocument: mockCanvasDoc,
    }));

    const snapshot = store.createRenderSnapshot();

    // Modify original canvas layers in store
    store.updateLayerTransform('layer-product-456', { x: 99, y: 99 });

    // Original has changed
    expect(store.getState().canvasDocument?.layers[1].transform.x).toBe(99);

    // Snapshot remains untouched
    expect(snapshot.canvasDocumentSnapshot.layers[1].transform.x).toBe(15);
  });

  it('3. Asset version binding: all Layer AssetReferences are preserved', () => {
    const store = new ProjectStore();
    
    store.updateState(() => ({
      canvasDocument: mockCanvasDoc,
    }));

    const snapshot = store.createRenderSnapshot();

    expect(snapshot.layerAssetReferences).toHaveLength(2);
    expect(snapshot.layerAssetReferences[0]).toEqual({
      assetId: 'scene-1',
      assetType: 'scene_background',
      sourceType: 'scene_image',
      version: 1,
    });
  });

  it('4. Illegal state forbidden creation (e.g. canvasDocument is null)', () => {
    const store = new ProjectStore();
    
    // Explicitly nullify canvasDocument
    store.updateState(() => ({
      canvasDocument: null,
    }));

    expect(() => {
      store.createRenderSnapshot();
    }).toThrow('当前画布文档 (canvasDocument) 为空');
  });

  it('5. Refresh recovery: serialized renderSnapshots and activeRenderSnapshotId are preserved on load', () => {
    const store = new ProjectStore();
    
    store.updateState(() => ({
      canvasDocument: mockCanvasDoc,
    }));

    const snapshot = store.createRenderSnapshot();
    const stateWithSnapshot = store.getState();

    // Reload state into a new store constructor
    const restoredStore = new ProjectStore(stateWithSnapshot);
    const restoredState = restoredStore.getState();

    expect(restoredState.renderSnapshots).toHaveLength(1);
    expect(restoredState.activeRenderSnapshotId).toBe(snapshot.id);
    expect(restoredState.renderSnapshots[0].canvasDocumentSnapshot).toEqual(mockCanvasDoc);
  });
});
