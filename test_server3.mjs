import { spawn } from 'child_process';
import fetch from 'node-fetch';

const p = spawn('node', ['dist/server.mjs'], { stdio: 'inherit', env: { ...process.env, PORT: '3003', NODE_ENV: 'production' } });

setTimeout(async () => {
  try {
    const res = await fetch('http://localhost:3003/some-client-route');
    console.log("Smoke Test Status:", res.status);
    console.log("Smoke Test Content-Type:", res.headers.get("content-type"));
    const text = await res.text();
    console.log("Smoke Test Response starts with:", text.substring(0, 50));
    p.kill();
    process.exit(0);
  } catch (e) {
    console.error("Failed:", e);
    p.kill();
    process.exit(1);
  }
}, 2000);
