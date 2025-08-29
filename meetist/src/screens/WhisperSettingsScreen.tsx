import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { whisperRealService, WhisperMode } from '../services/WhisperRealService';
import { storage } from '../services/StorageService';

export default function WhisperSettingsScreen() {
  const [currentMode, setCurrentMode] = useState<WhisperMode>('local-transformers');
  const [availableModes, setAvailableModes] = useState<any[]>([]);
  const [showApiModal, setShowApiModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [testingApi, setTestingApi] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const mode = whisperRealService.getMode();
    setCurrentMode(mode);
    
    const modes = whisperRealService.getAvailableModes();
    setAvailableModes(modes);
  };

  const handleModeChange = (mode: WhisperMode) => {
    const modeInfo = availableModes.find(m => m.mode === mode);
    
    if (!modeInfo?.available && mode !== 'local-transformers') {
      Alert.alert(
        'API Key Required',
        `Please configure an API key for ${modeInfo?.name} first.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Configure',
            onPress: () => {
              const provider = mode.replace('cloud-', '');
              setSelectedProvider(provider);
              setShowApiModal(true);
            },
          },
        ]
      );
      return;
    }

    whisperRealService.setMode(mode);
    setCurrentMode(mode);
    Alert.alert('Success', `Switched to ${modeInfo?.name}`);
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter a valid API key');
      return;
    }

    setTestingApi(true);

    try {
      // Save API key
      whisperRealService.setApiKey(selectedProvider, apiKey);
      
      // Test the API key
      // In a real app, you'd test with a small audio file
      Alert.alert('Success', `${selectedProvider} API key saved successfully!`);
      
      setShowApiModal(false);
      setApiKey('');
      loadSettings();
    } catch (error) {
      Alert.alert('Error', 'Failed to save API key');
    } finally {
      setTestingApi(false);
    }
  };

  const getModeIcon = (mode: WhisperMode) => {
    if (mode === 'local-transformers') {
      return 'smartphone';
    }
    return 'cloud';
  };

  const getModeDescription = (mode: WhisperMode) => {
    switch (mode) {
      case 'local-transformers':
        return 'Runs entirely on your device using JavaScript. Slower but private.';
      case 'cloud-openai':
        return 'OpenAI\'s Whisper API. Fast and accurate. Requires API key.';
      case 'cloud-replicate':
        return 'Replicate\'s Whisper models. Good for large files. Requires API key.';
      case 'cloud-huggingface':
        return 'Hugging Face inference API. Free tier available. Requires API key.';
      default:
        return '';
    }
  };

  const getProviderInstructions = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'Get your API key from https://platform.openai.com/api-keys';
      case 'replicate':
        return 'Get your API key from https://replicate.com/account/api-tokens';
      case 'huggingface':
        return 'Get your API key from https://huggingface.co/settings/tokens';
      default:
        return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Whisper Configuration</Text>
          <Text style={styles.subtitle}>Choose how to transcribe your recordings</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transcription Mode</Text>
          
          {availableModes.map((modeInfo) => (
            <TouchableOpacity
              key={modeInfo.mode}
              style={[
                styles.modeCard,
                currentMode === modeInfo.mode && styles.modeCardActive,
              ]}
              onPress={() => handleModeChange(modeInfo.mode)}
            >
              <View style={styles.modeHeader}>
                <Icon
                  name={getModeIcon(modeInfo.mode)}
                  size={24}
                  color={currentMode === modeInfo.mode ? '#4A90E2' : '#666'}
                />
                <View style={styles.modeInfo}>
                  <Text style={[
                    styles.modeName,
                    currentMode === modeInfo.mode && styles.modeNameActive,
                  ]}>
                    {modeInfo.name}
                  </Text>
                  {modeInfo.available ? (
                    <Icon name="check-circle" size={16} color="#4CAF50" />
                  ) : (
                    <Icon name="lock" size={16} color="#FFA500" />
                  )}
                </View>
              </View>
              <Text style={styles.modeDescription}>
                {getModeDescription(modeInfo.mode)}
              </Text>
              {currentMode === modeInfo.mode && (
                <View style={styles.activeIndicator}>
                  <Text style={styles.activeText}>ACTIVE</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Keys</Text>
          
          <TouchableOpacity
            style={styles.apiButton}
            onPress={() => {
              setSelectedProvider('openai');
              setShowApiModal(true);
            }}
          >
            <Text style={styles.apiButtonText}>Configure OpenAI API Key</Text>
            <Icon name="chevron-right" size={20} color="#4A90E2" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.apiButton}
            onPress={() => {
              setSelectedProvider('replicate');
              setShowApiModal(true);
            }}
          >
            <Text style={styles.apiButtonText}>Configure Replicate API Key</Text>
            <Icon name="chevron-right" size={20} color="#4A90E2" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.apiButton}
            onPress={() => {
              setSelectedProvider('huggingface');
              setShowApiModal(true);
            }}
          >
            <Text style={styles.apiButtonText}>Configure Hugging Face API Key</Text>
            <Icon name="chevron-right" size={20} color="#4A90E2" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Icon name="info" size={20} color="#4A90E2" />
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>Local Mode:</Text> Uses Transformers.js to run Whisper in JavaScript. Works offline but slower.{'\n\n'}
            <Text style={styles.infoBold}>Cloud Modes:</Text> Send audio to cloud APIs for fast, accurate transcription. Requires internet and API keys.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showApiModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowApiModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Configure {selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API Key
              </Text>
              <TouchableOpacity onPress={() => setShowApiModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.instructions}>
              {getProviderInstructions(selectedProvider)}
            </Text>

            <TextInput
              style={styles.apiInput}
              placeholder="Enter your API key"
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.saveButton, testingApi && styles.saveButtonDisabled]}
              onPress={handleSaveApiKey}
              disabled={testingApi}
            >
              <Text style={styles.saveButtonText}>
                {testingApi ? 'Saving...' : 'Save API Key'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 15,
  },
  modeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  modeCardActive: {
    borderColor: '#4A90E2',
    borderWidth: 2,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  modeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
    flex: 1,
  },
  modeNameActive: {
    color: '#4A90E2',
  },
  modeDescription: {
    fontSize: 13,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  activeIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#4A90E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  apiButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  apiButtonText: {
    fontSize: 15,
    color: '#2C3E50',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F4FF',
    margin: 15,
    padding: 15,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  infoBold: {
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  instructions: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
    lineHeight: 18,
  },
  apiInput: {
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});