import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { storage } from './StorageService';

export interface WhisperModel {
  id: string;
  name: string;
  size: string;
  sizeBytes: number;
  url: string;
  description: string;
  language: string;
  isMultilingual: boolean;
  downloaded: boolean;
  downloadProgress?: number;
}

const WHISPER_MODELS: WhisperModel[] = [
  {
    id: 'whisper-tiny',
    name: 'Whisper Tiny',
    size: '39 MB',
    sizeBytes: 39000000,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    description: 'Fastest, least accurate. Good for quick drafts.',
    language: 'English',
    isMultilingual: false,
    downloaded: false,
  },
  {
    id: 'whisper-tiny-q5',
    name: 'Whisper Tiny Q5',
    size: '25 MB',
    sizeBytes: 25000000,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q5_1.bin',
    description: 'Quantized tiny model, very fast with decent accuracy.',
    language: 'English',
    isMultilingual: false,
    downloaded: false,
  },
  {
    id: 'whisper-base',
    name: 'Whisper Base',
    size: '74 MB',
    sizeBytes: 74000000,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    description: 'Balanced speed and accuracy.',
    language: 'English',
    isMultilingual: false,
    downloaded: false,
  },
  {
    id: 'whisper-base-q5',
    name: 'Whisper Base Q5',
    size: '48 MB',
    sizeBytes: 48000000,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin',
    description: 'Quantized base model, good balance.',
    language: 'English',
    isMultilingual: false,
    downloaded: false,
  },
  {
    id: 'whisper-small',
    name: 'Whisper Small',
    size: '244 MB',
    sizeBytes: 244000000,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    description: 'Good accuracy, moderate speed.',
    language: 'English',
    isMultilingual: false,
    downloaded: false,
  },
  {
    id: 'whisper-small-q5',
    name: 'Whisper Small Q5',
    size: '154 MB',
    sizeBytes: 154000000,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin',
    description: 'Quantized small model, good accuracy with less memory.',
    language: 'English',
    isMultilingual: false,
    downloaded: false,
  },
  {
    id: 'whisper-medium',
    name: 'Whisper Medium',
    size: '769 MB',
    sizeBytes: 769000000,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
    description: 'High accuracy, slower processing.',
    language: 'English',
    isMultilingual: false,
    downloaded: false,
  },
  {
    id: 'whisper-medium-q5',
    name: 'Whisper Medium Q5',
    size: '488 MB',
    sizeBytes: 488000000,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium-q5_0.bin',
    description: 'Quantized medium model, high accuracy.',
    language: 'English',
    isMultilingual: false,
    downloaded: false,
  },
];

class WhisperModelService {
  private models: WhisperModel[] = WHISPER_MODELS;
  private modelDirectory: string;
  private downloadCallbacks: Map<string, (progress: number) => void> = new Map();
  private activeModel: string | null = null;

  constructor() {
    this.modelDirectory = `${FileSystem.documentDirectory}whisper-models/`;
    this.initializeModels();
  }

  private async initializeModels() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.modelDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.modelDirectory, { intermediates: true });
      }
      
      await this.checkDownloadedModels();
      
      const savedActiveModel = storage.getString('activeWhisperModel');
      if (savedActiveModel) {
        this.activeModel = savedActiveModel;
      } else {
        this.activeModel = 'whisper-tiny-q5';
        storage.set('activeWhisperModel', this.activeModel);
      }
    } catch (error) {
      console.error('Failed to initialize Whisper models:', error);
    }
  }

  private async checkDownloadedModels() {
    for (const model of this.models) {
      const modelPath = `${this.modelDirectory}${model.id}.bin`;
      try {
        const fileInfo = await FileSystem.getInfoAsync(modelPath);
        model.downloaded = fileInfo.exists;
      } catch {
        model.downloaded = false;
      }
    }
  }

  getAvailableModels(): WhisperModel[] {
    return [...this.models];
  }

  getDownloadedModels(): WhisperModel[] {
    return this.models.filter(m => m.downloaded);
  }

  getActiveModel(): WhisperModel | null {
    if (!this.activeModel) return null;
    return this.models.find(m => m.id === this.activeModel) || null;
  }

  setActiveModel(modelId: string): boolean {
    const model = this.models.find(m => m.id === modelId && m.downloaded);
    if (model) {
      this.activeModel = modelId;
      storage.set('activeWhisperModel', modelId);
      return true;
    }
    return false;
  }

  async downloadModel(
    modelId: string,
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    const model = this.models.find(m => m.id === modelId);
    if (!model) {
      throw new Error('Model not found');
    }

    if (model.downloaded) {
      return true;
    }

    const modelPath = `${this.modelDirectory}${model.id}.bin`;
    
    if (onProgress) {
      this.downloadCallbacks.set(modelId, onProgress);
    }

    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        model.url,
        modelPath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          model.downloadProgress = progress;
          const callback = this.downloadCallbacks.get(modelId);
          if (callback) {
            callback(progress);
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (result) {
        model.downloaded = true;
        model.downloadProgress = 1;
        
        if (!this.activeModel || this.activeModel === modelId) {
          this.setActiveModel(modelId);
        }
        
        this.downloadCallbacks.delete(modelId);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to download model ${modelId}:`, error);
      model.downloadProgress = 0;
      this.downloadCallbacks.delete(modelId);
      return false;
    }
  }

  async deleteModel(modelId: string): Promise<boolean> {
    const model = this.models.find(m => m.id === modelId);
    if (!model || !model.downloaded) {
      return false;
    }

    const modelPath = `${this.modelDirectory}${model.id}.bin`;
    
    try {
      await FileSystem.deleteAsync(modelPath, { idempotent: true });
      model.downloaded = false;
      model.downloadProgress = 0;
      
      if (this.activeModel === modelId) {
        const nextModel = this.getDownloadedModels()[0];
        if (nextModel) {
          this.setActiveModel(nextModel.id);
        } else {
          this.activeModel = null;
          storage.delete('activeWhisperModel');
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to delete model ${modelId}:`, error);
      return false;
    }
  }

  getModelPath(modelId: string): string | null {
    const model = this.models.find(m => m.id === modelId && m.downloaded);
    if (!model) return null;
    return `${this.modelDirectory}${model.id}.bin`;
  }

  async getStorageInfo() {
    let totalSize = 0;
    const downloadedModels = this.getDownloadedModels();
    
    for (const model of downloadedModels) {
      const modelPath = `${this.modelDirectory}${model.id}.bin`;
      try {
        const fileInfo = await FileSystem.getInfoAsync(modelPath);
        if (fileInfo.exists && 'size' in fileInfo) {
          totalSize += fileInfo.size;
        }
      } catch {
        // Ignore errors
      }
    }
    
    return {
      totalSize,
      modelCount: downloadedModels.length,
      models: downloadedModels.map(m => ({
        id: m.id,
        name: m.name,
        size: m.sizeBytes,
      })),
    };
  }
}

export const whisperModelService = new WhisperModelService();