import { SceneRecipe, PromptDocument } from '../types/schemas.js';
import { compilePromptDocument } from '../services/ai/promptCompiler.js';

export const COMPILER_VERSION = 'prompt-compiler-1.0';

/**
 * Legacy compatibility adapter. Delegating 100% to compilePromptDocument
 * to ensure single source of truth and byte-for-byte identical output.
 */
export function compilePrompt(recipe: SceneRecipe): PromptDocument {
  return compilePromptDocument(recipe);
}
