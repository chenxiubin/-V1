// Polyfills for testing analyzeImageFile in Node environment
global.URL = {
  createObjectURL: (blob) => {
    if (blob.size === 0) throw new Error("Invalid blob");
    return 'blob:mock-' + blob.name;
  },
  revokeObjectURL: () => {}
};
global.Image = class {
  constructor() {
    this.naturalWidth = 100;
    this.naturalHeight = 100;
    setTimeout(() => {
      if (this.src.includes('error')) {
        this.onerror && this.onerror();
      } else {
        this.onload && this.onload();
      }
    }, 0);
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
                // Return fake pixels
                return {
                  data: [255, 255, 255, global.__mockAlpha || 255]
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
