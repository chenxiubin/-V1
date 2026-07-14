const fs = require('fs');
const file = 'src/test/phase3ClientFlow.test.tsx';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/throw err;\n    \};/g, 'throw err;\n    });');
code = code.replace(/return getValidMockQuestions\(\);\n    \};/g, 'return getValidMockQuestions();\n    });');

fs.writeFileSync(file, code, 'utf-8');
console.log("Patched test spy closing");
