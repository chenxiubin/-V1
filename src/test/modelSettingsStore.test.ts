import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Set up mock before importing the store using hoisted variables
const { mockGetModelSettings, mockSaveModelSettings } = vi.hoisted(() => ({
  mockGetModelSettings: vi.fn(),
  mockSaveModelSettings: vi.fn(),
}));

vi.mock('../lib/db.js', () => ({
  getModelSettings: mockGetModelSettings,
  saveModelSettings: mockSaveModelSettings,
}));

import { modelSettingsStore } from '../services/modelSettingsStore.js';

describe('modelSettingsStore tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    // Reset private state of modelSettingsStore for test isolation
    (modelSettingsStore as any).currentSettings = null;
    (modelSettingsStore as any).loaded = false;
    (modelSettingsStore as any).subscribers.clear();
  });

  it('1. should load settings from DB when they exist', async () => {
    const mockData = {
      selectedModelId: 'gemini-1.5-pro',
      updatedAt: '2026-07-16T00:00:00.000Z',
    };
    mockGetModelSettings.mockResolvedValueOnce(mockData);

    const loaded = await modelSettingsStore.loadModelSettings();
    expect(mockGetModelSettings).toHaveBeenCalledTimes(1);
    expect(loaded).toEqual(mockData);
    expect(modelSettingsStore.getModelSettings()).toEqual(mockData);
  });

  it('2. should use default null state if DB contains nothing', async () => {
    mockGetModelSettings.mockResolvedValueOnce(undefined);

    const loaded = await modelSettingsStore.loadModelSettings();
    expect(mockGetModelSettings).toHaveBeenCalledTimes(1);
    expect(loaded?.selectedModelId).toBeNull();
    expect(modelSettingsStore.getModelSettings()?.selectedModelId).toBeNull();
  });

  it('3. should safely recover and use default null state if DB load fails', async () => {
    mockGetModelSettings.mockRejectedValueOnce(new Error('IndexedDB crash'));

    const loaded = await modelSettingsStore.loadModelSettings();
    expect(mockGetModelSettings).toHaveBeenCalledTimes(1);
    expect(loaded?.selectedModelId).toBeNull();
    expect(modelSettingsStore.getModelSettings()?.selectedModelId).toBeNull();
  });

  it('4. should save settings using setSelectedModelId and trigger subscriptions', async () => {
    mockSaveModelSettings.mockResolvedValueOnce({
      id: 'app-settings',
      selectedModelId: 'gemini-3.5-flash',
      updatedAt: '2026-07-16T00:00:00.000Z',
    });

    const subscriber = vi.fn();
    modelSettingsStore.subscribeModelSettings(subscriber);

    // Load first to set loaded = true (so subscriber is triggered immediately upon sub and on set)
    mockGetModelSettings.mockResolvedValueOnce(undefined);
    await modelSettingsStore.loadModelSettings();
    expect(subscriber).toHaveBeenCalledTimes(1); // Call during loadModelSettings notify

    const updated = await modelSettingsStore.setSelectedModelId('gemini-3.5-flash');
    expect(mockSaveModelSettings).toHaveBeenCalledWith('gemini-3.5-flash');
    expect(updated.selectedModelId).toBe('gemini-3.5-flash');
    expect(subscriber).toHaveBeenCalledTimes(2); // Second call on update
    expect(subscriber.mock.calls[1][0].selectedModelId).toBe('gemini-3.5-flash');
  });

  it('5. should support resetModelSettingsToDefault', async () => {
    mockGetModelSettings.mockResolvedValueOnce({
      selectedModelId: 'gemini-1.5-pro',
      updatedAt: '2026-07-16T00:00:00.000Z',
    });
    await modelSettingsStore.loadModelSettings();

    const resetResult = await modelSettingsStore.resetModelSettingsToDefault();
    expect(mockSaveModelSettings).toHaveBeenCalledWith(null);
    expect(resetResult.selectedModelId).toBeNull();
    expect(modelSettingsStore.getModelSettings()?.selectedModelId).toBeNull();
  });

  it('6. should return unsubscribe function and stop triggering subscriber', async () => {
    const subscriber = vi.fn();
    const unsub = modelSettingsStore.subscribeModelSettings(subscriber);

    mockGetModelSettings.mockResolvedValueOnce(undefined);
    await modelSettingsStore.loadModelSettings();
    expect(subscriber).toHaveBeenCalledTimes(1);

    unsub();

    await modelSettingsStore.setSelectedModelId('gemini-1.5-pro');
    expect(subscriber).toHaveBeenCalledTimes(1); // Subscriber should not be called after unsubscribe
  });
});
