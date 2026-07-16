import { Router, Request, Response } from 'express';
import { modelDiscoveryService } from '../services/geminiRuntimeModel.js';
import { sanitizeModelDiscoveryError } from '../services/geminiModelDiscovery.js';

const router = Router();

router.get('/models', async (req: Request, res: Response) => {
  try {
    const refresh = req.query.refresh === 'true';
    const result = await modelDiscoveryService.getAvailableModels(refresh);
    res.json(result);
  } catch (error: any) {
    const sanitized = sanitizeModelDiscoveryError(error);
    console.error('[AI Models] Error fetching models:', JSON.stringify(sanitized));

    if (error.code) {
      res.status(503).json({
        code: error.code,
        message: sanitized.messageSummary,
        retryable: error.retryable
      });
    } else {
      res.status(500).json({
        code: sanitized.code,
        message: '暂时无法获取当前项目可用模型，请稍后刷新。',
        retryable: sanitized.retryable
      });
    }
  }
});

export default router;
