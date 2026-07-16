import { ModelDiscoveryResult } from '../../server/services/geminiModelDiscovery.js';

export class ModelDiscoveryClient {
  private static cachedResult: ModelDiscoveryResult | null = null;
  private static pendingRequest: Promise<ModelDiscoveryResult> | null = null;

  static async fetchModels(refresh: boolean = false): Promise<ModelDiscoveryResult> {
    if (!refresh && this.cachedResult && !this.cachedResult.stale) {
      // Check if cache is expired according to our side
      const expires = new Date(this.cachedResult.cacheExpiresAt).getTime();
      if (Date.now() < expires) {
        return this.cachedResult;
      }
    }

    if (this.pendingRequest && !refresh) {
      return this.pendingRequest;
    }

    const url = refresh ? '/api/ai/models?refresh=true' : '/api/ai/models';

    this.pendingRequest = fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        const error = new Error(data.message || '获取模型列表失败');
        (error as any).code = data.code;
        (error as any).retryable = data.retryable;
        throw error;
      }
      return data as ModelDiscoveryResult;
    }).then((data) => {
      this.cachedResult = data;
      this.pendingRequest = null;
      return data;
    }).catch((error) => {
      this.pendingRequest = null;
      throw error;
    });

    return this.pendingRequest;
  }

  static clearCacheForTests() {
    this.cachedResult = null;
    this.pendingRequest = null;
  }
}
