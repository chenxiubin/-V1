import { ModelSettingsSchema, ModelSettings } from '../../shared/aiModelContracts';

const DB_NAME = 'CalendarScenePlannerDB';
const DB_VERSION = 2;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('assets')) {
        db.createObjectStore('assets');
      }
      if (!db.objectStoreNames.contains('gemini-model-settings')) {
        db.createObjectStore('gemini-model-settings', { keyPath: 'id' });
      }
    };
  });
}

export function getModelSettings(): Promise<ModelSettings | undefined> {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('gemini-model-settings', 'readonly');
      const store = transaction.objectStore('gemini-model-settings');
      const request = store.get('app-settings');

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(undefined);
          return;
        }
        const parsed = ModelSettingsSchema.safeParse(result);
        if (parsed.success) {
          resolve(parsed.data);
        } else {
          console.warn('[IndexedDB] Stored model settings do not match contract:', parsed.error);
          resolve(undefined);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  });
}

export function saveModelSettings(selectedModelId: string): Promise<ModelSettings> {
  const modelSettingsPayload = {
    id: 'app-settings',
    selectedModelId,
    updatedAt: new Date().toISOString(),
  };

  const parsed = ModelSettingsSchema.safeParse(modelSettingsPayload);
  if (!parsed.success) {
    throw new Error(`无法保存模型设置：参数 "${selectedModelId}" 不符合 AI 模型契约格式。`);
  }

  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('gemini-model-settings', 'readwrite');
      const store = transaction.objectStore('gemini-model-settings');
      const request = store.put(modelSettingsPayload);

      request.onsuccess = () => {
        resolve(parsed.data);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  });
}

export function saveProject(project: { id: string; [key: string]: any }): Promise<void> {
  return initDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('projects', 'readwrite');
      const store = transaction.objectStore(transaction.objectStoreNames[0]);
      const request = store.put(project);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  });
}

export function getProject(id: string): Promise<any | undefined> {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('projects', 'readonly');
      const store = transaction.objectStore(transaction.objectStoreNames[0]);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  });
}

export function listProjects(): Promise<any[]> {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('projects', 'readonly');
      const store = transaction.objectStore(transaction.objectStoreNames[0]);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  });
}

export function deleteProject(id: string): Promise<void> {
  return initDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('projects', 'readwrite');
      const store = transaction.objectStore(transaction.objectStoreNames[0]);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  });
}

export function saveAsset(id: string, blob: Blob): Promise<void> {
  return initDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('assets', 'readwrite');
      const store = transaction.objectStore(transaction.objectStoreNames[0]);
      const request = store.put(blob, id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  });
}

export function getAsset(id: string): Promise<Blob | undefined> {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('assets', 'readonly');
      const store = transaction.objectStore(transaction.objectStoreNames[0]);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  });
}

export function deleteAsset(id: string): Promise<void> {
  return initDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('assets', 'readwrite');
      const store = transaction.objectStore(transaction.objectStoreNames[0]);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  });
}

export function clearAllData(): Promise<void> {
  return initDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['projects', 'assets'], 'readwrite');
      const pStore = transaction.objectStore('projects');
      const aStore = transaction.objectStore('assets');
      
      const pReq = pStore.clear();
      const aReq = aStore.clear();

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  });
}
