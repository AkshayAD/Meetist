import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { addMeeting } from '../store/slices/meetingsSlice';
import RealTranscriptionService, { 
  TranscriptionProgress, 
  TranscriptionResult,
  TRANSCRIPTION_MODELS 
} from '../services/RealTranscriptionService';
import { Meeting } from '../types';
import { SimpleAudioWaveform } from '../components/AudioWaveform';

export default function RecordingScreenReal() {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState<TranscriptionProgress | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const meteringInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load selected model
    const model = RealTranscriptionService.getSelectedModel();
    setSelectedModel(model);
    
    // Set up progress callback
    RealTranscriptionService.setProgressCallback((progress) => {
      setTranscriptionProgress(progress);
    });

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      if (meteringInterval.current) {
        clearInterval(meteringInterval.current);
      }
    };
  }, []);

  const requestPermissions = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant microphone permission to record audio.');
      return false;
    }
    return true;
  };

  const startRecording = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording with metering enabled
      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });

      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      setAudioUri(null);
      setTranscriptionResult(null);

      // Start duration timer
      durationInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Start audio metering for waveform
      meteringInterval.current = setInterval(async () => {
        if (recording) {
          const status = await recording.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
            // Normalize the metering value (typically ranges from -160 to 0 dB)
            const normalizedLevel = Math.max(0, (status.metering + 160) / 160);
            setAudioLevel(normalizedLevel);
          }
        }
      }, 100);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      if (meteringInterval.current) {
        clearInterval(meteringInterval.current);
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioLevel(0);
      
      setRecording(null);
      setIsRecording(false);
      
      if (uri) {
        setAudioUri(uri);
        // Automatically start transcription
        await transcribeAudio(uri);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    }
  };

  const importAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        setAudioUri(file.uri);
        setTranscriptionResult(null);
        
        // Automatically start transcription
        await transcribeAudio(file.uri);
      }
    } catch (error) {
      console.error('Failed to import audio file:', error);
      Alert.alert('Error', 'Failed to import audio file. Please try again.');
    }
  };

  const transcribeAudio = async (uri: string) => {
    if (!RealTranscriptionService.isModelConfigured(selectedModel)) {
      Alert.alert(
        'Configuration Required',
        'Please configure an API key for the selected model in Settings > Transcription Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Go to Settings', 
            onPress: () => navigation.navigate('TranscriptionSettings' as any)
          }
        ]
      );
      return;
    }

    setIsTranscribing(true);
    setTranscriptionProgress(null);

    try {
      const result = await RealTranscriptionService.transcribe(uri, selectedModel);
      setTranscriptionResult(result);
      
      // Save the meeting
      await saveMeeting(uri, result);
    } catch (error: any) {
      console.error('Transcription failed:', error);
      Alert.alert('Transcription Failed', error.message || 'An error occurred during transcription.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const saveMeeting = async (audioUri: string, transcription: TranscriptionResult) => {
    try {
      const meeting: Omit<Meeting, 'id'> = {
        title: `Meeting ${new Date().toLocaleDateString()}`,
        date: new Date().toISOString(),
        duration: recordingDuration || 0,
        audioPath: audioUri,
        transcription: {
          text: transcription.text,
          segments: transcription.segments || [],
        },
        tags: [],
        participants: [],
        summary: '',
        keyPoints: [],
        actionItems: [],
      };

      await dispatch(addMeeting(meeting)).unwrap();
      
      Alert.alert(
        'Success',
        'Meeting saved successfully!',
        [
          { text: 'View Meeting', onPress: () => navigation.navigate('Meetings' as any) },
          { text: 'New Recording', onPress: () => resetRecording() }
        ]
      );
    } catch (error) {
      console.error('Failed to save meeting:', error);
      Alert.alert('Error', 'Failed to save meeting. Please try again.');
    }
  };

  const resetRecording = () => {
    setAudioUri(null);
    setTranscriptionResult(null);
    setTranscriptionProgress(null);
    setRecordingDuration(0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getModelDisplayName = () => {
    const model = TRANSCRIPTION_MODELS.find(m => m.id === selectedModel);
    return model?.name || 'Select Model';
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Record Meeting</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('TranscriptionSettings' as any)}
          style={styles.settingsButton}
        >
          <Ionicons name="settings" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Model Selection */}
      <View style={styles.modelSection}>
        <Text style={styles.modelLabel}>Transcription Model:</Text>
        <TouchableOpacity 
          style={styles.modelPicker}
          onPress={() => setShowModelPicker(true)}
        >
          <Text style={styles.modelPickerText}>{getModelDisplayName()}</Text>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Audio Waveform Visualization */}
      <View style={styles.waveformSection}>
        <SimpleAudioWaveform
          isRecording={isRecording}
          audioLevel={audioLevel}
          duration={recordingDuration}
          color="#FF3B30"
          backgroundColor="#FFF5F5"
          height={120}
          showTimer={true}
        />
      </View>

      {/* Recording Controls */}
      <View style={styles.recordingSection}>
        {isRecording ? (
          <>
            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
              <Ionicons name="stop-circle" size={80} color="#FF3B30" />
            </TouchableOpacity>
            <Text style={styles.recordingStatusText}>Recording in progress...</Text>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
              <Ionicons name="mic-circle" size={80} color="#FF3B30" />
            </TouchableOpacity>
            <Text style={styles.recordText}>Tap to Record</Text>
          </>
        )}
      </View>

      {/* Import Audio Option */}
      {!isRecording && !audioUri && (
        <View style={styles.importSection}>
          <Text style={styles.orText}>OR</Text>
          <TouchableOpacity style={styles.importButton} onPress={importAudioFile}>
            <Ionicons name="folder-open" size={24} color="white" />
            <Text style={styles.importButtonText}>Import Audio File</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Audio File Info */}
      {audioUri && !isRecording && (
        <View style={styles.audioInfo}>
          <Ionicons name="musical-note" size={24} color="#007AFF" />
          <Text style={styles.audioPath} numberOfLines={2}>
            {audioUri.split('/').pop()}
          </Text>
          {!isTranscribing && !transcriptionResult && (
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => transcribeAudio(audioUri)}
            >
              <Ionicons name="refresh" size={20} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Transcription Progress */}
      {isTranscribing && transcriptionProgress && (
        <View style={styles.progressSection}>
          <Text style={styles.progressTitle}>Transcribing...</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${transcriptionProgress.progress}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressMessage}>{transcriptionProgress.message}</Text>
        </View>
      )}

      {/* Transcription Result */}
      {transcriptionResult && (
        <View style={styles.resultSection}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>Transcription</Text>
            <View style={styles.resultMeta}>
              <Text style={styles.resultModel}>{transcriptionResult.model}</Text>
              <Text style={styles.resultTime}>
                {(transcriptionResult.processingTime / 1000).toFixed(1)}s
              </Text>
            </View>
          </View>
          
          <ScrollView style={styles.transcriptionContainer} nestedScrollEnabled>
            <Text style={styles.transcriptionText}>
              {transcriptionResult.text}
            </Text>
          </ScrollView>

          {transcriptionResult.segments && transcriptionResult.segments.length > 0 && (
            <TouchableOpacity 
              style={styles.segmentsButton}
              onPress={() => Alert.alert(
                'Segments',
                `Found ${transcriptionResult.segments?.length} segments with timestamps`
              )}
            >
              <Ionicons name="time" size={20} color="#007AFF" />
              <Text style={styles.segmentsButtonText}>
                View {transcriptionResult.segments.length} Segments
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Model Picker Modal */}
      <Modal
        visible={showModelPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModelPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Transcription Model</Text>
              <TouchableOpacity onPress={() => setShowModelPicker(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modelList}>
              {TRANSCRIPTION_MODELS.filter(m => m.isAvailable).map(model => (
                <TouchableOpacity
                  key={model.id}
                  style={[
                    styles.modelOption,
                    selectedModel === model.id && styles.selectedModelOption,
                    !RealTranscriptionService.isModelConfigured(model.id) && styles.unconfiguredModelOption
                  ]}
                  onPress={() => {
                    if (RealTranscriptionService.isModelConfigured(model.id)) {
                      setSelectedModel(model.id);
                      RealTranscriptionService.setSelectedModel(model.id);
                      setShowModelPicker(false);
                    } else {
                      Alert.alert(
                        'Configuration Required',
                        `Please add an API key for ${model.name} in Settings.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Go to Settings',
                            onPress: () => {
                              setShowModelPicker(false);
                              navigation.navigate('TranscriptionSettings' as any);
                            }
                          }
                        ]
                      );
                    }
                  }}
                >
                  <View style={styles.modelOptionContent}>
                    <Text style={[
                      styles.modelOptionName,
                      !RealTranscriptionService.isModelConfigured(model.id) && styles.unconfiguredText
                    ]}>
                      {model.name}
                    </Text>
                    <Text style={[
                      styles.modelOptionDescription,
                      !RealTranscriptionService.isModelConfigured(model.id) && styles.unconfiguredText
                    ]}>
                      {model.description}
                    </Text>
                    {!RealTranscriptionService.isModelConfigured(model.id) && (
                      <Text style={styles.configureText}>Tap to configure</Text>
                    )}
                  </View>
                  {selectedModel === model.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  settingsButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modelSection: {
    padding: 16,
    backgroundColor: 'white',
    marginTop: 8,
  },
  modelLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  modelPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
  },
  modelPickerText: {
    fontSize: 16,
    color: '#333',
  },
  waveformSection: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recordingSection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'white',
    marginTop: 8,
  },
  recordingStatusText: {
    fontSize: 16,
    color: '#FF3B30',
    marginTop: 12,
    fontWeight: '500',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 18,
    color: '#FF3B30',
    fontWeight: '600',
  },
  duration: {
    fontSize: 48,
    fontWeight: '200',
    color: '#333',
    marginBottom: 24,
  },
  recordButton: {
    marginBottom: 16,
  },
  stopButton: {
    marginTop: 16,
  },
  recordText: {
    fontSize: 16,
    color: '#666',
  },
  importSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
    marginTop: 8,
  },
  orText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  importButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  audioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#E3F2FD',
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    gap: 12,
  },
  audioPath: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
  },
  retryButton: {
    padding: 4,
  },
  progressSection: {
    padding: 16,
    backgroundColor: 'white',
    marginTop: 8,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  progressMessage: {
    fontSize: 14,
    color: '#666',
  },
  resultSection: {
    padding: 16,
    backgroundColor: 'white',
    marginTop: 8,
    marginBottom: 24,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  resultMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  resultModel: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  resultTime: {
    fontSize: 12,
    color: '#666',
  },
  transcriptionContainer: {
    maxHeight: 300,
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  transcriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  segmentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
    gap: 8,
  },
  segmentsButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modelList: {
    padding: 16,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
  },
  selectedModelOption: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  unconfiguredModelOption: {
    opacity: 0.7,
  },
  modelOptionContent: {
    flex: 1,
  },
  modelOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  modelOptionDescription: {
    fontSize: 13,
    color: '#666',
  },
  unconfiguredText: {
    color: '#999',
  },
  configureText: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 4,
    fontStyle: 'italic',
  },
});