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

describe('ModelCenterPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows loading state initially', () => {
    (ModelDiscoveryClient.fetchModels as any).mockImplementation(() => new Promise(() => {}));
    render(<ModelCenterPanel onClose={() => {}} />);
    expect(screen.getByText('正在加载模型列表...')).toBeDefined();
  });

  it('displays models and quota message', async () => {
    (ModelDiscoveryClient.fetchModels as any).mockResolvedValue({
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
      quota: { officialRemainingToday: null }
    });

    render(<ModelCenterPanel onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('模型中心')).toBeDefined();
    });

    expect(screen.getByText('当前运行模型')).toBeDefined();
    expect(screen.getByText('当前运行中')).toBeDefined();
    
    // Check unknown model is inside details
    expect(screen.getByText(/能力待确认模型/)).toBeDefined();
    expect(screen.getByText('Unknown Model')).toBeDefined();

    // Check quota message
    expect(screen.getByText('官方今日剩余额度无法通过接口获取')).toBeDefined();

    // No selection buttons
    expect(screen.queryByText('使用此模型')).toBeNull();
    expect(screen.queryByText('切换模型')).toBeNull();
  });

  it('shows error state when fetch fails', async () => {
    const error = new Error('暂时无法获取当前项目可用模型，请稍后刷新。');
    (error as any).code = 'MODEL_LIST_UNAVAILABLE';
    (error as any).retryable = true;
    (ModelDiscoveryClient.fetchModels as any).mockRejectedValue(error);

    render(<ModelCenterPanel onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('暂时无法获取当前项目可用模型，请稍后刷新。')).toBeDefined();
    });
    
    expect(screen.getByText('MODEL_LIST_UNAVAILABLE')).toBeDefined();
    expect(screen.getByText('重试')).toBeDefined();
  });
});
