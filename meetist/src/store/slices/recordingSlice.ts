import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RecordingState } from '../../types';

const initialState: RecordingState = {
  isRecording: false,
  isPaused: false,
  duration: 0,
  audioUri: undefined,
  waveformData: [],
};

const recordingSlice = createSlice({
  name: 'recording',
  initialState,
  reducers: {
    startRecording: (state) => {
      state.isRecording = true;
      state.isPaused = false;
      state.duration = 0;
      state.waveformData = [];
    },
    pauseRecording: (state) => {
      state.isPaused = true;
    },
    resumeRecording: (state) => {
      state.isPaused = false;
    },
    stopRecording: (state, action: PayloadAction<string | undefined>) => {
      state.isRecording = false;
      state.isPaused = false;
      state.audioUri = action.payload;
    },
    updateDuration: (state, action: PayloadAction<number>) => {
      state.duration = action.payload;
    },
    updateWaveform: (state, action: PayloadAction<number[]>) => {
      state.waveformData = action.payload;
    },
    resetRecording: (state) => {
      return initialState;
    },
  },
});

export const {
  startRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
  updateDuration,
  updateWaveform,
  resetRecording,
} = recordingSlice.actions;

export default recordingSlice.reducer;