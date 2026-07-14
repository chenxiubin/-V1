const fs = require('fs');
const file = 'src/test/phase3ClientFlow.test.tsx';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/const retryBtn = await screen\.findByRole\('button', \{ name: \/重新生成问题\.\*\/\}\);/g, "const retryBtn = await screen.findByRole('button', { name: /稍后重试/ });");
// Just in case:
code = code.replace(/name: \/重新生成问题\.\*\//g, "name: /稍后重试/");
code = code.replace(/name: \/重新生成问题…\//g, "name: /稍后重试/");

fs.writeFileSync(file, code, 'utf-8');
console.log("Patched test retry button successfully");
