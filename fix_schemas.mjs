import fs from 'fs';
let schemaCode = fs.readFileSync('src/types/schemas.ts', 'utf-8');
const regex = /export const AnalyzeMatchInputSchema = z\.object\(\{\s*productProfile:\s*ProductProfileSchema,\s*sceneRecipe:\s*SceneRecipeSchema,\s*productAsset:\s*ProductAssetSchema,\s*sceneAsset:\s*SceneAssetSchema,[\s\S]*?\}\);/g;

schemaCode = schemaCode.replace(regex, `export const AnalyzeMatchInputSchema = z.object({
  productProfile: ProductProfileSchema,
  sceneRecipe: SceneRecipeSchema,
  productAsset: ProductAssetSchema,
  sceneAsset: SceneAssetSchema,
  promptDocument: PromptDocumentSchema,
  overlayPreviewRef: z.string(),
});`);

fs.writeFileSync('src/types/schemas.ts', schemaCode);
