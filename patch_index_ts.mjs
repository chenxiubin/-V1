import fs from 'fs';
let code = fs.readFileSync('server/index.ts', 'utf-8');

const logs = `
    const mode = process.env.NODE_ENV || 'development';
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    const frontendMode = mode === 'production' ? 'dist-static' : 'vite-middleware';
    console.log('[SERVER_START]');
    console.log('mode:', mode);
    console.log('port:', PORT);
    console.log('apiHealth: ready');
    console.log('frontend:', frontendMode);
    console.log('geminiKeyConfigured:', hasGeminiKey);
`;

code = code.replace(
  "console.log(`Server running on http://0.0.0.0:${PORT}`);",
  "console.log(`Server running on http://0.0.0.0:${PORT}`);" + logs
);

fs.writeFileSync('server/index.ts', code);
