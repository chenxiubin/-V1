import { ModelDiscoveryClient } from '../services/modelDiscoveryClient';
import { setupNetworkIsolation } from "./networkIsolation";
// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import React from 'react';
import {  describe, it, expect, beforeAll, beforeEach, vi , afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import App, { projectStore } from '../App';
import { clearAllData, saveAsset } from '../lib/db';
import { ProductAsset } from '../types/schemas';

// Mock URL APIs for happy-dom
if (typeof window !== 'undefined') {
  if (!window.URL) {
    (window as any).URL = {};
  }
  window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/dummy');
  window.URL.revokeObjectURL = vi.fn();
}








// Mock RealAdapter to support multiple success, error, and mismatch test cases
vi.mock('../services/ai/realAdapter', () => {
  return {
    RealAdapter: class {
      async analyzeProduct({ productAsset }: any) {
        if (productAsset.id === 'trigger-deferred') {
          return await new Promise(resolve => {
            (window as any).resolveAnalyze = resolve;
          });
        }
        await new Promise(resolve => setTimeout(resolve, 50));
        if (productAsset.id === 'trigger-error') {
          const err = new Error('模型服务暂时不可用，请稍后重试');
          (err as any).retryable = true;
          throw err;
        }
        if (productAsset.id === 'trigger-fatal') {
          const err = new Error('致命格式损坏，不可恢复');
          (err as any).retryable = false;
          throw err;
        }
        if (productAsset.id === 'trigger-invalid-profile') {
          throw new Error('Zod 校验未通过: invalid data');
        }
        if (productAsset.id === 'trigger-low-confidence') {
          return {
            schemaVersion: '1.0',
            productAssetId: productAsset.id,
            productType: 'desk_calendar',
            bracketType: 'wood_base',
            subjectBounds: { x: 100, y: 100, width: 600, height: 600 },
            contactRegion: { xStart: 200, xEnd: 600, y: 700, confidence: 'high' },
            view: {
              class: 'front_left',
              visibleTop: 'none',
              visibleSide: 'left',
              perspectiveStrength: 'low',
            },
            materials: [
              { name: 'paper', reflectivity: 'low' },
            ],
            palette: {
              dominant: ['#FFFFFF', '#000000'],
              edgeBrightness: 'light',
            },
            existingLighting: {
              direction: 'diffuse',
              temperature: 'neutral',
              softness: 'soft',
              contrast: 'low',
            },
            overallConfidence: 'low',
            uncertainties: [
              { field: 'bracketType', reason: '台历底部被部分遮挡，无法精确判断底座材质。', confidence: 'low' }
            ],
            analyzedAt: new Date().toISOString(),
          };
        }
        return {
          schemaVersion: '1.0',
          productAssetId: productAsset.id,
          productType: 'desk_calendar',
          bracketType: 'paper_base',
          subjectBounds: { x: 100, y: 100, width: 600, height: 600 },
          contactRegion: { xStart: 200, xEnd: 600, y: 700, confidence: 'high' },
          view: {
            class: 'front',
            visibleTop: 'none',
            visibleSide: 'none',
            perspectiveStrength: 'low',
          },
          materials: [
            { name: 'paper', reflectivity: 'low' },
          ],
          palette: {
            dominant: ['#FF0000', '#00FF00'],
            edgeBrightness: 'mid',
          },
          overallConfidence: 'high',
          uncertainties: [],
          analyzedAt: new Date().toISOString(),
          existingLighting: {
            direction: 'front',
            temperature: 'neutral',
            softness: 'soft',
            contrast: 'medium',
          },
        };
      }
    }
  };
});

describe('Integration Tests', () => {

  let cleanupNetworkIsolation: (() => void) | null = null;
  
  beforeEach(async () => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    if (typeof ModelDiscoveryClient !== 'undefined') ModelDiscoveryClient.clearCacheForTests();
    cleanupNetworkIsolation = setupNetworkIsolation();
  });

  afterEach(() => {
    cleanupNetworkIsolation?.();
    cleanupNetworkIsolation = null;
    cleanup();
  });

  beforeEach(async () => {
    await clearAllData();
    projectStore.reset();
    
  });

  const importDummyProduct = async (id = 'test-asset-1') => {
    // Save asset mock file to IndexedDB so loadInitial finds it
    const file = new File(['dummy-content'], 'test_calendar.png', { type: 'image/png' });
    await saveAsset('some-db-ref', file);

    const asset: ProductAsset = {
      id,
      name: 'test_calendar.png',
      mimeType: 'image/png',
      width: 800,
      height: 800,
      hasAlpha: true,
      persistedAssetRef: 'some-db-ref',
      createdAt: new Date().toISOString(),
    };
    projectStore.importProduct(asset);
    await projectStore.persistToDB();
    return asset;
  };

  it('1. 渲染导入成功状态并开始分析（加载中状态验证）', async () => {
    await importDummyProduct('trigger-deferred');

    render(<App />);

    // Wait for async load initial and verify "开始智能分析" is present
    const btnStart = await screen.findByRole('button', { name: /开始智能分析/i });
    expect(btnStart).toBeDefined();

    // Click analysis button
    console.log("BEFORE CLICK ID IS:", projectStore.getState().productAsset?.id);
    fireEvent.click(btnStart);

    // Verify state transition and loading UI display
    console.log("LS DEBUG_ID:", window.localStorage.getItem('DEBUG_ID'));
    expect(projectStore.getState().status).toBe('ANALYZING_PRODUCT');
    await waitFor(() => {
      console.log(document.body.innerHTML);
      expect(screen.getByText('台历智能分析中...')).toBeDefined();
      expect(screen.getByText(/正在深度分析台历的物理结构/i)).toBeDefined();
    });

    // Resolve deferred promise to complete the mock analyze call
    const dummyProfile = {
      schemaVersion: '1.0',
      productAssetId: 'trigger-deferred',
      productType: 'desk_calendar',
      bracketType: 'paper_base',
      subjectBounds: { x: 100, y: 100, width: 600, height: 600 },
      contactRegion: { xStart: 200, xEnd: 600, y: 700, confidence: 'high' },
      view: {
        class: 'front',
        visibleTop: 'none',
        visibleSide: 'none',
        perspectiveStrength: 'low',
      },
      materials: [
        { name: 'paper', reflectivity: 'low' },
      ],
      palette: {
        dominant: ['#FF0000', '#00FF00'],
        edgeBrightness: 'mid',
      },
      overallConfidence: 'high',
      uncertainties: [],
      analyzedAt: new Date().toISOString(),
      existingLighting: {
        direction: 'front',
        temperature: 'neutral',
        softness: 'soft',
        contrast: 'medium',
      },
      overallConfidence: 'high',
      uncertainties: [],
      analyzedAt: new Date().toISOString(),
    };

    if ((window as any).resolveAnalyze) { (window as any).resolveAnalyze(dummyProfile); }

    // Settle promise and verify transition to PRODUCT_REVIEW
    await waitFor(() => {
      expect(projectStore.getState().status).toBe('PRODUCT_REVIEW');
    });
  });

  it('2. 成功完成分析并展示属性中文翻译报告', async () => {
    await importDummyProduct();

    render(<App />);

    const btnStart = await screen.findByRole('button', { name: /开始智能分析/i });
    fireEvent.click(btnStart);

    // Wait for the asynchronous analysis mock to resolve, update the store, and propagate to React DOM
    await waitFor(() => {
      expect(projectStore.getState().status).toBe('PRODUCT_REVIEW');
      
      // Verify mapped Chinese labels
      expect(screen.getByText('台历')).toBeDefined();
      expect(screen.getByText('纸质三角架')).toBeDefined();
      expect(screen.getByText('正视视角')).toBeDefined();
      expect(screen.getByText('置信度：高置信度')).toBeDefined();
      expect(screen.getByText(/大模型在各项属性提取中表现出高水平的一致度/i)).toBeDefined();

      // Verify dominant colors are rendered
      expect(screen.getByText('#FF0000')).toBeDefined();
      expect(screen.getByText('#00FF00')).toBeDefined();
    });
  });

  it('3. 低置信度与不确定项说明展示', async () => {
    await importDummyProduct('trigger-low-confidence');

    render(<App />);

    const btnStart = await screen.findByRole('button', { name: /开始智能分析/i });
    fireEvent.click(btnStart);

    // Wait for the async low-confidence response to resolve and update React DOM
    await waitFor(() => {
      expect(projectStore.getState().status).toBe('PRODUCT_REVIEW');
      
      // Verify uncertainty sections are populated and mapped
      expect(screen.getByText('置信度：低置信度')).toBeDefined();
      expect(screen.getByText('产品类型')).toBeDefined();
      expect(screen.getByText('台历底部被部分遮挡，无法精确判断底座材质。')).toBeDefined();
    });
  });

  it('4. 可重试错误捕获并支持重新分析', async () => {
    await importDummyProduct('trigger-error');

    render(<App />);

    const btnStart = await screen.findByRole('button', { name: /开始智能分析/i });
    fireEvent.click(btnStart);

    // Wait for the error message to be flushed and displayed in the UI
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /开始智能分析/i });
      expect(screen.getByText('模型服务暂时不可用，请稍后重试')).toBeDefined();
      expect((btn as HTMLButtonElement).disabled).toBe(false);
    });

    // Verify status is also PRODUCT_IMPORTED
    expect(projectStore.getState().status).toBe('PRODUCT_IMPORTED');

    // Verify the retry button exists
    const btnRetry = screen.getByRole('button', { name: /重新分析/i });
    expect(btnRetry).toBeDefined();
  });

  it('5. 不可重试错误捕获且不显示重新分析', async () => {
    await importDummyProduct('trigger-fatal');

    render(<App />);

    const btnStart = await screen.findByRole('button', { name: /开始智能分析/i });
    fireEvent.click(btnStart);

    // Wait for the fatal error message to be flushed and displayed in the UI
    await waitFor(() => {
      expect(screen.getByText('致命格式损坏，不可恢复')).toBeDefined();
      expect((screen.getByRole('button', { name: /开始智能分析/i }) as HTMLButtonElement).disabled).toBe(false);
    });

    // Verify status is PRODUCT_IMPORTED
    expect(projectStore.getState().status).toBe('PRODUCT_IMPORTED');

    // The "重新分析" button should NOT be rendered since retryable is false
    const btnRetry = screen.queryByRole('button', { name: /重新分析/i });
    expect(btnRetry).toBeNull();
  });

  it('6. 替换产品后，旧的在途分析响应被安全丢弃，不写入新产品', async () => {
    await importDummyProduct('asset-1');

    render(<App />);

    const btnStart = await screen.findByRole('button', { name: /开始智能分析/i });
    fireEvent.click(btnStart);

    // Simulate replacement immediately after starting analysis
    const asset2: ProductAsset = {
      id: 'asset-2',
      name: 'new_calendar.png',
      mimeType: 'image/png',
      width: 1000,
      height: 1000,
      hasAlpha: true,
      persistedAssetRef: 'new-db-ref',
      createdAt: new Date().toISOString(),
    };
    act(() => {
      projectStore.importProduct(asset2);
    });

    // Wait to see if state matches or review displays asset-2 instead of overwriting with old asset-1 profile
    await waitFor(() => {
      // The old request for asset-1 will complete, but should be discarded!
      // Thus, store's productProfile should remain null or not map to asset-2.
      expect(projectStore.getState().productProfile).toBeNull();
      expect((screen.getByRole('button', { name: /开始智能分析/i }) as HTMLButtonElement).disabled).toBe(false);
    });

    // Ensure status remains PRODUCT_IMPORTED
    await waitFor(() => {
      expect(projectStore.getState().status).toBe('PRODUCT_IMPORTED');
    });
  });

  it('7. 非法响应被安全拒绝不写入 Store', async () => {
    await importDummyProduct('trigger-invalid-profile');

    render(<App />);

    const btnStart = await screen.findByRole('button', { name: /开始智能分析/i });
    fireEvent.click(btnStart);

    await waitFor(() => {
      expect(screen.getByText(/Zod 校验未通过/i)).toBeDefined();
      expect((screen.getByRole('button', { name: /开始智能分析/i }) as HTMLButtonElement).disabled).toBe(false);
    });

    // The validation inside RealAdapter should fail, causing error, leaving profile as null
    expect(projectStore.getState().productProfile).toBeNull();
  });

  it('8. 真实 UI 路由测试：模拟 PRODUCTION_READY 状态启动 App 后直接展示生产工作台', async () => {
    const mockState = {
      schemaVersion: '1.0',
      id: 'default-project',
      name: 'Test Project',
      status: 'PRODUCTION_READY',
      productAsset: {
        id: 'prod-1',
        name: 'product_alpha.png',
        mimeType: 'image/png',
        width: 400,
        height: 400,
        hasAlpha: true,
        persistedAssetRef: 'db-ref-prod',
        createdAt: new Date().toISOString(),
      },
      productProfile: {
        schemaVersion: '1.0',
        productAssetId: 'prod-1',
        productType: 'desk_calendar',
        bracketType: 'paper_base',
        subjectBounds: { x: 100, y: 100, width: 600, height: 600 },
        contactRegion: { xStart: 200, xEnd: 600, y: 700, confidence: 'high' },
        view: { class: 'front', visibleTop: 'none', visibleSide: 'none', perspectiveStrength: 'low' },
        materials: [{ name: 'paper', reflectivity: 'low' }],
        palette: { dominant: ['#FF0000'], edgeBrightness: 'mid' },
        existingLighting: { direction: 'front', temperature: 'neutral', softness: 'soft', contrast: 'medium' },
        overallConfidence: 'high',
        uncertainties: [],
        analyzedAt: new Date().toISOString(),
      },
      guidedQuestions: [],
      guidedAnswers: [],
      sceneDirections: [],
      selectedDirectionId: 'dir-1',
      sceneRecipes: [
        {
          schemaVersion: '1.0',
          recipeId: 'recipe-1',
          version: 1,
          productAssetId: 'prod-1',
          productProfileSnapshot: {
            schemaVersion: '1.0',
            productAssetId: 'prod-1',
            productType: 'desk_calendar',
            bracketType: 'paper_base',
            subjectBounds: { x: 100, y: 100, width: 600, height: 600 },
            contactRegion: { xStart: 200, xEnd: 600, y: 700, confidence: 'high' },
            view: { class: 'front', visibleTop: 'none', visibleSide: 'none', perspectiveStrength: 'low' },
            materials: [{ name: 'paper', reflectivity: 'low' }],
            palette: { dominant: ['#FF0000'], edgeBrightness: 'mid' },
            existingLighting: { direction: 'front', temperature: 'neutral', softness: 'soft', contrast: 'medium' },
            overallConfidence: 'high',
            uncertainties: [],
            analyzedAt: new Date().toISOString(),
          },
          guidedAnswers: [],
          selectedDirectionId: 'dir-1',
          task: {
            operation: 'generate_empty_scene_background',
            productRole: 'analysis_and_spatial_reference_only',
            backgroundOnly: true,
          },
          scene: {
            spaceType: 'living_room',
            wallMaterial: 'plaster',
            desktopMaterial: 'wood',
            desktopTone: 'warm_wood',
            backgroundBrightness: 'medium_light',
            style: 'modern',
            palette: ['#E6E6FA'],
            furnitureDensity: 'medium',
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
            perspectiveStrength: 'medium',
            desktopVisiblePercent: 30,
          },
          lighting: {
            sourceType: 'window',
            sourcePosition: 'upper_left',
            temperature: 'neutral_warm',
            softness: 'soft',
            contrast: 'medium',
            shadowDirection: 'rear_right',
          },
          decoration: {
            density: 'moderate',
            allowed: ['books', 'plant'],
            forbiddenNearProduct: [],
            foregroundOcclusion: false,
          },
          output: {
            aspectRatio: '1:1',
            resolutionLabel: '2K',
            realism: 'real_commercial_interior_photography',
            exclude: [],
          },
          inheritance: {
            seriesId: 'series-1',
            mode: 'same_space',
            lockedSeriesVersion: 1,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ],
      recipeVersions: [],
      sceneRecipe: {
        schemaVersion: '1.0',
        recipeId: 'recipe-1',
        version: 1,
        productAssetId: 'prod-1',
        productProfileSnapshot: {
          schemaVersion: '1.0',
          productAssetId: 'prod-1',
          productType: 'desk_calendar',
          bracketType: 'paper_base',
          subjectBounds: { x: 100, y: 100, width: 600, height: 600 },
          contactRegion: { xStart: 200, xEnd: 600, y: 700, confidence: 'high' },
          view: { class: 'front', visibleTop: 'none', visibleSide: 'none', perspectiveStrength: 'low' },
          materials: [{ name: 'paper', reflectivity: 'low' }],
          palette: { dominant: ['#FF0000'], edgeBrightness: 'mid' },
          existingLighting: { direction: 'front', temperature: 'neutral', softness: 'soft', contrast: 'medium' },
          overallConfidence: 'high',
          uncertainties: [],
          analyzedAt: new Date().toISOString(),
        },
        guidedAnswers: [],
        selectedDirectionId: 'dir-1',
        task: {
          operation: 'generate_empty_scene_background',
          productRole: 'analysis_and_spatial_reference_only',
          backgroundOnly: true,
        },
        scene: {
          spaceType: 'living_room',
          wallMaterial: 'plaster',
          desktopMaterial: 'wood',
          desktopTone: 'warm_wood',
          backgroundBrightness: 'medium_light',
          style: 'modern',
          palette: ['#E6E6FA'],
          furnitureDensity: 'medium',
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
          perspectiveStrength: 'medium',
          desktopVisiblePercent: 30,
        },
        lighting: {
          sourceType: 'window',
          sourcePosition: 'upper_left',
          temperature: 'neutral_warm',
          softness: 'soft',
          contrast: 'medium',
          shadowDirection: 'rear_right',
        },
        decoration: {
          density: 'moderate',
          allowed: ['books', 'plant'],
          forbiddenNearProduct: [],
          foregroundOcclusion: false,
        },
        output: {
          aspectRatio: '1:1',
          resolutionLabel: '2K',
          realism: 'real_commercial_interior_photography',
          exclude: [],
        },
        inheritance: {
          seriesId: 'series-1',
          mode: 'same_space',
          lockedSeriesVersion: 1,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      promptDocument: null,
      activeVersion: 1,
      templateLibrary: [],
      selectedTemplateSuiteId: 'suite-1',
      selectedTemplateVariantId: 'var-1',
      templateInstances: [
        {
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
        }
      ],
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
      canvasDocument: {
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
      },
      selectedLayerId: null,
      canvasEditingMode: 'select',
      renderSnapshots: [],
      activeRenderSnapshotId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    act(() => {
      (projectStore as any).state = mockState as any;
      (projectStore as any).notify();
    });

    render(<App />);

    // Verify the ProductionWorkspace elements are rendered
    await waitFor(() => {
      expect(screen.getByText('生产工作台')).not.toBeNull();
      expect(screen.getByText('Mock Premium Template')).not.toBeNull();
      expect(screen.getByText('产品主体图')).not.toBeNull();
      expect(screen.getByText('智能场景背景')).not.toBeNull();
    });
  });
});
