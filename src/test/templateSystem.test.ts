import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectStore } from '../store/projectStore';
import { MOCK_TEMPLATES } from '../data/mockTemplates';

describe('ProjectStore Template System (Phase 7-B)', () => {
  let store: ProjectStore;

  const mockProfile = { 
    schemaVersion: '1.0' as const,
    productAssetId: 'p1', 
    productType: 'desk_calendar' as const, 
    bracketType: 'paper_base' as const, 
    view: {
      class: 'front' as const,
      visibleTop: 'medium' as const,
      visibleSide: 'none' as const,
      perspectiveStrength: 'medium' as const,
      confidence: 'high' as const,
      reason: 'test'
    },
    materials: [], 
    palette: {
      dominant: [],
      edgeBrightness: 'mid' as const,
      confidence: 'high' as const,
      reason: 'test'
    },
    existingLighting: {
      direction: 'front' as const,
      temperature: 'neutral' as const,
      softness: 'medium' as const,
      contrast: 'medium' as const,
      confidence: 'high' as const,
      reason: 'test'
    },
    subjectBounds: { x: 0, y: 0, width: 100, height: 100 },
    contactRegion: { xStart: 0, xEnd: 100, y: 100, confidence: 'high' as const },
    uncertainties: [],
    overallConfidence: 'high' as const, 
    analyzedAt: new Date().toISOString()
  };

  const mockRecipe = {
    schemaVersion: '1.0' as const,
    recipeId: 'r1',
    version: 1,
    productAssetId: 'p1',
    productProfileSnapshot: mockProfile,
    guidedAnswers: [],
    selectedDirectionId: 'dir-nordic',
    task: {
      operation: 'generate_empty_scene_background' as const,
      productRole: 'analysis_and_spatial_reference_only' as const,
      backgroundOnly: true as const
    },
    scene: {
      spaceType: 'study',
      wallMaterial: 'concrete',
      desktopMaterial: 'wood',
      desktopTone: 'light oak',
      backgroundBrightness: 'medium_light' as const,
      style: 'nordic minimalist',
      palette: ['#FFFFFF', '#ECEFF1'],
      furnitureDensity: 'low' as const
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
      perspectiveStrength: 'medium' as const,
      desktopVisiblePercent: 30
    },
    lighting: {
      sourceType: 'window' as const,
      sourcePosition: 'front' as const,
      temperature: 'neutral' as const,
      softness: 'medium' as const,
      contrast: 'medium' as const,
      shadowDirection: 'soft_diffuse' as const
    },
    decoration: {
      density: 'minimal' as const,
      allowed: [],
      forbiddenNearProduct: [],
      foregroundOcclusion: false as const
    },
    output: {
      aspectRatio: '1:1' as const,
      resolutionLabel: '2K' as const,
      realism: 'real_commercial_interior_photography' as const,
      exclude: []
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    store = new ProjectStore();
    // Setup a basic state that allows entering template selection
    store.updateState(() => ({
      status: 'APPROVED',
      productAsset: { 
        id: 'p1', 
        name: 'p1.png', 
        mimeType: 'image/png', 
        width: 800, 
        height: 800, 
        hasAlpha: true, 
        persistedAssetRef: 'ref', 
        createdAt: new Date().toISOString() 
      },
      productProfile: mockProfile,
      sceneRecipes: [mockRecipe],
      sceneRecipe: mockRecipe,
      activeVersion: 1,
      sceneAsset: {
        id: 's1',
        name: 'scene.png',
        mimeType: 'image/png' as const,
        width: 1024,
        height: 1024,
        persistedAssetRef: 'ref',
        createdAt: new Date().toISOString()
      },
      matchReport: {
        id: 'm1',
        recipeVersion: 1,
        productSceneStatus: 'pass' as const,
        issues: [],
        strengths: [],
        analyzedAt: new Date().toISOString()
      }
    }));
  });

  it('should initialize template library', () => {
    store.setTemplateLibrary(MOCK_TEMPLATES);
    expect(store.getState().templateLibrary).toHaveLength(MOCK_TEMPLATES.length);
  });

  it('should transition to TEMPLATE_SELECTION', () => {
    store.setTemplateLibrary(MOCK_TEMPLATES);
    store.goToTemplateSelection();
    expect(store.getState().status).toBe('TEMPLATE_SELECTION');
    // Should auto-select first suite and variant
    expect(store.getState().selectedTemplateSuiteId).toBe(MOCK_TEMPLATES[0].id);
    expect(store.getState().selectedTemplateVariantId).toBe(MOCK_TEMPLATES[0].variants[0].id);
  });

  it('should allow selecting suite and variant', () => {
    store.setTemplateLibrary(MOCK_TEMPLATES);
    store.goToTemplateSelection();
    
    const secondSuiteId = MOCK_TEMPLATES[1].id;
    store.selectTemplateSuite(secondSuiteId);
    expect(store.getState().selectedTemplateSuiteId).toBe(secondSuiteId);
    // Should auto-select first variant of new suite
    expect(store.getState().selectedTemplateVariantId).toBe(MOCK_TEMPLATES[1].variants[0].id);
  });

  it('should generate TemplateInstance on confirmation', () => {
    store.setTemplateLibrary(MOCK_TEMPLATES);
    store.goToTemplateSelection();
    
    store.confirmTemplateSelection();
    
    const state = store.getState();
    expect(state.status).toBe('PRODUCTION_READY');
    expect(state.templateInstance).toBeDefined();
    expect(state.templateInstance?.suiteId).toBe(MOCK_TEMPLATES[0].id);
    expect(state.templateInstance?.templateName).toBe(MOCK_TEMPLATES[0].name);
    expect(state.templateInstance?.slots).toHaveLength(MOCK_TEMPLATES[0].variants[0].slots.length);
    // Verify it's a snapshot (id is prefixed)
    expect(state.templateInstance?.id).toMatch(/^inst-/);
  });

  it('should auto-generate CanvasDocument with correct properties and layers', () => {
    store.setTemplateLibrary(MOCK_TEMPLATES);
    store.goToTemplateSelection();
    
    store.confirmTemplateSelection();
    
    const state = store.getState();
    const canvasDoc = state.canvasDocument;
    
    expect(canvasDoc).toBeDefined();
    expect(canvasDoc).not.toBeNull();
    expect(canvasDoc?.width).toBe(MOCK_TEMPLATES[0].variants[0].canvasSize.width);
    expect(canvasDoc?.height).toBe(MOCK_TEMPLATES[0].variants[0].canvasSize.height);
    expect(canvasDoc?.templateInstanceId).toBe(state.templateInstance?.id);
    expect(canvasDoc?.version).toBe(1);
    
    // Check if slots are converted to layers
    const expectedSlotsCount = MOCK_TEMPLATES[0].variants[0].slots.length;
    expect(canvasDoc?.layers).toHaveLength(expectedSlotsCount);
  });

  it('should map Slot types and fields to CanvasLayer and AssetReference correctly', () => {
    store.setTemplateLibrary(MOCK_TEMPLATES);
    store.goToTemplateSelection();
    store.confirmTemplateSelection();
    
    const state = store.getState();
    const canvasDoc = state.canvasDocument;
    
    // Find layers of different types
    const productLayer = canvasDoc?.layers.find(l => l.type === 'product');
    const bgLayer = canvasDoc?.layers.find(l => l.type === 'scene_background');
    const logoLayer = canvasDoc?.layers.find(l => l.type === 'logo');
    
    if (productLayer) {
      expect(productLayer.source).toBeDefined();
      expect(productLayer.source?.sourceType).toBe('product_png');
      expect(productLayer.source?.assetType).toBe('product');
      expect(productLayer.locked).toBe(false);
      expect(productLayer.visible).toBe(true);
    }
    
    if (bgLayer) {
      expect(bgLayer.source).toBeDefined();
      expect(bgLayer.source?.sourceType).toBe('scene_image');
      expect(bgLayer.source?.assetType).toBe('scene_background');
      expect(bgLayer.locked).toBe(true); // Background starts locked
    }
    
    if (logoLayer) {
      expect(logoLayer.source).toBeDefined();
      expect(logoLayer.source?.sourceType).toBe('template_element');
      expect(logoLayer.locked).toBe(false);
    }
  });

  it('should maintain correct layer order sorted by zIndex ascending', () => {
    store.setTemplateLibrary(MOCK_TEMPLATES);
    store.goToTemplateSelection();
    store.confirmTemplateSelection();
    
    const canvasDoc = store.getState().canvasDocument;
    const layers = canvasDoc?.layers || [];
    
    for (let i = 0; i < layers.length - 1; i++) {
      expect(layers[i].zIndex).toBeLessThanOrEqual(layers[i + 1].zIndex);
    }
  });

  it('should safely recover from corrupt canvas document data in store constructor', () => {
    const corruptState: any = {
      schemaVersion: '1.0' as const,
      id: 'test-project',
      name: 'Test Project',
      status: 'PRODUCTION_READY' as const,
      productAsset: null,
      productProfile: null,
      guidedQuestions: null,
      guidedAnswers: [],
      sceneDirections: null,
      selectedDirectionId: null,
      sceneRecipes: [],
      recipeVersions: [],
      sceneRecipe: null,
      promptDocument: null,
      recipeRequestStatus: 'idle' as const,
      recipeError: null,
      activeVersion: null,
      sceneAsset: null,
      matchReport: null,
      matchRequestStatus: 'idle' as const,
      matchError: null,
      matchRequestId: null,
      seriesProject: null,
      ignoredMatchIssueIds: [],
      templateLibrary: [],
      selectedTemplateSuiteId: null,
      selectedTemplateVariantId: null,
      templateInstances: [],
      templateInstance: null,
      // Corrupt canvas document missing required width/height properties
      canvasDocument: {
        templateInstanceId: 'some-id',
        layers: [],
        version: 'corrupt-version-string-should-be-number' as any
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const corruptStore = new ProjectStore(corruptState);
    // Should fallback to canvasDocument = null due to failed validation
    expect(corruptStore.getState().canvasDocument).toBeNull();
  });

  it('should allow returning to template selection from production ready', () => {
    store.setTemplateLibrary(MOCK_TEMPLATES);
    store.goToTemplateSelection();
    store.confirmTemplateSelection();
    expect(store.getState().status).toBe('PRODUCTION_READY');
    
    store.goToTemplateSelection();
    expect(store.getState().status).toBe('TEMPLATE_SELECTION');
  });
});
