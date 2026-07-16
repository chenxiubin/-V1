import { GeminiModelDiscoveryService } from './geminiModelDiscovery.js';
import { ModelIdSchema } from '../../shared/aiModelContracts.js';

export const modelDiscoveryService = new GeminiModelDiscoveryService();

export class RuntimeModelError extends Error {
  code:
    | 'INVALID_MODEL_ID'
    | 'MODEL_NOT_FOUND'
    | 'MODEL_NOT_COMPATIBLE'
    | 'MODEL_VALIDATION_UNAVAILABLE'
    | 'DEFAULT_MODEL_NOT_CONFIGURED';

  status: number;
  retryable: boolean;

  constructor(
    code: 'INVALID_MODEL_ID' | 'MODEL_NOT_FOUND' | 'MODEL_NOT_COMPATIBLE' | 'MODEL_VALIDATION_UNAVAILABLE' | 'DEFAULT_MODEL_NOT_CONFIGURED',
    message: string,
    status: number,
    retryable: boolean
  ) {
    super(message);
    this.name = 'RuntimeModelError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    Object.setPrototypeOf(this, RuntimeModelError.prototype);
  }
}

export function validateModelIdFormat(modelId: string): boolean {
  if (!modelId) return false;
  if (
    modelId.includes(' ') ||
    modelId.includes('/') ||
    modelId.includes('\\') ||
    modelId.includes('<') ||
    modelId.includes('>') ||
    modelId.startsWith('models/') ||
    modelId.length > 128
  ) {
    return false;
  }
  const parsed = ModelIdSchema.safeParse(modelId);
  return parsed.success;
}

export interface ModelResolution {
  effectiveModelId: string;
  source: 'user_selection' | 'server_default';
  requestedModelId: string | null;
}

/**
 * Resolves and validates the target model ID for the request.
 * If a specific requestedModelId is provided, it must be verified against active,
 * compatible models. If validation fails, appropriate RuntimeModelError is thrown.
 * If no requestedModelId is provided, falls back to process.env.GEMINI_ANALYSIS_MODEL.
 */
export async function resolveRuntimeModelId(requestedModelId?: string | null): Promise<ModelResolution> {
  if (requestedModelId !== undefined && requestedModelId !== null) {
    const isInvalid = 
      requestedModelId === '' ||
      requestedModelId.trim() === '' ||
      requestedModelId === 'null' ||
      requestedModelId === 'undefined' ||
      requestedModelId.includes(' ') ||
      requestedModelId.includes('/') ||
      requestedModelId.includes('\\') ||
      requestedModelId.includes('<') ||
      requestedModelId.includes('>') ||
      requestedModelId.includes('://') ||
      requestedModelId.toLowerCase().includes('script') ||
      requestedModelId.toLowerCase().includes('html') ||
      requestedModelId.startsWith('models/') ||
      requestedModelId.length > 128 ||
      !validateModelIdFormat(requestedModelId);

    if (isInvalid) {
      throw new RuntimeModelError(
        'INVALID_MODEL_ID',
        '模型 ID 格式不合法，请重新选择模型。',
        400,
        false
      );
    }

    // 2. Fetch available models
    let availableModels;
    try {
      availableModels = await modelDiscoveryService.getAvailableModels(false);
    } catch (err) {
      // 4. Model validation unavailable
      throw new RuntimeModelError(
        'MODEL_VALIDATION_UNAVAILABLE',
        '暂时无法验证所选模型是否可用，请稍后重试。',
        503,
        true
      );
    }

    // 3. Find matched model
    const matched = availableModels.models.find(m => m.id === requestedModelId);
    if (!matched) {
      throw new RuntimeModelError(
        'MODEL_NOT_FOUND',
        '当前 API Key 无法访问所选模型，请刷新模型列表后重新选择。',
        400,
        false
      );
    }

    // 4. Verify compatibility
    const isCompatible = 
      matched.compatibility === 'compatible' &&
      matched.selectableInFuture === true &&
      Array.isArray(matched.supportedGenerationMethods) &&
      matched.supportedGenerationMethods.includes('generateContent') &&
      matched.capabilities?.imageInput === true &&
      matched.capabilities?.structuredOutput === true &&
      matched.capabilities?.multimodalStatus === 'confirmed';

    if (!isCompatible) {
      throw new RuntimeModelError(
        'MODEL_NOT_COMPATIBLE',
        '所选模型不满足当前多模态分析与结构化输出要求。',
        400,
        false
      );
    }

    return {
      effectiveModelId: matched.id,
      source: 'user_selection',
      requestedModelId,
    };
  }

  // Fallback flow if no modelId is passed by the request
  const defaultModel = typeof process.env.GEMINI_ANALYSIS_MODEL === 'string'
    ? process.env.GEMINI_ANALYSIS_MODEL.trim()
    : undefined;

  if (!defaultModel || !validateModelIdFormat(defaultModel) || defaultModel === 'null' || defaultModel === 'undefined') {
    throw new RuntimeModelError(
      'DEFAULT_MODEL_NOT_CONFIGURED',
      '服务端默认模型未正确配置。',
      500,
      false
    );
  }

  return {
    effectiveModelId: defaultModel,
    source: 'server_default',
    requestedModelId: null,
  };
}
