import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { ProductAnalysisService } from '../services/productAnalysisService.js';
import { ModelIdSchema, ModelRequestContextSchema } from '../../shared/aiModelContracts.js';
import { resolveRuntimeModelId } from '../services/geminiRuntimeModel.js';

const router = Router();

function parseAndValidateModelId(req: Request, isMultipart: boolean): { success: true; modelId: string | undefined } | { success: false; status: number; payload: any } {
  let hasField = false;
  let rawValue: any = undefined;

  if (isMultipart) {
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'modelId')) {
      hasField = true;
      rawValue = req.body.modelId;
    }
    if (req.body && req.body.data) {
      try {
        const parsedData = JSON.parse(req.body.data);
        if (parsedData && Object.prototype.hasOwnProperty.call(parsedData, 'modelId')) {
          hasField = true;
          if (rawValue === undefined) {
            rawValue = parsedData.modelId;
          }
        }
      } catch (e) {
        // Ignore JSON parse error, it will be handled by the route itself
      }
    }
  } else {
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'modelId')) {
      hasField = true;
      rawValue = req.body.modelId;
    }
  }

  if (!hasField) {
    return { success: true, modelId: undefined };
  }

  if (rawValue === null || rawValue === undefined) {
    return {
      success: false,
      status: 400,
      payload: {
        code: 'INVALID_MODEL_ID',
        message: '模型 ID 格式不合法，请重新选择模型。',
        retryable: false
      }
    };
  }

  const check = ModelIdSchema.safeParse(rawValue);
  if (!check.success) {
    return {
      success: false,
      status: 400,
      payload: {
        code: 'INVALID_MODEL_ID',
        message: '模型 ID 格式不合法，请重新选择模型。',
        retryable: false
      }
    };
  }

  return { success: true, modelId: check.data };
}

// Configure multer for memory storage and 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp'];

import { GoogleGenAI } from '@google/genai';

