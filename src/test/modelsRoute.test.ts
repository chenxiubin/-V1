import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import modelsRouter from '../../server/routes/models.js';
import { sanitizeModelDiscoveryError } from '../../server/services/geminiModelDiscovery.js';

const { mockGetAvailableModels } = vi.hoisted(() => ({ mockGetAvailableModels: vi.fn() }));

vi.mock('../../server/services/geminiModelDiscovery.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    GeminiModelDiscoveryService: class {
      getAvailableModels = mockGetAvailableModels;
    }
  };
});

const app = express();
app.use('/api/ai', modelsRouter);

describe('models.ts route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Scenario A: sanitizes errors even with code', async () => {
    const err = new Error('Raw Secret is sk-1234567890123456789012345678901234567890 AIzaSyB123 file:///var/www');
    (err as any).code = 'MODEL_LIST_UNAVAILABLE';
    (err as any).retryable = true;
    mockGetAvailableModels.mockRejectedValueOnce(err);

    const res = await request(app).get('/api/ai/models');
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('MODEL_LIST_UNAVAILABLE');
    expect(res.body.retryable).toBe(true);
    expect(res.body.message).not.toContain('sk-');
    expect(res.body.message).not.toContain('AIza');
    expect(res.body.message).not.toContain('file://');
    expect(res.body.message).toContain('[REDACTED]');
    expect(JSON.stringify(res.body)).not.toContain('sk-');
    
    // Check logger
    expect(console.error).toHaveBeenCalled();
    const logArg = (console.error as any).mock.calls[0][1];
    expect(logArg).not.toContain('sk-');
    expect(logArg).not.toContain('AIza');
  });

  it('Scenario B: normal unknown error', async () => {
    mockGetAvailableModels.mockRejectedValueOnce(new Error('Unknown server failure with AIza123'));

    const res = await request(app).get('/api/ai/models');
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('UNKNOWN');
    expect(res.body.retryable).toBe(true);
    expect(res.body.message).toBe('暂时无法获取当前项目可用模型，请稍后刷新。');
    
    // Check logger
    expect(console.error).toHaveBeenCalled();
    const logArg = (console.error as any).mock.calls[0][1];
    expect(logArg).not.toContain('AIza123');
    expect(logArg).toContain('[REDACTED]');
  });
  
  it('Scenario C: stale cache returned with 200', async () => {
    mockGetAvailableModels.mockResolvedValueOnce({
      models: [],
      stale: true,
      refreshError: 'Network error [REDACTED]'
    });

    const res = await request(app).get('/api/ai/models');
    expect(res.status).toBe(200);
    expect(res.body.stale).toBe(true);
    expect(res.body.refreshError).toBe('Network error [REDACTED]');
  });
  
  it('returns successful result', async () => {
    mockGetAvailableModels.mockResolvedValueOnce({ models: [], stale: false });
    
    const res = await request(app).get('/api/ai/models');
    expect(res.status).toBe(200);
    expect(res.body.models).toEqual([]);
  });
});
