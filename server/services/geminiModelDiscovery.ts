import { GoogleGenAI } from '@google/genai';
import { getModelCapability } from '../../src/config/geminiModelCapabilities.js';

export interface DiscoveredModel {
  id: string;
  resourceName: string;
  displayName: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportedGenerationMethods: string[];
  releaseChannel: 'stable' | 'preview' | 'experimental';
  capabilities: {
    imageInput: boolean;
    structuredOutput: boolean;
    multimodalStatus: 'confirmed' | 'unknown';
  };
  selectableInFuture: boolean;
}

export interface ModelDiscoveryResult {
  models: DiscoveredModel[];
  currentConfiguredModelId: string;
  apiKeyConfigured: boolean;
  quota: {
    officialRemainingToday: null;
    officialDailyLimit: null;
    reason: string;
  };
  fetchedAt: string;
  cacheExpiresAt: string;
  stale: boolean;
  refreshError?: string;
}

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export class GeminiModelDiscoveryService {
  private cache: ModelDiscoveryResult | null = null;
  private pendingRequest: Promise<ModelDiscoveryResult> | null = null;

  async getAvailableModels(refresh: boolean = false): Promise<ModelDiscoveryResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    const currentConfiguredModelId = process.env.GEMINI_ANALYSIS_MODEL || 'gemini-3.5-flash';

    if (!apiKey) {
      const err = new Error('Gemini API Key 尚未配置。');
      (err as any).code = 'API_KEY_NOT_CONFIGURED';
      (err as any).retryable = false;
      throw err;
    }

    const now = Date.now();
    if (!refresh && this.cache && now < new Date(this.cache.cacheExpiresAt).getTime()) {
      // Current configuration model id should be updated even on cache hit, in case env changes without restart
      this.cache.currentConfiguredModelId = currentConfiguredModelId;
      return this.cache;
    }

    if (this.pendingRequest && !refresh) {
      return this.pendingRequest;
    }

    this.pendingRequest = this.fetchModelsFromGoogle(apiKey, currentConfiguredModelId, now)
      .then(result => {
        this.cache = result;
        this.pendingRequest = null;
        return result;
      })
      .catch(error => {
        this.pendingRequest = null;
        if (this.cache) {
          // If we have a cache, serve stale cache with an error note
          this.cache.stale = true;
          this.cache.refreshError = error.message;
          return this.cache;
        }
        
        // Otherwise throw appropriate error
        if (error.status === 400 || error.status === 403) {
          const err = new Error('当前 Gemini API Key 无法获取模型列表。');
          (err as any).code = 'API_KEY_INVALID';
          (err as any).retryable = false;
          throw err;
        }
        
        const err = new Error('暂时无法获取当前项目可用模型，请稍后刷新。');
        (err as any).code = 'MODEL_LIST_UNAVAILABLE';
        (err as any).retryable = true;
        throw err;
      });

    return this.pendingRequest;
  }

  private async fetchModelsFromGoogle(apiKey: string, currentConfiguredModelId: string, now: number): Promise<ModelDiscoveryResult> {
    const ai = new GoogleGenAI({ apiKey });
    
    let allModels: any[] = [];
    
    try {
      const response = await ai.models.list();
      for await (const m of response) {
        allModels.push(m);
      }
    } catch (error: any) {
      console.error("fetchModelsFromGoogle ERROR:", error.stack || error);
      throw error;
    }

    const discoveredModels: DiscoveredModel[] = [];

    for (const model of allModels) {
      const id = model.name.replace(/^models\//, '');
      const supportedMethods = model.supportedActions || model.supportedGenerationMethods || [];
      
      // We only care about generateContent models
      if (!supportedMethods.includes('generateContent')) {
        continue;
      }

      // Filter out some obvious non-generative models based on names if they snuck in
      if (id.includes('embedding') || id.includes('text-embedding') || id.includes('tts') || id.includes('veo') || id.includes('imagen')) {
        continue;
      }

      const capability = getModelCapability(id);

      discoveredModels.push({
        id,
        resourceName: model.name,
        displayName: model.displayName || id,
        description: model.description || '',
        inputTokenLimit: model.inputTokenLimit || 0,
        outputTokenLimit: model.outputTokenLimit || 0,
        supportedGenerationMethods: supportedMethods,
        releaseChannel: capability.releaseChannel,
        capabilities: {
          imageInput: capability.imageInput,
          structuredOutput: capability.structuredOutput,
          multimodalStatus: capability.multimodalStatus,
        },
        selectableInFuture: true
      });
    }

    return {
      models: discoveredModels,
      currentConfiguredModelId,
      apiKeyConfigured: true,
      quota: {
        officialRemainingToday: null,
        officialDailyLimit: null,
        reason: 'not_exposed_by_gemini_models_api'
      },
      fetchedAt: new Date(now).toISOString(),
      cacheExpiresAt: new Date(now + CACHE_DURATION_MS).toISOString(),
      stale: false,
      refreshError: undefined
    };
  }
}
