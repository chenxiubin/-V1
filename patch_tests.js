import fs from 'fs';
let code = fs.readFileSync('src/test/phase6MatchReport.test.tsx', 'utf-8');

code = code.replace(/sceneAsset:\s*\{\s*id:\s*'mock-scene-1',\s*name:\s*'test.png',\s*mimeType:\s*'image\/png',\s*width:\s*800,\s*height:\s*800,\s*persistedAssetRef:\s*'blob:test',\s*createdAt:\s*'2024-01-01T00:00:00Z',\s*\}/g,
`sceneAsset: {
          id: 'mock-scene-1',
          productAssetId: 'mock-product-1',
          recipeId: 'mock-recipe-1',
          recipeVersion: 1,
          name: 'test.png',
          mimeType: 'image/png',
          width: 800,
          height: 800,
          size: 1024,
          contentHash: 'abc',
          persistedAssetRef: 'scene-123',
          createdAt: '2024-01-01T00:00:00Z',
        }`);

fs.writeFileSync('src/test/phase6MatchReport.test.tsx', code);
