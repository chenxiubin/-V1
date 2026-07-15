import fs from 'fs';
let code = fs.readFileSync('server/routes/analyzeProduct.ts', 'utf-8');

const logBefore = `
    const reqId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    console.log('[ANALYZE_PRODUCT_REQUEST]', {
      requestId: reqId,
      method: req.method,
      contentType: req.headers['content-type'],
      hasProductImage: !!req.file,
      productAssetIdPresent: !!req.body.productAssetId,
      imageMimeType: req.file ? req.file.mimetype : null,
      imageSizeBytes: req.file ? req.file.size : null
    });
    const start = Date.now();
`;

code = code.replace(
  "try {\n      const file = req.file;",
  "try {\n" + logBefore + "      const file = req.file;"
);

const logSuccess = `
      console.log('[ANALYZE_PRODUCT_RESPONSE]', {
        requestId: reqId,
        status: 200,
        durationMs: Date.now() - start,
        errorCode: null
      });
`;
code = code.replace(
  "return res.status(200).json(profile);",
  logSuccess + "      return res.status(200).json(profile);"
);

const logError = `
      console.log('[ANALYZE_PRODUCT_RESPONSE]', {
        requestId: reqId,
        status,
        durationMs: Date.now() - start,
        errorCode: code
      });
`;
code = code.replace(
  "return res.status(status).json({",
  logError + "      return res.status(status).json({"
);

fs.writeFileSync('server/routes/analyzeProduct.ts', code);
