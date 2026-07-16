const fs = require('fs');
let code = fs.readFileSync('src/test/productImport.test.ts', 'utf8');

const mocks = `
// --- Mock browser DOM for Node environment ---
global.URL = {
  createObjectURL: (blob) => {
    if (blob.size === 0) throw new Error("Invalid blob");
    if (blob.name && blob.name.includes('invalid')) throw new Error('无法读取文件');
    return 'blob:mock-' + (blob.name || 'blob');
  },
  revokeObjectURL: () => {}
};
global.Image = class {
  constructor() {
    this.naturalWidth = 100;
    this.naturalHeight = 100;
  }
  set src(val) {
    this._src = val;
    setTimeout(() => {
      if (val.includes('corrupt')) {
        this.onerror && this.onerror();
      } else {
        this.onload && this.onload();
      }
    }, 0);
  }
  get src() {
    return this._src;
  }
};
global.document = {
  createElement: (tag) => {
    if (tag === 'canvas') {
      return {
        width: 0, height: 0,
        getContext: (type) => {
          if (type === '2d') {
            return {
              drawImage: () => {},
              getImageData: () => {
                const alpha = global.__mockAlpha !== undefined ? global.__mockAlpha : 255;
                if (alpha === -1) throw new Error("Canvas Error");
                return {
                  data: [255, 255, 255, alpha]
                };
              }
            };
          }
          return null;
        }
      };
    }
    return {};
  }
};
// --------------------------------------------
`;

code = code.replace("import { ProductAssetSchema", mocks + "\nimport { ProductAssetSchema");

// Update tests
code = code.replace(`expect(analysis.hasAlpha).toBe(true); // PNG defaults to true in Node/test fallback`, `expect(analysis.hasAlpha).toBe(true);`);

code = code.replace(
  `  it('透明PNG导入成功', async () => {`,
  `  it('透明PNG导入成功', async () => {
    global.__mockAlpha = 0; // Transparent
`
);

const opaqueTest = `
  it('实底（全不透明）PNG，正确识别为 false', async () => {
    global.__mockAlpha = 255; // Opaque
    const file = new File(['dummy-png-content'], 'opaque.png', { type: 'image/png' });
    const analysis = await analyzeImageFile(file);
    expect(analysis.mimeType).toBe('image/png');
    expect(analysis.hasAlpha).toBe(false);
  });
  
  it('图片解码或检测异常，安全降级为 false 且不抛出阻塞异常', async () => {
    global.__mockAlpha = -1; // Canvas throws error
    const file = new File(['dummy'], 'canvas_error.png', { type: 'image/png' });
    const analysis = await analyzeImageFile(file);
    expect(analysis.hasAlpha).toBe(false);
  });
  
  it('图片完全损坏，解析失败抛出错误', async () => {
    const file = new File(['corrupt'], 'corrupt.png', { type: 'image/png' });
    await expect(analyzeImageFile(file)).rejects.toThrow('无法加载图片');
  });
  
  it('超过大小限制被拒绝', async () => {
    const file = new File(['dummy'], 'large.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 20 * 1024 * 1024 });
    await expect(analyzeImageFile(file)).rejects.toThrow('文件大小超出限制');
  });
`;

code = code.replace(`it('非透明图片风险提示', async () => {`, opaqueTest + `\n  it('非透明图片风险提示', async () => {\n    global.__mockAlpha = 255;`);

fs.writeFileSync('src/test/productImport.test.ts', code);
