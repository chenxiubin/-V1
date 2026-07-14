import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server/app';
import { ProductAnalysisService } from '../../server/services/productAnalysisService';
import { ProductProfile } from '../types/schemas';

class MockSuccessAnalysisService implements ProductAnalysisService {
  async analyze(fileBuffer: Buffer, mimeType: string, productAssetId: string): Promise<ProductProfile> {
    return {
      schemaVersion: '1.0',
      productAssetId,
      productType: 'desk_calendar',
      bracketType: 'paper_base',
      subjectBounds: { x: 10, y: 10, width: 200, height: 200 },
      contactRegion: { xStart: 20, xEnd: 180, y: 210, confidence: 'high' },
      view: { class: 'front', visibleTop: 'none', visibleSide: 'none', perspectiveStrength: 'low' },
      materials: [{ name: 'paper', reflectivity: 'low' }],
      palette: { dominant: ['#FFFFFF'], edgeBrightness: 'light' },
      existingLighting: { direction: 'front', temperature: 'neutral', softness: 'soft', contrast: 'low' },
      uncertainties: [],
      overallConfidence: 'high',
      analyzedAt: new Date().toISOString(),
    };
  }
}

class MockFailureAnalysisService implements ProductAnalysisService {
  async analyze(fileBuffer: Buffer, mimeType: string, productAssetId: string): Promise<ProductProfile> {
    const err = new Error('模型服务暂时不可用，请稍后重试');
    (err as any).code = 'MODEL_UNAVAILABLE';
    (err as any).retryable = true;
    throw err;
  }
}

describe('Express /api/ai/analyze-product Endpoint Tests', () => {
  beforeEach(() => {
    app.set('productAnalysisService', new MockSuccessAnalysisService());
  });

  it('Missing product file', async () => {
    const res = await request(app)
      .post('/api/ai/analyze-product')
      .field('productAssetId', 'test-id');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      code: 'MISSING_FILE',
      message: '未接收到产品图片，请选择需要上传的产品图片。',
      retryable: false,
    });
  });

  it('Missing productAssetId', async () => {
    const buffer = Buffer.from('dummy-png-content');
    const res = await request(app)
      .post('/api/ai/analyze-product')
      .attach('productImage', buffer, 'test.png');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      code: 'MISSING_ASSET_ID',
      message: '缺少产品资产关联标识(productAssetId)。',
      retryable: false,
    });
  });

  it('Invalid MIME type', async () => {
    const buffer = Buffer.from('dummy-gif-content');
    const res = await request(app)
      .post('/api/ai/analyze-product')
      .field('productAssetId', 'test-id')
      .attach('productImage', buffer, 'test.gif');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      code: 'INVALID_MIME',
      message: '不支持的文件格式，仅支持 PNG、JPEG 和 WebP 格式图片。',
      retryable: false,
    });
  });

  it('Forged/Invalid signature (GIF disguised as PNG)', async () => {
    const buffer = Buffer.from('GIF89a disguised as PNG but invalid signature');
    const res = await request(app)
      .post('/api/ai/analyze-product')
      .field('productAssetId', 'test-id')
      .attach('productImage', buffer, { filename: 'test.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_SIGNATURE');
    expect(res.body.retryable).toBe(false);
  });

  it('File too large > 10MB limit', async () => {
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
    const res = await request(app)
      .post('/api/ai/analyze-product')
      .field('productAssetId', 'test-id')
      .attach('productImage', largeBuffer, 'test.png');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      code: 'FILE_TOO_LARGE',
      message: '文件大小超过10MB上限，请重新上传。',
      retryable: false,
    });
  });

  it('Successful upload and validated mock analysis', async () => {
    const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const pngBuffer = Buffer.from(base64Png, 'base64');

    const res = await request(app)
      .post('/api/ai/analyze-product')
      .field('productAssetId', 'valid-asset-id')
      .attach('productImage', pngBuffer, { filename: 'test.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.schemaVersion).toBe('1.0');
    expect(res.body.productAssetId).toBe('valid-asset-id');
    expect(res.body.productType).toBe('desk_calendar');
  });

  it('Propagates service failures with stable structure', async () => {
    app.set('productAnalysisService', new MockFailureAnalysisService());

    const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const pngBuffer = Buffer.from(base64Png, 'base64');

    const res = await request(app)
      .post('/api/ai/analyze-product')
      .field('productAssetId', 'fail-asset-id')
      .attach('productImage', pngBuffer, { filename: 'test.png', contentType: 'image/png' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      code: 'MODEL_UNAVAILABLE',
      message: '模型服务暂时不可用，请稍后重试',
      retryable: true,
    });
  });
});
