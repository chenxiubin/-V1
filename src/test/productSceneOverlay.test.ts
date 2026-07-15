/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest';
import { createProductSceneOverlay } from '../services/productSceneOverlay';

describe('ProductSceneOverlay Math', () => {
  it('should calculate positions without modifying inputs', async () => {
    // We mock URL and Image for happy-dom
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();

    // Mock Image
    const mockImageClass = class {
      width = 100;
      height = 100;
      onload: () => void = () => {};
      onerror: () => void = () => {};
      set src(url: string) {
        setTimeout(() => this.onload(), 0);
      }
    };
    vi.stubGlobal('Image', mockImageClass);

    // Mock Canvas
    const mockDrawImage = vi.fn();
    const mockToBlob = vi.fn((cb) => cb(new Blob(['test'], { type: 'image/png' })));
    const mockCanvasClass = class {
      width = 0;
      height = 0;
      getContext() { return { drawImage: mockDrawImage }; }
      toBlob = mockToBlob;
    };
    vi.stubGlobal('document', {
      createElement: (tag: string) => {
        if (tag === 'canvas') return new mockCanvasClass();
        return {};
      }
    });

    const productBlob = new Blob(['p'], { type: 'image/png' });
    const sceneBlob = new Blob(['s'], { type: 'image/png' });
    
    const productAsset: any = { id: 'p1', width: 200, height: 200 };
    const sceneAsset: any = { id: 's1', width: 400, height: 400 };
    const composition: any = { productWidthPercent: 50, productPosition: 'center_right' };

    const result = await createProductSceneOverlay({
      productBlob, sceneBlob, productAsset, sceneAsset, composition
    });

    expect(result.width).toBe(100); // Image mocked size
    expect(result.height).toBe(100);
    // 50% width -> 50px
    expect(result.layout.width).toBe(50);
    expect(result.layout.height).toBe(50);
    // center right -> x = 100 * 0.9 - 50 = 40
    // center right -> y = (100 - 50) / 2 = 25
    expect(result.layout.x).toBe(40);
    expect(result.layout.y).toBe(25);
    
    // MimeType test
    expect(result.blob.type).toBe('image/png');

    // Inputs untouched
    expect(productAsset.width).toBe(200);

    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.unstubAllGlobals();
  });
});
