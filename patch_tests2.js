import fs from 'fs';
let code = fs.readFileSync('src/test/phase6MatchReport.test.tsx', 'utf-8');

code = code.replace(/\{ id: 's2', name: 's2', mimeType: 'image\/png', width: 100, height: 100, persistedAssetRef: 'ref-s2', createdAt: 'now' \}/g, 
`{ id: 's2', name: 's2', mimeType: 'image/png', width: 100, height: 100, size: 1024, contentHash: 'hash2', persistedAssetRef: 'ref-s2', recipeId: 'rec1', recipeVersion: 1, productAssetId: 'p1', createdAt: new Date().toISOString() }`);

fs.writeFileSync('src/test/phase6MatchReport.test.tsx', code);