router.post('/analyze-product', (req: Request, res: Response, next: NextFunction) => {
  upload.single('productImage')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          code: 'FILE_TOO_LARGE',
          message: '文件大小超过10MB上限，请重新上传。',
          retryable: false,
        });
      }
      return res.status(400).json({
        code: 'UPLOAD_ERROR',
        message: err.message || '图片上传过程中发生错误。',
        retryable: true,
      });
    }

    const reqId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    const start = Date.now();
    let effectiveModelId: string | undefined = undefined;
    try {

    console.log('[ANALYZE_PRODUCT_REQUEST]', {
      requestId: reqId,
      method: req.method,
      contentType: req.headers['content-type'],
      hasProductImage: !!req.file,
      productAssetIdPresent: !!req.body.productAssetId,
      imageMimeType: req.file ? req.file.mimetype : null,
      imageSizeBytes: req.file ? req.file.size : null
    });
    const file = req.file;
      if (!file) {
        return res.status(400).json({
          code: 'MISSING_FILE',
          message: '未接收到产品图片，请选择需要上传的产品图片。',
          retryable: false,
        });
      }

      const productAssetId = req.body.productAssetId;
      if (!productAssetId) {
        return res.status(400).json({
          code: 'MISSING_ASSET_ID',
          message: '缺少产品资产关联标识(productAssetId)。',
          retryable: false,
        });
      }

      // Use parseAndValidateModelId to parse/validate the request modelId input
      const modelCheck = parseAndValidateModelId(req, true);
      if (modelCheck.success === false) {
        return res.status(modelCheck.status).json(modelCheck.payload);
      }

      const requestedModelId = modelCheck.modelId;

      try {
        const resolution = await resolveRuntimeModelId(requestedModelId);
        effectiveModelId = resolution.effectiveModelId;
      } catch (modelErr: any) {
        if (modelErr && typeof modelErr.status === 'number' && typeof modelErr.code === 'string') {
          return res.status(modelErr.status).json({
            code: modelErr.code,
            message: modelErr.message,
            retryable: typeof modelErr.retryable === 'boolean' ? modelErr.retryable : false,
          });
        }
        return res.status(500).json({
          code: 'INTERNAL_ERROR',
          message: '模型解析或运行过程中发生未知错误。',
          retryable: false,
        });
      }

      // 1. Check declared mime
      if (!ALLOWED_MIMES.includes(file.mimetype)) {
        return res.status(400).json({
          code: 'INVALID_MIME',
          message: '不支持的文件格式，仅支持 PNG、JPEG 和 WebP 格式图片。',
          retryable: false,
        });
      }

      // 2. Perform file signature (magic number) verification using file-type
      const detected = await fileTypeFromBuffer(file.buffer);
      if (!detected) {
        return res.status(400).json({
          code: 'INVALID_SIGNATURE',
          message: '无法识别的文件签名，上传文件可能已损坏或格式伪造。',
          retryable: false,
        });
      }

      if (!ALLOWED_MIMES.includes(detected.mime)) {
        return res.status(400).json({
          code: 'INVALID_SIGNATURE',
          message: `实际文件类型为 ${detected.mime}，不是允许的图片格式。`,
          retryable: false,
        });
      }

      // Ensure declared and actual mime types match
      if (file.mimetype !== detected.mime) {
        return res.status(400).json({
          code: 'MIME_MISMATCH',
          message: '上传文件的声明格式与实际文件签名内容不匹配。',
          retryable: false,
        });
      }

      // 3. Retrieve analysis service from Express app
      const service = req.app.get('productAnalysisService') as ProductAnalysisService;
      if (!service) {
        return res.status(500).json({
          code: 'SERVICE_NOT_FOUND',
          message: '系统配置错误：产品分析服务未注册。',
          retryable: false,
        });
      }

      // 4. Run analysis with the resolved modelId
      const profile = await service.analyze(file.buffer, detected.mime, productAssetId, effectiveModelId);
      
      console.log('[ANALYZE_PRODUCT_RESPONSE]', {
        requestId: reqId,
        status: 200,
        durationMs: Date.now() - start,
        errorCode: null
      });
      return res.status(200).json(profile);

    } catch (error: any) {
      let status = 500;
      let code = error.code || 'INTERNAL_ERROR';
      let message = error.message || '服务端分析产品时发生未知错误。';
      let retryable = typeof error.retryable === 'boolean' ? error.retryable : false;
      let retryAfterSeconds = null;

      // Handle custom TIMEOUT or gateway timeout (504)
      if (error.code === 'TIMEOUT' || error.status === 504 || error.statusCode === 504) {
        status = 504;
        code = 'TIMEOUT';
        message = '分析产品大模型服务请求超时（120秒超时限制），请重试。';
        retryable = true;
      } 
      // Handle rate limits (429)
      else if (error.status === 429 || error.statusCode === 429 || /429|resource_exhausted|quota/i.test(error.message)) {
        status = 429;
        code = 'GEMINI_QUOTA_EXHAUSTED';
        message = '当前项目的 Gemini 免费请求额度已达到上限，请稍后重试或检查项目额度。';
        retryable = true;
        
        console.error(JSON.stringify({
          status,
          code,
          model: effectiveModelId || 'unknown',
          quotaMetric: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier',
          retryAfterSeconds
        }));
      } 
      // Handle service unavailable (503)
      else if (error.status === 503 || error.statusCode === 503 || /503|service_unavailable/i.test(error.message)) {
        status = 503;
        code = 'SERVICE_UNAVAILABLE';
        message = '智能分析服务暂时不可用（503 Service Unavailable），请稍后再试。';
        retryable = true;
      }

      
      console.log('[ANALYZE_PRODUCT_RESPONSE]', {
        requestId: reqId,
        status,
        durationMs: Date.now() - start,
        errorCode: code
      });
      return res.status(status).json({
        code,
        message,
        retryable,
      });
    }
  });
});

export default router;
