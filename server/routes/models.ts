import { Router, Request, Response } from 'express';
import { GeminiModelDiscoveryService } from '../services/geminiModelDiscovery.js';

const router = Router();
const modelDiscoveryService = new GeminiModelDiscoveryService();

router.get('/models', async (req: Request, res: Response) => {
  try {
    const refresh = req.query.refresh === 'true';
    const result = await modelDiscoveryService.getAvailableModels(refresh);
    res.json(result);
  } catch (error: any) {
    console.error('[AI Models] Error fetching models:', error);
    if (error.code) {
      res.status(503).json({
        code: error.code,
        message: error.message,
        retryable: error.retryable
      });
    } else {
      res.status(500).json({
        code: 'MODEL_LIST_UNAVAILABLE',
        message: '暂时无法获取当前项目可用模型，请稍后刷新。',
        retryable: true
      });
    }
  }
});

export default router;
