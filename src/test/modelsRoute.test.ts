import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import modelsRouter from '../../server/routes/models.js';

vi.mock('../../server/services/geminiModelDiscovery.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    GeminiModelDiscoveryService: class {
      private reqCount = 0;
      async getAvailableModels(refresh: boolean) {
        this.reqCount++;
        
        if (this.reqCount === 1) {
          // Scenario A: Error with code but contains sensitive info
          const err = new Error('Raw Secret is sk-1234567890123456789012345678901234567890 AIzaSyB123 file:///var/www');
          (err as any).code = 'MODEL_LIST_UNAVAILABLE';
          (err as any).retryable = true;
          throw err;
        } else if (this.reqCount === 2) {
          // Scenario B: Unknown error
          throw new Error('Unknown server failure');
        } else if (this.reqCount === 3) {
          // Scenario C: Stale cache
          // But wait, the route just calls getAvailableModels. The cache logic is in the service.
          // If the service returns a stale cache, the route just sends it.
          // So we should return a stale cache object here.
          return {
            models: [],
            stale: true,
            refreshError: 'Network error [REDACTED]'
          };
        }
        
        return { models: [], stale: false };
      }
    }
  };
});

const app = express();
app.use('/api/ai', modelsRouter);

describe('models.ts route', () => {
  it('Scenario A: sanitizes errors even with code', async () => {
    const res = await request(app).get('/api/ai/models');
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('MODEL_LIST_UNAVAILABLE');
    expect(res.body.retryable).toBe(true);
    expect(res.body.message).not.toContain('sk-');
    expect(res.body.message).not.toContain('AIza');
    expect(res.body.message).not.toContain('file://');
    expect(res.body.message).toContain('[REDACTED]');
    expect(JSON.stringify(res.body)).not.toContain('sk-');
  });

  it('Scenario B: normal unknown error', async () => {
    const res = await request(app).get('/api/ai/models');
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('UNKNOWN');
    expect(res.body.retryable).toBe(true);
    expect(res.body.message).toBe('暂时无法获取当前项目可用模型，请稍后刷新。');
  });
  
  it('Scenario C: stale cache returned with 200', async () => {
    const res = await request(app).get('/api/ai/models');
    expect(res.status).toBe(200);
    expect(res.body.stale).toBe(true);
    expect(res.body.refreshError).toBe('Network error [REDACTED]');
  });
  
  it('returns successful result', async () => {
    const res = await request(app).get('/api/ai/models');
    expect(res.status).toBe(200);
    expect(res.body.models).toEqual([]);
  });
});
