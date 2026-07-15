/**
 * @vitest-environment happy-dom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { SceneImageImport } from '../components/SceneImageImport';

describe('SceneImageImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    global.URL.revokeObjectURL = vi.fn();
    const mockImageClass = class {
      width = 100;
      height = 100;
      onload: () => void = () => {};
      set src(url: string) {
        setTimeout(() => this.onload(), 0);
      }
    };
    vi.stubGlobal('Image', mockImageClass);
    
    // Mock crypto for SHA-256
    vi.stubGlobal('crypto', {
      randomUUID: () => 'uuid',
      subtle: {
        digest: vi.fn(async () => new Uint8Array([1,2,3]).buffer)
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should support upload and error out on bad files', async () => {
    const onImport = vi.fn();
    const onError = vi.fn();
    const { getByTestId } = render(<SceneImageImport onImport={onImport} onError={onError} />);
    const input = getByTestId('file-input');
    
    // Non-image rejection
    const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [txtFile] } });
    expect(onError).toHaveBeenCalledWith('不支持的文件格式，请上传 PNG、JPEG 或 WebP');
    
    // Large file rejection
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [largeFile] } });
    expect(onError).toHaveBeenCalledWith('文件大小超过 10MB 限制');
  });

  it('should process valid image and return hash and blob', async () => {
    const onImport = vi.fn();
    const onError = vi.fn();
    const { getByTestId } = render(<SceneImageImport onImport={onImport} onError={onError} />);
    const input = getByTestId('file-input');

    const pngFile = new File(['content'], 'valid.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [pngFile] } });

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledWith(expect.objectContaining({
        mimeType: 'image/png',
        name: 'valid.png',
        width: 100,
        height: 100,
        size: pngFile.size,
        blob: pngFile,
        contentHash: '010203'
      }));
    });
  });
});
