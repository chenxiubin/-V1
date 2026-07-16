const fs = require('fs');
let code = fs.readFileSync('src/test/ui.test.tsx', 'utf8');
code = code.replace(/if \(productAsset\.id === 'trigger-deferred' && mockState\.getProm\(\)\) \{/,
`console.log("MOCK CALLED WITH", productAsset.id, "analyzePromise exists:", !!mockState.getProm());
    if (productAsset.id === 'trigger-deferred' && mockState.getProm()) {`);
fs.writeFileSync('src/test/ui.test.tsx', code);
