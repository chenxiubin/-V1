import { spawn } from 'child_process';
import fetch from 'node-fetch';

const p = spawn('node', ['dist/server.mjs'], { stdio: 'inherit', env: { ...process.env, PORT: '3002', NODE_ENV: 'production' } });

setTimeout(async () => {
  try {
    const res = await fetch('http://localhost:3002/api/health');
    console.log("Smoke Test Status:", res.status);
    console.log("Smoke Test Content-Type:", res.headers.get("content-type"));
    console.log("Smoke Test Response:", await res.text());
    p.kill();
    process.exit(0);
  } catch (e) {
    console.error("Failed:", e);
    p.kill();
    process.exit(1);
  }
}, 2000);
