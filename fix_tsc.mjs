import fs from 'fs';

// 1. Fix src/test/canvasPreviewRenderer.test.tsx
let canvasCode = fs.readFileSync('src/test/canvasPreviewRenderer.test.tsx', 'utf-8');
canvasCode = canvasCode.replace(
  /sceneAsset:\s*\{[\s\S]*?createdAt: 'now',?\s*\}/g,
  `sceneAsset: { id: 'test-scene', productAssetId: 'p1', recipeId: 'r1', recipeVersion: 1, name: 'scene.png', mimeType: 'image/png', width: 800, height: 800, size: 1024, contentHash: 'hash', persistedAssetRef: 'blob:test2', createdAt: 'now' }`
);
fs.writeFileSync('src/test/canvasPreviewRenderer.test.tsx', canvasCode);

// 2. Fix src/test/projectStore.test.ts
let projectStoreCode = fs.readFileSync('src/test/projectStore.test.ts', 'utf-8');
projectStoreCode = projectStoreCode.replace(
  /\{ id: 'scene-id',[\s\S]*?name: 'scene\.jpg',[\s\S]*?mimeType: 'image\/jpeg',[\s\S]*?width: 800,[\s\S]*?height: 600,[\s\S]*?persistedAssetRef: 'scene-blob-ref',[\s\S]*?createdAt: 'now',?\s*\}/g,
  `{ id: 'scene-id', productAssetId: 'prod1', recipeId: 'rec1', recipeVersion: 1, name: 'scene.jpg', mimeType: 'image/jpeg', width: 800, height: 600, size: 1024, contentHash: 'hash', persistedAssetRef: 'scene-blob-ref', createdAt: 'now' }`
);
fs.writeFileSync('src/test/projectStore.test.ts', projectStoreCode);

// 3. Fix src/test/templateSystem.test.ts
let templateCode = fs.readFileSync('src/test/templateSystem.test.ts', 'utf-8');
templateCode = templateCode.replace(
  /sceneAsset:\s*\{[\s\S]*?createdAt:\s*'now'[\s\S]*?\}/g,
  `sceneAsset: { id: 'scene1', productAssetId: 'p1', recipeId: 'r1', recipeVersion: 1, name: 's1', mimeType: 'image/png', width: 100, height: 100, size: 1024, contentHash: 'hash', persistedAssetRef: 'blob:test2', createdAt: 'now' }`
);
fs.writeFileSync('src/test/templateSystem.test.ts', templateCode);

