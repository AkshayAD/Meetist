import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { whisperModelService, WhisperModel } from '../services/WhisperModelService';
import { whisperTranscriptionService } from '../services/WhisperTranscriptionService';

export default function WhisperModelScreen() {
  const [models, setModels] = useState<WhisperModel[]>([]);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(new Map());
  const [refreshing, setRefreshing] = useState(false);
  const [storageInfo, setStorageInfo] = useState<any>(null);

  useEffect(() => {
    loadModels();
    loadStorageInfo();
  }, []);

  const loadModels = async () => {
    const availableModels = whisperModelService.getAvailableModels();
    setModels(availableModels);
    
    const activeModel = whisperModelService.getActiveModel();
    if (activeModel) {
      setActiveModelId(activeModel.id);
    }
  };

  const loadStorageInfo = async () => {
    const info = await whisperModelService.getStorageInfo();
    setStorageInfo(info);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadModels();
    await loadStorageInfo();
    setRefreshing(false);
  };

  const handleDownload = async (model: WhisperModel) => {
    if (downloadingModels.has(model.id)) return;

    Alert.alert(
      'Download Model',
      `Download ${model.name} (${model.size})? This will use mobile data if not on WiFi.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            setDownloadingModels(prev => new Set([...prev, model.id]));
            
            try {
              const success = await whisperModelService.downloadModel(
                model.id,
                (progress) => {
                  setDownloadProgress(prev => new Map(prev).set(model.id, progress));
                }
              );

              if (success) {
                Alert.alert('Success', `${model.name} downloaded successfully!`);
                await loadModels();
                await loadStorageInfo();
                
                // Auto-select if first model
                const downloadedModels = whisperModelService.getDownloadedModels();
                if (downloadedModels.length === 1) {
                  handleSelectModel(model);
                }
              } else {
                Alert.alert('Error', 'Failed to download model');
              }
            } catch (error) {
              Alert.alert('Error', `Failed to download: ${error.message}`);
            } finally {
              setDownloadingModels(prev => {
                const next = new Set(prev);
                next.delete(model.id);
                return next;
              });
              setDownloadProgress(prev => {
                const next = new Map(prev);
                next.delete(model.id);
                return next;
              });
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (model: WhisperModel) => {
    Alert.alert(
      'Delete Model',
      `Delete ${model.name}? This will free up ${model.size} of storage.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await whisperModelService.deleteModel(model.id);
            if (success) {
              Alert.alert('Success', `${model.name} deleted`);
              await loadModels();
              await loadStorageInfo();
              
              const newActiveModel = whisperModelService.getActiveModel();
              if (newActiveModel) {
                setActiveModelId(newActiveModel.id);
              } else {
                setActiveModelId(null);
              }
            } else {
              Alert.alert('Error', 'Failed to delete model');
            }
          },
        },
      ]
    );
  };

  const handleSelectModel = (model: WhisperModel) => {
    if (!model.downloaded) {
      Alert.alert('Model Not Downloaded', 'Please download this model first.');
      return;
    }

    const success = whisperModelService.setActiveModel(model.id);
    if (success) {
      whisperTranscriptionService.setModel(model.id);
      setActiveModelId(model.id);
      Alert.alert('Success', `${model.name} is now the active model`);
    } else {
      Alert.alert('Error', 'Failed to set active model');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const renderModel = (model: WhisperModel) => {
    const isDownloading = downloadingModels.has(model.id);
    const progress = downloadProgress.get(model.id) || 0;
    const isActive = activeModelId === model.id;

    return (
      <TouchableOpacity
        key={model.id}
        style={[styles.modelCard, isActive && styles.activeModelCard]}
        onPress={() => handleSelectModel(model)}
        disabled={!model.downloaded || isDownloading}
      >
        <View style={styles.modelHeader}>
          <View style={styles.modelInfo}>
            <Text style={[styles.modelName, isActive && styles.activeText]}>
              {model.name}
            </Text>
            {isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            )}
          </View>
          <Text style={styles.modelSize}>{model.size}</Text>
        </View>

        <Text style={styles.modelDescription}>{model.description}</Text>

        {isDownloading ? (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${progress * 100}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        ) : (
          <View style={styles.modelActions}>
            {model.downloaded ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.selectButton]}
                  onPress={() => handleSelectModel(model)}
                >
                  <Icon
                    name={isActive ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={20}
                    color="#4A90E2"
                  />
                  <Text style={styles.actionButtonText}>
                    {isActive ? 'Selected' : 'Select'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(model)}
                >
                  <Icon name="delete" size={20} color="#FF6B6B" />
                  <Text style={[styles.actionButtonText, { color: '#FF6B6B' }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.downloadButton]}
                onPress={() => handleDownload(model)}
              >
                <Icon name="download" size={20} color="#4A90E2" />
                <Text style={styles.actionButtonText}>Download</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Whisper Models</Text>
        <Text style={styles.subtitle}>
          Download and manage offline transcription models
        </Text>
      </View>

      {storageInfo && (
        <View style={styles.storageInfo}>
          <Icon name="storage" size={20} color="#666" />
          <Text style={styles.storageText}>
            Storage: {formatBytes(storageInfo.totalSize)} ({storageInfo.modelCount} models)
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.modelList}
        contentContainerStyle={styles.modelListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {models.map(renderModel)}
        
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About Whisper Models</Text>
          <Text style={styles.infoText}>
            • Smaller models are faster but less accurate{'\n'}
            • Q5 models are quantized versions (smaller, slightly less accurate){'\n'}
            • All transcription happens locally on your device{'\n'}
            • No internet required after download{'\n'}
            • Recommended: Base Q5 for balance, Small Q5 for better accuracy
          </Text>
        </View>
      </ScrollView>
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
  storageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFF9E6',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
  },
  storageText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  modelList: {
    flex: 1,
  },
  modelListContent: {
    padding: 15,
  },
  modelCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeModelCard: {
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modelName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  activeText: {
    color: '#4A90E2',
  },
  activeBadge: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 10,
  },
  activeBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modelSize: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  modelDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  modelActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  downloadButton: {
    backgroundColor: '#E8F4FF',
  },
  selectButton: {
    backgroundColor: '#E8F4FF',
  },
  deleteButton: {
    backgroundColor: '#FFE8E8',
  },
  actionButtonText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '500',
    color: '#4A90E2',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E1E8ED',
    borderRadius: 3,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
  },
  progressText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
    minWidth: 40,
  },
  infoSection: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
});