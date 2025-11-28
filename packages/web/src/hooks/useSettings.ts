import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'auto' | 'ja' | 'en';
export type SendMessageMethod = 'enter' | 'ctrl-cmd-enter';

export interface Settings {
  theme: Theme;
  language: Language;
  sendMessageMethod: SendMessageMethod;
  customizeEnabled: boolean;
  customInstructions: string;
  webSearchEnabled: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  language: 'auto',
  sendMessageMethod: 'enter',
  customizeEnabled: false,
  customInstructions: '',
  webSearchEnabled: false,
};

const STORAGE_KEY = 'app-settings';

// localStorageから初期値を読み込む
const loadSettings = (): Settings => {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_SETTINGS;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return DEFAULT_SETTINGS;
};

// localStorageに保存する
const saveSettings = (settings: Settings) => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

interface SettingsStore {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  resetSettings: () => void;
}

const useSettingsStore = create<SettingsStore>((set) => ({
  settings: loadSettings(),
  updateSettings: (updates) =>
    set((state) => {
      const newSettings = { ...state.settings, ...updates };
      saveSettings(newSettings);
      return { settings: newSettings };
    }),
  resetSettings: () => {
    saveSettings(DEFAULT_SETTINGS);
    set({ settings: DEFAULT_SETTINGS });
  },
}));

export const useSettings = () => {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  return {
    settings,
    updateSettings,
    resetSettings,
  };
};
