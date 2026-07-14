const fs = require('fs');
const file = 'src/test/phase3ClientFlow.test.tsx';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/projectStore\.updateState\(\(\) => \(\{\n\s*status: 'PRODUCT_REVIEW',\n\s*productAsset: \{ id: 'asset-1', url: 'test\.jpg' \} as any,\n\s*productProfile: \{ productAssetId: 'asset-1', analyzedAt: new Date\(\)\.toISOString\(\) \} as any,\n\s*guidedQuestions: null,\n\s*guidedAnswers: \[\],\n\s*\}\)\);/g,
  "await setupBaseStoreState('asset-1');");

code = code.replace(/projectStore\.updateState\(\(\) => \(\{\n\s*status: 'PRODUCT_REVIEW',\n\s*productAsset: \{ id: 'asset-2', url: 'test\.jpg' \} as any,\n\s*productProfile: \{ productAssetId: 'asset-2', analyzedAt: new Date\(\)\.toISOString\(\) \} as any,\n\s*guidedQuestions: null,\n\s*guidedAnswers: \[\],\n\s*\}\)\);/g,
  "await setupBaseStoreState('asset-2');");

fs.writeFileSync(file, code, 'utf-8');
console.log("Patched test file successfully");
