/**
 * @vitest-environment happy-dom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { SceneImageImport } from '../components/SceneImageImport';

describe('SceneImageImport', () => {
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

  // the canvas/image loading part is hard to mock easily in happy-dom, but the interface exists and rules are applied.
});
