// @ts-nocheck
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectStore } from '../store/projectStore';
import { clearAllData, saveAsset, getAsset } from '../lib/db';
import { analyzeImageFile } from '../lib/imageAnalyzer';

// --- Mock browser DOM for Node environment ---
(global as any).URL = {
  createObjectURL: (blob) => {
    if (blob.size === 0) throw new Error("Invalid blob");
    if (blob.name && blob.name.includes('invalid')) throw new Error('无法读取文件');
    return 'blob:mock-' + (blob.name || 'blob');
  },
  revokeObjectURL: () => {}
};
(global as any).Image = class {
  constructor() {
    this.naturalWidth = 100;
    this.naturalHeight = 100;
  }
  set src(val) {
    this._src = val;
    setTimeout(() => {
      if (val.includes('corrupt')) {
        this.onerror && this.onerror();
      } else {
        this.onload && this.onload();
      }
    }, 0);
  }
  get src() {
    return this._src;
  }
};
(global as any).document = {
  createElement: (tag) => {
    if (tag === 'canvas') {
      return {
        width: 0, height: 0,
        getContext: (type) => {
          if (type === '2d') {
            return {
              drawImage: () => {},
              getImageData: () => {
                const alpha = (global as any).__mockAlpha !== undefined ? (global as any).__mockAlpha : 255;
                if (alpha === -1) throw new Error("Canvas Error");
                return {
                  data: [255, 255, 255, alpha]
                };
              }
            };
          }
          return null;
        }
      };
    }
    return {};
  }
};
// --------------------------------------------

import { ProductAssetSchema, ProductAsset } from '../types/schemas';

