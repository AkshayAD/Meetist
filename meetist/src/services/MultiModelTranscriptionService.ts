import * as FileSystem from 'expo-file-system';
import { storage } from './StorageService';

export interface TranscriptionModel {
  id: string;
  provider: string;
  name: string;
  description: string;
  pricing: string;
  freeQuota?: string;
  speed: string;
  accuracy: string;
  languages: string[];
  maxFileSize: string;
  requiresApiKey: boolean;
  apiKeyInstructions?: string;
}

export interface TranscriptionResult {
  text: string;
  segments?: Array<{
    text: string;
    timestamp: [number, number];
  }>;
  language?: string;
  duration?: number;
  model?: string;
  provider?: string;
}

export const TRANSCRIPTION_MODELS: TranscriptionModel[] = [
  // Gemini Models
  {
    id: 'gemini-2.0-flash',
    provider: 'Google',
    name: 'Gemini 2.0 Flash',
    description: 'Latest Gemini with native audio support, 1M token context',
    pricing: '$0.0001875/1K chars',
    freeQuota: 'Free tier via Google AI Studio',
    speed: 'Fast',
    accuracy: 'Excellent',
    languages: ['50+ languages'],
    maxFileSize: '20MB (direct), unlimited via Files API',
    requiresApiKey: true,
    apiKeyInstructions: 'Get from https://aistudio.google.com/apikey',
  },
  {
    id: 'gemini-2.5-flash',
    provider: 'Google',
    name: 'Gemini 2.5 Flash',
    description: 'Best price/performance ratio, multimodal input',
    pricing: '$0.0001875/1K chars',
    freeQuota: '5 RPM, 25 requests/day free',
    speed: 'Very Fast',
    accuracy: 'Excellent',
    languages: ['50+ languages'],
    maxFileSize: '20MB (direct)',
    requiresApiKey: true,
    apiKeyInstructions: 'Get from https://aistudio.google.com/apikey',
  },
  
  // Groq Models (Fastest)
  {
    id: 'groq-distil-whisper',
    provider: 'Groq',
    name: 'Groq Distil-Whisper',
    description: 'Fastest transcription, English only, 240x real-time',
    pricing: '$0.02/hour audio',
    freeQuota: '25MB free tier',
    speed: 'Ultra Fast (240x)',
    accuracy: 'Good',
    languages: ['English only'],
    maxFileSize: '25MB (free), 100MB (paid)',
    requiresApiKey: true,
    apiKeyInstructions: 'Get from https://console.groq.com',
  },
  {
    id: 'groq-whisper-v3-turbo',
    provider: 'Groq',
    name: 'Groq Whisper v3 Turbo',
    description: 'Best overall: speed + accuracy, 216x real-time',
    pricing: '$0.04/hour audio',
    freeQuota: '25MB free tier',
    speed: 'Ultra Fast (216x)',
    accuracy: 'Excellent',
    languages: ['50+ languages'],
    maxFileSize: '25MB (free), 100MB (paid)',
    requiresApiKey: true,
    apiKeyInstructions: 'Get from https://console.groq.com',
  },
  {
    id: 'groq-whisper-v3',
    provider: 'Groq',
    name: 'Groq Whisper v3 Large',
    description: 'Most accurate, 299x real-time speed',
    pricing: '$0.111/hour audio',
    freeQuota: '25MB free tier',
    speed: 'Ultra Fast (299x)',
    accuracy: 'Best',
    languages: ['50+ languages'],
    maxFileSize: '25MB (free), 100MB (paid)',
    requiresApiKey: true,
    apiKeyInstructions: 'Get from https://console.groq.com',
  },

  // Together AI
  {
    id: 'together-whisper-v3',
    provider: 'Together AI',
    name: 'Together Whisper v3',
    description: '15x faster than OpenAI, full accuracy',
    pricing: 'Usage-based',
    freeQuota: '$25 free credits on signup',
    speed: 'Very Fast (15x OpenAI)',
    accuracy: 'Excellent',
    languages: ['50+ languages'],
    maxFileSize: 'Large files supported',
    requiresApiKey: true,
    apiKeyInstructions: 'Get from https://api.together.xyz/settings/api-keys',
  },

  // OpenAI (Original)
  {
    id: 'openai-whisper',
    provider: 'OpenAI',
    name: 'OpenAI Whisper',
    description: 'Original Whisper API, reliable and accurate',
    pricing: '$0.006/minute',
    freeQuota: 'No free tier',
    speed: 'Standard',
    accuracy: 'Excellent',
    languages: ['98 languages'],
    maxFileSize: '25MB',
    requiresApiKey: true,
    apiKeyInstructions: 'Get from https://platform.openai.com/api-keys',
  },

  // Hugging Face
  {
    id: 'huggingface-whisper',
    provider: 'Hugging Face',
    name: 'HF Whisper Large v3',
    description: 'Community model with free tier',
    pricing: 'Free tier + paid options',
    freeQuota: 'Rate limited free tier',
    speed: 'Moderate',
    accuracy: 'Very Good',
    languages: ['50+ languages'],
    maxFileSize: '10MB',
    requiresApiKey: true,
    apiKeyInstructions: 'Get from https://huggingface.co/settings/tokens',
  },

  // AssemblyAI
  {
    id: 'assemblyai',
    provider: 'AssemblyAI',
    name: 'AssemblyAI',
    description: 'Professional transcription with speaker detection',
    pricing: '$0.00025/second',
    freeQuota: '5 hours free/month',
    speed: 'Fast',
    accuracy: 'Excellent',
    languages: ['Multiple languages'],
    maxFileSize: '5GB',
    requiresApiKey: true,
    apiKeyInstructions: 'Get from https://www.assemblyai.com/app',
  },

  // Deepgram
  {
    id: 'deepgram-nova',
    provider: 'Deepgram',
    name: 'Deepgram Nova',
    description: 'Real-time streaming transcription',
    pricing: '$0.0043/minute',
    freeQuota: '$200 free credits',
    speed: 'Real-time',
    accuracy: 'Excellent',
    languages: ['36+ languages'],
    maxFileSize: '2GB',
    requiresApiKey: true,
    apiKeyInstructions: 'Get from https://console.deepgram.com',
  },

  // Rev AI
  {
    id: 'revai',
    provider: 'Rev AI',
    name: 'Rev AI',
    description: 'High accuracy with timestamps',
    pricing: '$0.02/minute',
    freeQuota: '5 hours free',
    speed: 'Fast',
    accuracy: 'Very High',
    languages: ['36 languages'],
    maxFileSize: '2GB',
    requiresApiKey: true,
    apiKeyInstructions: 'Get from https://www.rev.ai',
  },

  // Local/Free Options
  {
    id: 'transformers-js',
    provider: 'Local',
    name: 'Transformers.js',
    description: 'Runs locally in JavaScript, no API needed',
    pricing: 'Free',
    freeQuota: 'Unlimited (local)',
    speed: 'Slow (30-60s/min)',
    accuracy: 'Good',
    languages: ['Multiple languages'],
    maxFileSize: 'Device limited',
    requiresApiKey: false,
  },
];

