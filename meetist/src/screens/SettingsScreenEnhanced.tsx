import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { updateSettings, resetSettings } from '../store/slices/settingsSlice';
import { AppSettings } from '../types';
import StorageService from '../services/StorageService';
import TranscriptionService from '../services/TranscriptionService';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';

export default function SettingsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const settings = useSelector((state: RootState) => state.settings);
  const [apiKeyModalVisible, setApiKeyModalVisible] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [testingApiKey, setTestingApiKey] = useState(false);

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    dispatch(updateSettings({ [key]: value }));
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter a valid API key');
      return;
    }

    setTestingApiKey(true);
    
    // Save the API key
    await TranscriptionService.saveGeminiApiKey(apiKey);
    
    // Test the API key
    try {
      const result = await TranscriptionService.processWithGemini(
        'Test connection',
        'transcribe'
      );
      
      if (result) {
        Alert.alert('Success', 'Gemini API key configured successfully!');
        setApiKeyModalVisible(false);
        setApiKey('');
      } else {
        Alert.alert('Error', 'Invalid API key. Please check and try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to validate API key. Please check your internet connection.');
    }
    
    setTestingApiKey(false);
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
    <>
      <ScrollView style={styles.container}>
        {/* AI Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI & Transcription</Text>
          
          <TouchableOpacity 
            style={styles.apiKeyItem}
            onPress={() => navigation.navigate('WhisperModels' as never)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Whisper Models</Text>
              <Text style={styles.settingDescription}>
                Download and manage offline transcription models
              </Text>
            </View>
            <View style={styles.apiKeyStatus}>
              <Text style={styles.apiKeyStatusText}>Manage</Text>
              <Ionicons name="chevron-forward" size={20} color="#2196F3" />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.apiKeyItem}
            onPress={() => setApiKeyModalVisible(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Gemini API Key</Text>
              <Text style={styles.settingDescription}>
                Configure Gemini 2.5 Flash for AI summaries
              </Text>
            </View>
            <View style={styles.apiKeyStatus}>
              <Text style={styles.apiKeyStatusText}>Configure</Text>
              <Ionicons name="chevron-forward" size={20} color="#2196F3" />
            </View>
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-Transcribe</Text>
              <Text style={styles.settingDescription}>
                Automatically transcribe while recording
              </Text>
            </View>
            <Switch
              value={settings.autoTranscribe}
              onValueChange={(value) => handleSettingChange('autoTranscribe', value)}
              trackColor={{ false: '#ccc', true: '#2196F3' }}
              thumbColor={settings.autoTranscribe ? '#1976D2' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Recording Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recording</Text>
          
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
            <Text style={styles.aboutLabel}>AI Model</Text>
            <Text style={styles.aboutValue}>
              Gemini 2.0 Flash (Cloud)
            </Text>
          </View>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Transcription</Text>
            <Text style={styles.aboutValue}>
              Device Speech Recognition + Gemini Enhancement
            </Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Use</Text>
          <View style={styles.instructions}>
            <Text style={styles.instructionStep}>1. Get a free Gemini API key from Google AI Studio</Text>
            <Text style={styles.instructionStep}>2. Configure the API key above</Text>
            <Text style={styles.instructionStep}>3. Enable Auto-Transcribe for live transcription</Text>
            <Text style={styles.instructionStep}>4. Record meetings with automatic transcription</Text>
            <Text style={styles.instructionStep}>5. All data is stored locally on your device</Text>
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

      {/* API Key Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={apiKeyModalVisible}
        onRequestClose={() => setApiKeyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configure Gemini API Key</Text>
            
            <Text style={styles.modalDescription}>
              Get your free API key from Google AI Studio:
              {'\n'}https://aistudio.google.com/apikey
            </Text>
            
            <TextInput
              style={styles.apiKeyInput}
              placeholder="Enter your Gemini API key"
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry
              autoCapitalize="none"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setApiKeyModalVisible(false);
                  setApiKey('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveApiKey}
                disabled={testingApiKey}
              >
                {testingApiKey ? (
                  <Text style={styles.saveButtonText}>Testing...</Text>
                ) : (
                  <Text style={styles.saveButtonText}>Save & Test</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  apiKeyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  apiKeyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  apiKeyStatusText: {
    fontSize: 14,
    color: '#2196F3',
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
  instructions: {
    paddingHorizontal: 16,
  },
  instructionStep: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    paddingLeft: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  apiKeyInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
});