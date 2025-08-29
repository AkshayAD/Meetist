import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppSettings } from '../../types';
import StorageService from '../../services/StorageService';

const initialState: AppSettings = StorageService.getSettings();

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<AppSettings>>) => {
      const newSettings = { ...state, ...action.payload };
      StorageService.saveSettings(newSettings);
      return newSettings;
    },
    resetSettings: () => {
      const defaultSettings: AppSettings = {
        whisperModel: 'tiny',
        audioQuality: 'medium',
        autoTranscribe: true,
        saveOriginalAudio: true,
        theme: 'light',
      };
      StorageService.saveSettings(defaultSettings);
      return defaultSettings;
    },
  },
});

export const { updateSettings, resetSettings } = settingsSlice.actions;
export default settingsSlice.reducer;