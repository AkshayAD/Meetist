export interface Meeting {
  id: string;
  title: string;
  date: Date;
  duration: number; // in seconds
  audioPath: string;
  transcription: Transcription;
  tags: string[];
  participants: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Transcription {
  text: string;
  segments: TranscriptionSegment[];
  language: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
}

export interface TranscriptionSegment {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  speaker?: string;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioUri?: string;
  waveformData: number[];
}

export interface AppSettings {
  whisperModel: 'tiny' | 'base';
  audioQuality: 'low' | 'medium' | 'high';
  autoTranscribe: boolean;
  saveOriginalAudio: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export type RootStackParamList = {
  Home: undefined;
  Recording: undefined;
  MeetingDetail: { meetingId: string };
  Settings: undefined;
};

export type BottomTabParamList = {
  HomeTab: undefined;
  MeetingsTab: undefined;
  SettingsTab: undefined;
};