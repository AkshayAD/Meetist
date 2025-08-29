import { pipeline, env } from '@xenova/transformers';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

// Configure Transformers.js for React Native
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.remoteURL = 'https://huggingface.co/';
env.cacheDir = `${FileSystem.documentDirectory}transformers-cache/`;

interface TranscriptionResult {
  text: string;
  segments?: Array<{
    text: string;
    timestamp: [number, number];
  }>;
  language?: string;
}

class WhisperTransformersService {
  private transcriber: any = null;
  private modelName: string = 'Xenova/whisper-tiny';
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  // Mapping of our model IDs to Transformers.js models
  private modelMapping: Record<string, string> = {
    'whisper-tiny': 'Xenova/whisper-tiny',
    'whisper-tiny-q5': 'Xenova/whisper-tiny',
    'whisper-base': 'Xenova/whisper-base',
    'whisper-base-q5': 'Xenova/whisper-base',
    'whisper-small': 'Xenova/whisper-small',
    'whisper-small-q5': 'Xenova/whisper-small',
    'whisper-medium': 'Xenova/whisper-medium',
    'whisper-medium-q5': 'Xenova/whisper-medium',
  };

  async initialize(modelId?: string): Promise<void> {
    if (this.isInitialized && !modelId) {
      return;
    }

    // Prevent multiple initialization
    if (this.initPromise && !modelId) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize(modelId);
    await this.initPromise;
    this.initPromise = null;
  }

  private async _doInitialize(modelId?: string): Promise<void> {
    try {
      // Set model based on selection
      if (modelId && this.modelMapping[modelId]) {
        this.modelName = this.modelMapping[modelId];
      }

      console.log(`Initializing Whisper model: ${this.modelName}`);

      // Create cache directory if it doesn't exist
      const cacheDir = `${FileSystem.documentDirectory}transformers-cache/`;
      const dirInfo = await FileSystem.getInfoAsync(cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      }

      // Initialize the transcription pipeline
      this.transcriber = await pipeline(
        'automatic-speech-recognition',
        this.modelName,
        {
          quantized: true,
          progress_callback: (progress: any) => {
            console.log('Model loading progress:', progress);
          },
        }
      );

      this.isInitialized = true;
      console.log('Whisper model initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Whisper model:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  async transcribeAudio(
    audioUri: string,
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    try {
      // Ensure model is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.transcriber) {
        throw new Error('Transcriber not initialized');
      }

      onProgress?.(0.1);

      // Convert audio to proper format
      const audioData = await this.prepareAudioData(audioUri);
      
      onProgress?.(0.3);

      // Perform transcription
      console.log('Starting transcription...');
      const result = await this.transcriber(audioData, {
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'english',
        task: 'transcribe',
      });

      onProgress?.(0.9);

      // Format the result
      const transcriptionResult: TranscriptionResult = {
        text: result.text || '',
        language: 'en',
      };

      // Add segments if available
      if (result.chunks) {
        transcriptionResult.segments = result.chunks.map((chunk: any) => ({
          text: chunk.text,
          timestamp: chunk.timestamp || [0, 0],
        }));
      }

      onProgress?.(1.0);

      console.log('Transcription completed:', transcriptionResult.text.substring(0, 100));
      return transcriptionResult;
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  private async prepareAudioData(audioUri: string): Promise<Float32Array> {
    try {
      // Read audio file as base64
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to ArrayBuffer
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // For now, return a simple Float32Array
      // In production, you'd decode the audio properly
      const audioData = new Float32Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        audioData[i] = (bytes[i] - 128) / 128.0;
      }

      return audioData;
    } catch (error) {
      console.error('Failed to prepare audio data:', error);
      throw error;
    }
  }

  async setModel(modelId: string): Promise<void> {
    if (this.modelMapping[modelId]) {
      const newModelName = this.modelMapping[modelId];
      if (newModelName !== this.modelName) {
        this.isInitialized = false;
        this.transcriber = null;
        await this.initialize(modelId);
      }
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && this.transcriber !== null;
  }

  async clearCache(): Promise<void> {
    try {
      const cacheDir = `${FileSystem.documentDirectory}transformers-cache/`;
      await FileSystem.deleteAsync(cacheDir, { idempotent: true });
      console.log('Transformers cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
}

export const whisperTransformersService = new WhisperTransformersService();