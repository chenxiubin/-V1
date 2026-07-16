import { ModelDiscoveryClient } from '../services/modelDiscoveryClient';
import { setupNetworkIsolation } from "./networkIsolation";
// @vitest-environment happy-dom
import React from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';

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

// We DO NOT mock ModelDiscoveryClient here so we can test the real fetch call.

describe('Network Isolation Real Fetch Assertion', () => {
  let cleanupNetworkIsolation: (() => void) | null = null;
  beforeEach(async () => {
    vi.resetAllMocks();
    cleanupNetworkIsolation = setupNetworkIsolation();
    ModelDiscoveryClient.clearCacheForTests();
  });

  afterEach(() => {
    cleanupNetworkIsolation?.();
    cleanupNetworkIsolation = null;
    cleanup();
  });

  it('App directly renders and network is completely isolated', async () => {
    await act(async () => {
      render(<App />);
    });

    const fetchCalls = (global.fetch as any).mock.calls;
    
    let healthCalls = 0;
    let modelsCalls = 0;
    let otherCalls = 0;

    for (const call of fetchCalls) {
      const url = call[0].toString();
      if (url.includes('/api/health')) healthCalls++;
      else if (url.includes('/api/ai/models')) modelsCalls++;
      else otherCalls++;
      
      expect(url).not.toContain('localhost');
      expect(url).not.toContain('127.0.0.1');
      expect(url).not.toContain('http://');
      expect(url).not.toContain('https://');
    }

    expect(healthCalls).toBe(1);
    expect(modelsCalls).toBe(1);
    expect(otherCalls).toBe(0);

    expect(screen.getByText(/当前模型: gemini-3.5-flash/)).toBeDefined();
  });

  it('throws on unmocked network request', async () => {
    await expect(globalThis.fetch('/api/not-mocked')).rejects.toThrow('Unmocked network request: /api/not-mocked');
  });
});
