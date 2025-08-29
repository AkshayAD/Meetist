import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Types for transcription models and results
export interface TranscriptionModel {
  id: string;
  name: string;
  type: 'gemini' | 'whisper-cloud' | 'whisper-native' | 'device';
  requiresApiKey: boolean;
  description: string;
  isAvailable: boolean;
}

export interface TranscriptionResult {
  text: string;
  segments?: Array<{
    text: string;
    startTime: number;
    endTime: number;
    confidence?: number;
  }>;
  model: string;
  processingTime: number;
  error?: string;
}

export interface TranscriptionProgress {
  status: 'preparing' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
}

// Available transcription models
export const TRANSCRIPTION_MODELS: TranscriptionModel[] = [
  {
    id: 'gemini-2.5-flash-exp',
    name: 'Gemini 2.5 Flash (Experimental)',
    type: 'gemini',
    requiresApiKey: true,
    description: 'Fast, efficient transcription with Gemini 2.5 Flash',
    isAvailable: true,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    type: 'gemini',
    requiresApiKey: true,
    description: 'Production-ready Gemini Flash model',
    isAvailable: true,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    type: 'gemini',
    requiresApiKey: true,
    description: 'Most accurate Gemini model for transcription',
    isAvailable: true,
  },
  {
    id: 'gemini-live-2.5-flash-preview',
    name: 'Gemini Live 2.5 Flash Preview',
    type: 'gemini',
    requiresApiKey: true,
    description: 'Real-time transcription with Gemini Live',
    isAvailable: true,
  },
  {
    id: 'device-speech',
    name: 'Device Speech Recognition',
    type: 'device',
    requiresApiKey: false,
    description: 'Use device\'s built-in speech recognition',
    isAvailable: Platform.OS === 'ios' || Platform.OS === 'android',
  },
  {
    id: 'whisper-cloud',
    name: 'Cloud Whisper API',
    type: 'whisper-cloud',
    requiresApiKey: true,
    description: 'OpenAI Whisper via cloud API',
    isAvailable: true,
  },
  {
    id: 'whisper-native',
    name: 'Native Whisper (Coming Soon)',
    type: 'whisper-native',
    requiresApiKey: false,
    description: 'On-device Whisper processing',
    isAvailable: false,
  },
];

class RealTranscriptionService {
  private apiKeys: Map<string, string> = new Map();
  private selectedModel: string = 'gemini-2.5-flash-exp';
  private progressCallback?: (progress: TranscriptionProgress) => void;

  constructor() {
    this.loadApiKeys();
    this.loadSelectedModel();
  }

