import { GeminiModelDiscoveryService } from './geminiModelDiscovery.js';

export const modelDiscoveryService = new GeminiModelDiscoveryService();

/**
 * Resolves and validates the target model ID for the request.
 * If a specific requestedModelId is provided, it must be verified against active,
 * compatible models. If validation fails, an INVALID_MODEL_REQUESTED error (status 400) is thrown.
 * If no requestedModelId is provided, falls back to process.env.GEMINI_ANALYSIS_MODEL or the default.
 */
export async function resolveRuntimeModelId(requestedModelId?: string): Promise<string> {
  const defaultModel = process.env.GEMINI_ANALYSIS_MODEL || 'gemini-3.5-flash';

  let availableModels;
  try {
    availableModels = await modelDiscoveryService.getAvailableModels(false);
  } catch (err) {
    // If API key is missing or validation service is down, but a specific model is explicitly requested, we cannot verify it.
    if (requestedModelId) {
      const error = new Error(`无法验证请求的模型 "${requestedModelId}"，可能由于 API 密钥未配置或大语言模型连接异常。`);
      (error as any).code = 'INVALID_MODEL_REQUESTED';
      (error as any).status = 400;
      throw error;
    }
    return defaultModel;
  }

  if (requestedModelId) {
    const matched = availableModels.models.find(m => m.id === requestedModelId);
    if (!matched) {
      const error = new Error(`请求的模型 "${requestedModelId}" 在当前项目的可用模型列表中不存在。`);
      (error as any).code = 'INVALID_MODEL_REQUESTED';
      (error as any).status = 400;
      throw error;
    }

    const isCompatible = matched.compatibility === 'compatible' || 
                         (matched.capabilities?.imageInput && matched.capabilities?.structuredOutput);
    if (!isCompatible) {
      const error = new Error(`请求的模型 "${requestedModelId}" 不满足多模态分析与结构化输出的兼容契约。`);
      (error as any).code = 'INVALID_MODEL_REQUESTED';
      (error as any).status = 400;
      throw error;
    }

    return matched.id;
  }

  // Fallback flow if no modelId is passed by the request (e.g., legacy request)
  if (process.env.GEMINI_ANALYSIS_MODEL) {
    const envModel = process.env.GEMINI_ANALYSIS_MODEL;
    const matchedEnv = availableModels.models.find(m => m.id === envModel);
    if (matchedEnv) {
      const isCompatible = matchedEnv.compatibility === 'compatible' || 
                           (matchedEnv.capabilities?.imageInput && matchedEnv.capabilities?.structuredOutput);
      if (isCompatible) {
        return matchedEnv.id;
      }
    }
  }

  return 'gemini-3.5-flash';
}
