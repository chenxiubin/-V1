import fs from 'fs';

function fixFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf-8');
  
  // Find { id: 'scene-1', name: 'scene', mimeType: 'image/png', width: 800, height: 600, persistedAssetRef: 'ref', createdAt: expect.any(String) } or similar
  // It's probably easier to just replace any sceneAsset: { ... } that doesn't have productAssetId
  code = code.replace(/sceneAsset:\s*\{([^}]*?)(persistedAssetRef:[^,}]+),([^}]*?)\}/g, (match, before, ref, after) => {
    if (match.includes('productAssetId')) return match;
    return `sceneAsset: {${before}productAssetId: 'dummy-product-id', recipeId: 'dummy-recipe-id', recipeVersion: 1, size: 1024, contentHash: 'dummy-hash', ${ref},${after}}`;
  });

  fs.writeFileSync(filePath, code);
}

['src/test/canvasPreviewRenderer.test.tsx', 'src/test/projectStore.test.ts', 'src/test/templateSystem.test.ts', 'src/test/phase5SceneImport.test.tsx'].forEach(fixFile);
