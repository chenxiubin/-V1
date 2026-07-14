import {
  ProductProfile,
  ProductProfileSchema,
  GuidedQuestion,
  GuidedQuestionSchema,
  SceneDirection,
  SceneDirectionSchema,
  SceneRecipe,
  MatchReport,
  MatchReportSchema,
  RecipePatchOperation
} from '../../types/schemas';
import {
  SceneIntelligenceAdapter,
  AnalyzeProductInput,
  GuidedQuestionInput,
  PlanDirectionsInput,
  CreateRecipeInput,
  AnalyzeMatchInput,
  ProposePatchInput,
  PlanNextShotInput,
  NextShotPlan
} from './sceneIntelligenceAdapter';
import { getAsset } from '../../lib/db';
import { validateGuidedQuestionsSemanticContract } from './clientContractValidation';

export class NotImplementedError extends Error {
  constructor(methodName: string) {
    super(`真实AI服务将在后续阶段接入: ${methodName} 尚未实现。`);
    this.name = 'NotImplementedError';
  }
}

async function parseResponseSafe(response: Response, defaultMessage: string): Promise<any> {
  const contentType = (response.headers && typeof response.headers.get === 'function')
    ? response.headers.get('Content-Type') || ''
    : 'application/json';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    if (isJson) {
      let errData;
      try {
        errData = await response.json();
      } catch (e) {
        const text = await response.text();
        const firstChars = text.substring(0, 300).toLowerCase();
        if (response.status === 504) {
          const err = new Error('网关超时（504 Gateway Timeout），大模型无响应，请重试。');
          (err as any).code = 'GATEWAY_TIMEOUT';
          (err as any).retryable = true;
          throw err;
        } else if (response.status === 429) {
          const err = new Error('当前项目的 Gemini 免费请求额度已达到上限，请稍后重试或检查项目额度。');
          (err as any).code = 'GEMINI_QUOTA_EXHAUSTED';
          (err as any).retryable = true;
          throw err;
        } else if (response.status === 503) {
          const err = new Error('大模型服务暂时不可用（503 Service Unavailable），请稍后重试。');
          (err as any).code = 'SERVICE_UNAVAILABLE';
          (err as any).retryable = true;
          throw err;
        } else if (firstChars.includes('<!doctype') || firstChars.includes('<html>')) {
          const err = new Error('服务端路由未就绪或接口响应异常，请联系系统管理员检查后台服务。');
          (err as any).code = 'API_RESPONSE_HTML_FALLBACK';
          (err as any).retryable = false;
          throw err;
        }
        const err = new Error(`请求失败，状态码: ${response.status}`);
        (err as any).code = 'SERVER_ERROR';
        (err as any).retryable = false;
        throw err;
      }
      const serverErr = new Error(errData.message || defaultMessage);
      (serverErr as any).code = errData.code || 'SERVER_ERROR';
      (serverErr as any).retryable = typeof errData.retryable === 'boolean' ? errData.retryable : false;
      throw serverErr;
    } else {
      const text = await response.text();
      const firstChars = text.substring(0, 300).toLowerCase();
      if (response.status === 504) {
        const err = new Error('网关超时（504 Gateway Timeout），大模型无响应，请重试。');
        (err as any).code = 'GATEWAY_TIMEOUT';
        (err as any).retryable = true;
        throw err;
      } else if (response.status === 429) {
        const err = new Error('当前项目的 Gemini 免费请求额度已达到上限，请稍后重试或检查项目额度。');
          (err as any).code = 'GEMINI_QUOTA_EXHAUSTED';
        (err as any).retryable = true;
        throw err;
      } else if (response.status === 503) {
        const err = new Error('大模型服务暂时不可用（503 Service Unavailable），请稍后重试。');
        (err as any).code = 'SERVICE_UNAVAILABLE';
        (err as any).retryable = true;
        throw err;
      } else if (firstChars.includes('<!doctype') || firstChars.includes('<html>')) {
        const err = new Error('服务端路由未就绪或接口响应异常，请联系系统管理员检查后台服务。');
        (err as any).code = 'SERVER_ROUTE_MISSING';
        (err as any).retryable = false;
        throw err;
      }
      const err = new Error(`请求失败，状态码: ${response.status}，响应内容不符合JSON格式。`);
      (err as any).code = 'API_RESPONSE_INVALID_CONTENT_TYPE';
      (err as any).retryable = false;
      throw err;
    }
  }

  // response is OK
  if (!isJson) {
    const text = await response.text();
    const firstChars = text.substring(0, 300).toLowerCase();
    if (firstChars.includes('<!doctype') || firstChars.includes('<html>')) {
      const err = new Error('服务端路由未就绪或接口响应异常，请联系系统管理员检查后台服务。');
      (err as any).code = 'API_RESPONSE_HTML_FALLBACK';
      (err as any).retryable = false;
      throw err;
    }
    const err = new Error('期望 JSON 响应，但服务端返回了非 JSON 格式内容。');
    (err as any).code = 'API_RESPONSE_INVALID_CONTENT_TYPE';
    (err as any).retryable = false;
    throw err;
  }

  return response.json();
}