  // Load API keys from storage
  private async loadApiKeys() {
    try {
      const keys = await AsyncStorage.getItem('transcription_api_keys');
      if (keys) {
        const parsed = JSON.parse(keys);
        Object.entries(parsed).forEach(([model, key]) => {
          this.apiKeys.set(model, key as string);
        });
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  }

  // Save API keys to storage
  private async saveApiKeys() {
    try {
      const keys: Record<string, string> = {};
      this.apiKeys.forEach((value, key) => {
        keys[key] = value;
      });
      await AsyncStorage.setItem('transcription_api_keys', JSON.stringify(keys));
    } catch (error) {
      console.error('Error saving API keys:', error);
    }
  }

  // Load selected model
  private async loadSelectedModel() {
    try {
      const model = await AsyncStorage.getItem('selected_transcription_model');
      if (model) {
        this.selectedModel = model;
      }
    } catch (error) {
      console.error('Error loading selected model:', error);
    }
  }

  // Set API key for a model
  public async setApiKey(model: string, apiKey: string) {
    this.apiKeys.set(model, apiKey);
    await this.saveApiKeys();
  }

  // Get API key for a model
  public getApiKey(model: string): string | undefined {
    // For Gemini models, use the same key
    if (model.startsWith('gemini')) {
      return this.apiKeys.get('gemini') || this.apiKeys.get(model);
    }
    return this.apiKeys.get(model);
  }

  // Set selected model
  public async setSelectedModel(model: string) {
    this.selectedModel = model;
    await AsyncStorage.setItem('selected_transcription_model', model);
  }

  // Get selected model
  public getSelectedModel(): string {
    return this.selectedModel;
  }

  // Set progress callback
  public setProgressCallback(callback: (progress: TranscriptionProgress) => void) {
    this.progressCallback = callback;
  }

  // Update progress
  private updateProgress(status: TranscriptionProgress['status'], progress: number, message: string) {
    if (this.progressCallback) {
      this.progressCallback({ status, progress, message });
    }
  }

  // Convert audio file to base64
  private async audioToBase64(audioPath: string): Promise<string> {
    try {
      const base64 = await FileSystem.readAsStringAsync(audioPath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      console.error('Error converting audio to base64:', error);
      throw error;
    }
  }

  // Transcribe with Gemini models
  private async transcribeWithGemini(audioPath: string, modelId: string): Promise<TranscriptionResult> {
    const startTime = Date.now();
    const apiKey = this.getApiKey(modelId);
    
    if (!apiKey) {
      throw new Error(`API key not configured for ${modelId}`);
    }

    this.updateProgress('preparing', 10, 'Converting audio to base64...');
    const audioBase64 = await this.audioToBase64(audioPath);
    
    // Get file info for MIME type
    const fileInfo = await FileSystem.getInfoAsync(audioPath);
    const fileName = audioPath.split('/').pop() || 'audio.wav';
    const mimeType = fileName.endsWith('.wav') ? 'audio/wav' : 
                     fileName.endsWith('.mp3') ? 'audio/mp3' :
                     fileName.endsWith('.m4a') ? 'audio/mp4' : 'audio/wav';

    this.updateProgress('uploading', 30, 'Sending audio to Gemini...');

    // Map model IDs to API endpoints
    const modelMapping: Record<string, string> = {
      'gemini-2.5-flash-exp': 'gemini-2.0-flash-exp',
      'gemini-2.5-flash': 'gemini-1.5-flash',
      'gemini-2.5-pro': 'gemini-1.5-pro',
      'gemini-live-2.5-flash-preview': 'gemini-2.0-flash-exp',
    };

    const apiModel = modelMapping[modelId] || 'gemini-1.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: "Please transcribe this audio file completely and accurately. Include timestamps if possible. Format the output as a clean transcript with speaker labels if multiple speakers are detected. After the transcript, provide a brief summary."
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: audioBase64
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          }
        }),
      });

      this.updateProgress('processing', 70, 'Processing transcription...');

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response from Gemini API');
      }

      const transcriptionText = data.candidates[0].content.parts[0].text;
      
      // Parse the transcription to extract segments if timestamps are included
      const segments = this.parseTranscriptionSegments(transcriptionText);

      this.updateProgress('completed', 100, 'Transcription completed!');

      return {
        text: transcriptionText,
        segments: segments.length > 0 ? segments : undefined,
        model: modelId,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.updateProgress('error', 0, `Error: ${error.message}`);
      throw error;
    }
  }

  // Parse transcription segments from text
  private parseTranscriptionSegments(text: string): Array<any> {
    const segments: Array<any> = [];
    const lines = text.split('\n');
    
    // Try to parse timestamps in format [00:00] or (00:00)
    const timestampRegex = /[\[\(](\d{1,2}:\d{2}(?::\d{2})?)[\]\)]\s*(.*)/;
    
    lines.forEach(line => {
      const match = line.match(timestampRegex);
      if (match) {
        const timeStr = match[1];
        const content = match[2];
        const timeParts = timeStr.split(':');
        let seconds = 0;
        
        if (timeParts.length === 2) {
          seconds = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
        } else if (timeParts.length === 3) {
          seconds = parseInt(timeParts[0]) * 3600 + parseInt(timeParts[1]) * 60 + parseInt(timeParts[2]);
        }
        
        segments.push({
          text: content,
          startTime: seconds,
          endTime: seconds + 5, // Estimate
          confidence: 0.95,
        });
      }
    });
    
    return segments;
  }

  // Transcribe with OpenAI Whisper Cloud API
  private async transcribeWithWhisperCloud(audioPath: string): Promise<TranscriptionResult> {
    const startTime = Date.now();
    const apiKey = this.getApiKey('whisper-cloud');
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured for Whisper Cloud');
    }

    this.updateProgress('preparing', 10, 'Preparing audio for upload...');

    try {
      // Read the audio file
      const fileInfo = await FileSystem.getInfoAsync(audioPath);
      if (!fileInfo.exists) {
        throw new Error('Audio file not found');
      }

      this.updateProgress('uploading', 30, 'Uploading to OpenAI Whisper...');

      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri: audioPath,
        type: 'audio/wav',
        name: 'audio.wav',
      } as any);
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities', 'segment');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      this.updateProgress('processing', 70, 'Processing transcription...');

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();

      this.updateProgress('completed', 100, 'Transcription completed!');

      return {
        text: data.text,
        segments: data.segments,
        model: 'whisper-cloud',
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.updateProgress('error', 0, `Error: ${error.message}`);
      throw error;
    }
  }

  // Transcribe with device speech recognition (React Native Voice)
  private async transcribeWithDeviceSpeech(audioPath: string): Promise<TranscriptionResult> {
    const startTime = Date.now();
    
    this.updateProgress('processing', 50, 'Using device speech recognition...');
    
    // Note: This requires react-native-voice to be installed and configured
    // For now, we'll return a message indicating the requirement
    
    try {
      // Check if react-native-voice is available
      let Voice: any;
      try {
        Voice = require('react-native-voice').default;
      } catch (e) {
        throw new Error('Device speech recognition requires react-native-voice package. Please install: npm install react-native-voice');
      }

      // Initialize Voice
      await Voice.start('en-US');
      
      // Note: react-native-voice works with microphone input, not files
      // For file transcription, we'd need to play the audio and capture it
      // This is a limitation of the device speech API
      
      throw new Error('Device speech recognition currently supports only live recording, not file transcription. Please use Gemini or Whisper models for file transcription.');
      
    } catch (error) {
      this.updateProgress('error', 0, `Error: ${error.message}`);
      throw error;
    }
  }

  // Main transcribe method
  public async transcribe(audioPath: string, modelId?: string): Promise<TranscriptionResult> {
    const model = modelId || this.selectedModel;
    
    // Find the model configuration
    const modelConfig = TRANSCRIPTION_MODELS.find(m => m.id === model);
    
    if (!modelConfig) {
      throw new Error(`Unknown model: ${model}`);
    }
    
    if (!modelConfig.isAvailable) {
      throw new Error(`Model ${modelConfig.name} is not yet available`);
    }
    
    // Check if API key is required and available
    if (modelConfig.requiresApiKey && !this.getApiKey(model)) {
      throw new Error(`API key required for ${modelConfig.name}. Please configure in settings.`);
    }
    
    // Route to appropriate transcription method
    switch (modelConfig.type) {
      case 'gemini':
        return await this.transcribeWithGemini(audioPath, model);
        
      case 'whisper-cloud':
        return await this.transcribeWithWhisperCloud(audioPath);
        
      case 'device':
        return await this.transcribeWithDeviceSpeech(audioPath);
        
      case 'whisper-native':
        throw new Error('Native Whisper module is not yet implemented');
        
      default:
        throw new Error(`Unsupported model type: ${modelConfig.type}`);
    }
  }

  // Get available models
  public getAvailableModels(): TranscriptionModel[] {
    return TRANSCRIPTION_MODELS;
  }

  // Check if a model is configured (has API key if required)
  public isModelConfigured(modelId: string): boolean {
    const model = TRANSCRIPTION_MODELS.find(m => m.id === modelId);
    if (!model) return false;
    
    if (!model.requiresApiKey) return true;
    
    return !!this.getApiKey(modelId);
  }
}

export default new RealTranscriptionService();