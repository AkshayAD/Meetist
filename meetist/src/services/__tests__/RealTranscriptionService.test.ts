import RealTranscriptionService, {
  TRANSCRIPTION_MODELS,
  TranscriptionModel,
  TranscriptionResult,
  TranscriptionProgress
} from '../RealTranscriptionService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-file-system');
jest.mock('react-native', () => ({
  Platform: { OS: 'android' }
}));

// Mock fetch globally
global.fetch = jest.fn();

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('RealTranscriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset service state
    RealTranscriptionService.setSelectedModel('gemini-2.5-flash-exp');
    
    // Mock async storage responses
    mockAsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'transcription_api_keys') {
        return Promise.resolve(JSON.stringify({ 'gemini': 'test-api-key' }));
      }
      if (key === 'selected_transcription_model') {
        return Promise.resolve('gemini-2.5-flash-exp');
      }
      return Promise.resolve(null);
    });
    
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  describe('Initialization', () => {
    it('should initialize with default selected model', () => {
      expect(RealTranscriptionService.getSelectedModel()).toBe('gemini-2.5-flash-exp');
    });

    it('should load API keys from storage', async () => {
      // First set an API key
      await RealTranscriptionService.setApiKey('gemini', 'test-api-key');
      
      expect(RealTranscriptionService.getApiKey('gemini')).toBe('test-api-key');
    });
  });

  describe('Model Management', () => {
    it('should get available models', () => {
      const models = RealTranscriptionService.getAvailableModels();
      
      expect(models).toHaveLength(TRANSCRIPTION_MODELS.length);
      expect(models[0]).toHaveProperty('id');
      expect(models[0]).toHaveProperty('name');
      expect(models[0]).toHaveProperty('type');
      expect(models[0]).toHaveProperty('requiresApiKey');
      expect(models[0]).toHaveProperty('description');
      expect(models[0]).toHaveProperty('isAvailable');
    });

    it('should set and get selected model', async () => {
      await RealTranscriptionService.setSelectedModel('gemini-2.5-pro');
      
      expect(RealTranscriptionService.getSelectedModel()).toBe('gemini-2.5-pro');
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'selected_transcription_model',
        'gemini-2.5-pro'
      );
    });

    it('should check if model is configured correctly', async () => {
      // Set up an API key first
      await RealTranscriptionService.setApiKey('gemini', 'test-key');
      
      // Model that requires API key and has one
      expect(RealTranscriptionService.isModelConfigured('gemini-2.5-pro')).toBe(true); // Has gemini key
      
      // Model that doesn't require API key
      expect(RealTranscriptionService.isModelConfigured('device-speech')).toBe(true);
      
      // Non-existent model
      expect(RealTranscriptionService.isModelConfigured('non-existent')).toBe(false);
    });
  });

  describe('API Key Management', () => {
    it('should set and get API keys', async () => {
      await RealTranscriptionService.setApiKey('test-model', 'test-key');
      
      expect(RealTranscriptionService.getApiKey('test-model')).toBe('test-key');
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'transcription_api_keys',
        expect.stringContaining('test-key')
      );
    });

    it('should share API keys between Gemini models', async () => {
      await RealTranscriptionService.setApiKey('gemini', 'shared-key');
      
      expect(RealTranscriptionService.getApiKey('gemini-2.5-flash')).toBe('shared-key');
      expect(RealTranscriptionService.getApiKey('gemini-2.5-pro')).toBe('shared-key');
      expect(RealTranscriptionService.getApiKey('gemini-live-2.5-flash-preview')).toBe('shared-key');
    });
  });

  describe('Progress Callback', () => {
    it('should set and call progress callback', () => {
      const progressCallback = jest.fn();
      RealTranscriptionService.setProgressCallback(progressCallback);
      
      // This will be tested indirectly through transcription methods
      expect(progressCallback).not.toHaveBeenCalled();
    });
  });

  describe('Gemini Transcription', () => {
    beforeEach(() => {
      // Mock file system operations
      mockFileSystem.readAsStringAsync.mockResolvedValue('mock-base64-audio');
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        uri: '/test/path/audio.wav'
      } as any);
      
      // Mock successful Gemini API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{
                text: 'This is a test transcription from Gemini.'
              }]
            }
          }]
        })
      } as any);
    });

    it('should transcribe audio with Gemini successfully', async () => {
      await RealTranscriptionService.setApiKey('gemini', 'test-api-key');
      
      const result = await RealTranscriptionService.transcribe('/test/audio.wav', 'gemini-2.5-flash-exp');
      
      expect(result).toMatchObject({
        text: 'This is a test transcription from Gemini.',
        model: 'gemini-2.5-flash-exp',
        processingTime: expect.any(Number)
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
    });

    it('should handle Gemini API errors gracefully', async () => {
      await RealTranscriptionService.setApiKey('gemini', 'test-api-key');
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request')
      } as any);
      
      await expect(RealTranscriptionService.transcribe('/test/audio.wav', 'gemini-2.5-flash-exp'))
        .rejects
        .toThrow('Gemini API error: 400 - Bad Request');
    });

    it('should throw error when API key is missing', async () => {
      // Remove API key
      await RealTranscriptionService.setApiKey('gemini', '');
      
      await expect(RealTranscriptionService.transcribe('/test/audio.wav', 'gemini-2.5-flash-exp'))
        .rejects
        .toThrow('API key required for');
    });

    it('should call progress callback during transcription', async () => {
      const progressCallback = jest.fn();
      RealTranscriptionService.setProgressCallback(progressCallback);
      await RealTranscriptionService.setApiKey('gemini', 'test-api-key');
      
      await RealTranscriptionService.transcribe('/test/audio.wav', 'gemini-2.5-flash-exp');
      
      expect(progressCallback).toHaveBeenCalledWith({
        status: 'preparing',
        progress: 10,
        message: 'Converting audio to base64...'
      });
      
      expect(progressCallback).toHaveBeenCalledWith({
        status: 'uploading',
        progress: 30,
        message: 'Sending audio to Gemini...'
      });
      
      expect(progressCallback).toHaveBeenCalledWith({
        status: 'processing',
        progress: 70,
        message: 'Processing transcription...'
      });
      
      expect(progressCallback).toHaveBeenCalledWith({
        status: 'completed',
        progress: 100,
        message: 'Transcription completed!'
      });
    });
  });

  describe('Whisper Cloud Transcription', () => {
    beforeEach(() => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false
      } as any);
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          text: 'This is a test transcription from Whisper.',
          segments: [
            {
              text: 'This is a test',
              startTime: 0,
              endTime: 2
            }
          ]
        })
      } as any);
    });

    it('should transcribe audio with Whisper Cloud successfully', async () => {
      await RealTranscriptionService.setApiKey('whisper-cloud', 'test-openai-key');
      
      const result = await RealTranscriptionService.transcribe('/test/audio.wav', 'whisper-cloud');
      
      expect(result).toMatchObject({
        text: 'This is a test transcription from Whisper.',
        segments: expect.arrayContaining([
          expect.objectContaining({
            text: 'This is a test'
          })
        ]),
        model: 'whisper-cloud',
        processingTime: expect.any(Number)
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/audio/transcriptions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-openai-key'
          }
        })
      );
    });

    it('should throw error when OpenAI API key is missing', async () => {
      // Ensure whisper-cloud key is not set
      await RealTranscriptionService.setApiKey('whisper-cloud', '');
      
      await expect(RealTranscriptionService.transcribe('/test/audio.wav', 'whisper-cloud'))
        .rejects
        .toThrow('API key required for');
    });
  });

  describe('Device Speech Recognition', () => {
    it('should throw error for device speech (not implemented for file transcription)', async () => {
      await expect(RealTranscriptionService.transcribe('/test/audio.wav', 'device-speech'))
        .rejects
        .toThrow('react-native-voice package');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown model', async () => {
      await expect(RealTranscriptionService.transcribe('/test/audio.wav', 'unknown-model'))
        .rejects
        .toThrow('Unknown model: unknown-model');
    });

    it('should throw error for unavailable model', async () => {
      await expect(RealTranscriptionService.transcribe('/test/audio.wav', 'whisper-native'))
        .rejects
        .toThrow('Model Native Whisper (Coming Soon) is not yet available');
    });

    it('should handle file system errors', async () => {
      await RealTranscriptionService.setApiKey('gemini', 'test-key');
      
      mockFileSystem.readAsStringAsync.mockRejectedValue(new Error('File not found'));
      
      await expect(RealTranscriptionService.transcribe('/test/audio.wav', 'gemini-2.5-flash-exp'))
        .rejects
        .toThrow('File not found');
    });
  });

  describe('Segment Parsing', () => {
    it('should parse timestamp segments from transcription text', async () => {
      await RealTranscriptionService.setApiKey('gemini', 'test-api-key');
      
      mockFileSystem.readAsStringAsync.mockResolvedValue('mock-base64-audio');
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        uri: '/test/path/audio.wav'
      } as any);
      
      const transcriptionWithTimestamps = `
[00:05] Hello, this is the beginning of the meeting.
[00:30] We will discuss the quarterly results today.
[01:15] The revenue has increased by 20%.
      `;
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{
                text: transcriptionWithTimestamps
              }]
            }
          }]
        })
      } as any);
      
      const result = await RealTranscriptionService.transcribe('/test/audio.wav', 'gemini-2.5-flash-exp');
      
      expect(result.segments).toHaveLength(3);
      expect(result.segments![0]).toMatchObject({
        text: 'Hello, this is the beginning of the meeting.',
        startTime: 5,
        confidence: 0.95
      });
      expect(result.segments![1]).toMatchObject({
        text: 'We will discuss the quarterly results today.',
        startTime: 30
      });
      expect(result.segments![2]).toMatchObject({
        text: 'The revenue has increased by 20%.',
        startTime: 75 // 1:15 = 75 seconds
      });
    });
  });

  describe('Performance', () => {
    it('should complete transcription within reasonable time', async () => {
      await RealTranscriptionService.setApiKey('gemini', 'test-api-key');
      
      mockFileSystem.readAsStringAsync.mockResolvedValue('mock-base64-audio');
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        uri: '/test/path/audio.wav'
      } as any);
      
      // Add a small delay to simulate processing time
      mockFetch.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({
                candidates: [{
                  content: {
                    parts: [{
                      text: 'Quick transcription test.'
                    }]
                  }
                }]
              })
            } as any);
          }, 50); // 50ms delay
        })
      );
      
      const startTime = Date.now();
      const result = await RealTranscriptionService.transcribe('/test/audio.wav', 'gemini-2.5-flash-exp');
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });
});