import { setupNetworkIsolation } from "./networkIsolation";
// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModelCenterPanel } from '../components/ModelCenterPanel';
import { ModelDiscoveryClient } from '../services/modelDiscoveryClient';
import { getModelSettings, saveModelSettings } from '../lib/db';
import { ModelSettingsProvider } from '../context/ModelSettingsContext';
import App from '../App';

vi.mock('../lib/db', () => ({
  initDB: vi.fn().mockResolvedValue(true),
  getProject: vi.fn().mockResolvedValue(null),
  listProjects: vi.fn().mockResolvedValue([]),
  saveProject: vi.fn(),
  deleteProject: vi.fn(),
  getAsset: vi.fn().mockResolvedValue(null),
  saveAsset: vi.fn(),
  deleteAsset: vi.fn(),
  getModelSettings: vi.fn().mockResolvedValue(null),
  saveModelSettings: vi.fn().mockResolvedValue({ selectedModelId: 'gemini-3.5-flash', updatedAt: '2026-07-15T20:00:00Z' })
}));

const mockSuccessResponse = {
  models: [
    {
      id: 'gemini-3.5-flash',
      displayName: 'Gemini 3.5 Flash',
      releaseChannel: 'stable',
      compatibility: 'compatible',
      capabilities: { imageInput: true, structuredOutput: true, multimodalStatus: 'confirmed' },
      inputTokenLimit: 1000000,
      outputTokenLimit: 8000
    },
    {
      id: 'gemini-2.0-flash-exp',
      displayName: 'Gemini 2.0 Flash Exp',
      releaseChannel: 'experimental',
      compatibility: 'compatible',
      capabilities: { imageInput: true, structuredOutput: true, multimodalStatus: 'confirmed' },
      inputTokenLimit: 1000000,
      outputTokenLimit: 8000
    },
    {
      id: 'gemini-unknown',
      displayName: 'Unknown Model',
      releaseChannel: 'unknown',
      compatibility: 'unknown',
      capabilities: { imageInput: false, structuredOutput: false, multimodalStatus: 'unknown' },
      inputTokenLimit: 1000000,
      outputTokenLimit: 8000
    },
    {
      id: 'gemini-preview',
      displayName: 'Preview Model',
      releaseChannel: 'preview',
      compatibility: 'compatible',
      capabilities: { imageInput: true, structuredOutput: true, multimodalStatus: 'confirmed' },
      inputTokenLimit: 1000000,
      outputTokenLimit: 8000
    },
    {
      id: 'gemini-incompatible',
      displayName: 'Incompatible Model',
      releaseChannel: 'stable',
      compatibility: 'incompatible',
      capabilities: { imageInput: false, structuredOutput: false, multimodalStatus: 'unknown' },
      inputTokenLimit: 1000,
      outputTokenLimit: 1000
    }
  ],
  currentConfiguredModelId: 'gemini-3.5-flash',
  apiKeyConfigured: true,
  quota: { officialRemainingToday: null },
  stale: false
};

