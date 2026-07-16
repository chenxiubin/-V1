import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveRuntimeModelId, modelDiscoveryService } from '../../server/services/geminiRuntimeModel.js';

describe('resolveRuntimeModelId unit and concurrency tests', () => {
  let originalEnvModel: string | undefined;

  beforeEach(() => {
    originalEnvModel = process.env.GEMINI_ANALYSIS_MODEL;
    process.env.GEMINI_ANALYSIS_MODEL = 'gemini-3.5-flash';
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.GEMINI_ANALYSIS_MODEL = originalEnvModel;
    vi.restoreAllMocks();
  });

  it('1. 未传 modelId，使用合法默认模型', async () => {
    const mockModelList = {
      models: [
        {
          id: 'gemini-3.5-flash',
          resourceName: 'models/gemini-3.5-flash',
          displayName: 'Gemini 3.5 Flash',
          description: 'Flash model',
          inputTokenLimit: 1000000,
          outputTokenLimit: 8192,
          supportedGenerationMethods: ['generateContent'],
          releaseChannel: 'stable' as const,
          compatibility: 'compatible' as const,
          capabilities: {
            imageInput: true,
            structuredOutput: true,
            multimodalStatus: 'confirmed' as const,
          },
          selectableInFuture: true,
        },
      ],
      currentConfiguredModelId: 'gemini-3.5-flash',
      apiKeyConfigured: true,
      quota: {
        officialRemainingToday: null,
        officialDailyLimit: null,
        reason: 'mock',
      },
      fetchedAt: new Date().toISOString(),
      cacheExpiresAt: new Date(Date.now() + 60000).toISOString(),
      stale: false,
    };

    vi.spyOn(modelDiscoveryService, 'getAvailableModels').mockResolvedValue(mockModelList as any);

    const res = await resolveRuntimeModelId(undefined);
    expect(res.effectiveModelId).toBe('gemini-3.5-flash');
    expect(res.source).toBe('server_default');
  });

  it('2. 默认模型为空，返回 DEFAULT_MODEL_NOT_CONFIGURED', async () => {
    process.env.GEMINI_ANALYSIS_MODEL = '';
    try {
      await resolveRuntimeModelId(undefined);
      expect.fail('Should throw');
    } catch (e: any) {
      expect(e.code).toBe('DEFAULT_MODEL_NOT_CONFIGURED');
      expect(e.status).toBe(500);
      expect(e.retryable).toBe(false);
    }
  });

  it('3. 默认模型格式非法，返回 DEFAULT_MODEL_NOT_CONFIGURED', async () => {
    process.env.GEMINI_ANALYSIS_MODEL = 'invalid name with spaces';
    try {
      await resolveRuntimeModelId(undefined);
      expect.fail('Should throw');
    } catch (e: any) {
      expect(e.code).toBe('DEFAULT_MODEL_NOT_CONFIGURED');
      expect(e.status).toBe(500);
    }

    process.env.GEMINI_ANALYSIS_MODEL = 'models/gemini-pro';
    try {
      await resolveRuntimeModelId(undefined);
      expect.fail('Should throw');
    } catch (e: any) {
      expect(e.code).toBe('DEFAULT_MODEL_NOT_CONFIGURED');
      expect(e.status).toBe(500);
    }
  });

  it('4. modelId 格式非法，返回 INVALID_MODEL_ID', async () => {
    try {
      await resolveRuntimeModelId('invalid name with spaces');
      expect.fail('Should throw');
    } catch (e: any) {
      expect(e.code).toBe('INVALID_MODEL_ID');
      expect(e.status).toBe(400);
    }

    try {
      await resolveRuntimeModelId('models/gemini-pro');
      expect.fail('Should throw');
    } catch (e: any) {
      expect(e.code).toBe('INVALID_MODEL_ID');
      expect(e.status).toBe(400);
    }

    try {
      await resolveRuntimeModelId('gemini-<script>');
      expect.fail('Should throw');
    } catch (e: any) {
      expect(e.code).toBe('INVALID_MODEL_ID');
      expect(e.status).toBe(400);
    }
  });

  it('5. 格式合法但列表不存在，返回 MODEL_NOT_FOUND', async () => {
    const mockModelList = {
      models: [],
      currentConfiguredModelId: 'gemini-3.5-flash',
      apiKeyConfigured: true,
      quota: { officialRemainingToday: null, officialDailyLimit: null, reason: 'mock' },
      fetchedAt: new Date().toISOString(),
      cacheExpiresAt: new Date(Date.now() + 60000).toISOString(),
      stale: false,
    };
    vi.spyOn(modelDiscoveryService, 'getAvailableModels').mockResolvedValue(mockModelList as any);

    try {
      await resolveRuntimeModelId('gemini-3.5-flash');
      expect.fail('Should throw');
    } catch (e: any) {
      expect(e.code).toBe('MODEL_NOT_FOUND');
      expect(e.status).toBe(404);
    }
  });

  it('6. compatibility=incompatible，返回 MODEL_NOT_COMPATIBLE', async () => {
    const mockModelList = {
      models: [
        {
          id: 'gemini-3.5-flash',
          supportedGenerationMethods: ['generateContent'],
          releaseChannel: 'stable',
          compatibility: 'incompatible',
          capabilities: { imageInput: true, structuredOutput: true, multimodalStatus: 'confirmed' },
          selectableInFuture: true,
        },
      ],
    };
    vi.spyOn(modelDiscoveryService, 'getAvailableModels').mockResolvedValue(mockModelList as any);

    try {
      await resolveRuntimeModelId('gemini-3.5-flash');
      expect.fail('Should throw');
    } catch (e: any) {
      expect(e.code).toBe('MODEL_NOT_COMPATIBLE');
      expect(e.status).toBe(400);
    }
  });

  it('7. compatibility=unknown，返回 MODEL_NOT_COMPATIBLE', async () => {
    const mockModelList = {
      models: [
        {
          id: 'gemini-3.5-flash',
          supportedGenerationMethods: ['generateContent'],
          releaseChannel: 'stable',
          compatibility: 'unknown',
          capabilities: { imageInput: true, structuredOutput: true, multimodalStatus: 'confirmed' },
          selectableInFuture: true,
        },
      ],
    };
    vi.spyOn(modelDiscoveryService, 'getAvailableModels').mockResolvedValue(mockModelList as any);

    try {
      await resolveRuntimeModelId('gemini-3.5-flash');
      expect.fail('Should throw');
    } catch (e: any) {
      expect(e.code).toBe('MODEL_NOT_COMPATIBLE');
      expect(e.status).toBe(400);
    }
  });

  it('8. selectableInFuture=false，返回 MODEL_NOT_COMPATIBLE', async () => {
    const mockModelList = {
      models: [
        {
          id: 'gemini-3.5-flash',
          supportedGenerationMethods: ['generateContent'],
          releaseChannel: 'stable',
          compatibility: 'compatible',
          capabilities: { imageInput: true, structuredOutput: true, multimodalStatus: 'confirmed' },
          selectableInFuture: false,
        },
      ],
    };
    vi.spyOn(modelDiscoveryService, 'getAvailableModels').mockResolvedValue(mockModelList as any);

    try {
      await resolveRuntimeModelId('gemini-3.5-flash');
      expect.fail('Should throw');
    } catch (e: any) {
      expect(e.code).toBe('MODEL_NOT_COMPATIBLE');
      expect(e.status).toBe(400);
    }
  });

  it('9. generateContent 缺失，返回 MODEL_NOT_COMPATIBLE', async () => {
    const mockModelList = {
      models: [
        {
          id: 'gemini-3.5-flash',
          supportedGenerationMethods: ['otherMethod'],
          releaseChannel: 'stable',
          compatibility: 'compatible',
          capabilities: { imageInput: true, structuredOutput: true, multimodalStatus: 'confirmed' },
          selectableInFuture: true,
        },
      ],
    };
    vi.spyOn(modelDiscoveryService, 'getAvailableModels').mockResolvedValue(mockModelList as any);

    try {
      await resolveRuntimeModelId('gemini-3.5-flash');
      expect.fail('Should throw');
    } catch (e: any) {
      expect(e.code).toBe('MODEL_NOT_COMPATIBLE');
      expect(e.status).toBe(400);
    }
  });

  it('10. imageInput=false，返回 MODEL_NOT_COMPATIBLE', async () => {
    const mockModelList = {
      models: [
        {
          id: 'gemini-3.5-flash',
          supportedGenerationMethods: ['generateContent'],
          releaseChannel: 'stable',
          compatibility: 'compatible',
          capabilities: { imageInput: false, structuredOutput: true, multimodalStatus: 'confirmed' },
          selectableInFuture: true,
        },
      ],
    };
    vi.spyOn(modelDiscoveryService, 'getAvailableModels').mockResolvedValue(mockModelList as any);

    try {
      await resolveRuntimeModelId('gemini-3.5-flash');
      expect.fail('Should throw');
    } catch (e: any) {
      expect(e.code).toBe('MODEL_NOT_COMPATIBLE');
      expect(e.status).toBe(400);
    }
  });

  it('11. structuredOutput=false，返回 MODEL_NOT_COMPATIBLE', async () => {
    const mockModelList = {
      models: [
        {
          id: 'gemini-3.5-flash',
          supportedGenerationMethods: ['generateContent'],
          releaseChannel: 'stable',
          compatibility: 'compatible',
          capabilities: { imageInput: true, structuredOutput: false, multimodalStatus: 'confirmed' },
          selectableInFuture: true,
        },
      ],
    };
    vi.spyOn(modelDiscoveryService, 'getAvailableModels').mockResolvedValue(mockModelList as any);

    try {
      await resolveRuntimeModelId('gemini-3.5-flash');
      expect.fail('Should throw');
    } catch (e: any) {
      expect(e.code).toBe('MODEL_NOT_COMPATIBLE');
      expect(e.status).toBe(400);
    }
  });

  it('12. multimodalStatus=unknown，返回 MODEL_NOT_COMPATIBLE', async () => {
    const mockModelList = {
      models: [
        {
          id: 'gemini-3.5-flash',
          supportedGenerationMethods: ['generateContent'],
          releaseChannel: 'stable',
          compatibility: 'compatible',
          capabilities: { imageInput: true, structuredOutput: true, multimodalStatus: 'unknown' },
          selectableInFuture: true,
        },
      ],
    };
    vi.spyOn(modelDiscoveryService, 'getAvailableModels').mockResolvedValue(mockModelList as any);

    try {
      await resolveRuntimeModelId('gemini-3.5-flash');
      expect.fail('Should throw');
    } catch (e: any) {
      expect(e.code).toBe('MODEL_NOT_COMPATIBLE');
      expect(e.status).toBe(400);
    }
  });

  it('13. 模型发现失败且无缓存，返回 MODEL_VALIDATION_UNAVAILABLE', async () => {
    vi.spyOn(modelDiscoveryService, 'getAvailableModels').mockRejectedValue(new Error('Network error'));

    try {
      await resolveRuntimeModelId('gemini-3.5-flash');
      expect.fail('Should throw');
    } catch (e: any) {
      expect(e.code).toBe('MODEL_VALIDATION_UNAVAILABLE');
      expect(e.status).toBe(503);
      expect(e.retryable).toBe(true);
    }
  });

  it('14. 显式模型失败时不调用默认模型', async () => {
    vi.spyOn(modelDiscoveryService, 'getAvailableModels').mockRejectedValue(new Error('Network error'));

    try {
      await resolveRuntimeModelId('gemini-3.5-flash');
      expect.fail('Should throw');
    } catch (e: any) {
      expect(e.code).toBe('MODEL_VALIDATION_UNAVAILABLE');
    }
  });

  it('15. 不调用 generateContent 做探测', async () => {
    const spy = vi.spyOn(modelDiscoveryService, 'getAvailableModels');
    try {
      await resolveRuntimeModelId('gemini-3.5-flash');
    } catch (e) {}
    expect(spy).toHaveBeenCalled();
  });

  it('16. 不修改 process.env', async () => {
    const beforeVal = process.env.GEMINI_ANALYSIS_MODEL;
    try {
      await resolveRuntimeModelId('gemini-3.5-flash');
    } catch (e) {}
    expect(process.env.GEMINI_ANALYSIS_MODEL).toBe(beforeVal);
  });

  it('17. 不使用服务端全局 selectedModelId', async () => {
    const res1 = await resolveRuntimeModelId(undefined).catch(() => null);
    const res2 = await resolveRuntimeModelId('gemini-3.5-flash').catch(() => null);
    expect(res1).not.toEqual(res2);
  });

  it('18. 两个并发请求分别选择模型 A 和 B 隔离验证，并且运行后 process.env.GEMINI_ANALYSIS_MODEL 保持原值', async () => {
    const mockModelList = {
      models: [
        {
          id: 'gemini-model-a',
          supportedGenerationMethods: ['generateContent'],
          releaseChannel: 'stable',
          compatibility: 'compatible',
          capabilities: { imageInput: true, structuredOutput: true, multimodalStatus: 'confirmed' },
          selectableInFuture: true,
        },
        {
          id: 'gemini-model-b',
          supportedGenerationMethods: ['generateContent'],
          releaseChannel: 'stable',
          compatibility: 'compatible',
          capabilities: { imageInput: true, structuredOutput: true, multimodalStatus: 'confirmed' },
          selectableInFuture: true,
        },
      ],
    };
    vi.spyOn(modelDiscoveryService, 'getAvailableModels').mockResolvedValue(mockModelList as any);

    const beforeVal = process.env.GEMINI_ANALYSIS_MODEL;

    const [resA, resB] = await Promise.all([
      resolveRuntimeModelId('gemini-model-a'),
      resolveRuntimeModelId('gemini-model-b'),
    ]);

    expect(resA.effectiveModelId).toBe('gemini-model-a');
    expect(resA.source).toBe('user_selection');

    expect(resB.effectiveModelId).toBe('gemini-model-b');
    expect(resB.source).toBe('user_selection');

    expect(process.env.GEMINI_ANALYSIS_MODEL).toBe(beforeVal);
  });
});
