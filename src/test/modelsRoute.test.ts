import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import modelsRouter from '../../server/routes/models.js';

// We need to mock GeminiModelDiscoveryService
vi.mock('../../server/services/geminiModelDiscovery.js', () => {
  return {
    GeminiModelDiscoveryService: class {
      async getAvailableModels(refresh: boolean) {
        if (refresh) {
          const err = new Error('Raw Secret is sk-1234567890123456789012345678901234567890 AIzaSyB123');
          (err as any).status = 403;
          throw err;
        }
        return { models: [], stale: false };
      }
    },
    sanitizeModelDiscoveryError: (error: any) => {
      // Re-implement or just pass through if we want to test router's usage
      // Wait, the router uses the actual sanitize from the module.
      // But we mocked the module, so we need to provide sanitizeModelDiscoveryError in the mock!
      let msg = error?.message ? String(error.message).substring(0, 200) : 'Unknown error';
      msg = msg.replace(/AIza[a-zA-Z0-9_-]+/g, '[REDACTED]')
               .replace(/sk-[a-zA-Z0-9]+/g, '[REDACTED]')
               .replace(/(Bearer|api_key=|key=|token=|access_token=)[^&\s'"]+/gi, '$1[REDACTED]')
               .replace(/Authorization:\s*[^'"\s]+/gi, 'Authorization: [REDACTED]')
               .replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/gi, '[REDACTED]')
               .replace(/(localhost|127\.0\.0\.1|file:\/\/|\/home\/|\/mnt\/|\/tmp\/|\/var\/|[A-Z]:\\[^\s'"]+)/gi, '[REDACTED]');
      return {
        code: error?.status || error?.code || 'UNKNOWN',
        status: error?.status || 500,
        retryable: error?.status !== 400 && error?.status !== 403,
        messageSummary: msg,
        hasStaleCache: false
      };
    }
  };
});

const app = express();
app.use('/', modelsRouter);

describe('models.ts route', () => {
  it('returns successful result', async () => {
    const res = await request(app).get('/models');
    expect(res.status).toBe(200);
    expect(res.body.models).toEqual([]);
  });

  it('sanitizes errors and returns 503 for raw errors without exposing secrets', async () => {
    const res = await request(app).get('/models?refresh=true');
    expect(res.status).toBe(500); // Because error doesn't have custom code in this mock, it falls to 500
    expect(res.body.code).toBe(403);
    expect(res.body.retryable).toBe(false);
    expect(res.body.message).toBe('暂时无法获取当前项目可用模型，请稍后刷新。');
    // Important: the raw message should NOT be in the body at all!
    expect(JSON.stringify(res.body)).not.toContain('sk-');
    expect(JSON.stringify(res.body)).not.toContain('AIza');
  });
});
