import { SceneRecipe, PromptDocument } from '../types/schemas.js';
import { compilePromptDocument, PROMPT_COMPILER_VERSION } from '../services/ai/promptCompiler.js';

export const COMPILER_VERSION = PROMPT_COMPILER_VERSION;

/**
 * Legacy compatibility adapter. Delegating 100% to compilePromptDocument
 * to ensure single source of truth and byte-for-byte identical output.
 */
export function compilePrompt(recipe: SceneRecipe): PromptDocument {
  return compilePromptDocument(recipe);
}
