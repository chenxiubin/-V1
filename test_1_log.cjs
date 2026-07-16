const { execSync } = require('child_process');
try {
  const out = execSync('npx vitest run src/test/ui.test.tsx -t "1. 渲染导入成功状态并开始分析"', { encoding: 'utf8' });
  console.log("STDOUT:", out);
} catch (e) {
  console.log("STDOUT:", e.stdout);
  console.log("STDERR:", e.stderr);
}
