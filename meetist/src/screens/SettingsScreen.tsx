import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { updateSettings, resetSettings } from '../store/slices/settingsSlice';
import { AppSettings } from '../types';
import StorageService from '../services/StorageService';
import * as FileSystem from 'expo-file-system';

export default function SettingsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const settings = useSelector((state: RootState) => state.settings);

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    dispatch(updateSettings({ [key]: value }));
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all temporary files but keep your meetings. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const cacheDir = `${FileSystem.cacheDirectory}`;
              await FileSystem.deleteAsync(cacheDir, { idempotent: true });
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will restore all settings to their default values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            dispatch(resetSettings());
            Alert.alert('Success', 'Settings reset to defaults');
          },
        },
      ]
    );
  };

  const calculateStorageUsed = async () => {
    try {
      const recordingsDir = `${FileSystem.documentDirectory}recordings/`;
      const dirInfo = await FileSystem.getInfoAsync(recordingsDir);
      
      if (dirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(recordingsDir);
        let totalSize = 0;
        
        for (const file of files) {
          const fileInfo = await FileSystem.getInfoAsync(`${recordingsDir}${file}`);
          if (fileInfo.exists && 'size' in fileInfo) {
            totalSize += fileInfo.size || 0;
          }
        }
        
        const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
        Alert.alert('Storage Used', `Audio files: ${sizeInMB} MB`);
      } else {
        Alert.alert('Storage Used', 'No audio files stored');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to calculate storage');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Recording Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recording</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Whisper Model</Text>
            <Text style={styles.settingDescription}>
              Smaller models use less memory but may be less accurate
            </Text>
          </View>
          <View style={styles.modelSelector}>
            <TouchableOpacity
              style={[
                styles.modelOption,
                settings.whisperModel === 'tiny' && styles.modelOptionActive,
              ]}
              onPress={() => handleSettingChange('whisperModel', 'tiny')}
            >
              <Text
                style={[
                  styles.modelOptionText,
                  settings.whisperModel === 'tiny' && styles.modelOptionTextActive,
                ]}
              >
                Tiny (39MB)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modelOption,
                settings.whisperModel === 'base' && styles.modelOptionActive,
              ]}
              onPress={() => handleSettingChange('whisperModel', 'base')}
            >
              <Text
                style={[
                  styles.modelOptionText,
                  settings.whisperModel === 'base' && styles.modelOptionTextActive,
                ]}
              >
                Base (74MB)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Audio Quality</Text>
            <Text style={styles.settingDescription}>
              Higher quality uses more storage space
            </Text>
          </View>
          <View style={styles.qualitySelector}>
            {(['low', 'medium', 'high'] as const).map((quality) => (
              <TouchableOpacity
                key={quality}
                style={[
                  styles.qualityOption,
                  settings.audioQuality === quality && styles.qualityOptionActive,
                ]}
                onPress={() => handleSettingChange('audioQuality', quality)}
              >
                <Text
                  style={[
                    styles.qualityOptionText,
                    settings.audioQuality === quality && styles.qualityOptionTextActive,
                  ]}
                >
                  {quality.charAt(0).toUpperCase() + quality.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto-Transcribe</Text>
            <Text style={styles.settingDescription}>
              Automatically transcribe after recording
            </Text>
          </View>
          <Switch
            value={settings.autoTranscribe}
            onValueChange={(value) => handleSettingChange('autoTranscribe', value)}
            trackColor={{ false: '#ccc', true: '#2196F3' }}
            thumbColor={settings.autoTranscribe ? '#1976D2' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Save Original Audio</Text>
            <Text style={styles.settingDescription}>
              Keep original audio files after transcription
            </Text>
          </View>
          <Switch
            value={settings.saveOriginalAudio}
            onValueChange={(value) =>
              handleSettingChange('saveOriginalAudio', value)
            }
            trackColor={{ false: '#ccc', true: '#2196F3' }}
            thumbColor={settings.saveOriginalAudio ? '#1976D2' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Appearance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Theme</Text>
          </View>
          <View style={styles.themeSelector}>
            {(['light', 'dark', 'auto'] as const).map((theme) => (
              <TouchableOpacity
                key={theme}
                style={[
                  styles.themeOption,
                  settings.theme === theme && styles.themeOptionActive,
                ]}
                onPress={() => handleSettingChange('theme', theme)}
              >
                <Ionicons
                  name={
                    theme === 'light'
                      ? 'sunny'
                      : theme === 'dark'
                      ? 'moon'
                      : 'phone-portrait'
                  }
                  size={20}
                  color={settings.theme === theme ? '#fff' : '#666'}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    settings.theme === theme && styles.themeOptionTextActive,
                  ]}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Storage */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage</Text>
        
        <TouchableOpacity style={styles.actionItem} onPress={calculateStorageUsed}>
          <Ionicons name="folder-outline" size={24} color="#666" />
          <Text style={styles.actionText}>Calculate Storage Used</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionItem} onPress={handleClearCache}>
          <Ionicons name="trash-outline" size={24} color="#666" />
          <Text style={styles.actionText}>Clear Cache</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Version</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>
        
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Whisper Model Info</Text>
          <Text style={styles.aboutValue}>
            OpenAI Whisper (Local Processing)
          </Text>
        </View>
      </View>

      {/* Reset */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetSettings}
        >
          <Ionicons name="refresh" size={20} color="#f44336" />
          <Text style={styles.resetButtonText}>Reset All Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 8,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
  },
  modelSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  modelOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modelOptionActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  modelOptionText: {
    fontSize: 12,
    color: '#666',
  },
  modelOptionTextActive: {
    color: '#fff',
  },
  qualitySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  qualityOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  qualityOptionActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  qualityOptionText: {
    fontSize: 12,
    color: '#666',
  },
  qualityOptionTextActive: {
    color: '#fff',
  },
  themeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  themeOptionActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  themeOptionText: {
    fontSize: 12,
    color: '#666',
  },
  themeOptionTextActive: {
    color: '#fff',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  aboutLabel: {
    fontSize: 14,
    color: '#666',
  },
  aboutValue: {
    fontSize: 14,
    color: '#333',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  resetButtonText: {
    fontSize: 16,
    color: '#f44336',
    fontWeight: '500',
  },
});