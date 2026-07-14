import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RealAdapter } from '../services/ai/realAdapter';
import { saveAsset, clearAllData } from '../lib/db';
import { ProductAsset, ProductProfile } from '../types/schemas';

const TEST_PRODUCT_ASSET: ProductAsset = {
  id: 'test-asset-id',
  name: 'test_calendar.png',
  mimeType: 'image/png',
  width: 1024,
  height: 1024,
  hasAlpha: true,
  persistedAssetRef: 'ref-test-xyz',
  createdAt: new Date().toISOString(),
};

describe('RealAdapter.analyzeProduct Integration Tests', () => {
  beforeEach(async () => {
    await clearAllData();
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
  });

  it('fails if asset blob is missing in IndexedDB', async () => {
    const adapter = new RealAdapter();
    await expect(adapter.analyzeProduct({ productAsset: TEST_PRODUCT_ASSET }))
      .rejects
      .toThrow('本地数据库未找到该产品资产大文件');
  });

  it('sends proper FormData and handles a successful response validated by Zod', async () => {
    const originalBlob = new Blob(['sample-image-data'], { type: 'image/png' });
    await saveAsset('ref-test-xyz', originalBlob);

    const mockProfile: ProductProfile = {
      schemaVersion: '1.0',
      productAssetId: 'test-asset-id',
      productType: 'desk_calendar',
      bracketType: 'paper_base',
      subjectBounds: { x: 0, y: 0, width: 100, height: 100 },
      contactRegion: { xStart: 10, xEnd: 90, y: 95, confidence: 'high' },
      view: { class: 'front', visibleTop: 'none', visibleSide: 'none', perspectiveStrength: 'low' },
      materials: [{ name: 'paper', reflectivity: 'low' }],
      palette: { dominant: ['#FFFFFF'], edgeBrightness: 'light' },
      existingLighting: { direction: 'front', temperature: 'neutral', softness: 'soft', contrast: 'low' },
      uncertainties: [],
      overallConfidence: 'high',
      analyzedAt: new Date().toISOString(),
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockProfile,
    });
    vi.stubGlobal('fetch', mockFetch);

    const adapter = new RealAdapter();
    const result = await adapter.analyzeProduct({ productAsset: TEST_PRODUCT_ASSET });

    expect(mockFetch).toHaveBeenCalled();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/ai/analyze-product');
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.headers).toBeUndefined();

    expect(result).toEqual(mockProfile);
  });

  it('handles server side errors gracefully with stable properties', async () => {
    const originalBlob = new Blob(['sample-image-data'], { type: 'image/png' });
    await saveAsset('ref-test-xyz', originalBlob);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        code: 'INVALID_SIGNATURE',
        message: '无法识别的文件签名，上传文件可能已损坏或格式伪造。',
        retryable: false,
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const adapter = new RealAdapter();
    
    try {
      await adapter.analyzeProduct({ productAsset: TEST_PRODUCT_ASSET });
      expect.fail('Should have failed');
    } catch (err: any) {
      expect(err.message).toBe('无法识别的文件签名，上传文件可能已损坏或格式伪造。');
      expect(err.code).toBe('INVALID_SIGNATURE');
      expect(err.retryable).toBe(false);
    }
  });

  it('rejects responses that do not conform to ProductProfile Zod schema', async () => {
    const originalBlob = new Blob(['sample-image-data'], { type: 'image/png' });
    await saveAsset('ref-test-xyz', originalBlob);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        invalidField: 'yes',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const adapter = new RealAdapter();
    await expect(adapter.analyzeProduct({ productAsset: TEST_PRODUCT_ASSET }))
      .rejects
      .toThrow('服务端分析数据校验失败，不符合 Zod 强契约规范');
  });
});
