import fs from 'fs';
let code = fs.readFileSync('src/services/ai/sceneIntelligenceAdapter.ts', 'utf-8');
code = code.replace(
  /export type \{ CreateRecipeInput \};/,
  "export type { CreateRecipeInput, AnalyzeMatchInput };"
);
code = code.replace(
  /CreateRecipeInput\s*\} from '\.\.\/\.\.\/types\/schemas';/,
  "CreateRecipeInput,\n  AnalyzeMatchInput\n} from '../../types/schemas';"
);
fs.writeFileSync('src/services/ai/sceneIntelligenceAdapter.ts', code);

// For projectStore.test.ts
let testCode = fs.readFileSync('src/test/projectStore.test.ts', 'utf-8');
testCode = testCode.replace(
  /const MOCK_SCENE_ASSET = \{\s*id: 'scene-1',\s*name: 'scene\.jpg',\s*mimeType: 'image\/jpeg' as const,\s*width: 1024,\s*height: 1024,/g,
  "const MOCK_SCENE_ASSET = { id: 'scene-1', productAssetId: 'prod-1', recipeId: 'rec-1', recipeVersion: 1, size: 1024, contentHash: 'hash', name: 'scene.jpg', mimeType: 'image/jpeg' as const, width: 1024, height: 1024,"
);
fs.writeFileSync('src/test/projectStore.test.ts', testCode);
