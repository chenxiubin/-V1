// @ts-nocheck
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
import * as dbModule from '../lib/db';

const createPngBlob = (name) => {
  const bytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0]);
  const f = new File([bytes], name, { type: 'image/png' });
  return f;
};

const createJpegBlob = (name) => {
  const bytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const f = new File([bytes], name, { type: 'image/jpeg' });
  return f;
};

const createWebpBlob = (name) => {
  const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  const f = new File([bytes], name, { type: 'image/webp' });
  return f;
};

describe('Phase 2-A: Local Product Import, Verification, and Preview Tests', () => {
  let store: ProjectStore;
  let saveAssetSpy;

  beforeEach(async () => {
    // Clear fake-indexeddb
    await clearAllData();
    // Instantiate a fresh store
    store = new ProjectStore();
    store.reset();
    saveAssetSpy = vi.spyOn(dbModule, 'saveAsset');
  });

  // 1. 透明 PNG
  it('透明PNG导入成功', async () => {
    (global as any).__mockAlpha = 0; // Transparent
    const file = createPngBlob('test_calendar.png');
    const analysis = await analyzeImageFile(file);
    expect(analysis.mimeType).toBe('image/png');
    expect(analysis.hasAlpha).toBe(true);
  });
  
  // 2. 实底 PNG
  it('实底（全不透明）PNG，正确识别为 false', async () => {
    (global as any).__mockAlpha = 255; // Opaque
    const file = createPngBlob('opaque.png');
    const analysis = await analyzeImageFile(file);
    expect(analysis.mimeType).toBe('image/png');
    expect(analysis.hasAlpha).toBe(false);
  });
  
  // 3. JPEG
  it('JPEG', async () => {
    (global as any).__mockAlpha = 255;
    const file = createJpegBlob('test.jpg');
    const analysis = await analyzeImageFile(file);
    expect(analysis.mimeType).toBe('image/jpeg');
    expect(analysis.hasAlpha).toBe(false);
  });
  
  // 4. 透明 WebP
  it('透明 WebP', async () => {
    (global as any).__mockAlpha = 0; // Transparent
    const file = createWebpBlob('test.webp');
    const analysis = await analyzeImageFile(file);
    expect(analysis.mimeType).toBe('image/webp');
    expect(analysis.hasAlpha).toBe(true);
  });
  
  // 5. 实底 WebP
  it('实底 WebP', async () => {
    (global as any).__mockAlpha = 255; // Opaque
    const file = createWebpBlob('test.webp');
    const analysis = await analyzeImageFile(file);
    expect(analysis.mimeType).toBe('image/webp');
    expect(analysis.hasAlpha).toBe(false);
  });

  // 6. Alpha 检测失败降级
  it('图片解码或检测异常，安全降级为 false 且不抛出阻塞异常', async () => {
    (global as any).__mockAlpha = -1; // Canvas throws error
    const file = createPngBlob('canvas_error.png');
    const analysis = await analyzeImageFile(file);
    expect(analysis.hasAlpha).toBe(false);
  });
  
  // 7. GIF 直接上传
  it('GIF 直接上传', async () => {
    const file = new File(['dummy-gif'], 'calendar.gif', { type: 'image/gif' });
    await expect(analyzeImageFile(file)).rejects.toThrow('不支持的文件格式，请上传 PNG、JPEG 或 WEBP 图片。');
    expect(saveAssetSpy).not.toHaveBeenCalled();
    expect(store.getState().productAsset).toBeNull();
  });
  
  // 8. GIF 伪装 PNG
  it('GIF 伪装 PNG', async () => {
    const bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0]);
    const file = new File([bytes], 'fake.png', { type: 'image/png' });
    await expect(analyzeImageFile(file)).rejects.toThrow('图片格式与文件内容不一致，请上传真实的 PNG、JPEG 或 WEBP 图片。');
    expect(saveAssetSpy).not.toHaveBeenCalled();
  });
  
  // 9. PNG 签名但 JPEG MIME
  it('PNG 签名但 JPEG MIME', async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0]);
    const file = new File([bytes], 'fake.png', { type: 'image/jpeg' });
    await expect(analyzeImageFile(file)).rejects.toThrow('图片格式与文件内容不一致');
  });
  
  // 10. JPEG 签名但 PNG 扩展名
  it('JPEG 签名但 PNG 扩展名', async () => {
    const bytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const file = new File([bytes], 'fake.png', { type: 'image/jpeg' }); // ext is .png, mime is .jpeg
    await expect(analyzeImageFile(file)).rejects.toThrow('图片格式与文件内容不一致');
  });
  
  // 11. WebP 签名但 JPG 扩展名
  it('WebP 签名但 JPG 扩展名', async () => {
    const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    const file = new File([bytes], 'fake.jpg', { type: 'image/webp' });
    await expect(analyzeImageFile(file)).rejects.toThrow('图片格式与文件内容不一致');
  });
  
  // 12. 签名不完整
  it('签名不完整', async () => {
    const bytes = new Uint8Array([0xFF]);
    const file = new File([bytes], 'short.jpg', { type: 'image/jpeg' });
    await expect(analyzeImageFile(file)).rejects.toThrow('图片格式与文件内容不一致');
  });
  
  // 13. 超过 10MB
  it('超过 10MB', async () => {
    const file = createPngBlob('large.png');
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });
    await expect(analyzeImageFile(file)).rejects.toThrow('图片大小不能超过 10MB。');
    expect(saveAssetSpy).not.toHaveBeenCalled();
  });
  
  // 14. 合法签名但 Image 解码失败
  it('图片完全损坏，解析失败抛出错误', async () => {
    const file = createPngBlob('corrupt.png');
    await expect(analyzeImageFile(file)).rejects.toThrow('无法加载图片文件，请确保文件未损坏。');
  });

  // Test UI Yellow Warning logic via state integration
  it('实底图片和 JPEG 显示黄色警告，不阻断分析', async () => {
    (global as any).__mockAlpha = 255;
    const file = createJpegBlob('test.jpg');
    const analysis = await analyzeImageFile(file);
    
    const assetId = 'test-asset-jpeg';
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
    
    await saveAsset(assetId, file);
    store.importProduct(productAsset);
    const state = store.getState();
    expect(state.productAsset?.hasAlpha).toBe(false); // UI shows warning
    
    // Ensure transition to analyzing is still possible
    expect(() => store.transitionTo('ANALYZING_PRODUCT')).not.toThrow();
  });

  it('透明图片不显示黄色警告', async () => {
    (global as any).__mockAlpha = 0;
    const file = createPngBlob('test.png');
    const analysis = await analyzeImageFile(file);
    expect(analysis.hasAlpha).toBe(true); // UI does not show warning
  });

  it('无产品不能进入分析状态', async () => {
    expect(() => store.transitionTo('ANALYZING_PRODUCT')).toThrow();
  });
});