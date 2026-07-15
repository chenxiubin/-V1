import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiModelDiscoveryService } from '../../server/services/geminiModelDiscovery.js';

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

  it('fails if no API key', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(service.getAvailableModels()).rejects.toThrow('Gemini API Key 尚未配置。');
  });

  it('filters generateContent and embedding models', async () => {
    const mockModels = [
      { name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/text-embedding-004', supportedGenerationMethods: ['generateContent', 'embedContent'] },
      { name: 'models/gemini-3.0-pro', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/only-embed', supportedGenerationMethods: ['embedContent'] }
    ];
    
    // We need to return an object that is iterable, for await supports sync iterables (like arrays)
    mockList.mockResolvedValueOnce(mockModels);

    const result = await service.getAvailableModels();
    expect(result.models.length).toBe(2);
    expect(result.models.map(m => m.id)).toEqual(['gemini-3.5-flash', 'gemini-3.0-pro']);
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
});
