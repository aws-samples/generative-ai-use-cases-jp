import { useState, useEffect, useCallback } from 'react';

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

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>(() => {
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
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
};
