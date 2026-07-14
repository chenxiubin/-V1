const fs = require('fs');
const file = 'src/services/ai/realAdapter.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/const err = new Error\('大模型服务限流中（429 Resource Exhausted），请稍候重试。'\);\s*\(err as any\)\.code = 'RATE_LIMIT';/g, 
  "const err = new Error('当前项目的 Gemini 免费请求额度已达到上限，请稍后重试或检查项目额度。');\n          (err as any).code = 'GEMINI_QUOTA_EXHAUSTED';");

fs.writeFileSync(file, code, 'utf-8');
console.log("Patched realAdapter.ts");
