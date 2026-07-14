// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductionWorkspace } from '../components/ProductionWorkspace';
import { CanvasDocument, ProjectState, RenderSnapshot } from '../types/schemas';

describe('Phase 7-D-3: ProductionWorkspace integration tests', () => {
  const mockCanvasDoc: CanvasDocument = {
    width: 800,
    height: 800,
    templateInstanceId: 'inst-test-1',
    version: 1,
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

  const mockState = {
    schemaVersion: '1.0',
    id: 'test-project-123',
    name: 'Test Calendar App',
    status: 'PRODUCTION_READY',
    recipeVersions: [],
    sceneRecipes: [],
    activeVersion: 1,
    templateLibrary: [],
    selectedTemplateSuiteId: 'suite-1',
    selectedTemplateVariantId: 'var-1',
    templateInstances: [],
    templateInstance: {
      id: 'inst-test-1',
      suiteId: 'suite-1',
      variantId: 'var-1',
      templateName: 'Mock Premium Template',
      createdAt: new Date().toISOString(),
      variantSnapshot: {
        id: 'var-1',
        aspectRatio: '1:1',
        canvasSize: { width: 800, height: 800 },
        slots: [],
        previewUrl: '',
      },
      slotValues: [],
    },
    canvasDocument: mockCanvasDoc,
    selectedLayerId: null,
    canvasEditingMode: 'select',
    renderSnapshots: [],
    activeRenderSnapshotId: null,
    productAsset: {
      id: 'prod-1',
      name: 'product_alpha.png',
      mimeType: 'image/png',
      width: 400,
      height: 400,
      hasAlpha: true,
      persistedAssetRef: 'https://assets.example.com/product.png',
      createdAt: new Date().toISOString(),
    },
    sceneAsset: {
      id: 'scene-1',
      name: 'scene_background.jpg',
      mimeType: 'image/jpeg',
      width: 800,
      height: 800,
      persistedAssetRef: 'https://assets.example.com/scene.jpg',
      createdAt: new Date().toISOString(),
      recipeId: 'recipe-abc',
      recipeVersion: 1,
    },
    sceneRecipe: {
      version: 1,
    } as any,
    promptDocument: null,
    guidedQuestions: null,
    guidedAnswers: [],
    selectedDirectionId: null,
    productProfile: null,
    sceneDirections: null,
    matchReport: null,
    seriesProject: null,
    ignoredMatchIssueIds: [],
  } as any as ProjectState;

  it('1. Renders the ProductionWorkspace and its panels correctly', () => {
    const onSelectLayer = vi.fn();
    const onSetEditingMode = vi.fn();
    const onUpdateLayerTransform = vi.fn();
    const onToggleLayerVisibility = vi.fn();
    const onToggleLayerLock = vi.fn();
    const onCreateRenderSnapshot = vi.fn();
    const onBackToTemplateSelection = vi.fn();

    render(
      <ProductionWorkspace
        state={mockState}
        onSelectLayer={onSelectLayer}
        onSetEditingMode={onSetEditingMode}
        onUpdateLayerTransform={onUpdateLayerTransform}
        onToggleLayerVisibility={onToggleLayerVisibility}
        onToggleLayerLock={onToggleLayerLock}
        onCreateRenderSnapshot={onCreateRenderSnapshot}
        onBackToTemplateSelection={onBackToTemplateSelection}
      />
    );

    // Header assertions
    expect(screen.getByText('生产工作台')).not.toBeNull();
    expect(screen.getByText(/test-project-123/)).not.toBeNull();
    expect(screen.getByText('Mock Premium Template')).not.toBeNull();

    // Left Panel assertions
    expect(screen.getByText('product_alpha.png')).not.toBeNull();
    expect(screen.getByText('400x400 px')).not.toBeNull();

    // Layer List assertions
    expect(screen.getByText('智能场景背景')).not.toBeNull();
    expect(screen.getAllByText('产品主体图')[0]).not.toBeNull();

    // Canvas Interaction Editor assertion
    expect(screen.getByAltText('Scene Background')).not.toBeNull();
    expect(screen.getAllByAltText('Product')[0]).not.toBeNull();
  });

  it('2. Shows inspector values when a layer is selected and handles range manipulation', () => {
    const onUpdateLayerTransform = vi.fn();
    const stateWithSelection: ProjectState = {
      ...mockState,
      selectedLayerId: 'layer-product-456',
    };

    render(
      <ProductionWorkspace
        state={stateWithSelection}
        onSelectLayer={vi.fn()}
        onSetEditingMode={vi.fn()}
        onUpdateLayerTransform={onUpdateLayerTransform}
        onToggleLayerVisibility={vi.fn()}
        onToggleLayerLock={vi.fn()}
        onCreateRenderSnapshot={vi.fn()}
        onBackToTemplateSelection={vi.fn()}
      />
    );

    // Inspector panel is visible
    expect(screen.getByText('图层属性审查 (Inspector)')).not.toBeNull();
    expect(screen.getAllByText('产品主体图')[0]).not.toBeNull();

    // Verify current transform sliders are present
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBe(5); // X, Y, Scale, Rotate, Opacity

    // Trigger update transform on X slider
    fireEvent.change(sliders[0], { target: { value: '30' } });
    expect(onUpdateLayerTransform).toHaveBeenCalledWith('layer-product-456', { x: 30 });
  });

  it('3. Trigger create snapshot, saves history snapshot, and launches readonly visual previewer', () => {
    const testSnapshot: RenderSnapshot = {
      id: 'snapshot-123',
      projectId: 'test-project-123',
      canvasDocumentSnapshot: mockCanvasDoc,
      templateInstanceSnapshot: mockState.templateInstance!,
      templateInstanceId: 'inst-test-1',
      templateInstanceVersion: 1,
      templateSuiteId: 'suite-1',
      templateSuiteVersion: 1,
      sceneRecipeId: 'recipe-abc',
      sceneRecipeVersion: 1,
      recipeId: 'recipe-abc',
      recipeVersion: 1,
      productAssetId: 'prod-1',
      productAssetVersion: 1,
      layerAssetReferences: [],
      createdAt: new Date().toISOString(),
    };

    const onCreateRenderSnapshot = vi.fn().mockReturnValue(testSnapshot);

    const stateWithSnapshots: ProjectState = {
      ...mockState,
      renderSnapshots: [testSnapshot],
    };

    const { rerender } = render(
      <ProductionWorkspace
        state={mockState} // Initially no snapshots
        onSelectLayer={vi.fn()}
        onSetEditingMode={vi.fn()}
        onUpdateLayerTransform={vi.fn()}
        onToggleLayerVisibility={vi.fn()}
        onToggleLayerLock={vi.fn()}
        onCreateRenderSnapshot={onCreateRenderSnapshot}
        onBackToTemplateSelection={vi.fn()}
      />
    );

    // Expect empty snapshot message
    expect(screen.getByText(/尚未生成任何生产渲染快照/)).not.toBeNull();

    // Click "Create Snapshot"
    const createBtn = screen.getByText('生成渲染快照 (Snapshot)');
    fireEvent.click(createBtn);
    expect(onCreateRenderSnapshot).toHaveBeenCalled();

    // Rerender with the created snapshot state
    rerender(
      <ProductionWorkspace
        state={stateWithSnapshots}
        onSelectLayer={vi.fn()}
        onSetEditingMode={vi.fn()}
        onUpdateLayerTransform={vi.fn()}
        onToggleLayerVisibility={vi.fn()}
        onToggleLayerLock={vi.fn()}
        onCreateRenderSnapshot={onCreateRenderSnapshot}
        onBackToTemplateSelection={vi.fn()}
      />
    );

    // Expect snapshot card to exist now
    expect(screen.getByText('独立静态渲染')).not.toBeNull();

    // Snapshot card trigger opens snapshot modal overlay
    const cardElement = screen.getByText('独立静态渲染');
    fireEvent.click(cardElement);

    // Expect modal overlay visual titles
    expect(screen.getByText('冻结只读静态快照审查器')).not.toBeNull();
    expect(screen.getByText('关闭审查')).not.toBeNull();
  });
});
