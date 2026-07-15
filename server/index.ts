import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import app from './app.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting in development mode with Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Starting in production mode...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    const mode = process.env.NODE_ENV || 'development';
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    const frontendMode = mode === 'production' ? 'dist-static' : 'vite-middleware';
    console.log('[SERVER_START]');
    console.log('mode:', mode);
    console.log('port:', PORT);
    console.log('apiHealth: ready');
    console.log('frontend:', frontendMode);
    console.log('geminiKeyConfigured:', hasGeminiKey);

  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
