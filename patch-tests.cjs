const fs = require('fs');
const file = 'src/test/phase3ClientFlow.test.tsx';
let code = fs.readFileSync(file, 'utf-8');

// Find the first instance of '});\n\n  // ==========================================\n  // D. 429 Error Handling Tests'
const searchStr = '});\n\n  // ==========================================\n  // D. 429 Error Handling Tests';
if (code.includes(searchStr)) {
  code = code.replace(searchStr, '\n  // ==========================================\n  // D. 429 Error Handling Tests');
  code += '\n});\n';
  fs.writeFileSync(file, code, 'utf-8');
  console.log("Patched test file successfully");
} else {
  console.log("Could not find search string");
}
