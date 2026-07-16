const { execSync } = require('child_process');
try {
  const out = execSync('npx vitest run src/test/ui.test.tsx', { encoding: 'utf8' });
  console.log("SUCCESS");
} catch (e) {
  console.log("FAILED");
  console.log(e.stderr);
  console.log(e.stdout);
}