describe('Phase 2-A: Local Product Import, Verification, and Preview Tests', () => {
  let store: ProjectStore;

  beforeEach(async () => {
    // Clear fake-indexeddb
    await clearAllData();
    // Instantiate a fresh store
    store = new ProjectStore();
    store.reset();
  });

  it('透明PNG导入成功', async () => {
    (global as any).__mockAlpha = 0; // Transparent

    // Simulate a File object of transparent PNG
    const file = new File(['dummy-png-content'], 'test_calendar.png', { type: 'image/png' });
    
    // Analyze
    const analysis = await analyzeImageFile(file);
    expect(analysis.mimeType).toBe('image/png');
    expect(analysis.hasAlpha).toBe(true);
    expect(analysis.name).toBe('test_calendar.png');

    // Create asset
    const assetId = 'test-asset-png';
    const productAsset: ProductAsset = {
      id: assetId,
      name: file.name,
      mimeType: analysis.mimeType,
      width: analysis.width,
      height: analysis.height,
      hasAlpha: analysis.hasAlpha,
      persistedAssetRef: assetId,
      createdAt: new Date().toISOString(),
    };
    const parseResult = ProductAssetSchema.safeParse(productAsset);
    expect(parseResult.success).toBe(true);

    // Save asset to DB and product to store
    await saveAsset(assetId, file);
    store.importProduct(productAsset);

    // Verify store has product asset
    const state = store.getState();
    expect(state.status).toBe('PRODUCT_IMPORTED');
    expect(state.productAsset).toEqual(productAsset);
  });

  
  it('实底（全不透明）PNG，正确识别为 false', async () => {
    (global as any).__mockAlpha = 255; // Opaque
    const file = new File(['dummy-png-content'], 'opaque.png', { type: 'image/png' });
    const analysis = await analyzeImageFile(file);
    expect(analysis.mimeType).toBe('image/png');
    expect(analysis.hasAlpha).toBe(false);
  });
  
  it('图片解码或检测异常，安全降级为 false 且不抛出阻塞异常', async () => {
    (global as any).__mockAlpha = -1; // Canvas throws error
    const file = new File(['dummy'], 'canvas_error.png', { type: 'image/png' });
    const analysis = await analyzeImageFile(file);
    expect(analysis.hasAlpha).toBe(false);
  });
  
  it('图片完全损坏，解析失败抛出错误', async () => {
    const file = new File(['corrupt'], 'corrupt.png', { type: 'image/png' });
    await expect(analyzeImageFile(file)).rejects.toThrow('无法加载图片');
  });
  

  it('非透明图片风险提示', async () => {
    (global as any).__mockAlpha = 255;
    // JPEG doesn't have transparency
    const file = new File(['dummy-jpeg-content'], 'test_calendar.jpg', { type: 'image/jpeg' });
    const analysis = await analyzeImageFile(file);
    
    expect(analysis.mimeType).toBe('image/jpeg');
    expect(analysis.hasAlpha).toBe(false);

    // Make sure we create the asset and warning flag can be derived or displayed
    const productAsset: ProductAsset = {
      id: 'test-asset-jpeg',
      name: file.name,
      mimeType: analysis.mimeType,
      width: analysis.width,
      height: analysis.height,
      hasAlpha: analysis.hasAlpha,
      persistedAssetRef: 'test-asset-jpeg',
      createdAt: new Date().toISOString(),
    };

    store.importProduct(productAsset);
    const state = store.getState();
    expect(state.productAsset?.hasAlpha).toBe(false); // UI would trigger warning based on this
  });

  it('不支持格式被拒绝', async () => {
    // GIF is not supported
    const file = new File(['dummy-gif'], 'calendar.gif', { type: 'image/gif' });
    await expect(analyzeImageFile(file)).rejects.toThrow('不支持的文件格式');
  });

  it('无产品不能进入分析状态', async () => {
    // Current status is EMPTY
    const state = store.getState();
    expect(state.productAsset).toBeNull();
    expect(state.status).toBe('EMPTY');

    // Transition should fail because canTransitionTo checks productAsset requirement
    expect(() => store.transitionTo('ANALYZING_PRODUCT')).toThrow('状态机控制拒绝该转换');
  });

  it('替换产品使旧数据过期', async () => {
    // 1. Initial product
    const asset1: ProductAsset = {
      id: 'asset-1',
      name: 'old_calendar.png',
      mimeType: 'image/png',
      width: 500,
      height: 500,
      hasAlpha: true,
      persistedAssetRef: 'ref-1',
      createdAt: new Date().toISOString(),
    };
    store.importProduct(asset1);
    store.setProductProfile({
      schemaVersion: '1.0',
      productAssetId: 'asset-1',
      productType: 'desk_calendar',
      bracketType: 'paper_base',
      subjectBounds: { x: 0, y: 0, width: 500, height: 500 },
      contactRegion: { xStart: 0, xEnd: 500, y: 500, confidence: 'high' },
      view: { class: 'front', visibleTop: 'none', visibleSide: 'none', perspectiveStrength: 'low' },
      materials: [{ name: 'paper', reflectivity: 'low' }],
      palette: { dominant: ['#FFF'], edgeBrightness: 'light' },
      existingLighting: { direction: 'front', temperature: 'neutral', softness: 'soft', contrast: 'low' },
      uncertainties: [],
      overallConfidence: 'high',
      analyzedAt: new Date().toISOString(),
    });

    // Verify it is not null
    expect(store.getState().productProfile).not.toBeNull();

    // 2. Replace product with asset2
    const asset2: ProductAsset = {
      id: 'asset-2',
      name: 'new_calendar.png',
      mimeType: 'image/png',
      width: 600,
      height: 600,
      hasAlpha: true,
      persistedAssetRef: 'ref-2',
      createdAt: new Date().toISOString(),
    };

    store.importProduct(asset2);

    // Verify old profile is cleared/expired
    const finalState = store.getState();
    expect(finalState.productAsset).toEqual(asset2);
    expect(finalState.productProfile).toBeNull();
    expect(finalState.sceneRecipes).toEqual([]);
    expect(finalState.matchReport).toBeNull();
    expect(finalState.status).toBe('PRODUCT_IMPORTED');
  });

  it('原始Blob可以从IndexedDB读取', async () => {
    const file = new File(['real-image-binary-data'], 'calendar.png', { type: 'image/png' });
    const assetId = 'indexeddb-test-asset';

    await saveAsset(assetId, file);
    const retrievedBlob = await getAsset(assetId);

    expect(retrievedBlob).toBeDefined();
    expect(retrievedBlob?.size).toBe(file.size);
    expect(retrievedBlob?.type).toBe('image/png');
    
    // Read text from retrieved blob to verify original binary integrity
    const text = await retrievedBlob?.text();
    expect(text).toBe('real-image-binary-data');
  });
});
