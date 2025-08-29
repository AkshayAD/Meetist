import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import RealTranscriptionService, { TRANSCRIPTION_MODELS, TranscriptionModel } from '../services/RealTranscriptionService';
import * as Clipboard from 'expo-clipboard';

export default function TranscriptionSettingsScreen() {
  const navigation = useNavigation();
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const model = RealTranscriptionService.getSelectedModel();
      setSelectedModel(model);

      // Load API keys for each model that requires one
      const keys: Record<string, string> = {};
      for (const model of TRANSCRIPTION_MODELS) {
        if (model.requiresApiKey) {
          const key = RealTranscriptionService.getApiKey(model.id) || '';
          if (model.type === 'gemini') {
            // Use a single key for all Gemini models
            keys['gemini'] = RealTranscriptionService.getApiKey('gemini') || key;
          } else {
            keys[model.id] = key;
          }
        }
      }
      setApiKeys(keys);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveApiKey = async (modelId: string, apiKey: string) => {
    try {
      if (modelId === 'gemini') {
        // Save the same key for all Gemini models
        for (const model of TRANSCRIPTION_MODELS) {
          if (model.type === 'gemini') {
            await RealTranscriptionService.setApiKey(model.id, apiKey);
          }
        }
        await RealTranscriptionService.setApiKey('gemini', apiKey);
      } else {
        await RealTranscriptionService.setApiKey(modelId, apiKey);
      }
      
      setApiKeys(prev => ({ ...prev, [modelId]: apiKey }));
      Alert.alert('Success', 'API key saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save API key');
    }
  };

  const selectModel = async (modelId: string) => {
    try {
      // Check if model is configured
      if (!RealTranscriptionService.isModelConfigured(modelId)) {
        Alert.alert('Configuration Required', 'Please add an API key for this model first.');
        return;
      }

      await RealTranscriptionService.setSelectedModel(modelId);
      setSelectedModel(modelId);
      Alert.alert('Success', `Selected ${TRANSCRIPTION_MODELS.find(m => m.id === modelId)?.name}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to select model');
    }
  };

  const testModel = async (modelId: string) => {
    setTestingModel(modelId);
    try {
      // Create a test audio file or use a sample
      Alert.alert('Test Started', 'Testing model connection...');
      
      // For testing, we'll just verify the API key works
      const model = TRANSCRIPTION_MODELS.find(m => m.id === modelId);
      if (model?.type === 'gemini') {
        const apiKey = RealTranscriptionService.getApiKey(modelId);
        if (!apiKey) {
          throw new Error('API key not configured');
        }
        
        // Test the API key with a simple request
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(testUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say "API key is valid"' }] }]
          }),
        });
        
        if (response.ok) {
          Alert.alert('Success', 'API key is valid and working!');
        } else {
          const error = await response.text();
          throw new Error(`API key validation failed: ${error}`);
        }
      } else {
        Alert.alert('Info', 'Test feature coming soon for this model type');
      }
    } catch (error: any) {
      Alert.alert('Test Failed', error.message);
    } finally {
      setTestingModel(null);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  const getModelGroupedByType = () => {
    const grouped: Record<string, TranscriptionModel[]> = {
      'Gemini Models': [],
      'Whisper Models': [],
      'Device Models': [],
    };

    TRANSCRIPTION_MODELS.forEach(model => {
      if (model.type === 'gemini') {
        grouped['Gemini Models'].push(model);
      } else if (model.type.includes('whisper')) {
        grouped['Whisper Models'].push(model);
      } else {
        grouped['Device Models'].push(model);
      }
    });

    return grouped;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const modelGroups = getModelGroupedByType();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Transcription Settings</Text>
      </View>

      {/* Current Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Model</Text>
        <View style={styles.currentModelCard}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          <Text style={styles.currentModelText}>
            {TRANSCRIPTION_MODELS.find(m => m.id === selectedModel)?.name || 'None selected'}
          </Text>
        </View>
      </View>

      {/* API Keys Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Keys</Text>
        
        {/* Gemini API Key (single key for all Gemini models) */}
        <View style={styles.apiKeyCard}>
          <View style={styles.apiKeyHeader}>
            <Ionicons name="key" size={20} color="#007AFF" />
            <Text style={styles.apiKeyTitle}>Gemini API Key</Text>
            <TouchableOpacity
              onPress={() => copyToClipboard('https://aistudio.google.com/apikey', 'API key URL')}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>Get Key</Text>
              <Ionicons name="open-outline" size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.apiKeyDescription}>
            Works for all Gemini models (2.5 Flash, Pro, Live)
          </Text>
          
          <View style={styles.apiKeyInputContainer}>
            <TextInput
              style={styles.apiKeyInput}
              placeholder="Enter your Gemini API key"
              value={apiKeys['gemini'] || ''}
              onChangeText={(text) => setApiKeys(prev => ({ ...prev, gemini: text }))}
              secureTextEntry={!showApiKeys['gemini']}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowApiKeys(prev => ({ ...prev, gemini: !prev.gemini }))}
              style={styles.eyeButton}
            >
              <Ionicons 
                name={showApiKeys['gemini'] ? 'eye-off' : 'eye'} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => saveApiKey('gemini', apiKeys['gemini'] || '')}
          >
            <Text style={styles.saveButtonText}>Save Gemini Key</Text>
          </TouchableOpacity>
        </View>

        {/* OpenAI Whisper API Key */}
        <View style={styles.apiKeyCard}>
          <View style={styles.apiKeyHeader}>
            <Ionicons name="key" size={20} color="#007AFF" />
            <Text style={styles.apiKeyTitle}>OpenAI API Key</Text>
            <TouchableOpacity
              onPress={() => copyToClipboard('https://platform.openai.com/api-keys', 'API key URL')}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>Get Key</Text>
              <Ionicons name="open-outline" size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.apiKeyDescription}>
            For Cloud Whisper API transcription
          </Text>
          
          <View style={styles.apiKeyInputContainer}>
            <TextInput
              style={styles.apiKeyInput}
              placeholder="Enter your OpenAI API key"
              value={apiKeys['whisper-cloud'] || ''}
              onChangeText={(text) => setApiKeys(prev => ({ ...prev, 'whisper-cloud': text }))}
              secureTextEntry={!showApiKeys['whisper-cloud']}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowApiKeys(prev => ({ ...prev, 'whisper-cloud': !prev['whisper-cloud'] }))}
              style={styles.eyeButton}
            >
              <Ionicons 
                name={showApiKeys['whisper-cloud'] ? 'eye-off' : 'eye'} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => saveApiKey('whisper-cloud', apiKeys['whisper-cloud'] || '')}
          >
            <Text style={styles.saveButtonText}>Save OpenAI Key</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Models Selection */}
      {Object.entries(modelGroups).map(([groupName, models]) => (
        models.length > 0 && (
          <View key={groupName} style={styles.section}>
            <Text style={styles.sectionTitle}>{groupName}</Text>
            {models.map(model => (
              <TouchableOpacity
                key={model.id}
                style={[
                  styles.modelCard,
                  selectedModel === model.id && styles.selectedModelCard,
                  !model.isAvailable && styles.disabledModelCard,
                ]}
                onPress={() => model.isAvailable && selectModel(model.id)}
                disabled={!model.isAvailable}
              >
                <View style={styles.modelInfo}>
                  <View style={styles.modelHeader}>
                    <Text style={[
                      styles.modelName,
                      !model.isAvailable && styles.disabledText
                    ]}>
                      {model.name}
                    </Text>
                    {selectedModel === model.id && (
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    )}
                  </View>
                  
                  <Text style={[
                    styles.modelDescription,
                    !model.isAvailable && styles.disabledText
                  ]}>
                    {model.description}
                  </Text>
                  
                  <View style={styles.modelTags}>
                    {model.requiresApiKey && (
                      <View style={[
                        styles.tag,
                        RealTranscriptionService.isModelConfigured(model.id) 
                          ? styles.configuredTag 
                          : styles.unconfiguredTag
                      ]}>
                        <Ionicons 
                          name={RealTranscriptionService.isModelConfigured(model.id) ? 'checkmark' : 'close'} 
                          size={12} 
                          color="white" 
                        />
                        <Text style={styles.tagText}>
                          {RealTranscriptionService.isModelConfigured(model.id) ? 'Configured' : 'API Key Required'}
                        </Text>
                      </View>
                    )}
                    
                    {!model.isAvailable && (
                      <View style={styles.comingSoonTag}>
                        <Text style={styles.tagText}>Coming Soon</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                {model.isAvailable && RealTranscriptionService.isModelConfigured(model.id) && (
                  <TouchableOpacity
                    style={styles.testButton}
                    onPress={() => testModel(model.id)}
                    disabled={testingModel === model.id}
                  >
                    {testingModel === model.id ? (
                      <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                      <>
                        <Ionicons name="play-circle" size={20} color="#007AFF" />
                        <Text style={styles.testButtonText}>Test</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )
      ))}

      {/* Information Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>About Transcription Models</Text>
        
        <View style={styles.infoCard}>
          <Ionicons name="flash" size={20} color="#FF9800" />
          <View style={styles.infoContent}>
            <Text style={styles.infoCardTitle}>Gemini Models</Text>
            <Text style={styles.infoCardText}>
              Google's latest AI models with native audio understanding. Flash models are faster and cheaper, while Pro offers the highest accuracy.
            </Text>
          </View>
        </View>
        
        <View style={styles.infoCard}>
          <Ionicons name="cloud" size={20} color="#2196F3" />
          <View style={styles.infoContent}>
            <Text style={styles.infoCardTitle}>Cloud Whisper</Text>
            <Text style={styles.infoCardText}>
              OpenAI's Whisper model via API. Excellent accuracy for multiple languages and accents.
            </Text>
          </View>
        </View>
        
        <View style={styles.infoCard}>
          <Ionicons name="phone-portrait" size={20} color="#4CAF50" />
          <View style={styles.infoContent}>
            <Text style={styles.infoCardTitle}>Device Speech</Text>
            <Text style={styles.infoCardText}>
              Uses your device's built-in speech recognition. Works offline but only for live recording.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  currentModelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  currentModelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2E7D32',
    flex: 1,
  },
  apiKeyCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  apiKeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  apiKeyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  apiKeyDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  apiKeyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    marginBottom: 12,
  },
  apiKeyInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
  },
  eyeButton: {
    padding: 12,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modelCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedModelCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  disabledModelCard: {
    opacity: 0.6,
  },
  modelInfo: {
    flex: 1,
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  modelDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  disabledText: {
    color: '#999',
  },
  modelTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  configuredTag: {
    backgroundColor: '#4CAF50',
  },
  unconfiguredTag: {
    backgroundColor: '#FF9800',
  },
  comingSoonTag: {
    backgroundColor: '#9E9E9E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 4,
  },
  testButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  infoSection: {
    padding: 16,
    marginTop: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});