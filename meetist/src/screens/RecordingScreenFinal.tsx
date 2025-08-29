import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { addMeeting } from '../store/slices/meetingsSlice';
import { audioService } from '../services/AudioService';
import { whisperTranscriptionService } from '../services/WhisperTranscriptionService';
import { whisperModelService } from '../services/WhisperModelService';
import { multiModelTranscriptionService } from '../services/MultiModelTranscriptionService';
import { geminiService } from '../services/GeminiService';

export default function RecordingScreenFinal() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [currentModel, setCurrentModel] = useState<any>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [realtimeTranscript, setRealtimeTranscript] = useState('');
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setupAudio();
    loadModels();
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  const setupAudio = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      await whisperTranscriptionService.initialize();
    } catch (error) {
      Alert.alert('Permission Error', 'Please grant microphone permissions');
    }
  };

  const loadModels = () => {
    const models = whisperModelService.getDownloadedModels();
    setAvailableModels(models);
    
    const activeModel = whisperModelService.getActiveModel();
    if (activeModel) {
      setCurrentModel(activeModel);
    } else if (models.length === 0) {
      Alert.alert(
        'No Models Available',
        'Please download a Whisper model from Settings to enable transcription.',
        [
          { text: 'Go to Settings', onPress: () => navigation.navigate('Settings' as never) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const startRecording = async () => {
    try {
      if (!currentModel) {
        Alert.alert(
          'No Model Selected',
          'Please select a Whisper model first.',
          [
            { text: 'Select Model', onPress: () => setShowModelSelector(true) },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      const uri = await audioService.startRecording();
      if (uri) {
        setIsRecording(true);
        setIsPaused(false);
        setRecordingDuration(0);
        setRealtimeTranscript('');
        
        durationInterval.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      }
    } catch (error) {
      Alert.alert('Recording Error', 'Failed to start recording');
    }
  };

  const pauseRecording = async () => {
    try {
      await audioService.pauseRecording();
      setIsPaused(true);
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pause recording');
    }
  };

  const resumeRecording = async () => {
    try {
      await audioService.resumeRecording();
      setIsPaused(false);
      durationInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to resume recording');
    }
  };

  const stopRecording = async () => {
    try {
      const audioUri = await audioService.stopRecording();
      setIsRecording(false);
      setIsPaused(false);
      
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }

      if (audioUri) {
        await processRecording(audioUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const processRecording = async (audioUri: string) => {
    setIsProcessing(true);
    setTranscriptionProgress(0);

    try {
      // Transcribe with Whisper
      const transcriptionResult = await whisperTranscriptionService.transcribeAudio(
        audioUri,
        (progress) => setTranscriptionProgress(progress * 0.7) // 70% for transcription
      );

      setTranscriptionProgress(0.7);

      // Generate summary with Gemini
      let summary = '';
      let keyPoints: string[] = [];
      let actionItems: string[] = [];

      if (transcriptionResult.text && transcriptionResult.text.length > 50) {
        setTranscriptionProgress(0.8);
        
        const geminiResult = await geminiService.generateSummary(transcriptionResult.text);
        summary = geminiResult.summary;
        keyPoints = geminiResult.keyPoints;
        actionItems = geminiResult.actionItems;
        
        setTranscriptionProgress(1);
      }

      // Save meeting
      const meeting = {
        id: Date.now().toString(),
        title: `Meeting ${new Date().toLocaleDateString()}`,
        date: new Date().toISOString(),
        duration: recordingDuration,
        transcript: transcriptionResult.text,
        summary,
        keyPoints,
        actionItems,
        audioUri,
        modelUsed: currentModel.name,
      };

      dispatch(addMeeting(meeting));

      Alert.alert(
        'Recording Processed',
        'Your meeting has been transcribed and saved.',
        [
          {
            text: 'View Meeting',
            onPress: () => navigation.navigate('MeetingDetail' as never, { meetingId: meeting.id } as never),
          },
          { text: 'OK', style: 'default' },
        ]
      );
    } catch (error) {
      Alert.alert('Processing Error', error.message || 'Failed to process recording');
    } finally {
      setIsProcessing(false);
      setTranscriptionProgress(0);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const selectModel = (model: any) => {
    whisperModelService.setActiveModel(model.id);
    whisperTranscriptionService.setModel(model.id);
    setCurrentModel(model);
    setShowModelSelector(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Record Meeting</Text>
        <TouchableOpacity
          style={styles.modelSelector}
          onPress={() => setShowModelSelector(true)}
        >
          <Icon name="memory" size={20} color="#4A90E2" />
          <Text style={styles.modelText}>
            {currentModel ? currentModel.name : 'Select Model'}
          </Text>
          <Icon name="arrow-drop-down" size={20} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.processingText}>Processing Recording...</Text>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${transcriptionProgress * 100}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {transcriptionProgress < 0.7
                ? 'Transcribing with Whisper...'
                : transcriptionProgress < 1
                ? 'Generating insights with Gemini...'
                : 'Finalizing...'}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.visualizer}>
              {isRecording && !isPaused && (
                <View style={styles.waveform}>
                  {[...Array(20)].map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.wavebar,
                        { height: Math.random() * 80 + 20 },
                      ]}
                    />
                  ))}
                </View>
              )}
              
              <Text style={styles.duration}>{formatDuration(recordingDuration)}</Text>
              
              {isRecording && (
                <Text style={styles.status}>
                  {isPaused ? 'Paused' : 'Recording...'}
                </Text>
              )}
            </View>

            {realtimeTranscript !== '' && (
              <ScrollView style={styles.transcriptPreview}>
                <Text style={styles.transcriptText}>{realtimeTranscript}</Text>
              </ScrollView>
            )}

            <View style={styles.controls}>
              {!isRecording ? (
                <TouchableOpacity
                  style={styles.recordButton}
                  onPress={startRecording}
                >
                  <Icon name="mic" size={40} color="white" />
                </TouchableOpacity>
              ) : (
                <View style={styles.recordingControls}>
                  <TouchableOpacity
                    style={[styles.controlButton, styles.pauseButton]}
                    onPress={isPaused ? resumeRecording : pauseRecording}
                  >
                    <Icon
                      name={isPaused ? 'play-arrow' : 'pause'}
                      size={30}
                      color="white"
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.controlButton, styles.stopButton]}
                    onPress={stopRecording}
                  >
                    <Icon name="stop" size={30} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.tips}>
              <Text style={styles.tipTitle}>Recording Tips</Text>
              <Text style={styles.tipText}>
                • Speak clearly and at a moderate pace{'\n'}
                • Minimize background noise{'\n'}
                • {currentModel ? `Using ${currentModel.name} for transcription` : 'Select a Whisper model to start'}{'\n'}
                • Transcription happens locally on your device
              </Text>
            </View>
          </>
        )}
      </View>

      <Modal
        visible={showModelSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModelSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Whisper Model</Text>
              <TouchableOpacity onPress={() => setShowModelSelector(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {availableModels.length === 0 ? (
              <View style={styles.noModelsContainer}>
                <Icon name="cloud-download" size={48} color="#CCC" />
                <Text style={styles.noModelsText}>
                  No models downloaded yet
                </Text>
                <TouchableOpacity
                  style={styles.downloadModelsButton}
                  onPress={() => {
                    setShowModelSelector(false);
                    navigation.navigate('WhisperModels' as never);
                  }}
                >
                  <Text style={styles.downloadModelsText}>Download Models</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={styles.modelList}>
                {availableModels.map((model) => (
                  <TouchableOpacity
                    key={model.id}
                    style={[
                      styles.modelItem,
                      currentModel?.id === model.id && styles.selectedModel,
                    ]}
                    onPress={() => selectModel(model)}
                  >
                    <View>
                      <Text style={styles.modelName}>{model.name}</Text>
                      <Text style={styles.modelDescription}>{model.description}</Text>
                    </View>
                    {currentModel?.id === model.id && (
                      <Icon name="check-circle" size={24} color="#4A90E2" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  modelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    padding: 10,
    borderRadius: 8,
  },
  modelText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#4A90E2',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  visualizer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 100,
    marginBottom: 20,
  },
  wavebar: {
    width: 4,
    backgroundColor: '#4A90E2',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  duration: {
    fontSize: 48,
    fontWeight: '200',
    color: '#2C3E50',
    marginBottom: 10,
  },
  status: {
    fontSize: 18,
    color: '#7F8C8D',
  },
  transcriptPreview: {
    maxHeight: 150,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginVertical: 20,
  },
  transcriptText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  controls: {
    alignItems: 'center',
    marginBottom: 30,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordingControls: {
    flexDirection: 'row',
    gap: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  pauseButton: {
    backgroundColor: '#FFA500',
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
  },
  tips: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    fontSize: 18,
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 30,
  },
  progressBar: {
    width: '80%',
    height: 6,
    backgroundColor: '#E1E8ED',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
  },
  progressText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 10,
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
  },
  modelList: {
    padding: 20,
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#F5F7FA',
  },
  selectedModel: {
    backgroundColor: '#E8F4FF',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  modelName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
  },
  modelDescription: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  noModelsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noModelsText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 15,
    marginBottom: 20,
  },
  downloadModelsButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  downloadModelsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});