import AsyncStorage from '@react-native-async-storage/async-storage';

// Gemini 2.5 Flash configuration
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // User needs to add their key
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export class GeminiService {
  // Store API key securely
  async saveApiKey(apiKey: string): Promise<void> {
    await AsyncStorage.setItem('gemini_api_key', apiKey);
  }

  async getApiKey(): Promise<string | null> {
    const key = await AsyncStorage.getItem('gemini_api_key');
    return key || GEMINI_API_KEY;
  }

  // Generate meeting summary
  async generateSummary(transcript: string): Promise<string> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
        return 'Configure Gemini API key for AI summaries';
      }

      const prompt = `Provide a concise summary (2-3 paragraphs) of this meeting transcript:

${transcript}

Focus on:
- Main topics discussed
- Key decisions made
- Important information shared`;

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
            maxOutputTokens: 512,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Failed to generate summary:', error);
      return 'Summary generation failed';
    }
  }

  // Extract action items
  async extractActionItems(transcript: string): Promise<string[]> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
        return [];
      }

      const prompt = `Extract all action items and tasks from this meeting transcript.
List each action item on a new line, starting with "- ".
Only include concrete tasks that someone needs to do.

Transcript:
${transcript}`;

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
            maxOutputTokens: 512,
          },
        }),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const result = data.candidates[0].content.parts[0].text;
      
      // Parse action items from response
      const items = result
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim());
      
      return items;
    } catch (error) {
      console.error('Failed to extract action items:', error);
      return [];
    }
  }

  // Extract key points
  async extractKeyPoints(transcript: string): Promise<string[]> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
        return [];
      }

      const prompt = `Extract the 5 most important points from this meeting transcript.
List each point on a new line, starting with "- ".
Keep each point concise (one sentence).

Transcript:
${transcript}`;

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
            maxOutputTokens: 256,
          },
        }),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const result = data.candidates[0].content.parts[0].text;
      
      // Parse key points from response
      const points = result
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim())
        .slice(0, 5);
      
      return points;
    } catch (error) {
      console.error('Failed to extract key points:', error);
      return [];
    }
  }

  // Get meeting insights (combined analysis)
  async getMeetingInsights(transcript: string): Promise<{
    summary: string;
    actionItems: string[];
    keyPoints: string[];
    sentiment: string;
  }> {
    try {
      // Run all analyses in parallel
      const [summary, actionItems, keyPoints] = await Promise.all([
        this.generateSummary(transcript),
        this.extractActionItems(transcript),
        this.extractKeyPoints(transcript),
      ]);

      // Simple sentiment analysis based on summary
      let sentiment = 'neutral';
      const summaryLower = summary.toLowerCase();
      if (summaryLower.includes('successful') || summaryLower.includes('agreed') || summaryLower.includes('progress')) {
        sentiment = 'positive';
      } else if (summaryLower.includes('concern') || summaryLower.includes('issue') || summaryLower.includes('problem')) {
        sentiment = 'mixed';
      }

      return {
        summary,
        actionItems,
        keyPoints,
        sentiment,
      };
    } catch (error) {
      console.error('Failed to get meeting insights:', error);
      return {
        summary: 'Analysis unavailable',
        actionItems: [],
        keyPoints: [],
        sentiment: 'unknown',
      };
    }
  }

  // Test API key
  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Test connection'
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 10,
          },
        }),
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export default new GeminiService();