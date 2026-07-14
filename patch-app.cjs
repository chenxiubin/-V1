const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/} else if \(err\.code === 'RATE_LIMIT' \|\| err\.status === 429 \|\| \/429\|resource_exhausted\/i\.test\(err\.message\)\) {\s*userFriendlyMessage = '[^']+';/g, 
  "} else if (err.code === 'GEMINI_QUOTA_EXHAUSTED' || err.code === 'RATE_LIMIT' || err.status === 429 || /429|resource_exhausted/i.test(err.message)) {\n        userFriendlyMessage = '当前项目的 Gemini 免费请求额度已达到上限，请稍后重试或检查项目额度。';");

fs.writeFileSync(file, code, 'utf-8');
console.log("Patched App.tsx");
