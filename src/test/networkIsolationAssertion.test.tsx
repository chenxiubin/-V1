// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupNetworkIsolation } from './networkIsolation';
import React from 'react';
import { render, screen, act, cleanup, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { ModelSettingsProvider } from '../context/ModelSettingsContext';
import { ModelDiscoveryClient } from '../services/modelDiscoveryClient';

vi.mock('../lib/db', () => ({
  initDB: vi.fn().mockResolvedValue(true),
  getProject: vi.fn().mockResolvedValue(null),
  listProjects: vi.fn().mockResolvedValue([]),
  saveProject: vi.fn(),
  deleteProject: vi.fn(),
  getAsset: vi.fn().mockResolvedValue(null),
  saveAsset: vi.fn(),
  deleteAsset: vi.fn()
}));

describe('Network Isolation', () => {
  let teardown: () => void;

  beforeEach(() => {
    vi.resetAllMocks();
    teardown = setupNetworkIsolation();
  });

  afterEach(() => {
    teardown();
  });

  it('1. health 相对 URL', async () => {
    const res = await fetch('/api/health');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it('2. models 相对 URL', async () => {
    const res = await fetch('/api/ai/models');
    expect(res.status).toBe(200);
  });

  it('3. refresh=true', async () => {
    const res = await fetch('/api/ai/models?refresh=true');
    expect(res.status).toBe(200);
  });

  it('4. localhost 绝对 URL', async () => {
    const res = await fetch('http://localhost:3000/api/health');
    expect(res.status).toBe(200);
  });

  it('5. 127.0.0.1 绝对 URL', async () => {
    const res = await fetch('http://127.0.0.1:3000/api/health');
    expect(res.status).toBe(200);
  });

  it('6. 未识别 URL 抛错', async () => {
    await expect(fetch('http://example.com/api/data')).rejects.toThrow('Unmocked network request: http://example.com/api/data');
    await expect(fetch('/api/unknown')).rejects.toThrow('Unmocked network request: /api/unknown');
    await expect(fetch('/api/ai/models?foo=bar')).rejects.toThrow('Unmocked network request: /api/ai/models?foo=bar');
  });

  it('7. teardown 恢复原始 fetch', async () => {
    const originalFetch = globalThis.fetch;
    teardown();
    expect(globalThis.fetch).not.toBe(originalFetch);
    teardown = setupNetworkIsolation(); 
  });
  
  it('8. 连续 setup/teardown 不污染', async () => {
    teardown();
    
    const originalFetch = globalThis.fetch;
    
    const localTeardown1 = setupNetworkIsolation();
    expect(globalThis.fetch).not.toBe(originalFetch);
    localTeardown1();
    expect(globalThis.fetch).toBe(originalFetch);
    
    const localTeardown2 = setupNetworkIsolation();
    expect(globalThis.fetch).not.toBe(originalFetch);
    localTeardown2();
    expect(globalThis.fetch).toBe(originalFetch);
    
    teardown = setupNetworkIsolation();
  });
});

describe('App Network Isolation & UI Interaction', () => {
  let teardown: () => void;

  beforeEach(() => {
    vi.resetAllMocks();
    teardown = setupNetworkIsolation();
    ModelDiscoveryClient.clearCacheForTests();
  });

  afterEach(() => {
    teardown();
    cleanup();
  });

  it('9-13 App 交互过程的网络隔离精确验证', async () => {
    const fetchSpy = globalThis.fetch as any;
    
    await act(async () => {
      render(
        <ModelSettingsProvider>
          <App />
        </ModelSettingsProvider>
      );
    });
    
    let initialModelsCalls = fetchSpy.mock.calls.filter((c: any) => c[0].includes('/api/ai/models'));
    expect(initialModelsCalls.length).toBe(0);

    const modelBadge = await screen.findByText(/当前模型/);
    await act(async () => {
      fireEvent.click(modelBadge);
    });

    let modelsCallsAfterOpen = fetchSpy.mock.calls.filter((c: any) => c[0].includes('/api/ai/models'));
    expect(modelsCallsAfterOpen.length).toBe(1);

    await waitFor(() => {
      const dialogs = screen.queryAllByRole('dialog');
      expect(dialogs.length).toBe(1);
    });

    const refreshBtn = await screen.findByText('刷新列表');
    await act(async () => {
      fireEvent.click(refreshBtn);
    });
    
    let refreshCalls = fetchSpy.mock.calls.filter((c: any) => c[0].includes('refresh=true'));
    expect(refreshCalls.length).toBe(1);
    
    let modelsCallsAfterRefresh = fetchSpy.mock.calls.filter((c: any) => c[0].includes('/api/ai/models'));
    expect(modelsCallsAfterRefresh.length).toBe(2);

    const closeBtn = await screen.findByLabelText('关闭模型中心');
    await act(async () => {
      fireEvent.click(closeBtn);
    });
    
    let modelsCallsAfterClose = fetchSpy.mock.calls.filter((c: any) => c[0].includes('/api/ai/models'));
    expect(modelsCallsAfterClose.length).toBe(2);
  });
});
