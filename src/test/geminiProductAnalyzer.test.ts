import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiProductAnalysisService, GeminiClient } from '../../server/services/geminiProductAnalyzer.js';

class MockGeminiClient implements GeminiClient {
  public generateContent = vi.fn();
}

const VALID_MOCK_RESPONSE = {
  schemaVersion: '1.0',
  productType: 'desk_calendar',
  bracketType: 'paper_base',
  subjectBounds: { x: 50, y: 50, width: 300, height: 400 },
  contactRegion: { xStart: 100, xEnd: 300, y: 440, confidence: 'high' },
  view: {
    class: 'front_left',
    visibleTop: 'none',
    visibleSide: 'left',
    perspectiveStrength: 'medium'
  },
  materials: [
    { name: 'paper', reflectivity: 'low' },
    { name: 'wood', reflectivity: 'low' }
  ],
  palette: {
    dominant: ['#FFFFFF', '#2C3E50'],
    edgeBrightness: 'light'
  },
  existingLighting: {
    direction: 'upper_left',
    temperature: 'neutral_warm',
    softness: 'soft',
    contrast: 'medium'
  },
  uncertainties: [],
  overallConfidence: 'high'
};

describe('GeminiProductAnalysisService Unit Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.GEMINI_API_KEY = 'mock-key-123';
    process.env.GEMINI_ANALYSIS_MODEL = 'gemini-3.5-flash';
    process.env.GEMINI_ANALYSIS_TIMEOUT_MS = '5000';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('1. Missing Key throws SERVICE_NOT_CONFIGURED', async () => {
    delete process.env.GEMINI_API_KEY;
    const client = new MockGeminiClient();
    const service = new GeminiProductAnalysisService(client);
    const dummyBuffer = Buffer.from('dummy-image');

    await expect(service.analyze(dummyBuffer, 'image/png', 'asset-123', 'gemini-3.5-flash'))
      .rejects
      .toThrowError('系统未配置大语言模型 API 密钥');

    try {
      await service.analyze(dummyBuffer, 'image/png', 'asset-123', 'gemini-3.5-flash');
    } catch (err: any) {
      expect(err.code).toBe('SERVICE_NOT_CONFIGURED');
      expect(err.retryable).toBe(false);
    }
  });

  it('2. Legitimate structured response parses and validates successfully', async () => {
    const client = new MockGeminiClient();
    client.generateContent.mockResolvedValue({
      text: JSON.stringify(VALID_MOCK_RESPONSE)
    });

    const service = new GeminiProductAnalysisService(client);
    const dummyBuffer = Buffer.from('dummy-image');
    const result = await service.analyze(dummyBuffer, 'image/png', 'asset-123', 'gemini-3.5-flash');

    expect(result.productAssetId).toBe('asset-123');
    expect(result.productType).toBe('desk_calendar');
    expect(result.schemaVersion).toBe('1.0');
    expect(result.analyzedAt).toBeDefined();
    expect(client.generateContent).toHaveBeenCalledTimes(1);
  });

  it('3. Invalid JSON triggers repair attempt, fails twice then stops with GEMINI_PARSE_FAILED', async () => {
    const client = new MockGeminiClient();
    // Return garbage twice
    client.generateContent
      .mockResolvedValueOnce({ text: 'Not a JSON text' })
      .mockResolvedValueOnce({ text: 'Still not a JSON text' });

    const service = new GeminiProductAnalysisService(client);
    const dummyBuffer = Buffer.from('dummy-image');

    await expect(service.analyze(dummyBuffer, 'image/png', 'asset-123', 'gemini-3.5-flash'))
      .rejects
      .toThrowError('分析产品大模型响应解析及校验失败');

    expect(client.generateContent).toHaveBeenCalledTimes(2);

    try {
      await service.analyze(dummyBuffer, 'image/png', 'asset-123', 'gemini-3.5-flash');
    } catch (err: any) {
      expect(err.code).toBe('GEMINI_PARSE_FAILED');
    }
  });

  it('4. Schema missing fields triggers repair, fails twice then stops with GEMINI_PARSE_FAILED', async () => {
    const client = new MockGeminiClient();
    const invalidSchemaResponse = { ...VALID_MOCK_RESPONSE, productType: undefined };
    
    client.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify(invalidSchemaResponse) })
      .mockResolvedValueOnce({ text: JSON.stringify(invalidSchemaResponse) });

    const service = new GeminiProductAnalysisService(client);
    const dummyBuffer = Buffer.from('dummy-image');

    await expect(service.analyze(dummyBuffer, 'image/png', 'asset-123', 'gemini-3.5-flash'))
      .rejects
      .toThrowError('分析产品大模型响应解析及校验失败');

    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('5. Repair works successfully on second attempt (一次修复成功)', async () => {
    const client = new MockGeminiClient();
    client.generateContent
      .mockResolvedValueOnce({ text: 'garbage-json' })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RESPONSE) });

    const service = new GeminiProductAnalysisService(client);
    const dummyBuffer = Buffer.from('dummy-image');
    const result = await service.analyze(dummyBuffer, 'image/png', 'asset-123', 'gemini-3.5-flash');

    expect(result.productAssetId).toBe('asset-123');
    expect(result.productType).toBe('desk_calendar');
    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('6. Double failures stop exactly after second failure', async () => {
    const client = new MockGeminiClient();
    client.generateContent
      .mockResolvedValueOnce({ text: 'bad-1' })
      .mockResolvedValueOnce({ text: 'bad-2' })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RESPONSE) }); // third is valid but shouldn't be reached

    const service = new GeminiProductAnalysisService(client);
    const dummyBuffer = Buffer.from('dummy-image');

    await expect(service.analyze(dummyBuffer, 'image/png', 'asset-123', 'gemini-3.5-flash'))
      .rejects
      .toThrowError('分析产品大模型响应解析及校验失败');

    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('7. Timeout triggers TIMEOUT error', async () => {
    process.env.GEMINI_ANALYSIS_TIMEOUT_MS = '20'; // set very low timeout

    const client = new MockGeminiClient();
    // Simulate slow model response (50ms)
    client.generateContent.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return { text: JSON.stringify(VALID_MOCK_RESPONSE) };
    });

    const service = new GeminiProductAnalysisService(client);
    const dummyBuffer = Buffer.from('dummy-image');

    await expect(service.analyze(dummyBuffer, 'image/png', 'asset-123', 'gemini-3.5-flash'))
      .rejects
      .toThrowError('Gemini API 分析产品请求超时。');

    try {
      await service.analyze(dummyBuffer, 'image/png', 'asset-123', 'gemini-3.5-flash');
    } catch (err: any) {
      expect(err.code).toBe('TIMEOUT');
      expect(err.retryable).toBe(true);
    }
  });

  it('8. productAssetId cannot be overridden by model response', async () => {
    const client = new MockGeminiClient();
    const maliciousResponse = {
      ...VALID_MOCK_RESPONSE,
      productAssetId: 'hacked-asset-id' // model attempts to overwrite it
    };
    client.generateContent.mockResolvedValue({
      text: JSON.stringify(maliciousResponse)
    });

    const service = new GeminiProductAnalysisService(client);
    const dummyBuffer = Buffer.from('dummy-image');
    const result = await service.analyze(dummyBuffer, 'image/png', 'trusted-asset-id', 'gemini-3.5-flash');

    expect(result.productAssetId).toBe('trusted-asset-id'); // must remain our trusted field
  });

  it('9. Error response does not leak sensitive information (Key, Base64, model raw contents, stacks)', async () => {
    const client = new MockGeminiClient();
    client.generateContent.mockResolvedValue({
      text: 'MALICIOUS_MODEL_CONTENT_WITH_SECRET_KEY_EXPOSURE_12345'
    });

    const service = new GeminiProductAnalysisService(client);
    // Huge image data containing hypothetical sensitive content or base64 patterns
    const hugeBuffer = Buffer.from('VERY_LARGE_IMAGE_CONTENT_BASE64_ABC123'.repeat(100));

    try {
      await service.analyze(hugeBuffer, 'image/png', 'asset-id', 'gemini-3.5-flash');
      expect.fail('Should have failed');
    } catch (err: any) {
      // The error message must be generic and standard, without leaking the secrets
      const errorStr = JSON.stringify(err.message + ' ' + err.stack);
      
      expect(errorStr).not.toContain('mock-key-123');
      expect(errorStr).not.toContain('VERY_LARGE_IMAGE_CONTENT_BASE64_ABC123');
      expect(errorStr).not.toContain('MALICIOUS_MODEL_CONTENT_WITH_SECRET_KEY_EXPOSURE_12345');
    }
  });

  it('10. First returns English reason, second returns Chinese reason: triggers one repair and succeeds', async () => {
    const client = new MockGeminiClient();
    const firstResponse = {
      ...VALID_MOCK_RESPONSE,
      uncertainties: [
        { field: 'materials', reason: 'English reason message here', confidence: 'medium' }
      ]
    };
    const secondResponse = {
      ...VALID_MOCK_RESPONSE,
      uncertainties: [
        { field: 'materials', reason: '中文说明原因', confidence: 'medium' }
      ]
    };

    client.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify(firstResponse) })
      .mockResolvedValueOnce({ text: JSON.stringify(secondResponse) });

    const service = new GeminiProductAnalysisService(client);
    const dummyBuffer = Buffer.from('dummy-image');
    const result = await service.analyze(dummyBuffer, 'image/png', 'asset-123', 'gemini-3.5-flash');

    expect(result.productAssetId).toBe('asset-123');
    expect(result.uncertainties[0].reason).toBe('中文说明原因');
    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('11. Both attempts return English reason: stops with GEMINI_PARSE_FAILED', async () => {
    const client = new MockGeminiClient();
    const firstResponse = {
      ...VALID_MOCK_RESPONSE,
      uncertainties: [
        { field: 'materials', reason: 'English reason message here', confidence: 'medium' }
      ]
    };
    const secondResponse = {
      ...VALID_MOCK_RESPONSE,
      uncertainties: [
        { field: 'materials', reason: 'Another English explanation', confidence: 'medium' }
      ]
    };

    client.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify(firstResponse) })
      .mockResolvedValueOnce({ text: JSON.stringify(secondResponse) });

    const service = new GeminiProductAnalysisService(client);
    const dummyBuffer = Buffer.from('dummy-image');

    await expect(service.analyze(dummyBuffer, 'image/png', 'asset-123', 'gemini-3.5-flash'))
      .rejects
      .toThrowError('分析产品大模型响应解析及校验失败');

    expect(client.generateContent).toHaveBeenCalledTimes(2);
    
    try {
      await service.analyze(dummyBuffer, 'image/png', 'asset-123', 'gemini-3.5-flash');
    } catch (err: any) {
      expect(err.code).toBe('GEMINI_PARSE_FAILED');
    }
  });

  it('12. Chinese reason contains necessary English technical terms: succeeds', async () => {
    const client = new MockGeminiClient();
    const validResponse = {
      ...VALID_MOCK_RESPONSE,
      uncertainties: [
        { field: 'materials', reason: '无法确定该图层是否为 PNG 透明通道', confidence: 'medium' }
      ]
    };

    client.generateContent.mockResolvedValue({
      text: JSON.stringify(validResponse)
    });

    const service = new GeminiProductAnalysisService(client);
    const dummyBuffer = Buffer.from('dummy-image');
    const result = await service.analyze(dummyBuffer, 'image/png', 'asset-123', 'gemini-3.5-flash');

    expect(result.productAssetId).toBe('asset-123');
    expect(result.uncertainties[0].reason).toBe('无法确定该图层是否为 PNG 透明通道');
    expect(client.generateContent).toHaveBeenCalledTimes(1);
  });
});
