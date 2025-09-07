export const Audio = {
  RecordingOptionsPresets: {
    HIGH_QUALITY: {},
  },
  setAudioModeAsync: jest.fn(),
  Recording: jest.fn().mockImplementation(() => ({
    prepareToRecordAsync: jest.fn(),
    startAsync: jest.fn(),
    stopAndUnloadAsync: jest.fn(),
    getStatusAsync: jest.fn().mockResolvedValue({ isRecording: false }),
    setOnRecordingStatusUpdate: jest.fn(),
  })),
};

export const AVPlaybackStatus = {};