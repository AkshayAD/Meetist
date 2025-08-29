import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { whisperModelService } from './WhisperModelService';
import { whisperRealService } from './WhisperRealService';
import { Platform } from 'react-native';

interface TranscriptionSegment {
  text: string;
  timestamp: [number, number];
  confidence?: number;
}

interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language?: string;
  duration?: number;
}

class WhisperTranscriptionService {
  private isProcessing: boolean = false;
  private currentModel: string | null = null;

  async initialize(): Promise<void> {
    const activeModel = whisperModelService.getActiveModel();
    if (activeModel) {
      this.currentModel = activeModel.id;
      await whisperRealService.initialize(activeModel.id);
    }
  }

  async transcribeAudio(
    audioUri: string,
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    if (this.isProcessing) {
      throw new Error('Transcription already in progress');
    }

    const activeModel = whisperModelService.getActiveModel();
    if (!activeModel) {
      throw new Error('No Whisper model selected. Please download a model first.');
    }

    const modelPath = whisperModelService.getModelPath(activeModel.id);
    if (!modelPath) {
      throw new Error('Model file not found. Please re-download the model.');
    }

    this.isProcessing = true;

    try {
      // Initialize with selected model
      await whisperRealService.setModel(activeModel.id);
      
      // Use real Whisper service
      const result = await whisperRealService.transcribeAudio(audioUri, onProgress);
      return result;
    } finally {
      this.isProcessing = false;
    }
  }

  private async transcribeWithWhisperAndroid(
    audioUri: string,
    modelPath: string,
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    try {
      const audioInfo = await FileSystem.getInfoAsync(audioUri);
      if (!audioInfo.exists) {
        throw new Error('Audio file not found');
      }

      // Convert audio to WAV format if needed
      const wavUri = await this.convertToWav(audioUri);
      
      // Simulate transcription with progress updates
      // In a real implementation, this would use native bindings
      const segments: TranscriptionSegment[] = [];
      const totalDuration = await this.getAudioDuration(audioUri);
      
      // Simulate processing chunks
      const chunkSize = 5; // 5 second chunks
      const numChunks = Math.ceil(totalDuration / chunkSize);
      
      for (let i = 0; i < numChunks; i++) {
        if (onProgress) {
          onProgress((i + 1) / numChunks);
        }
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const startTime = i * chunkSize;
        const endTime = Math.min((i + 1) * chunkSize, totalDuration);
        
        segments.push({
          text: `[Transcribed segment ${i + 1}]`,
          timestamp: [startTime, endTime],
          confidence: 0.95,
        });
      }

      const fullText = segments.map(s => s.text).join(' ');
      
      return {
        text: fullText,
        segments,
        language: 'en',
        duration: totalDuration,
      };
    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw error;
    }
  }

  private async transcribeWithWhisperFallback(
    audioUri: string,
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    // Fallback implementation for iOS or when native binding is not available
    const duration = await this.getAudioDuration(audioUri);
    
    if (onProgress) {
      onProgress(0.5);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (onProgress) {
      onProgress(1);
    }
    
    return {
      text: '[Whisper transcription will be available once native module is installed]',
      segments: [{
        text: '[Whisper transcription will be available once native module is installed]',
        timestamp: [0, duration],
        confidence: 0,
      }],
      language: 'en',
      duration,
    };
  }

  private async convertToWav(audioUri: string): Promise<string> {
    // Check if already WAV
    if (audioUri.endsWith('.wav')) {
      return audioUri;
    }
    
    // Convert to WAV format
    const wavUri = audioUri.replace(/\.[^.]+$/, '.wav');
    
    try {
      // In a real implementation, this would use native audio conversion
      // For now, we'll just copy the file
      await FileSystem.copyAsync({
        from: audioUri,
        to: wavUri,
      });
      
      return wavUri;
    } catch (error) {
      console.error('Failed to convert audio to WAV:', error);
      return audioUri;
    }
  }

  private async getAudioDuration(audioUri: string): Promise<number> {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      const status = await sound.getStatusAsync();
      await sound.unloadAsync();
      
      if (status.isLoaded && status.durationMillis) {
        return status.durationMillis / 1000;
      }
    } catch (error) {
      console.error('Failed to get audio duration:', error);
    }
    
    return 60; // Default to 60 seconds
  }

  async transcribeRealtimeChunk(
    audioBuffer: ArrayBuffer,
    previousContext?: string
  ): Promise<string> {
    const activeModel = whisperModelService.getActiveModel();
    if (!activeModel) {
      throw new Error('No Whisper model selected');
    }

    // In a real implementation, this would process audio chunks in real-time
    // For now, return placeholder text
    return '[Real-time transcription chunk]';
  }

  setModel(modelId: string): boolean {
    if (whisperModelService.setActiveModel(modelId)) {
      this.currentModel = modelId;
      return true;
    }
    return false;
  }

  getCurrentModel(): string | null {
    return this.currentModel;
  }

  isAvailable(): boolean {
    return whisperModelService.getDownloadedModels().length > 0;
  }
}

export const whisperTranscriptionService = new WhisperTranscriptionService();