import React, { createContext, useContext, useState, useEffect } from 'react';
import { getModelSettings, saveModelSettings } from '../lib/db';
import { ModelDiscoveryClient } from '../services/modelDiscoveryClient';

interface ModelSettingsContextType {
  currentModelId: string;
  setCurrentModelId: (modelId: string) => Promise<void>;
  isLoadingSettings: boolean;
}

const ModelSettingsContext = createContext<ModelSettingsContextType | undefined>(undefined);

export const ModelSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentModelId, setCurrentModelIdState] = useState<string>('gemini-3.5-flash');
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);

  useEffect(() => {
    async function loadInitialSettings() {
      try {
        const stored = await getModelSettings();
        if (stored && stored.selectedModelId) {
          setCurrentModelIdState(stored.selectedModelId);
        } else {
          // If no setting is stored in IndexedDB, query model discovery for default or fallback
          let defaultModel = 'gemini-3.5-flash';
          try {
            const discovery = await ModelDiscoveryClient.fetchModels();
            if (discovery && discovery.currentConfiguredModelId) {
              defaultModel = discovery.currentConfiguredModelId;
            }
          } catch (err) {
            console.warn('[ModelSettingsContext] Failed to fetch discovery model, using fallback:', err);
          }
          // Automatically persist initial model settings to IndexedDB
          await saveModelSettings(defaultModel);
          setCurrentModelIdState(defaultModel);
        }
      } catch (err) {
        console.error('[ModelSettingsContext] Error loading initial settings from IndexedDB:', err);
      } finally {
        setIsLoadingSettings(false);
      }
    }

    loadInitialSettings();
  }, []);

  const setCurrentModelId = async (modelId: string) => {
    try {
      await saveModelSettings(modelId);
      setCurrentModelIdState(modelId);
    } catch (err) {
      console.error('[ModelSettingsContext] Error saving model settings to IndexedDB:', err);
      throw err;
    }
  };

  return (
    <ModelSettingsContext.Provider value={{ currentModelId, setCurrentModelId, isLoadingSettings }}>
      {children}
    </ModelSettingsContext.Provider>
  );
};

export const useModelSettings = () => {
  const context = useContext(ModelSettingsContext);
  if (context === undefined) {
    throw new Error('useModelSettings must be used within a ModelSettingsProvider');
  }
  return context;
};
