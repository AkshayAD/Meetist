import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export class AudioService {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private recordingOptions: Audio.RecordingOptions;

  constructor() {
    // Optimized for Whisper: 16kHz mono WAV
    this.recordingOptions = {
      android: {
        extension: '.wav',
        outputFormat: Audio.AndroidOutputFormat.DEFAULT,
        audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
        sampleRate: 16000, // Whisper optimal rate
        numberOfChannels: 1, // Mono for smaller files
        bitRate: 128000,
      },
      ios: {
        extension: '.wav',
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/wav',
        bitsPerSecond: 128000,
      },
    };
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to request audio permissions:', error);
      return false;
    }
  }

  async startRecording(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Audio recording permission not granted');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        this.recordingOptions
      );
      
      this.recording = recording;
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }

  async stopRecording(): Promise<string | null> {
    if (!this.recording) {
      return null;
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      
      if (uri) {
        // Move to permanent location
        const fileName = `recording_${Date.now()}.wav`;
        const newUri = `${FileSystem.documentDirectory}recordings/${fileName}`;
        
        // Ensure directory exists
        await FileSystem.makeDirectoryAsync(
          `${FileSystem.documentDirectory}recordings`,
          { intermediates: true }
        );
        
        await FileSystem.moveAsync({
          from: uri,
          to: newUri,
        });
        
        return newUri;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return null;
    }
  }

  async pauseRecording(): Promise<void> {
    if (this.recording) {
      await this.recording.pauseAsync();
    }
  }

  async resumeRecording(): Promise<void> {
    if (this.recording) {
      await this.recording.startAsync();
    }
  }

  async getRecordingStatus(): Promise<Audio.RecordingStatus | null> {
    if (!this.recording) {
      return null;
    }
    return await this.recording.getStatusAsync();
  }

  async playAudio(uri: string): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync({ uri });
      this.sound = sound;
      await sound.playAsync();
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  }

  async stopPlayback(): Promise<void> {
    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }

  async getAudioInfo(uri: string): Promise<{ duration: number; size: number } | null> {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) {
        return null;
      }

      // Load audio to get duration
      const { sound } = await Audio.Sound.createAsync({ uri });
      const status = await sound.getStatusAsync();
      await sound.unloadAsync();

      if (status.isLoaded && status.durationMillis) {
        return {
          duration: status.durationMillis / 1000, // Convert to seconds
          size: info.size || 0,
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get audio info:', error);
      return null;
    }
  }

  async deleteAudioFile(uri: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (error) {
      console.error('Failed to delete audio file:', error);
    }
  }
}

export default new AudioService();