import { MMKV } from 'react-native-mmkv';
import * as SQLite from 'expo-sqlite';
import { Meeting, AppSettings } from '../types';

class StorageService {
  private mmkv: MMKV;
  private db: SQLite.SQLiteDatabase | null = null;

  constructor() {
    this.mmkv = new MMKV();
    this.initDatabase();
  }

  private async initDatabase() {
    try {
      this.db = await SQLite.openDatabaseAsync('meetist.db');
      
      // Create meetings table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS meetings (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          date INTEGER NOT NULL,
          duration INTEGER NOT NULL,
          audioPath TEXT NOT NULL,
          transcription TEXT,
          tags TEXT,
          participants TEXT,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);
        CREATE INDEX IF NOT EXISTS idx_meetings_title ON meetings(title);
      `);

      // Create transcription segments table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS transcription_segments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          meetingId TEXT NOT NULL,
          text TEXT NOT NULL,
          startTime REAL NOT NULL,
          endTime REAL NOT NULL,
          confidence REAL NOT NULL,
          speaker TEXT,
          FOREIGN KEY (meetingId) REFERENCES meetings(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_segments_meeting ON transcription_segments(meetingId);
      `);
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }

  // Meeting Management
  async saveMeeting(meeting: Meeting): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO meetings 
         (id, title, date, duration, audioPath, transcription, tags, participants, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          meeting.id,
          meeting.title,
          meeting.date.getTime(),
          meeting.duration,
          meeting.audioPath,
          JSON.stringify(meeting.transcription),
          JSON.stringify(meeting.tags),
          JSON.stringify(meeting.participants),
          meeting.createdAt.getTime(),
          meeting.updatedAt.getTime(),
        ]
      );

      // Save transcription segments
      if (meeting.transcription.segments.length > 0) {
        for (const segment of meeting.transcription.segments) {
          await this.db.runAsync(
            `INSERT INTO transcription_segments 
             (meetingId, text, startTime, endTime, confidence, speaker)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              meeting.id,
              segment.text,
              segment.startTime,
              segment.endTime,
              segment.confidence,
              segment.speaker || null,
            ]
          );
        }
      }
    } catch (error) {
      console.error('Failed to save meeting:', error);
      throw error;
    }
  }

  async getMeeting(id: string): Promise<Meeting | null> {
    if (!this.db) return null;

    try {
      const result = await this.db.getFirstAsync<any>(
        'SELECT * FROM meetings WHERE id = ?',
        [id]
      );

      if (!result) return null;

      const segments = await this.db.getAllAsync<any>(
        'SELECT * FROM transcription_segments WHERE meetingId = ?',
        [id]
      );

      return this.parseMeeting(result, segments);
    } catch (error) {
      console.error('Failed to get meeting:', error);
      return null;
    }
  }

  async getAllMeetings(): Promise<Meeting[]> {
    if (!this.db) return [];

    try {
      const results = await this.db.getAllAsync<any>(
        'SELECT * FROM meetings ORDER BY date DESC'
      );

      const meetings: Meeting[] = [];
      for (const result of results) {
        const segments = await this.db!.getAllAsync<any>(
          'SELECT * FROM transcription_segments WHERE meetingId = ?',
          [result.id]
        );
        meetings.push(this.parseMeeting(result, segments));
      }

      return meetings;
    } catch (error) {
      console.error('Failed to get all meetings:', error);
      return [];
    }
  }

  async searchMeetings(query: string): Promise<Meeting[]> {
    if (!this.db) return [];

    try {
      const searchQuery = `%${query}%`;
      const results = await this.db.getAllAsync<any>(
        `SELECT DISTINCT m.* FROM meetings m
         LEFT JOIN transcription_segments ts ON m.id = ts.meetingId
         WHERE m.title LIKE ? OR ts.text LIKE ?
         ORDER BY m.date DESC`,
        [searchQuery, searchQuery]
      );

      const meetings: Meeting[] = [];
      for (const result of results) {
        const segments = await this.db!.getAllAsync<any>(
          'SELECT * FROM transcription_segments WHERE meetingId = ?',
          [result.id]
        );
        meetings.push(this.parseMeeting(result, segments));
      }

      return meetings;
    } catch (error) {
      console.error('Failed to search meetings:', error);
      return [];
    }
  }

  async deleteMeeting(id: string): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.runAsync('DELETE FROM meetings WHERE id = ?', [id]);
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      throw error;
    }
  }

  private parseMeeting(dbRow: any, segments: any[]): Meeting {
    return {
      id: dbRow.id,
      title: dbRow.title,
      date: new Date(dbRow.date),
      duration: dbRow.duration,
      audioPath: dbRow.audioPath,
      transcription: {
        ...JSON.parse(dbRow.transcription),
        segments: segments.map(s => ({
          text: s.text,
          startTime: s.startTime,
          endTime: s.endTime,
          confidence: s.confidence,
          speaker: s.speaker,
        })),
      },
      tags: JSON.parse(dbRow.tags),
      participants: JSON.parse(dbRow.participants),
      createdAt: new Date(dbRow.createdAt),
      updatedAt: new Date(dbRow.updatedAt),
    };
  }

  // Settings Management
  getSettings(): AppSettings {
    const settingsJson = this.mmkv.getString('app_settings');
    if (settingsJson) {
      return JSON.parse(settingsJson);
    }
    
    // Default settings
    return {
      whisperModel: 'tiny',
      audioQuality: 'medium',
      autoTranscribe: true,
      saveOriginalAudio: true,
      theme: 'light',
    };
  }

  saveSettings(settings: AppSettings): void {
    this.mmkv.set('app_settings', JSON.stringify(settings));
  }

  // Generic key-value storage
  setValue(key: string, value: string): void {
    this.mmkv.set(key, value);
  }

  getValue(key: string): string | undefined {
    return this.mmkv.getString(key);
  }

  removeValue(key: string): void {
    this.mmkv.delete(key);
  }

  clearAll(): void {
    this.mmkv.clearAll();
  }
}

export default new StorageService();