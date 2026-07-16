const { execSync } = require('child_process');
try {
  const output = execSync('npx vitest run src/test/ui.test.tsx', { encoding: 'utf8', stdio: 'pipe' });
  console.log(output);
} catch (e) {
  console.log("FAILED:\n", e.stdout, e.stderr);
}
