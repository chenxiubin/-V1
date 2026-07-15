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
  releaseChannel: 'stable' | 'preview' | 'experimental' | 'unknown';
  compatibility: 'compatible' | 'unknown' | 'incompatible';
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

export function getSupportedModelActions(model: any): string[] {
  const actions = Array.isArray(model?.supportedActions) ? model.supportedActions : [];
  const methods = Array.isArray(model?.supportedGenerationMethods) ? model.supportedGenerationMethods : [];
  const combined = Array.from(new Set([...actions, ...methods]));
  return combined.filter((s): s is string => typeof s === 'string');
}

export function sanitizeModelDiscoveryError(error: any) {
  let msg = error?.message ? String(error.message).substring(0, 200) : 'Unknown error';
  
  // Redact secrets
  msg = msg.replace(/AIza[a-zA-Z0-9_-]{35}/g, '[REDACTED]')
           .replace(/sk-[a-zA-Z0-9]{40,}/g, '[REDACTED]')
           .replace(/(Bearer|api_key=|key=|token=)[^&\s'"]+/gi, '$1[REDACTED]')
           .replace(/Authorization:\s*[^'"\s]+/gi, 'Authorization: [REDACTED]')
           .replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/gi, '[BASE64_IMAGE]')
           .replace(/(localhost|127\.0\.0\.1|file:\/\/|\/home\/|\/mnt\/|\/tmp\/|\/var\/|[A-Z]:\\[^\s'"]+)/gi, '[LOCAL_PATH]');

  return {
    code: error?.status || error?.code || 'UNKNOWN',
    status: error?.status || 500,
    retryable: error?.status !== 400 && error?.status !== 403,
    messageSummary: msg,
    hasStaleCache: false // will be updated contextually if needed
  };
}

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

    if (this.pendingRequest) {
      return this.pendingRequest;
    }

    const now = Date.now();
    if (!refresh && this.cache && now < new Date(this.cache.cacheExpiresAt).getTime()) {
      // Current configuration model id should be updated even on cache hit, in case env changes without restart
      this.cache.currentConfiguredModelId = currentConfiguredModelId;
      return this.cache;
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
        
        const err = new Error('暂时无法获取当前项目可用模型，请稍后重试。');
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
      const sanitized = sanitizeModelDiscoveryError(error);
      sanitized.hasStaleCache = !!this.cache;
      console.error("[MODEL_DISCOVERY_ERROR]", JSON.stringify(sanitized));
      throw error;
    }

    const discoveredModels: DiscoveredModel[] = [];
    for (const model of allModels) {
      const id = model.name.replace(/^models\//, '');
      const supportedMethods = getSupportedModelActions(model);
      const displayName = model.displayName || id;
      
      const capability = getModelCapability(id);

      // Determine Release Channel
      let releaseChannel: 'stable' | 'preview' | 'experimental' | 'unknown' = 'unknown';
      if (capability.releaseChannel && capability.releaseChannel !== 'unknown' as any) {
        releaseChannel = capability.releaseChannel;
      } else {
        const idLower = id.toLowerCase();
        const displayLower = displayName.toLowerCase();
        if (idLower.includes('-preview') || displayLower.includes('preview')) {
          releaseChannel = 'preview';
        } else if (idLower.includes('-exp') || displayLower.includes('experimental')) {
          releaseChannel = 'experimental';
        } else if (capability.multimodalStatus === 'confirmed') {
           // We only safely assume stable if it's explicitly confirmed in registry and not named preview/exp
           releaseChannel = 'stable';
        }
      }

      let compatibility: 'compatible' | 'unknown' | 'incompatible' = 'unknown';
      
      const idLower = id.toLowerCase();
      const isIncompatibleName = idLower.includes('embedding') || 
                                 idLower.includes('tts') || 
                                 idLower.includes('veo') || 
                                 idLower.includes('imagen') || 
                                 idLower.includes('nano') || 
                                 idLower.includes('image-only') ||
                                 idLower.includes('lyria') ||
                                 idLower.includes('robotics') ||
                                 idLower.includes('computer-use') ||
                                 idLower.includes('deep-research') ||
                                 idLower.includes('antigravity');
                                 
      if (!supportedMethods.includes('generateContent') || isIncompatibleName) {
        compatibility = 'incompatible';
      } else if (capability.imageInput && capability.structuredOutput) {
        compatibility = 'compatible';
      }

      discoveredModels.push({
        id,
        resourceName: model.name,
        displayName: displayName,
        description: model.description || '',
        inputTokenLimit: model.inputTokenLimit || 0,
        outputTokenLimit: model.outputTokenLimit || 0,
        supportedGenerationMethods: supportedMethods,
        releaseChannel,
        compatibility,
        capabilities: {
          imageInput: capability.imageInput,
          structuredOutput: capability.structuredOutput,
          multimodalStatus: capability.multimodalStatus,
        },
        selectableInFuture: compatibility === 'compatible'
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

