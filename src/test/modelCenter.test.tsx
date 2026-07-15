// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModelCenterPanel } from '../components/ModelCenterPanel';
import { ModelDiscoveryClient } from '../services/modelDiscoveryClient';

vi.mock('../services/modelDiscoveryClient', () => ({
  ModelDiscoveryClient: {
    fetchModels: vi.fn()
  }
}));

describe('ModelCenter Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockSuccessResponse = {
    models: [
      {
        id: 'gemini-3.5-flash',
        displayName: 'Gemini 3.5 Flash',
        releaseChannel: 'stable',
        capabilities: { imageInput: true, structuredOutput: true, multimodalStatus: 'confirmed' },
        inputTokenLimit: 1000000,
        outputTokenLimit: 8000
      },
      {
        id: 'gemini-2.0-flash-exp',
        displayName: 'Gemini 2.0 Flash Exp',
        releaseChannel: 'experimental',
        capabilities: { imageInput: true, structuredOutput: true, multimodalStatus: 'confirmed' },
        inputTokenLimit: 1000000,
        outputTokenLimit: 8000
      },
      {
        id: 'gemini-3.5-pro-preview',
        displayName: 'Gemini 3.5 Pro Preview',
        releaseChannel: 'preview',
        capabilities: { imageInput: true, structuredOutput: true, multimodalStatus: 'confirmed' },
        inputTokenLimit: 1000000,
        outputTokenLimit: 8000
      },
      {
        id: 'gemini-unknown',
        displayName: 'Unknown Model',
        releaseChannel: 'stable',
        capabilities: { imageInput: false, structuredOutput: false, multimodalStatus: 'unknown' },
        inputTokenLimit: 1000000,
        outputTokenLimit: 8000
      }
    ],
    currentConfiguredModelId: 'gemini-3.5-flash',
    apiKeyConfigured: true,
    quota: { officialRemainingToday: null },
    stale: false
  };

  it('renders correctly and checks for models and capabilities', async () => {
    (ModelDiscoveryClient.fetchModels as any).mockResolvedValue(mockSuccessResponse);
    render(<ModelCenterPanel onClose={() => {}} />);

    // 3. Loading
    expect(screen.getByText('正在加载模型列表...')).toBeDefined();

    // Wait for load
    await waitFor(() => {
      expect(screen.getByText('模型中心')).toBeDefined();
    });

    // 4. 模型卡片
    expect(screen.getByText('Gemini 3.5 Flash')).toBeDefined();
    expect(screen.getByText('Gemini 2.0 Flash Exp')).toBeDefined();

    // 5. 当前运行中
    expect(screen.getByText('当前运行中')).toBeDefined();

    // 6. Stable/Preview/Experimental
    expect(screen.getByText('Experimental')).toBeDefined();
    expect(screen.getByText('Preview')).toBeDefined();

    // 7. 能力待确认
    expect(screen.getByText(/能力待确认模型/)).toBeDefined();

    // 8. 官方额度无法获取提示
    expect(screen.getByText('官方今日剩余额度无法通过接口获取')).toBeDefined();

    // 9. 不显示虚构数字
    expect(screen.queryByText(/1500\/1500/)).toBeNull();

    // 15. 不存在切换按钮
    expect(screen.queryByText('切换模型')).toBeNull();
    expect(screen.queryByText('使用此模型')).toBeNull();

    // 16. 不存在 selectedModelId 交互 (absent selection elements)
  });

  it('Refreshes with refresh=true', async () => {
    (ModelDiscoveryClient.fetchModels as any).mockResolvedValue(mockSuccessResponse);
    render(<ModelCenterPanel onClose={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByText('模型中心')).toBeDefined();
    });

    // 10. 刷新请求 refresh=true
    const refreshBtn = screen.getByText('刷新列表');
    fireEvent.click(refreshBtn);
    expect(ModelDiscoveryClient.fetchModels).toHaveBeenCalledWith(true);
  });

  it('Shows stale cache message', async () => {
    (ModelDiscoveryClient.fetchModels as any).mockResolvedValue({
      ...mockSuccessResponse,
      stale: true,
      refreshError: 'Network Error'
    });
    render(<ModelCenterPanel onClose={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByText(/当前显示的是缓存数据/)).toBeDefined();
    });
    // 11. stale 提示
  });

  it('Handles error state correctly', async () => {
    const error = new Error('暂时无法获取');
    (error as any).code = 'MODEL_LIST_UNAVAILABLE';
    (ModelDiscoveryClient.fetchModels as any).mockRejectedValue(error);
    
    render(<ModelCenterPanel onClose={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByText('暂时无法获取')).toBeDefined();
    });
    // 12. 错误状态
  });

  it('Closes on escape key', async () => {
    (ModelDiscoveryClient.fetchModels as any).mockResolvedValue(mockSuccessResponse);
    const onClose = vi.fn();
    render(<ModelCenterPanel onClose={onClose} />);
    
    await waitFor(() => {
      expect(screen.getByText('模型中心')).toBeDefined();
    });

    // 13. Esc 关闭
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