class MultiModelTranscriptionService {
  private activeModelId: string = 'transformers-js';
  private apiKeys: Map<string, string> = new Map();

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    // Load active model
    const savedModel = storage.getString('active_transcription_model');
    if (savedModel) {
      this.activeModelId = savedModel;
    }

    // Load API keys
    TRANSCRIPTION_MODELS.forEach(model => {
      if (model.requiresApiKey) {
        const key = storage.getString(`${model.id}_api_key`);
        if (key) {
          this.apiKeys.set(model.id, key);
        }
      }
    });
  }

  getAvailableModels(): TranscriptionModel[] {
    return TRANSCRIPTION_MODELS.map(model => ({
      ...model,
      isConfigured: !model.requiresApiKey || this.apiKeys.has(model.id),
    }));
  }

  getActiveModel(): TranscriptionModel | null {
    return TRANSCRIPTION_MODELS.find(m => m.id === this.activeModelId) || null;
  }

  setActiveModel(modelId: string): boolean {
    const model = TRANSCRIPTION_MODELS.find(m => m.id === modelId);
    if (model) {
      if (model.requiresApiKey && !this.apiKeys.has(modelId)) {
        throw new Error(`API key required for ${model.name}`);
      }
      this.activeModelId = modelId;
      storage.set('active_transcription_model', modelId);
      return true;
    }
    return false;
  }

  setApiKey(modelId: string, apiKey: string): void {
    this.apiKeys.set(modelId, apiKey);
    storage.set(`${modelId}_api_key`, apiKey);
  }

  async transcribeWithGemini(
    audioUri: string,
    modelId: string,
    apiKey: string,
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    onProgress?.(0.1);

    // Read audio file as base64
    const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    onProgress?.(0.3);

    // Prepare request
    const model = modelId === 'gemini-2.0-flash' ? 'gemini-2.0-flash' : 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{
        parts: [
          {
            text: "Transcribe this audio to text. Provide a detailed transcription with timestamps if possible."
          },
          {
            inline_data: {
              mime_type: "audio/mp4",
              data: audioBase64
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
      }
    };

    onProgress?.(0.5);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    onProgress?.(0.8);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    onProgress?.(1.0);

    return {
      text,
      model: modelId,
      provider: 'Google',
    };
  }

  async transcribeWithGroq(
    audioUri: string,
    modelId: string,
    apiKey: string,
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    onProgress?.(0.1);

    // Create form data for Groq API
    const formData = new FormData();
    
    // Add audio file
    const audioBlob = {
      uri: audioUri,
      type: 'audio/mp4',
      name: 'audio.mp4',
    } as any;
    
    formData.append('file', audioBlob);
    
    // Map model ID to Groq model name
    let groqModel = 'whisper-large-v3';
    if (modelId === 'groq-distil-whisper') {
      groqModel = 'distil-whisper-large-v3-en';
    } else if (modelId === 'groq-whisper-v3-turbo') {
      groqModel = 'whisper-large-v3-turbo';
    }
    
    formData.append('model', groqModel);
    formData.append('response_format', 'verbose_json');

    onProgress?.(0.5);

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    onProgress?.(0.8);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${error}`);
    }

    const result = await response.json();

    onProgress?.(1.0);

    return {
      text: result.text,
      language: result.language,
      duration: result.duration,
      segments: result.segments?.map((seg: any) => ({
        text: seg.text,
        timestamp: [seg.start, seg.end],
      })),
      model: modelId,
      provider: 'Groq',
    };
  }

  async transcribeWithTogetherAI(
    audioUri: string,
    apiKey: string,
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    onProgress?.(0.1);

    const formData = new FormData();
    const audioBlob = {
      uri: audioUri,
      type: 'audio/mp4',
      name: 'audio.mp4',
    } as any;
    
    formData.append('file', audioBlob);
    formData.append('model', 'openai/whisper-large-v3');
    formData.append('response_format', 'verbose_json');

    onProgress?.(0.5);

    const response = await fetch('https://api.together.xyz/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    onProgress?.(0.8);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Together AI API error: ${error}`);
    }

    const result = await response.json();

    onProgress?.(1.0);

    return {
      text: result.text,
      language: result.language,
      model: 'together-whisper-v3',
      provider: 'Together AI',
    };
  }

  async transcribeWithAssemblyAI(
    audioUri: string,
    apiKey: string,
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    onProgress?.(0.1);

    // Upload file
    const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'content-type': 'application/octet-stream',
      },
      body: Buffer.from(audioBase64, 'base64'),
    });

    const { upload_url } = await uploadResponse.json();

    onProgress?.(0.3);

    // Create transcription
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: upload_url,
        speaker_labels: true,
      }),
    });

    const transcript = await transcriptResponse.json();

    onProgress?.(0.5);

    // Poll for completion
    let result = transcript;
    while (result.status !== 'completed' && result.status !== 'error') {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const pollingResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${result.id}`,
        {
          headers: { 'authorization': apiKey },
        }
      );
      
      result = await pollingResponse.json();
      onProgress?.(0.5 + (0.4 * (result.progress || 0)));
    }

    if (result.status === 'error') {
      throw new Error('Transcription failed');
    }

    onProgress?.(1.0);

    return {
      text: result.text,
      model: 'assemblyai',
      provider: 'AssemblyAI',
    };
  }

  async transcribeWithDeepgram(
    audioUri: string,
    apiKey: string,
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    onProgress?.(0.1);

    const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    onProgress?.(0.3);

    const response = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&paragraphs=true',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'audio/mp4',
        },
        body: Buffer.from(audioBase64, 'base64'),
      }
    );

    onProgress?.(0.8);

    if (!response.ok) {
      throw new Error('Deepgram API error');
    }

    const result = await response.json();

    onProgress?.(1.0);

    return {
      text: result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '',
      model: 'deepgram-nova',
      provider: 'Deepgram',
    };
  }

  async transcribe(
    audioUri: string,
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    const model = this.getActiveModel();
    if (!model) {
      throw new Error('No transcription model selected');
    }

    const apiKey = this.apiKeys.get(model.id);
    if (model.requiresApiKey && !apiKey) {
      throw new Error(`API key required for ${model.name}`);
    }

    switch (model.id) {
      case 'gemini-2.0-flash':
      case 'gemini-2.5-flash':
        return this.transcribeWithGemini(audioUri, model.id, apiKey!, onProgress);
      
      case 'groq-distil-whisper':
      case 'groq-whisper-v3-turbo':
      case 'groq-whisper-v3':
        return this.transcribeWithGroq(audioUri, model.id, apiKey!, onProgress);
      
      case 'together-whisper-v3':
        return this.transcribeWithTogetherAI(audioUri, apiKey!, onProgress);
      
      case 'assemblyai':
        return this.transcribeWithAssemblyAI(audioUri, apiKey!, onProgress);
      
      case 'deepgram-nova':
        return this.transcribeWithDeepgram(audioUri, apiKey!, onProgress);
      
      case 'transformers-js':
        // Use existing Transformers.js implementation
        const { whisperTransformersService } = await import('./WhisperTransformersService');
        return whisperTransformersService.transcribeAudio(audioUri, onProgress);
      
      default:
        // Fallback to OpenAI or Hugging Face
        const { whisperCloudService } = await import('./WhisperCloudService');
        return whisperCloudService.transcribeAudio(audioUri, onProgress);
    }
  }

  getModelStats(): { configured: number; total: number; hasFreeOptions: boolean } {
    const configured = TRANSCRIPTION_MODELS.filter(
      m => !m.requiresApiKey || this.apiKeys.has(m.id)
    ).length;
    
    const hasFreeOptions = TRANSCRIPTION_MODELS.some(
      m => m.freeQuota && (!m.requiresApiKey || this.apiKeys.has(m.id))
    );

    return {
      configured,
      total: TRANSCRIPTION_MODELS.length,
      hasFreeOptions,
    };
  }
}

export const multiModelTranscriptionService = new MultiModelTranscriptionService();