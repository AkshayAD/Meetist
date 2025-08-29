import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WhisperService, { WHISPER_MODELS } from '../services/WhisperService';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function ModelDownloadScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [models, setModels] = useState<Array<{
    name: string;
    size: number;
    isDownloaded: boolean;
  }>>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    const availableModels = await WhisperService.getAvailableModels();
    setModels(availableModels);
    setLoading(false);
  };

  const handleDownload = async (modelName: 'tiny' | 'base') => {
    setDownloading(modelName);
    setDownloadProgress(0);

    const success = await WhisperService.downloadModel(
      modelName,
      (progress) => setDownloadProgress(progress)
    );

    if (success) {
      Alert.alert('Success', `${modelName} model downloaded successfully!`);
      await loadModels();
    } else {
      Alert.alert('Error', 'Failed to download model. Please try again.');
    }

    setDownloading(null);
    setDownloadProgress(0);
  };

  const handleDelete = async (modelName: 'tiny' | 'base') => {
    Alert.alert(
      'Delete Model',
      `Are you sure you want to delete the ${modelName} model?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await WhisperService.deleteModel(modelName);
            await loadModels();
          },
        },
      ]
    );
  };

  const getModelDescription = (name: string) => {
    switch (name) {
      case 'tiny':
        return 'Fastest, lowest accuracy. Good for quick transcriptions.';
      case 'base':
        return 'Balanced speed and accuracy. Recommended for most uses.';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  const hasDownloadedModel = models.some(m => m.isDownloaded);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="cube-outline" size={48} color="#2196F3" />
        <Text style={styles.title}>Whisper Models</Text>
        <Text style={styles.subtitle}>
          Download a model to enable offline transcription
        </Text>
      </View>

      {!hasDownloadedModel && (
        <View style={styles.warningCard}>
          <Ionicons name="warning" size={24} color="#FF9800" />
          <Text style={styles.warningText}>
            No model downloaded. Transcription won't work without a model.
          </Text>
        </View>
      )}

      <View style={styles.modelsContainer}>
        {models.map((model) => (
          <View key={model.name} style={styles.modelCard}>
            <View style={styles.modelInfo}>
              <View style={styles.modelHeader}>
                <Text style={styles.modelName}>
                  {model.name.charAt(0).toUpperCase() + model.name.slice(1)} Model
                </Text>
                {model.isDownloaded && (
                  <View style={styles.downloadedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.downloadedText}>Downloaded</Text>
                  </View>
                )}
              </View>
              <Text style={styles.modelSize}>{model.size} MB</Text>
              <Text style={styles.modelDescription}>
                {getModelDescription(model.name)}
              </Text>
            </View>

            <View style={styles.modelActions}>
              {model.isDownloaded ? (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(model.name as 'tiny' | 'base')}
                >
                  <Ionicons name="trash-outline" size={20} color="#f44336" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => handleDownload(model.name as 'tiny' | 'base')}
                  disabled={downloading !== null}
                >
                  {downloading === model.name ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.downloadButtonText}>
                        {Math.round(downloadProgress * 100)}%
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={20} color="#fff" />
                      <Text style={styles.downloadButtonText}>Download</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {downloading === model.name && (
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${downloadProgress * 100}%` },
                  ]}
                />
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>About Whisper Models</Text>
        <Text style={styles.infoText}>
          • Models run entirely on your device{'\n'}
          • No internet required for transcription{'\n'}
          • Audio never leaves your device{'\n'}
          • Supports English language{'\n'}
          • Download once, use forever
        </Text>
      </View>

      {hasDownloadedModel && (
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
  },
  modelsContainer: {
    padding: 16,
  },
  modelCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modelInfo: {
    marginBottom: 12,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modelName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  downloadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  downloadedText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  modelSize: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  modelDescription: {
    fontSize: 12,
    color: '#999',
  },
  modelActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#f44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  deleteButtonText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E3F2FD',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
  },
  infoSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2196F3',
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});