async function resizeImageClientSide(blob: Blob, originalWidth: number, originalHeight: number, targetMax: number): Promise<Blob> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof URL === 'undefined' || typeof Image === 'undefined' || typeof document === 'undefined') {
      resolve(blob);
      return;
    }
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      let w = originalWidth;
      let h = originalHeight;
      if (w <= 0 || h <= 0) {
        w = img.width;
        h = img.height;
      }

      if (w <= targetMax && h <= targetMax) {
        resolve(blob);
        return;
      }

      if (w > h) {
        if (w > targetMax) {
          h = Math.round((h * targetMax) / w);
          w = targetMax;
        }
      } else {
        if (h > targetMax) {
          w = Math.round((w * targetMax) / h);
          h = targetMax;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(blob);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((resizedBlob) => {
        if (resizedBlob) {
          resolve(resizedBlob);
        } else {
          resolve(blob);
        }
      }, blob.type || 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
  });
}

export class RealAdapter implements SceneIntelligenceAdapter {
  readonly mode = 'real' as const;

  async analyzeProduct(input: AnalyzeProductInput): Promise<ProductProfile> {
    const blob = await getAsset(input.productAsset.persistedAssetRef);
    if (!blob) {
      throw new Error('本地数据库未找到该产品资产大文件');
    }

    let imageBlob = blob;
    try {
      const maxDim = Math.max(input.productAsset.width || 0, input.productAsset.height || 0);
      if (maxDim > 1280) {
        imageBlob = await resizeImageClientSide(blob, input.productAsset.width, input.productAsset.height, 1280);
      }
    } catch (err) {
      console.warn('生成临时缩放分析副本失败，回退使用原始图像进行分析。错误:', err);
      imageBlob = blob;
    }

    const formData = new FormData();
    formData.append('productImage', imageBlob, input.productAsset.name);
    formData.append('productAssetId', input.productAsset.id);

    // Make the API request to Express server
    const response = await fetch('/api/ai/analyze-product', {
      method: 'POST',
      body: formData,
      // Note: Do NOT manually set Content-Type header to allow browser/test environment
      // to generate the correct multipart boundary.
    });

    const data = await parseResponseSafe(response, '未知服务端分析错误');
    
    // Perform robust Zod Schema Validation
    const parseResult = ProductProfileSchema.safeParse(data);
    if (!parseResult.success) {
      const zodErr = new Error('服务端分析数据校验失败，不符合 Zod 强契约规范');
      (zodErr as any).code = 'SCHEMA_VALIDATION_FAILED';
      (zodErr as any).retryable = false;
      throw zodErr;
    }

    return parseResult.data;
  }

  async generateGuidedQuestions(input: GuidedQuestionInput): Promise<GuidedQuestion[]> {
    const response = await fetch('/api/ai/guided-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productProfile: input.productProfile }),
    });

    const data = await parseResponseSafe(response, '未知服务端分析错误');

    if (!Array.isArray(data)) {
      const zodErr = new Error('服务端返回的引导问题不是数组格式');
      (zodErr as any).code = 'SCHEMA_VALIDATION_FAILED';
      (zodErr as any).retryable = false;
      throw zodErr;
    }

    const validated: GuidedQuestion[] = [];
    for (const q of data) {
      const parseResult = GuidedQuestionSchema.safeParse(q);
      if (!parseResult.success) {
        const zodErr = new Error(`服务端引导问题校验失败: ${parseResult.error.issues.map(i => i.message).join(', ')}`);
        (zodErr as any).code = 'SCHEMA_VALIDATION_FAILED';
        (zodErr as any).retryable = false;
        throw zodErr;
      }
      const question = parseResult.data;

      // Strict client semantic contract validation
      if (
        !question.recommendedOptionId ||
        typeof question.recommendedOptionId !== 'string' ||
        question.recommendedOptionId.trim() === ''
      ) {
        const err = new Error('引导问题数据不符合约定，请重新生成。');
        (err as any).code = 'SEMANTIC_VALIDATION_FAILED';
        (err as any).retryable = false;
        throw err;
      }

      if (question.options.length < 2 || question.options.length > 3) {
        const err = new Error('引导问题数据不符合约定，请重新生成。');
        (err as any).code = 'SEMANTIC_VALIDATION_FAILED';
        (err as any).retryable = false;
        throw err;
      }

      const hasRecommended = question.options.some(opt => opt.id === question.recommendedOptionId);
      if (!hasRecommended) {
        const err = new Error('引导问题数据不符合约定，请重新生成。');
        (err as any).code = 'SEMANTIC_VALIDATION_FAILED';
        (err as any).retryable = false;
        throw err;
      }

      if (question.options[0].id !== question.recommendedOptionId) {
        const err = new Error('引导问题数据不符合约定，请重新生成。');
        (err as any).code = 'SEMANTIC_VALIDATION_FAILED';
        (err as any).retryable = false;
        throw err;
      }

      const uniqueIds = new Set(question.options.map(opt => opt.id));
      if (uniqueIds.size !== question.options.length) {
        const err = new Error('引导问题数据不符合约定，请重新生成。');
        (err as any).code = 'SEMANTIC_VALIDATION_FAILED';
        (err as any).retryable = false;
        throw err;
      }

      validated.push(question);
    }

