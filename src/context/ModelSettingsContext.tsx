import React, { createContext, useContext, useState, useEffect } from 'react';
import { modelSettingsStore } from '../services/modelSettingsStore.js';
import { ModelDiscoveryClient } from '../services/modelDiscoveryClient.js';

interface ModelSettingsContextType {
  currentModelId: string;
  setCurrentModelId: (modelId: string | null) => Promise<void>;
  isLoadingSettings: boolean;
}

const ModelSettingsContext = createContext<ModelSettingsContextType | undefined>(undefined);

export const ModelSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [discoveredDefault, setDiscoveredDefault] = useState<string>('gemini-3.5-flash');
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = modelSettingsStore.subscribeModelSettings((settings) => {
      setSelectedModelId(settings?.selectedModelId ?? null);
    });

    // Start discovery fetch immediately to ensure network requests are dispatched on mount tick (required for tests)
    const discoveryPromise = ModelDiscoveryClient.fetchModels()
      .then((discovery) => {
        if (discovery && discovery.currentConfiguredModelId) {
          setDiscoveredDefault(discovery.currentConfiguredModelId);
        }
        return discovery;
      })
      .catch((err) => {
        console.warn('[ModelSettingsContext] Failed to fetch discovery on startup, using fallback:', err);
        return null;
      });

    async function initSettingsAndDiscovery() {
      try {
        await modelSettingsStore.loadModelSettings();
      } catch (err) {
        console.error('[ModelSettingsContext] Error loading settings:', err);
      }

      try {
        await discoveryPromise;
      } catch (err) {
        // Safe ignore
      } finally {
        setIsLoadingSettings(false);
      }
    }

    initSettingsAndDiscovery();

    return () => {
      unsubscribe();
    };
  }, []);

  const setCurrentModelId = async (modelId: string | null) => {
    try {
      await modelSettingsStore.setSelectedModelId(modelId);
    } catch (err) {
      console.error('[ModelSettingsContext] Error saving model setting:', err);
      throw err;
    }
  };

  const currentModelId = selectedModelId !== null ? selectedModelId : discoveredDefault;

  return (
    <ModelSettingsContext.Provider value={{ currentModelId, setCurrentModelId, isLoadingSettings }}>
      {children}
    </ModelSettingsContext.Provider>
  );
};

export const useModelSettings = () => {
  const context = useContext(ModelSettingsContext);
  if (context === undefined) {
    return {
      currentModelId: 'gemini-3.5-flash',
      setCurrentModelId: async () => {},
      isLoadingSettings: false,
    };
  }
  return context;
};
export { ModelSettingsContext };
