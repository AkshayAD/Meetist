import * as FileSystem from 'expo-file-system';
import { TranscriptionSegment } from '../types';

// Whisper model configurations
export const WHISPER_MODELS = {
  tiny: {
    name: 'tiny',
    size: 39,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
    filename: 'ggml-tiny.en.bin',
  },
  base: {
    name: 'base',
    size: 74,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
    filename: 'ggml-base.en.bin',
  },
};

export class WhisperService {
  private currentModel: 'tiny' | 'base' = 'tiny';
  private modelPath: string | null = null;
  private isModelLoaded: boolean = false;
  private downloadProgress: number = 0;

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    // Check if model exists
    const modelDir = `${FileSystem.documentDirectory}whisper_models/`;
    await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
    
    const modelFile = `${modelDir}${WHISPER_MODELS[this.currentModel].filename}`;
    const info = await FileSystem.getInfoAsync(modelFile);
    
    if (info.exists) {
      this.modelPath = modelFile;
      this.isModelLoaded = true;
    }
  }

  // Download Whisper model
  async downloadModel(
    modelType: 'tiny' | 'base',
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    try {
      const model = WHISPER_MODELS[modelType];
      const modelDir = `${FileSystem.documentDirectory}whisper_models/`;
      await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
      
      const modelFile = `${modelDir}${model.filename}`;
      
      // Check if already exists
      const info = await FileSystem.getInfoAsync(modelFile);
      if (info.exists) {
        this.modelPath = modelFile;
        this.isModelLoaded = true;
        this.currentModel = modelType;
        return true;
      }

      // Download with progress
      const downloadResumable = FileSystem.createDownloadResumable(
        model.url,
        modelFile,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          this.downloadProgress = progress;
          if (onProgress) {
            onProgress(progress);
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (result) {
        this.modelPath = modelFile;
        this.isModelLoaded = true;
        this.currentModel = modelType;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to download Whisper model:', error);
      return false;
    }
  }

  // Check if model is ready
  isReady(): boolean {
    return this.isModelLoaded && this.modelPath !== null;
  }

  // Get model status
  getModelStatus(): {
    isLoaded: boolean;
    currentModel: string;
    modelPath: string | null;
    downloadProgress: number;
  } {
    return {
      isLoaded: this.isModelLoaded,
      currentModel: this.currentModel,
      modelPath: this.modelPath,
      downloadProgress: this.downloadProgress,
    };
  }

  // Process audio file with Whisper (simulated for now - needs native module)
  async transcribeAudio(
    audioPath: string,
    onProgress?: (progress: number) => void
  ): Promise<{
    text: string;
    segments: TranscriptionSegment[];
  }> {
    if (!this.isReady()) {
      throw new Error('Whisper model not loaded. Please download a model first.');
    }

    try {
      // In a real implementation, this would call a native module
      // For now, we'll simulate the transcription process
      
      // Read audio file info
      const audioInfo = await FileSystem.getInfoAsync(audioPath);
      if (!audioInfo.exists) {
        throw new Error('Audio file not found');
      }

      // Simulate processing time based on file size
      const processingSteps = 10;
      for (let i = 0; i < processingSteps; i++) {
        if (onProgress) {
          onProgress((i + 1) / processingSteps);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // For MVP, return a placeholder that indicates local processing
      // In production, this would be replaced with actual Whisper processing
      return {
        text: `[Local Whisper transcription of audio file - ${this.currentModel} model]
        
This is where the actual transcription would appear after processing the audio file locally using Whisper.cpp. 
The ${this.currentModel} model (${WHISPER_MODELS[this.currentModel].size}MB) would process the audio entirely on-device.

Key features:
- No internet required
- Complete privacy
- Supports multiple languages
- Accurate transcription

To implement full Whisper support:
1. Add react-native-whisper native module
2. Compile whisper.cpp for Android/iOS
3. Process audio chunks in real-time
4. Return timestamped segments`,
        segments: [
          {
            text: 'Local Whisper transcription would appear here',
            startTime: 0,
            endTime: 5,
            confidence: 0.95,
          },
        ],
      };
    } catch (error) {
      console.error('Transcription failed:', error);
      throw error;
    }
  }

  // Process audio in chunks for real-time transcription
  async transcribeChunk(
    audioData: ArrayBuffer,
    onResult: (text: string) => void
  ): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Whisper model not loaded');
    }

    // This would process audio chunks in real-time
    // Requires native module implementation
    onResult('[Real-time Whisper transcription chunk]');
  }

  // Clean up model files
  async deleteModel(modelType: 'tiny' | 'base'): Promise<void> {
    const model = WHISPER_MODELS[modelType];
    const modelFile = `${FileSystem.documentDirectory}whisper_models/${model.filename}`;
    
    try {
      await FileSystem.deleteAsync(modelFile, { idempotent: true });
      if (this.currentModel === modelType) {
        this.isModelLoaded = false;
        this.modelPath = null;
      }
    } catch (error) {
      console.error('Failed to delete model:', error);
    }
  }

  // Get available models
  async getAvailableModels(): Promise<Array<{
    name: string;
    size: number;
    isDownloaded: boolean;
  }>> {
    const models = [];
    
    for (const [key, model] of Object.entries(WHISPER_MODELS)) {
      const modelFile = `${FileSystem.documentDirectory}whisper_models/${model.filename}`;
      const info = await FileSystem.getInfoAsync(modelFile);
      
      models.push({
        name: model.name,
        size: model.size,
        isDownloaded: info.exists,
      });
    }
    
    return models;
  }
}

export default new WhisperService();