// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CanvasInteractionEditor } from '../components/CanvasInteractionEditor';
import { ProjectStore } from '../store/projectStore';
import { CanvasDocument, ProductAsset, ProjectState } from '../types/schemas';

describe('Phase 7-D-2: CanvasInteractionEditor Tests', () => {
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
        locked: true, // background is locked by default
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
      {
        id: 'layer-title-789',
        type: 'text',
        source: {
          assetId: 'title-slot',
          assetType: 'title',
          sourceType: 'template_element',
          version: 1,
        },
        transform: { x: 10, y: 5, scale: 1.0, rotate: -5 },
        visible: true,
        locked: false,
        zIndex: 20,
        content: 'Summer Sale!',
      },
    ],
  };

  const mockProductAsset: ProductAsset = {
    id: 'prod-1',
    name: 'test_product.png',
    mimeType: 'image/png',
    width: 400,
    height: 400,
    hasAlpha: true,
    persistedAssetRef: 'https://assets.example.com/product.png',
    createdAt: new Date().toISOString(),
  };

  it('1. Choose / Select Layer correctly', () => {
    const onSelectLayer = vi.fn();
    const onSetEditingMode = vi.fn();
    const onUpdateLayerTransform = vi.fn();
    const onToggleLayerVisibility = vi.fn();
    const onToggleLayerLock = vi.fn();

    render(
      <CanvasInteractionEditor
        canvasDocument={mockCanvasDoc}
        selectedLayerId={null}
        canvasEditingMode="select"
        productAsset={mockProductAsset}
        sceneAsset={null}
        templateInstance={null}
        onSelectLayer={onSelectLayer}
        onSetEditingMode={onSetEditingMode}
        onUpdateLayerTransform={onUpdateLayerTransform}
        onToggleLayerVisibility={onToggleLayerVisibility}
        onToggleLayerLock={onToggleLayerLock}
      />
    );

    // Clicking product layer inside canvas
    const productEl = screen.getByAltText('Product');
    fireEvent.mouseDown(productEl);
    expect(onSelectLayer).toHaveBeenCalledWith('layer-product-456');

    // Clicking layer list item in panel
    const titleListItem = screen.getByText('文本: Summer Sale!');
    fireEvent.click(titleListItem);
    expect(onSelectLayer).toHaveBeenCalledWith('layer-title-789');
  });

  it('2. Move Layer correctly updates transform coordinate', () => {
    const onUpdateLayerTransform = vi.fn();
    const onSelectLayer = vi.fn();

    // Render with selected layer product
    const { container } = render(
      <CanvasInteractionEditor
        canvasDocument={mockCanvasDoc}
        selectedLayerId="layer-product-456"
        canvasEditingMode="move"
        productAsset={mockProductAsset}
        sceneAsset={null}
        templateInstance={null}
        onSelectLayer={onSelectLayer}
        onSetEditingMode={vi.fn()}
        onUpdateLayerTransform={onUpdateLayerTransform}
        onToggleLayerVisibility={vi.fn()}
        onToggleLayerLock={vi.fn()}
      />
    );

    // Mock getBoundingClientRect on container
    const canvasContainer = container.querySelector('.relative.bg-black');
    if (canvasContainer) {
      vi.spyOn(canvasContainer, 'getBoundingClientRect').mockReturnValue({
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        right: 100,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
    }

    const productEl = screen.getByAltText('Product');
    
    // Simulate drag start on the product
    fireEvent.mouseDown(productEl, { clientX: 10, clientY: 20 });
    
    // Simulate mousemove on document
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 20, // deltaX = 10 -> +10% of 100px
      clientY: 35, // deltaY = 15 -> +15% of 100px
    });
    document.dispatchEvent(mouseMoveEvent);

    // 15% (startX) + 10% (delta) = 25%
    // 20% (startY) + 15% (delta) = 35%
    expect(onUpdateLayerTransform).toHaveBeenCalledWith('layer-product-456', { x: 25, y: 35 });
  });

  it('3. Equal-ratio Scale adjustments strictly retain aspect ratio', () => {
    const onUpdateLayerTransform = vi.fn();

    const { container } = render(
      <CanvasInteractionEditor
        canvasDocument={mockCanvasDoc}
        selectedLayerId="layer-product-456"
        canvasEditingMode="scale"
        productAsset={mockProductAsset}
        sceneAsset={null}
        templateInstance={null}
        onSelectLayer={vi.fn()}
        onSetEditingMode={vi.fn()}
        onUpdateLayerTransform={onUpdateLayerTransform}
        onToggleLayerVisibility={vi.fn()}
        onToggleLayerLock={vi.fn()}
      />
    );

    const canvasContainer = container.querySelector('.relative.bg-black');
    if (canvasContainer) {
      vi.spyOn(canvasContainer, 'getBoundingClientRect').mockReturnValue({
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        right: 100,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
    }

    // Get corner scale handle
    const scaleHandle = container.querySelector('#scale-handle-layer-product-456');
    expect(scaleHandle).not.toBeNull();

    if (scaleHandle) {
      // Simulate scale handle drag
      fireEvent.mouseDown(scaleHandle, { clientX: 10, clientY: 10 });
      
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 20, // deltaX = 10 -> (10 / 100) * 3 = +0.3 scale increase
        clientY: 10,
      });
      document.dispatchEvent(mouseMoveEvent);

      // startScale (1.2) + 0.3 = 1.5
      expect(onUpdateLayerTransform).toHaveBeenCalledWith('layer-product-456', { scale: 1.5 });
    }
  });

  it('4. Toggle Visibility correctly triggers event', () => {
    const onToggleLayerVisibility = vi.fn();

    const { container } = render(
      <CanvasInteractionEditor
        canvasDocument={mockCanvasDoc}
        selectedLayerId={null}
        canvasEditingMode="select"
        productAsset={mockProductAsset}
        sceneAsset={null}
        templateInstance={null}
        onSelectLayer={vi.fn()}
        onSetEditingMode={vi.fn()}
        onUpdateLayerTransform={vi.fn()}
        onToggleLayerVisibility={onToggleLayerVisibility}
        onToggleLayerLock={vi.fn()}
      />
    );

    // Get visibility button for title using its unique ID
    const visibilityBtn = container.querySelector('#layer-visibility-btn-layer-title-789');
    expect(visibilityBtn).not.toBeNull();
    
    if (visibilityBtn) {
      fireEvent.click(visibilityBtn);
    }
    expect(onToggleLayerVisibility).toHaveBeenCalledWith('layer-title-789');
  });

  it('5. Toggle Lock correctly triggers lock event, and locked layer rejects drag modifications', () => {
    const onToggleLayerLock = vi.fn();
    const onUpdateLayerTransform = vi.fn();

    const { container } = render(
      <CanvasInteractionEditor
        canvasDocument={mockCanvasDoc}
        selectedLayerId={null}
        canvasEditingMode="move"
        productAsset={mockProductAsset}
        sceneAsset={null}
        templateInstance={null}
        onSelectLayer={vi.fn()}
        onSetEditingMode={vi.fn()}
        onUpdateLayerTransform={onUpdateLayerTransform}
        onToggleLayerVisibility={vi.fn()}
        onToggleLayerLock={onToggleLayerLock}
      />
    );

    // Background is locked, try to select and drag background using its unique element ID
    const bgLayer = container.querySelector('#canvas-layer-el-layer-bg-123');
    expect(bgLayer).not.toBeNull();
    if (bgLayer) {
      fireEvent.mouseDown(bgLayer, { clientX: 10, clientY: 10 });
    }
    
    const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 20, clientY: 20 });
    document.dispatchEvent(mouseMoveEvent);

    // Locked, so onUpdateLayerTransform should NOT be called
    expect(onUpdateLayerTransform).not.toHaveBeenCalled();

    // Get lock button for background using its unique ID
    const lockBtn = container.querySelector('#layer-lock-btn-layer-bg-123');
    expect(lockBtn).not.toBeNull();

    if (lockBtn) {
      fireEvent.click(lockBtn);
    }
    expect(onToggleLayerLock).toHaveBeenCalledWith('layer-bg-123');
  });

  it('6. ProjectStore updates and serializes selectedLayerId, canvasEditingMode, and layers successfully', () => {
    const store = new ProjectStore();
    const initialState = store.getState();
    
    expect(initialState.selectedLayerId).toBeNull();
    expect(initialState.canvasEditingMode).toBe('select');

    // Select layer
    store.selectLayer('layer-123');
    expect(store.getState().selectedLayerId).toBe('layer-123');

    // Change editing mode
    store.setCanvasEditingMode('scale');
    expect(store.getState().canvasEditingMode).toBe('scale');

    // Simulate canvasDocument presence to test edit/lock/visibility update
    const testDoc: CanvasDocument = {
      width: 500,
      height: 500,
      templateInstanceId: 'test-inst',
      version: 1,
      layers: [
        {
          id: 'layer-1',
          type: 'text',
          transform: { x: 10, y: 10, scale: 1.0, rotate: 0 },
          visible: true,
          locked: false,
          zIndex: 1,
        }
      ]
    };

    store.updateState(() => ({
      canvasDocument: testDoc,
    }));

    // Update transform
    store.updateLayerTransform('layer-1', { x: 20, y: 30, scale: 1.5 });
    let updatedDoc = store.getState().canvasDocument;
    expect(updatedDoc?.layers[0].transform.x).toBe(20);
    expect(updatedDoc?.layers[0].transform.y).toBe(30);
    expect(updatedDoc?.layers[0].transform.scale).toBe(1.5);
    expect(updatedDoc?.version).toBe(2);

    // Lock layer prevents transform change
    store.toggleLayerLock('layer-1');
    expect(store.getState().canvasDocument?.layers[0].locked).toBe(true);

    store.updateLayerTransform('layer-1', { x: 50, y: 50 });
    expect(store.getState().canvasDocument?.layers[0].transform.x).toBe(20); // untouched!

    // Toggle visibility
    store.toggleLayerVisibility('layer-1');
    expect(store.getState().canvasDocument?.layers[0].visible).toBe(false);
  });
});
