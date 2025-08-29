import { configureStore } from '@reduxjs/toolkit';
import recordingReducer from './slices/recordingSlice';
import meetingsReducer from './slices/meetingsSlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    recording: recordingReducer,
    meetings: meetingsReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['recording/updateWaveform'],
        ignoredPaths: ['recording.waveformData'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;