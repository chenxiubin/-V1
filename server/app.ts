import express from 'express';
import analyzeProductRouter from './routes/analyzeProduct.js';
import scenePlannerRouter from './routes/scenePlanner.js';
import modelsRouter from './routes/models.js';
import { GeminiProductAnalysisService } from './services/geminiProductAnalyzer.js';
import { GeminiScenePlannerService } from './services/geminiScenePlanner.js';

const app = express();

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'calendar-scene-planner'
  });
});

// Register primary Gemini analysis service
app.set('productAnalysisService', new GeminiProductAnalysisService());
app.set('scenePlannerService', new GeminiScenePlannerService());

// Mount API routes
app.use('/api/ai', analyzeProductRouter);
app.use('/api/ai', scenePlannerRouter);
app.use('/api/ai', modelsRouter);
// Fallback for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    code: 'API_ROUTE_NOT_FOUND',
    message: `接口不存在：${req.method} ${req.path}`,
    retryable: false
  });
});


// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    code: 'UNHANDLED_SERVER_ERROR',
    message: err.message || '系统发生未处理的服务端错误。',
    retryable: true
  });
});

export default app;
