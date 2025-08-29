import AsyncStorage from '@react-native-async-storage/async-storage';
import { Meeting } from '../types';

export interface MeetingSummary {
  id: string;
  meetingId: string;
  generatedAt: Date;
  model: string;
  header: {
    title: string;
    date: string;
    duration: string;
    participantCount: number;
  };
  participants: string[];
  shortSummary: string;
  structuredSummary: {
    overview: string;
    mainTopics: Array<{
      topic: string;
      details: string[];
    }>;
    decisions: string[];
    discussions: Array<{
      topic: string;
      points: string[];
    }>;
  };
  actionItems: Array<{
    task: string;
    assignee?: string;
    deadline?: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  timeline: Array<{
    time: string;
    event: string;
    type: 'topic' | 'decision' | 'action' | 'milestone';
  }>;
  keyInsights: string[];
  nextSteps: string[];
  attachments?: Array<{
    type: string;
    reference: string;
  }>;
}

class MeetingSummaryService {
  private apiKey: string | null = null;
  private summaryCache: Map<string, MeetingSummary> = new Map();
  private readonly CACHE_KEY = 'meeting_summaries';
  private readonly API_KEY_STORAGE_KEY = 'gemini_api_key';

  constructor() {
    this.loadApiKey();
    this.loadCachedSummaries();
  }

  private async loadApiKey() {
    try {
      // First try to get from the storage key
      this.apiKey = await AsyncStorage.getItem(this.API_KEY_STORAGE_KEY);
      
      // If not found, try to get from transcription_api_keys
      if (!this.apiKey) {
        const keys = await AsyncStorage.getItem('transcription_api_keys');
        if (keys) {
          const parsed = JSON.parse(keys);
          this.apiKey = parsed.gemini || null;
        }
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  }

  private async loadCachedSummaries() {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const summaries = JSON.parse(cached);
        Object.entries(summaries).forEach(([key, value]) => {
          this.summaryCache.set(key, value as MeetingSummary);
        });
      }
    } catch (error) {
      console.error('Error loading cached summaries:', error);
    }
  }

  private async saveCachedSummaries() {
    try {
      const summaries: Record<string, MeetingSummary> = {};
      this.summaryCache.forEach((value, key) => {
        summaries[key] = value;
      });
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(summaries));
    } catch (error) {
      console.error('Error saving cached summaries:', error);
    }
  }

