import fs from 'fs';
let code = fs.readFileSync('src/types/schemas.ts', 'utf-8');

// Define SceneAssetSchema
const sceneAssetSchemaDef = `
export const SceneAssetSchema = z.object({
  id: z.string(),
  productAssetId: z.string(),
  recipeId: z.string(),
  recipeVersion: z.number(),
  name: z.string(),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  size: z.number().int().positive(),
  contentHash: z.string(),
  persistedAssetRef: z.string(),
  createdAt: z.string().datetime(),
});
export type SceneAsset = z.infer<typeof SceneAssetSchema>;
`;

// Insert it before ProjectStateSchema
code = code.replace(/export type ProjectState = z\.infer<typeof ProjectStateSchema>;/, sceneAssetSchemaDef + '\nexport type ProjectState = z.infer<typeof ProjectStateSchema>;');

// Replace the inline sceneAsset in ProjectStateSchema
code = code.replace(/sceneAsset: z\.object\(\{[^}]+\}\)/, 'sceneAsset: SceneAssetSchema.nullable().optional()');

// Replace inline sceneAsset in AnalyzeMatchInputSchema
code = code.replace(/sceneAsset: z\.object\(\{[^\}]+(?!\}).*?\}(\.optional\(\))?,\n/, '');
code = code.replace(/sceneAsset: z\.object\(\{[\s\S]*?\}\),/, 'sceneAsset: SceneAssetSchema,');

// Add promptDocument to AnalyzeMatchInputSchema
code = code.replace(/overlayPreviewRef: z\.string\(\),/, 'promptDocument: PromptDocumentSchema,\n  overlayPreviewRef: z.string(),');

fs.writeFileSync('src/types/schemas.ts', code);
