import WhisperService from './WhisperService';
import GeminiService from './GeminiService';
import { TranscriptionSegment } from '../types';

export class TranscriptionServiceLocal {
  private isProcessing: boolean = false;

  // Check if ready for transcription
  async isReady(): Promise<boolean> {
    return WhisperService.isReady();
  }

  // Get model status
  getModelStatus() {
    return WhisperService.getModelStatus();
  }

  // Transcribe audio file using local Whisper
  async transcribeAudioFile(
    audioPath: string,
    onProgress?: (progress: number, status: string) => void
  ): Promise<{
    text: string;
    segments: TranscriptionSegment[];
    processingTime: number;
  }> {
    if (this.isProcessing) {
      throw new Error('Already processing another transcription');
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      // Check if Whisper model is ready
      if (!await this.isReady()) {
        throw new Error('Whisper model not loaded. Please download a model first.');
      }

      // Update progress
      if (onProgress) {
        onProgress(0, 'Starting transcription...');
      }

      // Process with local Whisper
      const whisperResult = await WhisperService.transcribeAudio(
        audioPath,
        (progress) => {
          if (onProgress) {
            onProgress(progress * 0.8, `Processing audio... ${Math.round(progress * 100)}%`);
          }
        }
      );

      // Update progress
      if (onProgress) {
        onProgress(0.9, 'Finalizing transcript...');
      }

      const processingTime = (Date.now() - startTime) / 1000;

      // Complete
      if (onProgress) {
        onProgress(1, 'Transcription complete!');
      }

      return {
        text: whisperResult.text,
        segments: whisperResult.segments,
        processingTime,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  // Process transcript with Gemini for insights
  async generateInsights(
    transcript: string,
    onProgress?: (status: string) => void
  ): Promise<{
    summary: string;
    actionItems: string[];
    keyPoints: string[];
  }> {
    try {
      if (onProgress) {
        onProgress('Generating AI insights...');
      }

      const insights = await GeminiService.getMeetingInsights(transcript);

      if (onProgress) {
        onProgress('Insights ready!');
      }

      return {
        summary: insights.summary,
        actionItems: insights.actionItems,
        keyPoints: insights.keyPoints,
      };
    } catch (error) {
      console.error('Failed to generate insights:', error);
      return {
        summary: 'AI insights unavailable',
        actionItems: [],
        keyPoints: [],
      };
    }
  }

  // Complete transcription pipeline
  async processRecording(
    audioPath: string,
    options: {
      generateInsights?: boolean;
      onProgress?: (progress: number, status: string) => void;
    } = {}
  ): Promise<{
    transcript: {
      text: string;
      segments: TranscriptionSegment[];
    };
    insights?: {
      summary: string;
      actionItems: string[];
      keyPoints: string[];
    };
    processingTime: number;
  }> {
    const startTime = Date.now();
    const { generateInsights = true, onProgress } = options;

    // Step 1: Transcribe with Whisper
    if (onProgress) {
      onProgress(0, 'Starting local transcription...');
    }

    const transcriptionResult = await this.transcribeAudioFile(
      audioPath,
      (progress, status) => {
        if (onProgress) {
          // Transcription is 70% of the total process
          onProgress(progress * 0.7, status);
        }
      }
    );

    let insights = undefined;

    // Step 2: Generate insights with Gemini (if enabled)
    if (generateInsights && transcriptionResult.text) {
      if (onProgress) {
        onProgress(0.7, 'Generating AI insights...');
      }

      try {
        insights = await this.generateInsights(
          transcriptionResult.text,
          (status) => {
            if (onProgress) {
              onProgress(0.85, status);
            }
          }
        );
      } catch (error) {
        console.log('Insights generation skipped:', error);
      }
    }

    const totalProcessingTime = (Date.now() - startTime) / 1000;

    if (onProgress) {
      onProgress(1, 'Processing complete!');
    }

    return {
      transcript: {
        text: transcriptionResult.text,
        segments: transcriptionResult.segments,
      },
      insights,
      processingTime: totalProcessingTime,
    };
  }

  // Download Whisper model
  async downloadModel(
    modelType: 'tiny' | 'base',
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    return WhisperService.downloadModel(modelType, onProgress);
  }

  // Get available models
  async getAvailableModels() {
    return WhisperService.getAvailableModels();
  }
}

export default new TranscriptionServiceLocal();