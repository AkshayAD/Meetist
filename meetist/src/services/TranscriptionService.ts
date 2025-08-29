import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
  SpeechEndEvent,
} from 'react-native-voice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TranscriptionSegment } from '../types';

// Gemini API configuration - using free tier
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // User needs to add their key
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

export class TranscriptionService {
  private isListening: boolean = false;
  private transcriptionResults: string[] = [];
  private currentSegments: TranscriptionSegment[] = [];
  private startTime: number = 0;
  private onTranscriptionUpdate?: (text: string) => void;
  private onSegmentUpdate?: (segments: TranscriptionSegment[]) => void;

  constructor() {
    this.initializeVoice();
  }

  private async initializeVoice() {
    Voice.onSpeechStart = this.onSpeechStart.bind(this);
    Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
    Voice.onSpeechResults = this.onSpeechResults.bind(this);
    Voice.onSpeechError = this.onSpeechError.bind(this);
    Voice.onSpeechPartialResults = this.onSpeechPartialResults.bind(this);
  }

  // Real-time transcription using device's speech recognition
  async startRealtimeTranscription(
    onUpdate?: (text: string) => void,
    onSegmentUpdate?: (segments: TranscriptionSegment[]) => void
  ): Promise<boolean> {
    try {
      this.onTranscriptionUpdate = onUpdate;
      this.onSegmentUpdate = onSegmentUpdate;
      this.startTime = Date.now();
      this.transcriptionResults = [];
      this.currentSegments = [];
      
      const isAvailable = await Voice.isAvailable();
      if (!isAvailable) {
        console.log('Voice recognition not available, will use post-processing');
        return false;
      }

      await Voice.start('en-US');
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      return false;
    }
  }

  async stopRealtimeTranscription(): Promise<string> {
    try {
      if (this.isListening) {
        await Voice.stop();
        await Voice.destroy();
        this.isListening = false;
      }
      return this.transcriptionResults.join(' ');
    } catch (error) {
      console.error('Failed to stop voice recognition:', error);
      return this.transcriptionResults.join(' ');
    }
  }

  private onSpeechStart(e: SpeechStartEvent) {
    console.log('Speech recognition started');
  }

  private onSpeechEnd(e: SpeechEndEvent) {
    console.log('Speech recognition ended');
  }

  private onSpeechResults(e: SpeechResultsEvent) {
    if (e.value && e.value.length > 0) {
      const text = e.value[0];
      this.transcriptionResults.push(text);
      
      const segment: TranscriptionSegment = {
        text,
        startTime: (Date.now() - this.startTime) / 1000,
        endTime: (Date.now() - this.startTime) / 1000 + 2,
        confidence: 0.9,
      };
      
      this.currentSegments.push(segment);
      
      if (this.onTranscriptionUpdate) {
        this.onTranscriptionUpdate(this.transcriptionResults.join(' '));
      }
      
      if (this.onSegmentUpdate) {
        this.onSegmentUpdate(this.currentSegments);
      }
      
      // Restart listening for continuous transcription
      if (this.isListening) {
        Voice.start('en-US').catch(console.error);
      }
    }
  }

  private onSpeechPartialResults(e: SpeechResultsEvent) {
    if (e.value && e.value.length > 0 && this.onTranscriptionUpdate) {
      const partialText = [...this.transcriptionResults, e.value[0]].join(' ');
      this.onTranscriptionUpdate(partialText);
    }
  }

  private onSpeechError(e: SpeechErrorEvent) {
    console.error('Speech recognition error:', e.error);
    // Restart if it's a timeout or network error
    if (this.isListening && (e.error?.code === '7' || e.error?.code === '2')) {
      setTimeout(() => {
        Voice.start('en-US').catch(console.error);
      }, 100);
    }
  }

  // Post-processing using Gemini 2.0 Flash
  async processWithGemini(
    audioText: string,
    task: 'transcribe' | 'summarize' | 'extract_actions' = 'transcribe'
  ): Promise<any> {
    try {
      // Check if API key is configured
      const apiKey = await this.getGeminiApiKey();
      if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
        throw new Error('Gemini API key not configured. Please add your API key in Settings.');
      }

      let prompt = '';
      switch (task) {
        case 'transcribe':
          prompt = `Clean up and format this meeting transcript. Fix any errors and add proper punctuation:\n\n${audioText}`;
          break;
        case 'summarize':
          prompt = `Provide a concise summary of this meeting transcript with key points:\n\n${audioText}`;
          break;
        case 'extract_actions':
          prompt = `Extract action items and decisions from this meeting transcript:\n\n${audioText}`;
          break;
      }

      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini processing error:', error);
      // Return original text if Gemini fails
      return audioText;
    }
  }

  // Store API key securely
  async saveGeminiApiKey(apiKey: string): Promise<void> {
    await AsyncStorage.setItem('gemini_api_key', apiKey);
  }

  async getGeminiApiKey(): Promise<string | null> {
    const key = await AsyncStorage.getItem('gemini_api_key');
    return key || GEMINI_API_KEY;
  }

  // Process audio file locally first, then enhance with Gemini if available
  async transcribeAudioFile(audioPath: string): Promise<{
    text: string;
    segments: TranscriptionSegment[];
  }> {
    // For now, return placeholder since we can't process audio files directly
    // In production, you'd use a service or native module
    return {
      text: 'Audio file transcription will be processed when online',
      segments: [],
    };
  }

  // Get meeting insights using Gemini
  async getMeetingInsights(transcript: string): Promise<{
    summary: string;
    actionItems: string[];
    keyPoints: string[];
    decisions: string[];
  }> {
    try {
      const apiKey = await this.getGeminiApiKey();
      if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
        return {
          summary: 'Configure Gemini API key for AI insights',
          actionItems: [],
          keyPoints: [],
          decisions: [],
        };
      }

      const prompt = `Analyze this meeting transcript and provide:
1. A brief summary (2-3 sentences)
2. List of action items
3. Key discussion points
4. Decisions made

Transcript:
${transcript}

Format the response as JSON with keys: summary, actionItems (array), keyPoints (array), decisions (array)`;

      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const resultText = data.candidates[0].content.parts[0].text;
      
      // Try to parse as JSON, fallback to text parsing
      try {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // Fallback to simple text parsing
      }

      return {
        summary: resultText.split('\n')[0] || 'No summary available',
        actionItems: [],
        keyPoints: [],
        decisions: [],
      };
    } catch (error) {
      console.error('Failed to get meeting insights:', error);
      return {
        summary: 'Insights unavailable offline',
        actionItems: [],
        keyPoints: [],
        decisions: [],
      };
    }
  }
}

export default new TranscriptionService();