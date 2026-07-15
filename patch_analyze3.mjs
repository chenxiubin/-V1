import fs from 'fs';
let code = fs.readFileSync('server/routes/analyzeProduct.ts', 'utf-8');

code = code.replace(
  "    try {\n\n    console.log('[ANALYZE_PRODUCT_REQUEST]', {",
  "    const reqId = Date.now().toString(36) + Math.random().toString(36).substring(2);\n    const start = Date.now();\n    try {\n\n    console.log('[ANALYZE_PRODUCT_REQUEST]', {"
);

fs.writeFileSync('server/routes/analyzeProduct.ts', code);
