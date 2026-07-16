
code += `

import React from 'react';
import { render, screen, act, cleanup, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
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
    
    // 9. App 初始请求次数
    await act(async () => {
      render(<App />);
    });
    
    // 初始渲染应该有 1 次 health 和 1 次 models 请求
    let initialModelsCalls = fetchSpy.mock.calls.filter((c: any) => c[0].includes('/api/ai/models'));
    expect(initialModelsCalls.length).toBe(1);

    // 10. 打开模型中心后的 models 请求次数
    // Click header to open model center
    const modelBadge = await screen.findByText(/当前模型/);
    await act(async () => {
      fireEvent.click(modelBadge);
    });

    // 模型中心打开时不应该有额外的 models 网络请求（因为使用缓存）
    let modelsCallsAfterOpen = fetchSpy.mock.calls.filter((c: any) => c[0].includes('/api/ai/models'));
    expect(modelsCallsAfterOpen.length).toBe(1);

    // 12. 模型面板只有一个 dialog
    const dialogs = document.querySelectorAll('dialog');
    expect(dialogs.length).toBe(1);

    // 11. 刷新只发出一次 refresh=true 请求
    const refreshBtn = await screen.findByText('刷新网络');
    await act(async () => {
      fireEvent.click(refreshBtn);
    });
    
    let refreshCalls = fetchSpy.mock.calls.filter((c: any) => c[0].includes('refresh=true'));
    expect(refreshCalls.length).toBe(1);
    
    // 总 models 请求数变为 2
    let modelsCallsAfterRefresh = fetchSpy.mock.calls.filter((c: any) => c[0].includes('/api/ai/models'));
    expect(modelsCallsAfterRefresh.length).toBe(2);

    // 13. 关闭后无额外请求
    const closeBtn = await screen.findByText('关闭');
    await act(async () => {
      fireEvent.click(closeBtn);
    });
    
    let modelsCallsAfterClose = fetchSpy.mock.calls.filter((c: any) => c[0].includes('/api/ai/models'));
    expect(modelsCallsAfterClose.length).toBe(2); // no new requests
  });
});
`;
fs.writeFileSync('src/test/networkIsolationAssertion.test.tsx', code);
