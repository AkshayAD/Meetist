import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

interface TranscriptionResult {
  text: string;
  segments?: Array<{
    text: string;
    timestamp: [number, number];
  }>;
  language?: string;
  duration?: number;
}

interface WhisperAPIProvider {
  name: string;
  endpoint: string;
  apiKey: string;
  headers: Record<string, string>;
}

class WhisperCloudService {
  private providers: Record<string, WhisperAPIProvider> = {
    openai: {
      name: 'OpenAI Whisper',
      endpoint: 'https://api.openai.com/v1/audio/transcriptions',
      apiKey: '',
      headers: {
        'Authorization': 'Bearer {API_KEY}',
      },
    },
    replicate: {
      name: 'Replicate Whisper',
      endpoint: 'https://api.replicate.com/v1/predictions',
      apiKey: '',
      headers: {
        'Authorization': 'Token {API_KEY}',
        'Content-Type': 'application/json',
      },
    },
    huggingface: {
      name: 'Hugging Face Whisper',
      endpoint: 'https://api-inference.huggingface.co/models/openai/whisper-large-v3',
      apiKey: '',
      headers: {
        'Authorization': 'Bearer {API_KEY}',
      },
    },
  };

  private currentProvider: string = 'openai';

  setApiKey(provider: string, apiKey: string): void {
    if (this.providers[provider]) {
      this.providers[provider].apiKey = apiKey;
    }
  }

  setProvider(provider: string): void {
    if (this.providers[provider]) {
      this.currentProvider = provider;
    }
  }

  async transcribeWithOpenAI(
    audioUri: string,
    apiKey: string,
    modelSize: string = 'whisper-1',
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    try {
      onProgress?.(0.1);

      // Read audio file
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      onProgress?.(0.3);

      // Create form data
      const formData = new FormData();
      
      // Convert base64 to blob
      const audioBlob = {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'audio.m4a',
      } as any;
      
      formData.append('file', audioBlob);
      formData.append('model', modelSize);
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities', 'segment');

      onProgress?.(0.5);

      // Make API request
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      onProgress?.(0.8);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const result = await response.json();

      onProgress?.(1.0);

      // Format response
      const transcriptionResult: TranscriptionResult = {
        text: result.text,
        language: result.language,
        duration: result.duration,
      };

      if (result.segments) {
        transcriptionResult.segments = result.segments.map((seg: any) => ({
          text: seg.text,
          timestamp: [seg.start, seg.end],
        }));
      }

      return transcriptionResult;
    } catch (error) {
      console.error('OpenAI Whisper error:', error);
      throw error;
    }
  }

  async transcribeWithReplicate(
    audioUri: string,
    apiKey: string,
    modelVersion: string = 'openai/whisper',
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    try {
      onProgress?.(0.1);

      // Convert audio to base64
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      onProgress?.(0.3);

      // Create prediction
      const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: modelVersion,
          input: {
            audio: `data:audio/m4a;base64,${audioBase64}`,
            model: 'large-v3',
            language: 'en',
            translate: false,
            temperature: 0,
            transcription: 'plain text',
            suppress_silence: true,
            logprob_threshold: -1.0,
            no_speech_threshold: 0.6,
            condition_on_previous_text: true,
            compression_ratio_threshold: 2.4,
            temperature_increment_on_fallback: 0.2,
          },
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create prediction');
      }

      const prediction = await createResponse.json();
      
      onProgress?.(0.5);

      // Poll for results
      let result = prediction;
      while (result.status !== 'succeeded' && result.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(result.urls.get, {
          headers: {
            'Authorization': `Token ${apiKey}`,
          },
        });
        
        result = await statusResponse.json();
        onProgress?.(0.5 + (0.4 * (result.progress || 0)));
      }

      if (result.status === 'failed') {
        throw new Error('Transcription failed');
      }

      onProgress?.(1.0);

      return {
        text: result.output?.transcription || result.output || '',
        language: 'en',
      };
    } catch (error) {
      console.error('Replicate Whisper error:', error);
      throw error;
    }
  }

  async transcribeWithHuggingFace(
    audioUri: string,
    apiKey: string,
    model: string = 'openai/whisper-large-v3',
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    try {
      onProgress?.(0.1);

      // Read audio file as base64
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to binary
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      onProgress?.(0.5);

      // Send to Hugging Face
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/octet-stream',
          },
          body: bytes,
        }
      );

      onProgress?.(0.8);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Hugging Face API error: ${error}`);
      }

      const result = await response.json();

      onProgress?.(1.0);

      return {
        text: result.text || result.transcription || '',
        language: 'en',
      };
    } catch (error) {
      console.error('Hugging Face Whisper error:', error);
      throw error;
    }
  }

  async transcribeAudio(
    audioUri: string,
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    const provider = this.providers[this.currentProvider];
    
    if (!provider.apiKey) {
      throw new Error(`API key not set for ${provider.name}. Please configure in settings.`);
    }

    switch (this.currentProvider) {
      case 'openai':
        return this.transcribeWithOpenAI(audioUri, provider.apiKey, 'whisper-1', onProgress);
      case 'replicate':
        return this.transcribeWithReplicate(
          audioUri,
          provider.apiKey,
          '4d50797290df275329f202e48c76360b3f22b08d28c196cbc54600319435f8d2',
          onProgress
        );
      case 'huggingface':
        return this.transcribeWithHuggingFace(
          audioUri,
          provider.apiKey,
          'openai/whisper-large-v3',
          onProgress
        );
      default:
        throw new Error('Invalid provider selected');
    }
  }

  isAvailable(): boolean {
    const provider = this.providers[this.currentProvider];
    return !!provider && !!provider.apiKey;
  }

  getAvailableProviders(): string[] {
    return Object.keys(this.providers);
  }

  getCurrentProvider(): string {
    return this.currentProvider;
  }
}

export const whisperCloudService = new WhisperCloudService();