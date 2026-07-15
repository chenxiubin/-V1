const fs = require('fs');
let code = fs.readFileSync('server/services/geminiModelDiscovery.ts', 'utf8');
code = code.replace('const response = await ai.models.list();', 'const response = await ai.models.list(); console.error("RESPONSE IS:", response);');
fs.writeFileSync('server/services/geminiModelDiscovery.ts', code);
