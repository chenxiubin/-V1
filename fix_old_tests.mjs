import fs from 'fs';

function fixFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf-8');
  code = code.replace(/createdAt: ''/g, "createdAt: new Date().toISOString()");
  
  // also inject missing fields into these "validScene" or "mockAsset" stubs
  code = code.replace(/const validScene = \{id: 'a1'/g, "const validScene = {id: 'a1', productAssetId: 'p1', recipeId: 'r1', recipeVersion: 1, size: 100, contentHash: 'h',");
  
  code = code.replace(/productAssetId: 'prod-1',\s*recipeId: 'rec-1',\s*recipeVersion: 1,\s*size: 1024,\s*contentHash: 'hash',\s*name: 'background\.jpg'/g,
    "productAssetId: 'prod-1', recipeId: 'rec-1', recipeVersion: 1, size: 1024, contentHash: 'hash', name: 'background.jpg'"
  );

  fs.writeFileSync(filePath, code);
}

fixFile('src/test/phase5Preview.test.tsx');
fixFile('src/test/phase5SceneImport.test.tsx');
