/**
 * Preferences Store
 * 
 * Separate store for user preferences with persistence.
 * Stores theme, units, and other user customizations.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_CONFIG } from './utils/persistence';

export interface PreferencesState {
  theme: 'light' | 'dark' | 'auto';
  temperatureUnit: 'celsius' | 'fahrenheit';
  timeFormat: '12h' | '24h';
  language: string;
  notifications: {
    weather: boolean;
    location: boolean;
    general: boolean;
  };
  display: {
    compactMode: boolean;
    showAnimations: boolean;
    showWeatherDetails: boolean;
  };
}

export interface PreferencesActions {
  setTheme: (theme: PreferencesState['theme']) => void;
  setTemperatureUnit: (unit: PreferencesState['temperatureUnit']) => void;
  setTimeFormat: (format: PreferencesState['timeFormat']) => void;
  setLanguage: (language: string) => void;
  updateNotificationPreferences: (notifications: Partial<PreferencesState['notifications']>) => void;
  updateDisplayPreferences: (display: Partial<PreferencesState['display']>) => void;
  resetPreferences: () => void;
  importPreferences: (preferences: Partial<PreferencesState>) => void;
  exportPreferences: () => PreferencesState;
}

export interface PreferencesStore extends PreferencesState, PreferencesActions {}

// Default preferences
const DEFAULT_PREFERENCES: PreferencesState = {
  theme: 'auto',
  temperatureUnit: 'fahrenheit',
  timeFormat: '12h',
  language: 'en-US',
  notifications: {
    weather: true,
    location: false,
    general: true,
  },
  display: {
    compactMode: false,
    showAnimations: true,
    showWeatherDetails: true,
  },
};

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set, get) => ({
      // State - spread defaults
      ...DEFAULT_PREFERENCES,

      // Actions
      setTheme: (theme) => {
        set({ theme });
      },

      setTemperatureUnit: (temperatureUnit) => {
        set({ temperatureUnit });
      },

      setTimeFormat: (timeFormat) => {
        set({ timeFormat });
      },

      setLanguage: (language) => {
        set({ language });
      },

      updateNotificationPreferences: (notificationUpdates) => {
        set((state) => ({
          notifications: {
            ...state.notifications,
            ...notificationUpdates,
          },
        }));
      },

      updateDisplayPreferences: (displayUpdates) => {
        set((state) => ({
          display: {
            ...state.display,
            ...displayUpdates,
          },
        }));
      },

      resetPreferences: () => {
        set(DEFAULT_PREFERENCES);
      },

      importPreferences: (preferences) => {
        set((state) => ({
          ...state,
          ...preferences,
          // Merge nested objects properly
          notifications: {
            ...state.notifications,
            ...preferences.notifications,
          },
          display: {
            ...state.display,
            ...preferences.display,
          },
        }));
      },

      exportPreferences: () => {
        const state = get();
        return {
          theme: state.theme,
          temperatureUnit: state.temperatureUnit,
          timeFormat: state.timeFormat,
          language: state.language,
          notifications: state.notifications,
          display: state.display,
        };
      },
    }),
    {
      name: STORAGE_CONFIG.keys.preferences,
      // Persist all preferences
      partialize: (state) => ({
        theme: state.theme,
        temperatureUnit: state.temperatureUnit,
        timeFormat: state.timeFormat,
        language: state.language,
        notifications: state.notifications,
        display: state.display,
      }),
    },
  ),
);