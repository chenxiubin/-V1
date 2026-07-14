import { SceneIntelligenceAdapter } from './sceneIntelligenceAdapter';
import { MockAdapter } from './mockAdapter';
import { RealAdapter } from './realAdapter';

/**
 * Factory function to create appropriate SceneIntelligenceAdapter.
 * 
 * Strict constraints:
 * - Only accepts explicit 'mock' or 'real' mode.
 * - No dynamic/silent fallback depending on environmental variables (e.g. NODE_ENV).
 * - Direct rejection of invalid modes with compile/runtime errors.
 */
export function createAdapter(mode: 'mock' | 'real'): SceneIntelligenceAdapter {
  if (mode === 'mock') {
    return new MockAdapter();
  } else if (mode === 'real') {
    return new RealAdapter();
  } else {
    throw new Error(`未知的 Adapter 模式: ${mode}。仅允许显式指定 'mock' 或 'real'。`);
  }
}
