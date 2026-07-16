import { getModelSettings as dbGetModelSettings, saveModelSettings as dbSaveModelSettings } from '../lib/db.js';
import { ModelSettings } from '../../shared/aiModelContracts.js';

type Subscriber = (settings: ModelSettings | null) => void;

class ModelSettingsStore {
  private currentSettings: ModelSettings | null = null;
  private subscribers: Set<Subscriber> = new Set();
  private loaded = false;

  async loadModelSettings(): Promise<ModelSettings | null> {
    try {
      const stored = await dbGetModelSettings();
      if (stored) {
        this.currentSettings = stored;
      } else {
        this.currentSettings = {
          selectedModelId: null,
          updatedAt: new Date().toISOString()
        };
      }
    } catch (err) {
      console.error('[ModelSettingsStore] Failed to load model settings:', err);
      this.currentSettings = {
        selectedModelId: null,
        updatedAt: new Date().toISOString()
      };
    }
    this.loaded = true;
    this.notify();
    return this.currentSettings;
  }

  getModelSettings(): ModelSettings | null {
    return this.currentSettings;
  }

  async setSelectedModelId(modelId: string | null): Promise<ModelSettings> {
    const updatedPayload: ModelSettings = {
      selectedModelId: modelId,
      updatedAt: new Date().toISOString()
    };
    
    await dbSaveModelSettings(modelId);
    
    this.currentSettings = updatedPayload;
    this.notify();
    return updatedPayload;
  }

  subscribeModelSettings(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    if (this.loaded) {
      callback(this.currentSettings);
    }
    return () => {
      this.subscribers.delete(callback);
    };
  }

  async resetModelSettingsToDefault(): Promise<ModelSettings> {
    return this.setSelectedModelId(null);
  }

  private notify() {
    for (const callback of this.subscribers) {
      try {
        callback(this.currentSettings);
      } catch (err) {
        console.error('[ModelSettingsStore] Error notifying subscriber:', err);
      }
    }
  }
}

export const modelSettingsStore = new ModelSettingsStore();
export type { ModelSettingsStore };
export type { Subscriber as ModelSettingsSubscriber };
