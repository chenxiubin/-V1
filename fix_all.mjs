import fs from 'fs';

function replaceFile(path, regex, replacement) {
  let code = fs.readFileSync(path, 'utf-8');
  code = code.replace(regex, replacement);
  fs.writeFileSync(path, code);
}

replaceFile('src/test/canvasPreviewRenderer.test.tsx', 
  /sceneAsset:\s*\{\s*id:\s*'test-scene',\s*name:\s*'scene\.png',\s*mimeType:\s*'image\/png',\s*width:\s*800,\s*height:\s*800,\s*persistedAssetRef:\s*'blob:test2',\s*createdAt:\s*'now'\s*\}/g, 
  `sceneAsset: { id: 'test-scene', productAssetId: 'p1', recipeId: 'r1', recipeVersion: 1, name: 'scene.png', mimeType: 'image/png', width: 800, height: 800, size: 1024, contentHash: 'hash', persistedAssetRef: 'blob:test2', createdAt: 'now' }`
);

replaceFile('src/test/projectStore.test.ts',
  /\{\s*id:\s*'scene-id',\s*name:\s*'scene\.jpg',\s*mimeType:\s*'image\/jpeg',\s*width:\s*800,\s*height:\s*600,\s*persistedAssetRef:\s*'scene-blob-ref',\s*createdAt:\s*'now'\s*\}/g,
  `{ id: 'scene-id', productAssetId: 'prod1', recipeId: 'rec1', recipeVersion: 1, name: 'scene.jpg', mimeType: 'image/jpeg', width: 800, height: 600, size: 1024, contentHash: 'hash', persistedAssetRef: 'scene-blob-ref', createdAt: 'now' }`
);

replaceFile('src/test/templateSystem.test.ts',
  /sceneAsset:\s*\{\s*id:\s*'scene1',\s*name:\s*'s1',\s*mimeType:\s*'image\/png',\s*width:\s*100,\s*height:\s*100,\s*persistedAssetRef:\s*'blob:test2',\s*createdAt:\s*'now'\s*\}/g,
  `sceneAsset: { id: 'scene1', productAssetId: 'p1', recipeId: 'r1', recipeVersion: 1, name: 's1', mimeType: 'image/png', width: 100, height: 100, size: 1024, contentHash: 'hash', persistedAssetRef: 'blob:test2', createdAt: 'now' }`
);

