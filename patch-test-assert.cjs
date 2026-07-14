const fs = require('fs');
const file = 'src/test/phase3ClientFlow.test.tsx';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/await screen\.findByText\('Old Question 1'\);/g, "await screen.findByText('您期望的台历布景场景氛围是？');");

fs.writeFileSync(file, code, 'utf-8');
console.log("Patched test assert successfully");