  public async setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    await AsyncStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
  }

  public getApiKey(): string | null {
    return this.apiKey;
  }

  public getCachedSummary(meetingId: string): MeetingSummary | null {
    return this.summaryCache.get(meetingId) || null;
  }

  public async generateSummary(
    meeting: Meeting,
    onProgress?: (status: string, progress: number) => void
  ): Promise<MeetingSummary> {
    // Check cache first
    const cached = this.getCachedSummary(meeting.id);
    if (cached && this.isSummaryRecent(cached)) {
      return cached;
    }

    if (!this.apiKey) {
      throw new Error('Gemini API key not configured. Please add your API key in settings.');
    }

    if (!meeting.transcription?.text) {
      throw new Error('No transcription available for this meeting.');
    }

    onProgress?.('Preparing transcript...', 10);

    // Prepare the prompt for comprehensive summary
    const prompt = this.createSummaryPrompt(meeting);

    onProgress?.('Generating summary with AI...', 30);

    try {
      // Call Gemini API
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
      
      const response = await fetch(apiUrl, {
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
            temperature: 0.3, // Lower temperature for more consistent formatting
            maxOutputTokens: 4096,
          }
        }),
      });

      onProgress?.('Processing AI response...', 70);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response from Gemini API');
      }

      const aiResponse = data.candidates[0].content.parts[0].text;
      
      onProgress?.('Formatting summary...', 90);

      // Parse the AI response into structured summary
      const summary = this.parseAIResponse(aiResponse, meeting);
      
      // Cache the summary
      this.summaryCache.set(meeting.id, summary);
      await this.saveCachedSummaries();

      onProgress?.('Summary complete!', 100);

      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  }

  private createSummaryPrompt(meeting: Meeting): string {
    const transcription = meeting.transcription.text;
    const duration = this.formatDuration(meeting.duration);
    
    return `You are an expert meeting analyst. Please analyze this meeting transcript and provide a comprehensive, well-structured summary.

MEETING TRANSCRIPT:
${transcription}

MEETING METADATA:
- Date: ${new Date(meeting.date).toLocaleDateString()}
- Duration: ${duration}
- Title: ${meeting.title}

Please provide a comprehensive meeting summary in the following JSON format. Be thorough and extract all relevant information:

{
  "header": {
    "title": "Improved meeting title based on content",
    "mainTopic": "Primary subject of the meeting"
  },
  "participants": ["List of identified participants or speakers"],
  "shortSummary": "A concise 2-3 sentence overview of the entire meeting",
  "structuredSummary": {
    "overview": "A comprehensive paragraph summarizing the meeting's purpose, main discussions, and outcomes",
    "mainTopics": [
      {
        "topic": "Topic name",
        "details": ["Key point 1", "Key point 2", "Key point 3"]
      }
    ],
    "decisions": ["List of decisions made during the meeting"],
    "discussions": [
      {
        "topic": "Discussion topic",
        "points": ["Point discussed", "Different viewpoints", "Consensus reached"]
      }
    ]
  },
  "actionItems": [
    {
      "task": "Specific action to be taken",
      "assignee": "Person responsible (if mentioned)",
      "deadline": "Due date (if mentioned)",
      "priority": "high/medium/low based on context"
    }
  ],
  "timeline": [
    {
      "time": "Beginning/First Quarter/Middle/Third Quarter/End",
      "event": "What was discussed or decided",
      "type": "topic/decision/action/milestone"
    }
  ],
  "keyInsights": ["Important insights or learnings from the meeting"],
  "nextSteps": ["Immediate next steps or follow-up items"],
  "recommendations": ["Suggestions for future meetings or improvements"]
}

IMPORTANT INSTRUCTIONS:
1. Extract ALL action items mentioned, even if informal
2. Identify all participants/speakers if their names are mentioned
3. Create a logical timeline of the meeting flow
4. Highlight all decisions made, no matter how small
5. Provide specific, actionable next steps
6. If information is not available for a field, use empty array [] or "Not specified"
7. Be thorough but concise in your descriptions
8. Maintain professional language throughout
9. Prioritize accuracy over assumptions

Ensure the response is valid JSON that can be parsed.`;
  }

  private parseAIResponse(aiResponse: string, meeting: Meeting): MeetingSummary {
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Create the summary object with fallbacks
      const summary: MeetingSummary = {
        id: `summary_${meeting.id}_${Date.now()}`,
        meetingId: meeting.id,
        generatedAt: new Date(),
        model: 'gemini-1.5-flash',
        header: {
          title: parsed.header?.title || meeting.title,
          date: new Date(meeting.date).toLocaleDateString(),
          duration: this.formatDuration(meeting.duration),
          participantCount: parsed.participants?.length || 0,
        },
        participants: parsed.participants || [],
        shortSummary: parsed.shortSummary || 'Summary not available',
        structuredSummary: {
          overview: parsed.structuredSummary?.overview || '',
          mainTopics: parsed.structuredSummary?.mainTopics || [],
          decisions: parsed.structuredSummary?.decisions || [],
          discussions: parsed.structuredSummary?.discussions || [],
        },
        actionItems: (parsed.actionItems || []).map((item: any) => ({
          task: item.task || '',
          assignee: item.assignee || undefined,
          deadline: item.deadline || undefined,
          priority: item.priority || 'medium',
        })),
        timeline: (parsed.timeline || []).map((item: any) => ({
          time: item.time || '',
          event: item.event || '',
          type: item.type || 'topic',
        })),
        keyInsights: parsed.keyInsights || [],
        nextSteps: parsed.nextSteps || [],
      };

      return summary;
    } catch (error) {
      console.error('Error parsing AI response:', error);
      
      // Return a basic summary if parsing fails
      return this.createFallbackSummary(meeting, aiResponse);
    }
  }

  private createFallbackSummary(meeting: Meeting, rawText: string): MeetingSummary {
    // Extract what we can from the raw text
    const lines = rawText.split('\n').filter(line => line.trim());
    
    return {
      id: `summary_${meeting.id}_${Date.now()}`,
      meetingId: meeting.id,
      generatedAt: new Date(),
      model: 'gemini-1.5-flash',
      header: {
        title: meeting.title,
        date: new Date(meeting.date).toLocaleDateString(),
        duration: this.formatDuration(meeting.duration),
        participantCount: 0,
      },
      participants: [],
      shortSummary: lines[0] || 'Meeting transcript analyzed',
      structuredSummary: {
        overview: rawText.substring(0, 500),
        mainTopics: [],
        decisions: [],
        discussions: [],
      },
      actionItems: [],
      timeline: [],
      keyInsights: lines.slice(0, 5),
      nextSteps: [],
    };
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }

  private isSummaryRecent(summary: MeetingSummary): boolean {
    // Consider summary recent if generated within last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return new Date(summary.generatedAt) > oneDayAgo;
  }

  public async clearCache() {
    this.summaryCache.clear();
    await AsyncStorage.removeItem(this.CACHE_KEY);
  }

  public async regenerateSummary(meetingId: string): Promise<void> {
    this.summaryCache.delete(meetingId);
    await this.saveCachedSummaries();
  }
}

export default new MeetingSummaryService();