describe('ModelCenter Integration', () => {
  let cleanupNetworkIsolation: (() => void) | null = null;
  let fetchModelsSpy: any;

  beforeEach(async () => {
    vi.resetAllMocks();
    (getModelSettings as any).mockResolvedValue(null);
    (saveModelSettings as any).mockResolvedValue({ selectedModelId: 'gemini-3.5-flash', updatedAt: '2026-07-15T20:00:00Z' });
    cleanupNetworkIsolation = setupNetworkIsolation();
    ModelDiscoveryClient.clearCacheForTests();
    fetchModelsSpy = vi.spyOn(ModelDiscoveryClient, 'fetchModels');
  });

  afterEach(() => {
    fetchModelsSpy.mockRestore();
    cleanupNetworkIsolation?.();
    cleanupNetworkIsolation = null;
    cleanup();
  });

  it('renders correctly and checks for models and capabilities in Panel directly', async () => {
    fetchModelsSpy.mockResolvedValue(mockSuccessResponse);
    
    await act(async () => {
      render(<ModelCenterPanel onClose={() => {}} />);
    });

    expect(screen.getByText('模型中心')).toBeDefined();
    expect(screen.getByText('Gemini 3.5 Flash')).toBeDefined();
    expect(screen.getByText('Gemini 2.0 Flash Exp')).toBeDefined();
    expect(screen.getByText('Unknown Model')).toBeDefined();
    expect(screen.getByText('Preview Model')).toBeDefined();
    
    // Tags
    expect(screen.getByText('当前运行中')).toBeDefined();
    expect(screen.getByText('Experimental')).toBeDefined();
    expect(screen.getByText('Preview')).toBeDefined();
    // expect(screen.getByText('Stable')).toBeDefined();
    expect(screen.getByText(/能力待确认模型/)).toBeDefined();
    
    // Incompatible should NOT be in the main DOM under any section
    expect(screen.queryByText('Incompatible Model')).toBeNull();

    expect(screen.getByText('官方今日剩余额度无法通过接口获取')).toBeDefined();
    expect(screen.queryByText(/\/1500/)).toBeNull(); // no fake quota

    expect(screen.queryByText('切换模型')).toBeNull();
    expect(screen.queryByText('使用此模型')).toBeNull();
    expect(screen.queryByText('保存模型')).toBeNull();
  });

  it('Refreshes with refresh=true and disables button during fetch', async () => {
    let resolveFetch: any;
    const fetchPromise = new Promise(resolve => { resolveFetch = resolve; });

    fetchModelsSpy.mockReturnValueOnce(Promise.resolve(mockSuccessResponse))
                  .mockReturnValueOnce(fetchPromise);
    
    await act(async () => {
      render(<ModelCenterPanel onClose={() => {}} />);
    });
    
    const refreshBtn = screen.getByLabelText('刷新模型列表');
    
    await act(async () => {
      fireEvent.click(refreshBtn);
    });

    expect(fetchModelsSpy).toHaveBeenCalledWith(true);
    expect(refreshBtn).toHaveProperty('disabled', true);
    
    await act(async () => {
      resolveFetch(mockSuccessResponse);
    });
  });

  it('Shows stale cache message', async () => {
    fetchModelsSpy.mockResolvedValue({
      ...mockSuccessResponse,
      stale: true,
      refreshError: 'Network Error'
    });
    
    await act(async () => {
      render(<ModelCenterPanel onClose={() => {}} />);
    });
    
    expect(screen.getByText(/当前显示的是缓存数据/)).toBeDefined();
  });

  it('Handles error state correctly and retries', async () => {
    const error = new Error('暂时无法获取');
    (error as any).code = 'MODEL_LIST_UNAVAILABLE';
    (error as any).retryable = true;
    fetchModelsSpy.mockRejectedValueOnce(error);
    
    await act(async () => {
      render(<ModelCenterPanel onClose={() => {}} />);
    });
    
    expect(screen.getByText('暂时无法获取')).toBeDefined();

    fetchModelsSpy.mockResolvedValueOnce(mockSuccessResponse);
    const retryBtn = screen.getByText('重试');
    
    await act(async () => {
      fireEvent.click(retryBtn);
    });

    expect(screen.getByText('模型中心')).toBeDefined();
  });

  it('Closes on escape key, mask click, and close button, but not on content click', async () => {
    fetchModelsSpy.mockResolvedValue(mockSuccessResponse);
    const onClose = vi.fn();
    
    await act(async () => {
      render(<ModelCenterPanel onClose={onClose} />);
    });

    // Content click shouldn't close
    const title = screen.getByText('模型中心');
    await act(async () => {
      fireEvent.click(title);
    });
    expect(onClose).toHaveBeenCalledTimes(0);
    
    // Mask click (the dialog role element)
    const dialog = screen.getByRole('dialog');
    await act(async () => {
      fireEvent.click(dialog);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    
    // Close button
    const closeBtn = screen.getByLabelText('关闭模型中心');
    await act(async () => {
      fireEvent.click(closeBtn);
    });
    expect(onClose).toHaveBeenCalledTimes(2);

    // Escape
    await act(async () => {
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
    });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('App integration: mounts only one button, opens one dialog, and does not mount duplicate panels', async () => {
    fetchModelsSpy.mockResolvedValue(mockSuccessResponse);
    
    await act(async () => {
      render(
        <ModelSettingsProvider>
          <App />
        </ModelSettingsProvider>
      );
    });
    
    // 1. App 顶部只有一个当前模型按钮
    const modelButtons = screen.getAllByText(/当前模型:/);
    expect(modelButtons).toHaveLength(1);

    fetchModelsSpy.mockClear();

    // 2. Click to open
    await act(async () => {
      fireEvent.click(modelButtons[0]);
    });

    // 3. fetchModels is called exactly once per open
    expect(fetchModelsSpy).toHaveBeenCalledTimes(1);

    // 4. 点击按钮只打开一个模型中心; 页面 DOM 中只有一个 dialog
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(1);
    
    // Title shows only once inside the dialog
    const titles = screen.getAllByText('模型中心');
    expect(titles).toHaveLength(1);

    // 5. Close the dialog
    const closeBtn = screen.getByLabelText('关闭模型中心');
    await act(async () => {
      fireEvent.click(closeBtn);
    });

    // 6. 关闭后 dialog 数量为 0, App main content stays
    expect(screen.queryByRole('dialog')).toBeNull();
    // App top button should still exist
    expect(screen.getByText(/当前模型:/)).toBeDefined();
  });

  it('Cache behavior: real network request is only fired once per test, second open uses cache', async () => {
    // We restore spy so it uses the real client which hits the network mock
    fetchModelsSpy.mockRestore();

    await act(async () => {
      render(
        <ModelSettingsProvider>
          <App />
        </ModelSettingsProvider>
      );
    });

    const modelButtons = screen.getAllByText(/当前模型:/);

    // Clear network mock calls to count clearly
    const fetchCalls = (global.fetch as any).mock.calls;
    let initialModelCalls = fetchCalls.filter((c: any) => c[0].toString().includes('/api/ai/models')).length;
    expect(initialModelCalls).toBe(0); // App mounted and did NOT prefetch models on startup anymore

    // Open panel
    await act(async () => {
      fireEvent.click(modelButtons[0]);
    });

    // Wait for panel to open
    expect(screen.getByText('模型中心')).toBeDefined();

    // Check fetch was called exactly once to load models on open
    const afterOpenCalls = (global.fetch as any).mock.calls.filter((c: any) => c[0].toString().includes('/api/ai/models')).length;
    expect(afterOpenCalls).toBe(1);

    // clear the mock calls history
    (global.fetch as any).mockClear();

    // Close panel
    const closeBtn = screen.getByLabelText('关闭模型中心');
    await act(async () => {
      fireEvent.click(closeBtn);
    });

    // Open again
    await act(async () => {
      fireEvent.click(modelButtons[0]);
    });

    // Still no new network request because of cache
    const afterSecondOpenCalls = (global.fetch as any).mock.calls.filter((c: any) => c[0].toString().includes('/api/ai/models')).length;
    expect(afterSecondOpenCalls).toBe(0);
  });
});
