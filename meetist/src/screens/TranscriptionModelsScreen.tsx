import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  multiModelTranscriptionService,
  TranscriptionModel,
  TRANSCRIPTION_MODELS,
} from '../services/MultiModelTranscriptionService';

export default function TranscriptionModelsScreen() {
  const [models, setModels] = useState<TranscriptionModel[]>([]);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [showApiModal, setShowApiModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<TranscriptionModel | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [showOnlyFree, setShowOnlyFree] = useState(false);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = () => {
    const availableModels = multiModelTranscriptionService.getAvailableModels();
    setModels(availableModels);
    
    const activeModel = multiModelTranscriptionService.getActiveModel();
    if (activeModel) {
      setActiveModelId(activeModel.id);
    }
  };

  const handleSelectModel = (model: TranscriptionModel) => {
    if (model.requiresApiKey && !(model as any).isConfigured) {
      setSelectedModel(model);
      setShowApiModal(true);
      return;
    }

    try {
      multiModelTranscriptionService.setActiveModel(model.id);
      setActiveModelId(model.id);
      Alert.alert('Success', `${model.name} is now active for transcription`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSaveApiKey = () => {
    if (!selectedModel || !apiKey.trim()) {
      Alert.alert('Error', 'Please enter a valid API key');
      return;
    }

    multiModelTranscriptionService.setApiKey(selectedModel.id, apiKey);
    setShowApiModal(false);
    setApiKey('');
    
    // Now set as active
    multiModelTranscriptionService.setActiveModel(selectedModel.id);
    setActiveModelId(selectedModel.id);
    
    Alert.alert('Success', `${selectedModel.name} configured and activated`);
    loadModels();
  };

  const getProviders = (): string[] => {
    const providers = new Set(TRANSCRIPTION_MODELS.map(m => m.provider));
    return ['all', ...Array.from(providers)];
  };

  const getFilteredModels = (): TranscriptionModel[] => {
    let filtered = models;
    
    if (filterProvider !== 'all') {
      filtered = filtered.filter(m => m.provider === filterProvider);
    }
    
    if (showOnlyFree) {
      filtered = filtered.filter(m => m.freeQuota);
    }
    
    return filtered;
  };

  const getPriceColor = (pricing: string): string => {
    if (pricing === 'Free') return '#4CAF50';
    if (pricing.includes('$0.0')) return '#FF9800';
    return '#F44336';
  };

  const getSpeedColor = (speed: string): string => {
    if (speed.includes('Ultra')) return '#4CAF50';
    if (speed.includes('Very Fast') || speed.includes('Fast')) return '#2196F3';
    if (speed.includes('Real-time')) return '#00BCD4';
    return '#FF9800';
  };

  const renderModelCard = (model: TranscriptionModel) => {
    const isActive = activeModelId === model.id;
    const isConfigured = !(model.requiresApiKey) || (model as any).isConfigured;

    return (
      <TouchableOpacity
        key={model.id}
        style={[styles.modelCard, isActive && styles.activeCard]}
        onPress={() => handleSelectModel(model)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.modelTitle}>
            <Text style={[styles.modelName, isActive && styles.activeName]}>
              {model.name}
            </Text>
            <Text style={styles.provider}>{model.provider}</Text>
          </View>
          {isActive && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ACTIVE</Text>
            </View>
          )}
        </View>

        <Text style={styles.description}>{model.description}</Text>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Icon name="attach-money" size={16} color={getPriceColor(model.pricing)} />
            <Text style={[styles.featureText, { color: getPriceColor(model.pricing) }]}>
              {model.pricing}
            </Text>
          </View>

          {model.freeQuota && (
            <View style={styles.feature}>
              <Icon name="card-giftcard" size={16} color="#4CAF50" />
              <Text style={[styles.featureText, { color: '#4CAF50' }]}>
                {model.freeQuota}
              </Text>
            </View>
          )}

          <View style={styles.feature}>
            <Icon name="speed" size={16} color={getSpeedColor(model.speed)} />
            <Text style={[styles.featureText, { color: getSpeedColor(model.speed) }]}>
              {model.speed}
            </Text>
          </View>

          <View style={styles.feature}>
            <Icon name="stars" size={16} color="#FF9800" />
            <Text style={styles.featureText}>{model.accuracy}</Text>
          </View>
        </View>

        <View style={styles.specs}>
          <Text style={styles.specText}>
            Languages: {model.languages.join(', ')}
          </Text>
          <Text style={styles.specText}>
            Max size: {model.maxFileSize}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          {model.requiresApiKey ? (
            isConfigured ? (
              <View style={styles.configuredBadge}>
                <Icon name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.configuredText}>Configured</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.configureButton}
                onPress={() => {
                  setSelectedModel(model);
                  setShowApiModal(true);
                }}
              >
                <Icon name="key" size={16} color="#2196F3" />
                <Text style={styles.configureText}>Configure API Key</Text>
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.nativeSupport}>
              <Icon name="smartphone" size={16} color="#4CAF50" />
              <Text style={styles.nativeSupportText}>No API Key Required</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.selectButton, isActive && styles.selectedButton]}
            onPress={() => handleSelectModel(model)}
          >
            <Text style={[styles.selectButtonText, isActive && styles.selectedButtonText]}>
              {isActive ? 'Selected' : 'Select'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const stats = multiModelTranscriptionService.getModelStats();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Transcription Models</Text>
          <Text style={styles.subtitle}>
            Choose from {stats.total} models • {stats.configured} configured
          </Text>
        </View>

        <View style={styles.statsBar}>
          <View style={styles.stat}>
            <Icon name="cloud-off" size={20} color="#4CAF50" />
            <Text style={styles.statText}>Local Options</Text>
          </View>
          <View style={styles.stat}>
            <Icon name="card-giftcard" size={20} color="#2196F3" />
            <Text style={styles.statText}>Free Tiers Available</Text>
          </View>
          <View style={styles.stat}>
            <Icon name="bolt" size={20} color="#FF9800" />
            <Text style={styles.statText}>Ultra-Fast Options</Text>
          </View>
        </View>

        <View style={styles.filters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {getProviders().map(provider => (
              <TouchableOpacity
                key={provider}
                style={[
                  styles.filterChip,
                  filterProvider === provider && styles.filterChipActive,
                ]}
                onPress={() => setFilterProvider(provider)}
              >
                <Text style={[
                  styles.filterChipText,
                  filterProvider === provider && styles.filterChipTextActive,
                ]}>
                  {provider === 'all' ? 'All Providers' : provider}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.freeToggle, showOnlyFree && styles.freeToggleActive]}
            onPress={() => setShowOnlyFree(!showOnlyFree)}
          >
            <Icon 
              name={showOnlyFree ? 'check-box' : 'check-box-outline-blank'} 
              size={20} 
              color={showOnlyFree ? '#4CAF50' : '#666'} 
            />
            <Text style={styles.freeToggleText}>Free Options Only</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modelsList}>
          {getFilteredModels().map(renderModelCard)}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Quick Recommendations</Text>
          <View style={styles.recommendation}>
            <Icon name="flash-on" size={20} color="#FF9800" />
            <View style={styles.recommendationText}>
              <Text style={styles.recommendationTitle}>Fastest:</Text>
              <Text style={styles.recommendationDesc}>
                Groq models (200-300x real-time) - Best for quick transcripts
              </Text>
            </View>
          </View>
          <View style={styles.recommendation}>
            <Icon name="account-balance-wallet" size={20} color="#4CAF50" />
            <View style={styles.recommendationText}>
              <Text style={styles.recommendationTitle}>Best Free:</Text>
              <Text style={styles.recommendationDesc}>
                Gemini 2.5 Flash (25 req/day) or Groq (25MB free)
              </Text>
            </View>
          </View>
          <View style={styles.recommendation}>
            <Icon name="star" size={20} color="#2196F3" />
            <View style={styles.recommendationText}>
              <Text style={styles.recommendationTitle}>Best Overall:</Text>
              <Text style={styles.recommendationDesc}>
                Groq Whisper v3 Turbo - Speed + Accuracy + Price
              </Text>
            </View>
          </View>
          <View style={styles.recommendation}>
            <Icon name="lock" size={20} color="#9C27B0" />
            <View style={styles.recommendationText}>
              <Text style={styles.recommendationTitle}>Most Private:</Text>
              <Text style={styles.recommendationDesc}>
                Transformers.js - Runs 100% locally, no data leaves device
              </Text>
            </View>
          </View>
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
              <Text style={styles.modalTitle}>Configure {selectedModel?.name}</Text>
              <TouchableOpacity onPress={() => setShowApiModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedModel && (
              <>
                <Text style={styles.modalDescription}>
                  {selectedModel.apiKeyInstructions}
                </Text>

                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => {
                    if (selectedModel.apiKeyInstructions) {
                      const url = selectedModel.apiKeyInstructions.match(/https?:\/\/[^\s]+/)?.[0];
                      if (url) Linking.openURL(url);
                    }
                  }}
                >
                  <Icon name="open-in-new" size={18} color="#2196F3" />
                  <Text style={styles.linkButtonText}>Get API Key</Text>
                </TouchableOpacity>

                <TextInput
                  style={styles.apiInput}
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChangeText={setApiKey}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <View style={styles.modalInfo}>
                  <Icon name="info" size={16} color="#666" />
                  <Text style={styles.modalInfoText}>
                    Pricing: {selectedModel.pricing}
                    {selectedModel.freeQuota && ` • ${selectedModel.freeQuota}`}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveApiKey}
                >
                  <Text style={styles.saveButtonText}>Save & Activate</Text>
                </TouchableOpacity>
              </>
            )}
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: 'white',
    marginTop: 1,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filters: {
    padding: 15,
    backgroundColor: 'white',
    marginTop: 10,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: '#2196F3',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  freeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 5,
  },
  freeToggleActive: {
    opacity: 1,
  },
  freeToggleText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  modelsList: {
    padding: 15,
  },
  modelCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  activeCard: {
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  modelTitle: {
    flex: 1,
  },
  modelName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  activeName: {
    color: '#2196F3',
  },
  provider: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  featureText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  specs: {
    marginBottom: 12,
  },
  specText: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  configuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  configuredText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  configureButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  configureText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  nativeSupport: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nativeSupportText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  selectButton: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  selectedButton: {
    backgroundColor: '#2196F3',
  },
  selectButtonText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  selectedButtonText: {
    color: 'white',
  },
  infoSection: {
    margin: 15,
    padding: 15,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 15,
  },
  recommendation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationText: {
    flex: 1,
    marginLeft: 10,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  recommendationDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  modalDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
    lineHeight: 18,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    marginBottom: 15,
  },
  linkButtonText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  apiInput: {
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 10,
  },
  modalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    marginBottom: 15,
  },
  modalInfoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});