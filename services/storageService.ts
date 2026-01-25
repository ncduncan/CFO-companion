import { AppData, INITIAL_DATA } from '../types';

const DB_NAME = 'CFO_Companion_DB';
const STORE_NAME = 'handles';
const KEY_NAME = 'workspace_dir';

const FILES = {
  SETTINGS: 'cfo_companion_settings.json',
  DATA: 'cfo_companion_data.json',
  IMPROVEMENTS: 'cfo_companion_improvements.json'
};

// --- IndexedDB Helper for Persisting Directory Handle ---

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
  });
};

export const getStoredDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_NAME);
      req.onsuccess = () => resolve(req.result as FileSystemDirectoryHandle || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error("Error reading DB", e);
    return null;
  }
};

export const storeDirectoryHandle = async (handle: FileSystemDirectoryHandle): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(handle, KEY_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// --- File System Operations ---

export const verifyPermission = async (handle: FileSystemDirectoryHandle, readWrite: boolean): Promise<boolean> => {
  const options: any = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  if ((await (handle as any).queryPermission(options)) === 'granted') {
    return true;
  }
  if ((await (handle as any).requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
};

// Helper to read a single JSON file, returning default if missing
async function readJsonFile<T>(dirHandle: FileSystemDirectoryHandle, filename: string, defaultValue: T): Promise<T> {
  try {
    const fileHandle = await dirHandle.getFileHandle(filename, { create: false });
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      return defaultValue;
    }
    throw error;
  }
}

// Helper to write a single JSON file
async function writeJsonFile(dirHandle: FileSystemDirectoryHandle, filename: string, data: any): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

export const readDataFromDirectory = async (dirHandle: FileSystemDirectoryHandle): Promise<AppData> => {
  // Read all 3 files in parallel
  const [settings, recordsData, improvementsData] = await Promise.all([
    readJsonFile(dirHandle, FILES.SETTINGS, {
      accounts: INITIAL_DATA.accounts,
      costCenters: INITIAL_DATA.costCenters,
      productLines: INITIAL_DATA.productLines,
      plans: INITIAL_DATA.plans,
      assumptions: INITIAL_DATA.assumptions
    }),
    readJsonFile(dirHandle, FILES.DATA, { records: INITIAL_DATA.records }),
    readJsonFile(dirHandle, FILES.IMPROVEMENTS, { opportunities: INITIAL_DATA.opportunities })
  ]);

  return {
    accounts: settings.accounts || INITIAL_DATA.accounts,
    costCenters: settings.costCenters || INITIAL_DATA.costCenters,
    productLines: settings.productLines || INITIAL_DATA.productLines,
    plans: settings.plans || INITIAL_DATA.plans,
    assumptions: settings.assumptions || INITIAL_DATA.assumptions,
    records: recordsData.records || INITIAL_DATA.records,
    opportunities: improvementsData.opportunities || INITIAL_DATA.opportunities,
    lastModified: new Date().toISOString()
  };
};

export const writeDataToDirectory = async (dirHandle: FileSystemDirectoryHandle, data: AppData): Promise<void> => {
  // Split data back into 3 files
  const settingsData = {
    accounts: data.accounts,
    costCenters: data.costCenters,
    productLines: data.productLines,
    plans: data.plans,
    assumptions: data.assumptions
  };

  const recordsData = {
    records: data.records
  };

  const improvementsData = {
    opportunities: data.opportunities
  };

  await Promise.all([
    writeJsonFile(dirHandle, FILES.SETTINGS, settingsData),
    writeJsonFile(dirHandle, FILES.DATA, recordsData),
    writeJsonFile(dirHandle, FILES.IMPROVEMENTS, improvementsData)
  ]);
};

export const isFileSystemSupported = (): boolean => {
  return 'showDirectoryPicker' in window;
};