    return validated;
  }

  async planSceneDirections(input: PlanDirectionsInput): Promise<SceneDirection[]> {
    const response = await fetch('/api/ai/scene-directions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productProfile: input.productProfile,
        guidedAnswers: input.guidedAnswers,
      }),
    });

    const data = await parseResponseSafe(response, '未知服务端分析错误');

    if (!Array.isArray(data)) {
      const zodErr = new Error('服务端返回的场景规划方向不是数组格式');
      (zodErr as any).code = 'SCHEMA_VALIDATION_FAILED';
      (zodErr as any).retryable = false;
      throw zodErr;
    }

    const validated: SceneDirection[] = [];
    for (const d of data) {
      const parseResult = SceneDirectionSchema.safeParse(d);
      if (!parseResult.success) {
        const zodErr = new Error(`服务端场景规划方向校验失败: ${parseResult.error.issues.map(i => i.message).join(', ')}`);
        (zodErr as any).code = 'SCHEMA_VALIDATION_FAILED';
        (zodErr as any).retryable = false;
        throw zodErr;
      }
      validated.push(parseResult.data);
    }

    return validated;
  }

  async createSceneRecipe(input: CreateRecipeInput): Promise<SceneRecipe> {
    const response = await fetch('/api/ai/scene-recipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productAssetId: input.productAssetId,
        productProfileSnapshot: input.productProfileSnapshot,
        guidedQuestions: input.guidedQuestions,
        guidedAnswers: input.guidedAnswers,
        sceneDirections: input.sceneDirections,
        selectedDirectionId: input.selectedDirectionId
      }),
    });

    const data = await parseResponseSafe(response, '未知服务端错误');
    
    // Additional Schema Check dynamically if needed, but since it's real adapter we can use imported schemas
    const { SceneRecipeSchema } = await import('../../types/schemas');
    const parseResult = SceneRecipeSchema.safeParse(data);
    if (!parseResult.success) {
      const zodErr = new Error(`服务端创建 SceneRecipe 校验失败: ${parseResult.error.issues.map(i => i.message).join(', ')}`);
      (zodErr as any).code = 'SCHEMA_VALIDATION_FAILED';
      (zodErr as any).retryable = false;
      throw zodErr;
    }

    return parseResult.data;
  }

  async analyzeMatch(input: AnalyzeMatchInput): Promise<MatchReport> {
    const productBlob = await getAsset(input.productAsset.persistedAssetRef);
    const sceneBlob = await getAsset(input.sceneAsset.persistedAssetRef);
    const overlayBlob = await getAsset(input.overlayPreviewRef); // Assuming it's in DB

    if (!productBlob || !sceneBlob || !overlayBlob) {
      throw new Error('本地数据库未找到必要的分析资产');
    }

    const formData = new FormData();
    formData.append('productImage', productBlob, 'product.png');
    formData.append('sceneImage', sceneBlob, 'scene.png');
    formData.append('overlayImage', overlayBlob, 'overlay.png');
    formData.append('data', JSON.stringify({
      productProfile: input.productProfile,
      sceneRecipe: input.sceneRecipe,
      productAsset: input.productAsset,
      sceneAsset: input.sceneAsset,
      overlayPreviewRef: input.overlayPreviewRef
    }));

    const response = await fetch('/api/ai/analyze-match', {
      method: 'POST',
      body: formData,
    });

    const data = await parseResponseSafe(response, '未知服务端分析错误');
    const parseResult = MatchReportSchema.safeParse(data);
    if (!parseResult.success) {
      const zodErr = new Error('服务端匹配分析数据校验失败');
      (zodErr as any).code = 'SCHEMA_VALIDATION_FAILED';
      (zodErr as any).retryable = false;
      throw zodErr;
    }
    return parseResult.data;
  }

  async proposeRecipePatch(input: ProposePatchInput): Promise<RecipePatchOperation[]> {
    throw new NotImplementedError('proposeRecipePatch');
  }

  async planNextSeriesShot(input: PlanNextShotInput): Promise<NextShotPlan> {
    throw new NotImplementedError('planNextSeriesShot');
  }
}
