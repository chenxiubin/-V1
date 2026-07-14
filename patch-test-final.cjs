const fs = require('fs');
const file = 'src/test/phase3ClientFlow.test.tsx';
let code = fs.readFileSync(file, 'utf-8');

// Fix existing test button text
code = code.replace(/findByRole\('button', \{ name: \/重新生成问题\/\}\)/g, "findByRole('button', { name: /稍后重试/})");
code = code.replace(/getByRole\('button', \{ name: \/重新生成问题\/\}\)/g, "getByRole('button', { name: /稍后重试/})");

// Fix my new tests
code = code.replace(/adapter\.generateGuidedQuestions = async \(\) => \{/g, "vi.spyOn(RealAdapter.prototype, 'generateGuidedQuestions').mockImplementation(async () => {");

fs.writeFileSync(file, code, 'utf-8');
console.log("Patched test file successfully");
