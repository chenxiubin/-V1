const fs = require('fs');

let code = fs.readFileSync('src/test/ui.test.tsx', 'utf8');

// Replace the old promise logic
code = code.replace(/let resolveAnalyze: \(value: any\) => void;\nlet analyzePromise: Promise<any>;\n\nfunction resetDeferredPromise\(\) \{\n  analyzePromise = new Promise\(\(resolve\) => \{\n    resolveAnalyze = resolve;\n  \}\);\n\}/, 
`const mockState = vi.hoisted(() => {
  let resolveAnalyze: (value: any) => void = () => {};
  let analyzePromise: Promise<any> | null = null;
  return {
    resetDeferredPromise: () => {
      analyzePromise = new Promise((resolve) => {
        resolveAnalyze = resolve;
      });
    },
    getPromise: () => analyzePromise,
    resolve: (val: any) => resolveAnalyze(val)
  };
});
const resetDeferredPromise = mockState.resetDeferredPromise;
const resolveAnalyze = mockState.resolve;`);

// Replace uses inside vi.mock
code = code.replace(/analyzePromise/g, 'mockState.getPromise()');
// But wait, the previous replace also replaced 'analyzePromise', let's be careful.
// Let's just do it manually for the mock block:
// Actually, using vi.hoisted is the correct vitest way.
