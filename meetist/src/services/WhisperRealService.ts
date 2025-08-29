import { whisperTransformersService } from './WhisperTransformersService';
import { whisperCloudService } from './WhisperCloudService';
import { storage } from './StorageService';

export type WhisperMode = 'local-transformers' | 'cloud-openai' | 'cloud-replicate' | 'cloud-huggingface';

interface TranscriptionResult {
  text: string;
  segments?: Array<{
    text: string;
    timestamp: [number, number];
  }>;
  language?: string;
  duration?: number;
  mode?: WhisperMode;
}

class WhisperRealService {
  private mode: WhisperMode = 'local-transformers';
  private isInitialized: boolean = false;

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    // Load saved mode
    const savedMode = storage.getString('whisper_mode');
    if (savedMode) {
      this.mode = savedMode as WhisperMode;
    }

    // Load API keys
    const openaiKey = storage.getString('openai_api_key');
    if (openaiKey) {
      whisperCloudService.setApiKey('openai', openaiKey);
    }

    const replicateKey = storage.getString('replicate_api_key');
    if (replicateKey) {
      whisperCloudService.setApiKey('replicate', replicateKey);
    }

    const huggingfaceKey = storage.getString('huggingface_api_key');
    if (huggingfaceKey) {
      whisperCloudService.setApiKey('huggingface', huggingfaceKey);
    }
  }

  async initialize(modelId?: string): Promise<void> {
    if (this.mode === 'local-transformers') {
      await whisperTransformersService.initialize(modelId);
    }
    this.isInitialized = true;
  }

  setMode(mode: WhisperMode): void {
    this.mode = mode;
    storage.set('whisper_mode', mode);

    // Set cloud provider if needed
    if (mode.startsWith('cloud-')) {
      const provider = mode.replace('cloud-', '');
      whisperCloudService.setProvider(provider);
    }
  }

  getMode(): WhisperMode {
    return this.mode;
  }

  setApiKey(provider: string, apiKey: string): void {
    // Save API key
    storage.set(`${provider}_api_key`, apiKey);
    
    // Set in cloud service
    whisperCloudService.setApiKey(provider, apiKey);
  }

  async transcribeAudio(
    audioUri: string,
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    try {
      let result: TranscriptionResult;

      switch (this.mode) {
        case 'local-transformers':
          // Use Transformers.js (works in JavaScript)
          if (!this.isInitialized) {
            await this.initialize();
          }
          result = await whisperTransformersService.transcribeAudio(audioUri, onProgress);
          break;

        case 'cloud-openai':
        case 'cloud-replicate':
        case 'cloud-huggingface':
          // Use cloud service
          result = await whisperCloudService.transcribeAudio(audioUri, onProgress);
          break;

        default:
          throw new Error(`Unsupported mode: ${this.mode}`);
      }

      // Add mode to result
      result.mode = this.mode;
      return result;
    } catch (error) {
      console.error(`Transcription error in mode ${this.mode}:`, error);
      
      // Fallback to cloud if local fails
      if (this.mode === 'local-transformers' && whisperCloudService.isAvailable()) {
        console.log('Falling back to cloud service...');
        this.setMode('cloud-openai');
        return this.transcribeAudio(audioUri, onProgress);
      }
      
      throw error;
    }
  }

  async setModel(modelId: string): Promise<void> {
    if (this.mode === 'local-transformers') {
      await whisperTransformersService.setModel(modelId);
    }
  }

  isAvailable(): boolean {
    switch (this.mode) {
      case 'local-transformers':
        return whisperTransformersService.isAvailable();
      case 'cloud-openai':
      case 'cloud-replicate':
      case 'cloud-huggingface':
        return whisperCloudService.isAvailable();
      default:
        return false;
    }
  }

  getAvailableModes(): Array<{ mode: WhisperMode; name: string; available: boolean }> {
    return [
      {
        mode: 'local-transformers',
        name: 'Local (Transformers.js)',
        available: true,
      },
      {
        mode: 'cloud-openai',
        name: 'OpenAI Whisper API',
        available: !!storage.getString('openai_api_key'),
      },
      {
        mode: 'cloud-replicate',
        name: 'Replicate Whisper',
        available: !!storage.getString('replicate_api_key'),
      },
      {
        mode: 'cloud-huggingface',
        name: 'Hugging Face Whisper',
        available: !!storage.getString('huggingface_api_key'),
      },
    ];
  }
}

export const whisperRealService = new WhisperRealService();