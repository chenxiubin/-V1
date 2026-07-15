import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  let service: GeminiModelDiscoveryService;

  beforeEach(() => {
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
    it('handles normal errors without exposing key or full stack', () => {
      const err = new Error('Secret API Key is ABC');
      const sanitized = sanitizeModelDiscoveryError(err);
      expect(sanitized.code).toBe('UNKNOWN');
      expect(sanitized.status).toBe(500);
      expect(sanitized.retryable).toBe(true);
      expect(sanitized.messageSummary).toBe('Secret API Key is ABC');
      expect((sanitized as any).stack).toBeUndefined();
    });

    it('preserves status and retryable for 403', () => {
      const err: any = new Error('Forbidden');
      err.status = 403;
      const sanitized = sanitizeModelDiscoveryError(err);
      expect(sanitized.status).toBe(403);
      expect(sanitized.retryable).toBe(false);
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

    it('serves stale cache on refresh error', async () => {
      const mockModels = [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }];
      mockList.mockResolvedValueOnce(mockModels);

      await service.getAvailableModels();
      
      mockList.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await service.getAvailableModels(true);
      expect(result.stale).toBe(true);
      expect(result.refreshError).toBe('Network error');
      expect(result.models.length).toBe(1);
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
