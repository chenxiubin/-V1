import { vi } from 'vitest';
import type { ModelDiscoveryResult } from '../../server/services/geminiModelDiscovery.js';

export function setupNetworkIsolation(): () => void {
  const originalFetch = globalThis.fetch;

  const mockFetch = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let rawUrl = '';
    if (typeof input === 'string') {
      rawUrl = input;
    } else if (input instanceof Request) {
      rawUrl = input.url;
    } else {
      rawUrl = input.toString();
    }

    const urlObj = new URL(rawUrl, 'http://localhost');
    const path = urlObj.pathname;
    const search = urlObj.search;

    if (urlObj.hostname !== 'localhost' && urlObj.hostname !== '127.0.0.1') {
       throw new Error(`Unmocked network request: ${rawUrl}`);
    }

    if (path === '/api/health') {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (path === '/api/ai/models') {
      if (search !== '' && search !== '?refresh=true') {
        throw new Error(`Unmocked network request: ${rawUrl}`);
      }

      const mockResult: ModelDiscoveryResult = {
        models: [
          {
            id: 'gemini-3.5-flash',
            resourceName: 'models/gemini-3.5-flash',
            displayName: 'Gemini 3.5 Flash',
            description: 'Mock Model',
            inputTokenLimit: 1000000,
            outputTokenLimit: 8192,
            supportedGenerationMethods: ['generateContent'],
            releaseChannel: 'stable',
            compatibility: 'compatible',
            capabilities: {
              imageInput: true,
              structuredOutput: true,
              multimodalStatus: 'confirmed'
            },
            selectableInFuture: true
          }
        ],
        currentConfiguredModelId: 'gemini-3.5-flash',
        apiKeyConfigured: true,
        quota: {
          officialRemainingToday: null,
          officialDailyLimit: null,
          reason: 'not_exposed_by_gemini_models_api'
        },
        fetchedAt: new Date().toISOString(),
        cacheExpiresAt: new Date(Date.now() + 300000).toISOString(),
        stale: false
      };
      return new Response(JSON.stringify(mockResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    throw new Error(`Unmocked network request: ${rawUrl}`);
  });

  globalThis.fetch = mockFetch as any;

  if (typeof window !== 'undefined' && !(window as any).indexedDB) {
    (window as any).indexedDB = {
      open: vi.fn().mockReturnValue({
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        result: {
          transaction: vi.fn().mockReturnValue({
            objectStore: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue({ onsuccess: null }),
              put: vi.fn().mockReturnValue({ onsuccess: null })
            })
          })
        }
      })
    };
  }

  return () => {
    globalThis.fetch = originalFetch;
  };
}
