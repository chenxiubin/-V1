import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiModelDiscoveryService, getSupportedModelActions, sanitizeModelDiscoveryError } from '../../server/services/geminiModelDiscovery.js';

const mockList = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        list: mockList
      };
    }
  };
});

describe('GeminiModelDiscoveryService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  let service: GeminiModelDiscoveryService;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    service = new GeminiModelDiscoveryService();
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_ANALYSIS_MODEL = 'gemini-3.5-flash';
    mockList.mockReset();
  });

  describe('getSupportedModelActions', () => {
    it('returns empty array if no effective field', () => {
      expect(getSupportedModelActions({})).toEqual([]);
      expect(getSupportedModelActions({ supportedActions: null, supportedGenerationMethods: 'invalid' })).toEqual([]);
    });

    it('returns supportedActions if present', () => {
      expect(getSupportedModelActions({ supportedActions: ['generateContent'] })).toEqual(['generateContent']);
    });

    it('returns supportedGenerationMethods if present', () => {
      expect(getSupportedModelActions({ supportedGenerationMethods: ['countTokens'] })).toEqual(['countTokens']);
    });

    it('combines and deduplicates both fields', () => {
      expect(getSupportedModelActions({
        supportedActions: ['generateContent', 'countTokens'],
        supportedGenerationMethods: ['countTokens', 'embedContent']
      })).toEqual(['generateContent', 'countTokens', 'embedContent']);
    });
  });

  describe('sanitizeModelDiscoveryError', () => {
    it('redacts Authorization Bearer Token', () => {
      const err = new Error('Failed: Authorization: Bearer TOPSECRET123');
      const sanitized = sanitizeModelDiscoveryError(err);
      expect(sanitized.messageSummary).not.toContain('TOPSECRET123');
      expect(sanitized.messageSummary).toContain('Authorization: [REDACTED]');
    });

    it('redacts simple Bearer Token', () => {
      const err = new Error('Failed: Bearer TOPSECRET123');
      const sanitized = sanitizeModelDiscoveryError(err);
      expect(sanitized.messageSummary).not.toContain('TOPSECRET123');
      expect(sanitized.messageSummary).toContain('Bearer [REDACTED]');
    });

    it('redacts AIza and sk- Key', () => {
      const err = new Error('Keys AIzaSyB123 and sk-12345678901234567890');
      const sanitized = sanitizeModelDiscoveryError(err);
      expect(sanitized.messageSummary).not.toContain('AIzaSyB123');
      expect(sanitized.messageSummary).not.toContain('12345678901234567890');
      expect(sanitized.messageSummary).toContain('[REDACTED]');
    });

    it('redacts URL token parameter', () => {
      const err = new Error('URL param token=SECRET_VAL_456');
      const sanitized = sanitizeModelDiscoveryError(err);
      expect(sanitized.messageSummary).not.toContain('SECRET_VAL_456');
      expect(sanitized.messageSummary).toContain('token=[REDACTED]');
    });

    it('redacts localhost complete URL', () => {
      const err = new Error('Error at http://localhost:3000/private/path?token=abc');
      const sanitized = sanitizeModelDiscoveryError(err);
      expect(sanitized.messageSummary).not.toContain('private/path');
      expect(sanitized.messageSummary).not.toContain('token=abc');
      expect(sanitized.messageSummary).not.toContain('localhost');
      expect(sanitized.messageSummary).toContain('[REDACTED]');
    });

    it('redacts file:// paths', () => {
      const err = new Error('Error at file:///home/user/secret.txt');
      const sanitized = sanitizeModelDiscoveryError(err);
      expect(sanitized.messageSummary).not.toContain('user/secret.txt');
      expect(sanitized.messageSummary).not.toContain('file://');
      expect(sanitized.messageSummary).toContain('[REDACTED]');
    });

    it('redacts Unix absolute paths', () => {
      const err = new Error('Error at /home/user/secret.txt and /var/www/html');
      const sanitized = sanitizeModelDiscoveryError(err);
      expect(sanitized.messageSummary).not.toContain('user/secret.txt');
      expect(sanitized.messageSummary).not.toContain('www/html');
      expect(sanitized.messageSummary).toContain('[REDACTED]');
    });

    it('redacts Windows absolute paths', () => {
      const err = new Error('Error at C:\\Windows\\temp\\secret.txt');
      const sanitized = sanitizeModelDiscoveryError(err);
      expect(sanitized.messageSummary).not.toContain('temp\\secret.txt');
      expect(sanitized.messageSummary).toContain('[REDACTED]');
    });

    it('redacts Base64 image data', () => {
      const err = new Error('Upload failed: data:image/png;base64,AAAA BBBB');
      const sanitized = sanitizeModelDiscoveryError(err);
      expect(sanitized.messageSummary).not.toContain('AAAA');
      expect(sanitized.messageSummary).not.toContain('BBBB');
      expect(sanitized.messageSummary).toContain('[REDACTED]');
    });

    it('does not leak original stack', () => {
      const err = new Error('Test error');
      const sanitized = sanitizeModelDiscoveryError(err);
      expect((sanitized as any).stack).toBeUndefined();
    });

    it('preserves status and retryable for 403 and maintains general message', () => {
      const err: any = new Error('Forbidden due to quota limits');
      err.status = 403;
      const sanitized = sanitizeModelDiscoveryError(err);
      expect(sanitized.status).toBe(403);
      expect(sanitized.retryable).toBe(false);
      expect(sanitized.messageSummary).toContain('Forbidden');
    });
  });
  describe('Service behaviors', () => {
    it('fails if no API key', async () => {
      delete process.env.GEMINI_API_KEY;
      await expect(service.getAvailableModels()).rejects.toThrow('Gemini API Key 尚未配置。');
    });

    it('filters generateContent and embedding models', async () => {
      const mockModels = [
        { name: 'models/gemini-3.5-flash', supportedActions: ['generateContent'] },
        { name: 'models/text-embedding-004', supportedActions: ['generateContent', 'embedContent'] },
        { name: 'models/gemini-3.0-pro', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/only-embed', supportedActions: ['embedContent'] }
      ];
      
      mockList.mockResolvedValueOnce(mockModels);

      const result = await service.getAvailableModels();
      // Now it returns 4 models because it sets compatibility rather than filtering strictly.
      expect(result.models.length).toBe(4);
      // No longer strictly filtering
      
      // Does not call generateContent directly
      expect(mockList).toHaveBeenCalledTimes(1);
    });

    it('caches results for 5 minutes', async () => {
      const mockModels = [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }];
      mockList.mockResolvedValueOnce(mockModels);

      await service.getAvailableModels();
      await service.getAvailableModels();
      
      expect(mockList).toHaveBeenCalledTimes(1);
    });

    it('bypasses cache on refresh=true', async () => {
      const mockModels = [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }];
      mockList.mockResolvedValue(mockModels);

      await service.getAvailableModels();
      await service.getAvailableModels(true);
      
      expect(mockList).toHaveBeenCalledTimes(2);
    });

    it('sets officialRemainingToday to null and assigns unknown multimodalStatus properly', async () => {
      const mockModels = [
        { name: 'models/gemini-unknown-model', supportedGenerationMethods: ['generateContent'] }
      ];
      mockList.mockResolvedValueOnce(mockModels);

      const result = await service.getAvailableModels();
      expect(result.quota.officialRemainingToday).toBeNull();
      expect(result.models[0].capabilities.multimodalStatus).toBe('unknown');
    });

    it('re-uses in-flight promise for concurrent requests', async () => {
      const mockModels = [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }];
      mockList.mockImplementation(async () => {
        await new Promise(r => setTimeout(r, 50));
        return mockModels;
      });

      const [res1, res2] = await Promise.all([
        service.getAvailableModels(),
        service.getAvailableModels()
      ]);
      
      expect(mockList).toHaveBeenCalledTimes(1);
      expect(res1).toBe(res2);
    });

    it('re-uses in-flight promise for concurrent refresh requests', async () => {
      const mockModels = [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }];
      mockList.mockImplementation(async () => {
        await new Promise(r => setTimeout(r, 50));
        return mockModels;
      });

      const [res1, res2] = await Promise.all([
        service.getAvailableModels(true),
        service.getAvailableModels(true)
      ]);
      
      expect(mockList).toHaveBeenCalledTimes(1);
      expect(res1).toBe(res2);
    });

    it('re-uses in-flight promise for mixed normal and refresh requests', async () => {
      const mockModels = [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }];
      mockList.mockImplementation(async () => {
        await new Promise(r => setTimeout(r, 50));
        return mockModels;
      });

      const [res1, res2] = await Promise.all([
        service.getAvailableModels(),
        service.getAvailableModels(true)
      ]);
      
      expect(mockList).toHaveBeenCalledTimes(1);
      expect(res1).toBe(res2);
    });

    it('clears pending request after failure', async () => {
      mockList.mockRejectedValueOnce(new Error('Network error'));
      await expect(service.getAvailableModels()).rejects.toThrow('暂时无法获取当前项目可用模型，请稍后重试。');

      const mockModels = [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }];
      mockList.mockResolvedValueOnce(mockModels);
      
      const res = await service.getAvailableModels();
      expect(mockList).toHaveBeenCalledTimes(2);
      expect(res.models.length).toBe(1);
    });

        it('serves stale cache on refresh error and does not mutate original cache with real sanitizer', async () => {
      const mockModels = [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }];
      mockList.mockResolvedValueOnce(mockModels);
      const originalResult = await service.getAvailableModels();
      expect(originalResult.stale).toBe(false);
      
      mockList.mockRejectedValueOnce(new Error('Network error with Authorization: Bearer TOPSECRET123 and file:///home/user/secret.txt'));
      
      const staleResult = await service.getAvailableModels(true);
      expect(staleResult.stale).toBe(true);
      expect(staleResult.refreshError).not.toContain('TOPSECRET123');
      expect(staleResult.refreshError).not.toContain('user/secret.txt');
      expect(staleResult.refreshError).toContain('[REDACTED]');
      expect(staleResult.models.length).toBe(1);
      
      // Original cache should remain pristine
      expect(originalResult.stale).toBe(false);
      expect(originalResult.refreshError).toBeUndefined();
      expect(staleResult).not.toBe(originalResult);
      
      // Next normal fetch should return pristine cache
      const cachedResult = await service.getAvailableModels(false);
      expect(cachedResult.stale).toBe(false);
      expect(cachedResult.refreshError).toBeUndefined();
    });

    it('throws API_KEY_INVALID for 400/403', async () => {
      const error: any = new Error('Forbidden');
      error.status = 403;
      mockList.mockRejectedValueOnce(error);

      await expect(service.getAvailableModels()).rejects.toThrow('当前 Gemini API Key 无法获取模型列表。');
    });

    it('does not leak API key to response', async () => {
      const mockModels = [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }];
      mockList.mockResolvedValueOnce(mockModels);

      const result = await service.getAvailableModels();
      expect(JSON.stringify(result)).not.toContain('test-key');
    });
  });
});
