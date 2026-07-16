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

    async function initSettings() {
      try {
        await modelSettingsStore.loadModelSettings();
      } catch (err) {
        console.error('[ModelSettingsContext] Error loading settings:', err);
      } finally {
        setIsLoadingSettings(false);
      }
    }

    initSettings();

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

  const currentModelId = selectedModelId !== null
    ? selectedModelId
    : (ModelDiscoveryClient.getCachedResult()?.currentConfiguredModelId || discoveredDefault);

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
