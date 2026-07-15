// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CanvasPreviewRenderer } from '../components/CanvasPreviewRenderer';
import { CanvasDocument, ProductAsset, ProjectState } from '../types/schemas';

describe('Phase 7-D-1: CanvasPreviewRenderer Component Tests', () => {
  const mockCanvasDoc: CanvasDocument = {
    width: 800,
    height: 800,
    templateInstanceId: 'inst-test-1',
    version: 1,
    layers: [
      {
        id: 'layer-slot-bg-12345',
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
        id: 'layer-slot-product-12345',
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
        id: 'layer-slot-title-12345',
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

  const mockSceneAsset: NonNullable<ProjectState['sceneAsset']> = {
    id: 'scene-1',
    productAssetId: 'prod-1',
    recipeId: 'rec-1',
    recipeVersion: 1,
    size: 1024,
    contentHash: 'hash',
    name: 'test_scene.png',
    mimeType: 'image/png',
    width: 800,
    height: 800,
    persistedAssetRef: 'https://assets.example.com/scene.png',
    createdAt: new Date().toISOString(),
  };

  it('1. CanvasDocument 正确渲染 & 安全显示缺失资源', () => {
    // Render with null assets to verify elegant placeholders are shown
    render(
      <CanvasPreviewRenderer 
        canvasDocument={mockCanvasDoc}
        productAsset={null}
        sceneAsset={null}
      />
    );

    // Verify fallback placeholder messages are visible in the DOM
    expect(screen.getByText('AI 场景背景（待生成）')).toBeDefined();
    expect(screen.getByText('产品PNG（未加载）')).toBeDefined();
    expect(screen.getByText('Summer Sale!')).toBeDefined();
  });

  it('2. 非法 Canvas 安全降级且不崩溃', () => {
    const { container } = render(
      <CanvasPreviewRenderer 
        canvasDocument={null}
      />
    );

    expect(screen.getByText('画布数据不可用或格式损坏')).toBeDefined();
    expect(screen.getByText('已进行降级容错，请重新生成或选择模板')).toBeDefined();
  });

  it('3. Layer zIndex 顺序正确且 transform & 位置样式生效', () => {
    // Render with all assets supplied
    const { container } = render(
      <CanvasPreviewRenderer 
        canvasDocument={mockCanvasDoc}
        productAsset={mockProductAsset}
        sceneAsset={mockSceneAsset}
      />
    );

    // Verify images rendered
    const imgElements = container.querySelectorAll('img');
    expect(imgElements.length).toBe(2);
    expect(imgElements[0].getAttribute('src')).toBe('https://assets.example.com/scene.png');
    expect(imgElements[1].getAttribute('src')).toBe('https://assets.example.com/product.png');

    // Verify transform values and left/top positions are mapped into inline styles
    // Find background parent div
    const bgImg = screen.getByAltText('Scene Background');
    const bgParent = bgImg.parentElement;
    expect(bgParent).toBeDefined();
    expect(bgParent?.style.zIndex).toBe('0');
    expect(bgParent?.style.left).toBe('0%');
    expect(bgParent?.style.top).toBe('0%');

    // Find product parent div
    const prodImg = screen.getByAltText('Product');
    const prodParent = prodImg.parentElement;
    expect(prodParent).toBeDefined();
    expect(prodParent?.style.zIndex).toBe('10');
    expect(prodParent?.style.left).toBe('15%');
    expect(prodParent?.style.top).toBe('20%');
    expect(prodParent?.style.transform).toBe('scale(1.2) rotate(15deg)');

    // Find text layer parent div
    const textLayer = screen.getByText('Summer Sale!');
    const textParent = textLayer.parentElement;
    expect(textParent).toBeDefined();
    expect(textParent?.style.zIndex).toBe('20');
    expect(textParent?.style.left).toBe('10%');
    expect(textParent?.style.top).toBe('5%');
    expect(textParent?.style.transform).toBe('scale(1) rotate(-5deg)');
  });

  it('4. 验证不产生 Base64 并直接使用原始引用', () => {
    const { container } = render(
      <CanvasPreviewRenderer 
        canvasDocument={mockCanvasDoc}
        productAsset={mockProductAsset}
        sceneAsset={mockSceneAsset}
      />
    );

    const imgElements = container.querySelectorAll('img');
    imgElements.forEach(img => {
      const src = img.getAttribute('src') || '';
      expect(src.startsWith('data:')).toBe(false); // Base64 check
      expect(src.startsWith('blob:')).toBe(false); // Blob URL check
    });
  });

  it('5. PRODUCTION_READY 状态下: 验证 layer.source.persistedAssetRef 渲染优先级高于 asset 属性引用', () => {
    const layerSpecificBgDoc: CanvasDocument = {
      ...mockCanvasDoc,
      layers: [
        {
          ...mockCanvasDoc.layers[0],
          source: {
            ...mockCanvasDoc.layers[0].source!,
            persistedAssetRef: 'https://assets.example.com/layer-specific-bg.png',
          },
        },
        {
          ...mockCanvasDoc.layers[1],
          source: {
            ...mockCanvasDoc.layers[1].source!,
            persistedAssetRef: 'https://assets.example.com/layer-specific-prod.png',
          },
        },
        mockCanvasDoc.layers[2],
      ],
    };

    const { container } = render(
      <CanvasPreviewRenderer 
        canvasDocument={layerSpecificBgDoc}
        productAsset={mockProductAsset}
        sceneAsset={mockSceneAsset}
      />
    );

    const imgElements = container.querySelectorAll('img');
    expect(imgElements.length).toBe(2);
    expect(imgElements[0].getAttribute('src')).toBe('https://assets.example.com/layer-specific-bg.png');
    expect(imgElements[1].getAttribute('src')).toBe('https://assets.example.com/layer-specific-prod.png');
  });
});
