const { execSync } = require('child_process');
try {
  const out = execSync('npx vitest run src/test/ui.test.tsx -t "1. 渲染导入成功状态并开始分析" --reporter=verbose', { encoding: 'utf8', stdio: 'pipe' });
  console.log(out);
} catch (e) {
  console.log(e.stdout);
}
