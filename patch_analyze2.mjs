import fs from 'fs';
let code = fs.readFileSync('server/routes/analyzeProduct.ts', 'utf-8');

code = code.replace(
  "try {\n    const reqId = Date.now().toString(36) + Math.random().toString(36).substring(2);",
  "const reqId = Date.now().toString(36) + Math.random().toString(36).substring(2);\n    const start = Date.now();\n    try {\n"
);
code = code.replace(
  "const reqId = Date.now().toString(36) + Math.random().toString(36).substring(2);\n    console.log('[ANALYZE_PRODUCT_REQUEST]', {",
  "console.log('[ANALYZE_PRODUCT_REQUEST]', {"
);
code = code.replace(
  "const start = Date.now();\n      const file = req.file;",
  "const file = req.file;"
);

fs.writeFileSync('server/routes/analyzeProduct.ts', code);
