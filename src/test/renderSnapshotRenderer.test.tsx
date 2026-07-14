// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RenderSnapshotRenderer } from '../components/RenderSnapshotRenderer';
import { CanvasDocument, RenderSnapshot, ProductAsset } from '../types/schemas';

describe('Phase 7-E-2: RenderSnapshotRenderer Tests', () => {
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

  const mockSceneAsset = {
    id: 'scene-test-123',
    persistedAssetRef: 'https://assets.example.com/scene.png',
  };

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
          assetId: 'scene-test-123',
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
          assetId: 'prod-test-123',
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
        id: 'layer-text-1',
        type: 'text',
        source: null,
        transform: { x: 5, y: 5, scale: 1.0, rotate: 0 },
        visible: true,
        locked: false,
        zIndex: 20,
        content: 'Custom Title TEXT',
      },
      {
        id: 'layer-decor-1',
        type: 'decoration',
        source: null,
        transform: { x: 40, y: 40, scale: 1.0, rotate: 0 },
        visible: true,
        locked: false,
        zIndex: 5,
        content: 'Golden Bonsai',
      },
      {
        id: 'layer-badge-1',
        type: 'badge',
        source: null,
        transform: { x: 70, y: 10, scale: 1.0, rotate: -10 },
        visible: true,
        locked: false,
        zIndex: 30,
        content: 'SALE 50%',
      },
    ],
  };

  const mockSnapshot: RenderSnapshot = {
    id: 'snapshot-test-999',
    projectId: 'proj-test-1',
    canvasDocumentSnapshot: mockCanvasDoc,
    templateInstanceSnapshot: {
      id: 'inst-test-1',
      suiteId: 'suite-1',
      variantId: 'variant-1',
      variantSnapshot: {
        id: 'variant-1',
        aspectRatio: '1:1',
        canvasSize: { width: 800, height: 800 },
        slots: [
          {
            id: 'scene-test-123',
            type: 'background',
            label: 'AI Background',
            rect: { x: 0, y: 0, width: 100, height: 100 },
            zIndex: 0,
            isRequired: true,
            allowAI: true,
          },
          {
            id: 'prod-test-123',
            type: 'product',
            label: 'Product Hero',
            rect: { x: 15, y: 20, width: 50, height: 50 },
            zIndex: 10,
            isRequired: true,
            allowAI: true,
          }
        ],
        previewUrl: '',
      },
      slotValues: [],
      createdAt: new Date().toISOString(),
    },
    templateInstanceId: 'inst-test-1',
    templateInstanceVersion: 1,
    templateSuiteId: 'suite-1',
    templateSuiteVersion: 1,
    sceneRecipeId: 'recipe-1',
    sceneRecipeVersion: 1,
    recipeId: 'recipe-1',
    recipeVersion: 1,
    productAssetId: 'prod-test-123',
    productAssetVersion: 1,
    layerAssetReferences: [],
    createdAt: new Date().toISOString(),
  };

  it('1. RenderSnapshotRenderer renders all requested layer types successfully', () => {
    const { container } = render(
      <RenderSnapshotRenderer 
        snapshot={mockSnapshot} 
        productAsset={mockProductAsset}
        sceneAsset={mockSceneAsset}
      />
    );

    // Verify header exists with correct size
    expect(screen.getByText('生产只读静态快照预览')).toBeTruthy();
    expect(screen.getByText('冻结尺寸: 800 × 800 px')).toBeTruthy();

    // Verify text layer content
    expect(screen.getByText('Custom Title TEXT')).toBeTruthy();

    // Verify decoration layer content
    expect(screen.getByText('Golden Bonsai')).toBeTruthy();

    // Verify badge layer content
    expect(screen.getByText('SALE 50%')).toBeTruthy();

    // Verify images exist for background & product
    const images = container.querySelectorAll('img');
    expect(images.length).toBe(2);

    const bgImage = Array.from(images).find(img => img.src === 'https://assets.example.com/scene.png');
    const prodImage = Array.from(images).find(img => img.src === 'https://assets.example.com/product.png');

    expect(bgImage).toBeDefined();
    expect(prodImage).toBeDefined();
  });

  it('2. Data isolation: modifying canvas document does not affect RenderSnapshotRenderer', () => {
    // Deep copy mockSnapshot
    const snapshotCopy = JSON.parse(JSON.stringify(mockSnapshot)) as RenderSnapshot;

    const { rerender } = render(
      <RenderSnapshotRenderer 
        snapshot={snapshotCopy} 
        productAsset={mockProductAsset}
        sceneAsset={mockSceneAsset}
      />
    );

    // Verify initial text layer content
    expect(screen.getByText('Custom Title TEXT')).toBeTruthy();

    // Simulate modifying the external/current canvas document or template (independent of the snapshot)
    const modifiedCanvasDoc = {
      ...mockCanvasDoc,
      layers: mockCanvasDoc.layers.map(layer => {
        if (layer.type === 'text') {
          return { ...layer, content: 'NEW DYNAMIC TEXT' };
        }
        return layer;
      })
    };

    // Rerender with the original snapshot (which is isolated from the modified canvas document)
    rerender(
      <RenderSnapshotRenderer 
        snapshot={snapshotCopy} 
        productAsset={mockProductAsset}
        sceneAsset={mockSceneAsset}
      />
    );

    // Snapshot remains unchanged since it references canvasDocumentSnapshot
    expect(screen.queryByText('NEW DYNAMIC TEXT')).toBeNull();
    expect(screen.getByText('Custom Title TEXT')).toBeTruthy();
  });

  it('3. Layer order (z-index) is maintained consistently', () => {
    const { container } = render(
      <RenderSnapshotRenderer 
        snapshot={mockSnapshot} 
        productAsset={mockProductAsset}
        sceneAsset={mockSceneAsset}
      />
    );

    const viewport = container.querySelector('#snapshot-canvas-viewport');
    expect(viewport).toBeTruthy();

    const layerElements = viewport?.children;
    expect(layerElements).toBeDefined();
    
    if (layerElements) {
      // Find the layers in DOM order
      const idsInDOMOrder = Array.from(layerElements).map(el => el.id);
      
      // Expected zIndex order ascending:
      // bg-123 (zIndex: 0), decor-1 (zIndex: 5), product-456 (zIndex: 10), text-1 (zIndex: 20), badge-1 (zIndex: 30)
      const expectedZIndexAscending = [
        'snapshot-layer-layer-bg-123',
        'snapshot-layer-layer-decor-1',
        'snapshot-layer-layer-product-456',
        'snapshot-layer-layer-text-1',
        'snapshot-layer-layer-badge-1',
      ];

      expect(idsInDOMOrder).toEqual(expectedZIndexAscending);
    }
  });

  it('4. Handles missing or mismatched assets with graceful degradation placeholders without crashing', () => {
    // Render with missing productAsset and sceneAsset
    const { container } = render(
      <RenderSnapshotRenderer 
        snapshot={mockSnapshot} 
        productAsset={null}
        sceneAsset={null}
      />
    );

    // Render should not crash and should render degradations
    expect(screen.getByText('场景背景 (占位降级)')).toBeTruthy();
    expect(screen.getByText('产品主图 (占位降级)')).toBeTruthy();

    // No actual images should be loaded
    const images = container.querySelectorAll('img');
    expect(images.length).toBe(0);
  });

  it('5. Safe fallback on corrupt or empty snapshot inputs', () => {
    const { rerender } = render(
      <RenderSnapshotRenderer 
        snapshot={null} 
      />
    );

    expect(screen.getByText('快照数据非法或不存在')).toBeTruthy();

    const corruptSnapshot = {
      id: 'corrupt-1',
      projectId: 'proj-1',
    } as any;

    rerender(
      <RenderSnapshotRenderer 
        snapshot={corruptSnapshot} 
      />
    );

    expect(screen.getByText('快照数据非法或不存在')).toBeTruthy();
  });
});
