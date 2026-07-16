
import { vi } from 'vitest';
import type { ModelDiscoveryResult } from '../../server/services/geminiModelDiscovery.js';

export function setupNetworkIsolation(): () => void {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    let url = typeof input === 'string' ? input : (input as Request).url || input.toString();

    if (url.includes('/api/ai/models')) {
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

    if (url.includes('/api/health')) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    throw new Error(`Unmocked network request: ${url}`);
  });

  // Mock IndexedDB globally if needed
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
    fetchSpy.mockRestore();
  };
}
