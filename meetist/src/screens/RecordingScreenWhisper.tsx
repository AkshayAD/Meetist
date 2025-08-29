import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import {
  startRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
  updateDuration,
  resetRecording,
} from '../store/slices/recordingSlice';
import { saveMeeting } from '../store/slices/meetingsSlice';
import AudioService from '../services/AudioService';
import TranscriptionServiceLocal from '../services/TranscriptionServiceLocal';
import { Meeting } from '../types';
import { RootStackParamList } from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Recording'>;

export default function RecordingScreenWhisper() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { isRecording, isPaused, duration } = useSelector(
    (state: RootState) => state.recording
  );
  const { autoTranscribe } = useSelector((state: RootState) => state.settings);

  const [title, setTitle] = useState('');
  const [participants, setParticipants] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [processingModalVisible, setProcessingModalVisible] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [modelReady, setModelReady] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkModelStatus();
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      intervalRef.current = setInterval(() => {
        dispatch(updateDuration(duration + 1));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording, isPaused, duration, dispatch]);

  const checkModelStatus = async () => {
    const ready = await TranscriptionServiceLocal.isReady();
    setModelReady(ready);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    // Check if model is ready when auto-transcribe is enabled
    if (autoTranscribe && !modelReady) {
      Alert.alert(
        'Whisper Model Required',
        'Please download a Whisper model first to enable transcription.',
        [
          {
            text: 'Download Model',
            onPress: () => navigation.navigate('ModelDownload' as any),
          },
          {
            text: 'Record Without Transcription',
            onPress: async () => {
              const success = await AudioService.startRecording();
              if (success) {
                dispatch(startRecording());
              } else {
                Alert.alert('Error', 'Failed to start recording. Please check permissions.');
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
      return;
    }

    const success = await AudioService.startRecording();
    if (success) {
      dispatch(startRecording());
    } else {
      Alert.alert('Error', 'Failed to start recording. Please check permissions.');
    }
  };

  const handlePauseResume = async () => {
    if (isPaused) {
      await AudioService.resumeRecording();
      dispatch(resumeRecording());
    } else {
      await AudioService.pauseRecording();
      dispatch(pauseRecording());
    }
  };

  const handleStopRecording = async () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a title for this meeting.');
      return;
    }

    setIsSaving(true);
    const audioUri = await AudioService.stopRecording();
    
    if (audioUri) {
      dispatch(stopRecording(audioUri));
      
      let transcriptionResult = null;
      let insights = null;
      
      // Process with Whisper if auto-transcribe is enabled and model is ready
      if (autoTranscribe && modelReady) {
        setProcessingModalVisible(true);
        setProcessingProgress(0);
        setProcessingStatus('Processing audio with Whisper...');
        
        try {
          const result = await TranscriptionServiceLocal.processRecording(
            audioUri,
            {
              generateInsights: true,
              onProgress: (progress, status) => {
                setProcessingProgress(progress);
                setProcessingStatus(status);
              },
            }
          );
          
          transcriptionResult = result.transcript;
          insights = result.insights;
          
          console.log(`Transcription completed in ${result.processingTime}s`);
        } catch (error) {
          console.error('Transcription failed:', error);
          Alert.alert(
            'Transcription Failed',
            'The recording was saved but transcription failed. You can try again later.'
          );
        }
        
        setProcessingModalVisible(false);
      }
      
      // Create meeting object
      const meeting: Meeting = {
        id: `meeting_${Date.now()}`,
        title: title.trim(),
        date: new Date(),
        duration,
        audioPath: audioUri,
        transcription: {
          text: transcriptionResult?.text || '',
          segments: transcriptionResult?.segments || [],
          language: 'en',
          processingStatus: transcriptionResult ? 'completed' : 'pending',
        },
        tags: insights?.keyPoints?.slice(0, 3) || [],
        participants: participants
          .split(',')
          .map(p => p.trim())
          .filter(p => p),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dispatch(saveMeeting(meeting)).unwrap();
      dispatch(resetRecording());
      
      Alert.alert(
        'Recording Saved',
        `Your meeting has been saved${transcriptionResult ? ' with transcript' : ''}.`,
        [
          {
            text: 'View Meeting',
            onPress: () => navigation.navigate('MeetingDetail', { meetingId: meeting.id }),
          },
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
            style: 'cancel',
          },
        ]
      );
    } else {
      Alert.alert('Error', 'Failed to save recording.');
    }
    
    setIsSaving(false);
  };

  const handleCancel = () => {
    if (isRecording) {
      Alert.alert(
        'Cancel Recording',
        'Are you sure you want to cancel this recording? All data will be lost.',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: async () => {
              await AudioService.stopRecording();
              dispatch(resetRecording());
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {/* Model Status */}
          {!modelReady && (
            <TouchableOpacity
              style={styles.modelWarning}
              onPress={() => navigation.navigate('ModelDownload' as any)}
            >
              <Ionicons name="warning" size={20} color="#FF9800" />
              <Text style={styles.modelWarningText}>
                Whisper model not loaded. Tap to download.
              </Text>
            </TouchableOpacity>
          )}

          {/* Timer Display */}
          <View style={styles.timerContainer}>
            <Text style={styles.timer}>{formatTime(duration)}</Text>
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={[styles.recordingDot, isPaused && styles.pausedDot]} />
                <Text style={styles.recordingText}>
                  {isPaused ? 'Paused' : 'Recording'}
                </Text>
              </View>
            )}
          </View>

          {/* Meeting Info */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Meeting Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter meeting title"
              value={title}
              onChangeText={setTitle}
              editable={!isSaving}
            />

            <Text style={styles.label}>Participants</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter participant names (comma separated)"
              value={participants}
              onChangeText={setParticipants}
              multiline
              numberOfLines={3}
              editable={!isSaving}
            />
          </View>

          {/* Recording Info */}
          {isRecording && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Recording in Progress</Text>
              <Text style={styles.infoText}>
                Audio is being saved locally. Transcription will process after recording stops.
              </Text>
              {modelReady && autoTranscribe && (
                <View style={styles.modelInfo}>
                  <Ionicons name="cube" size={16} color="#2196F3" />
                  <Text style={styles.modelInfoText}>
                    Whisper {TranscriptionServiceLocal.getModelStatus().currentModel} model ready
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Recording Controls */}
          <View style={styles.controls}>
            {!isRecording ? (
              <TouchableOpacity
                style={styles.recordButton}
                onPress={handleStartRecording}
                disabled={isSaving}
              >
                <Ionicons name="mic" size={48} color="#fff" />
                <Text style={styles.recordButtonText}>Start Recording</Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.activeControls}>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={handlePauseResume}
                    disabled={isSaving}
                  >
                    <Ionicons
                      name={isPaused ? 'play' : 'pause'}
                      size={32}
                      color="#fff"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.controlButton, styles.stopButton]}
                    onPress={handleStopRecording}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Ionicons name="stop" size={32} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          {/* Instructions */}
          {!isRecording && (
            <View style={styles.instructions}>
              <Text style={styles.instructionText}>
                • Recording saves audio locally on device
              </Text>
              <Text style={styles.instructionText}>
                • {modelReady 
                  ? `Whisper ${TranscriptionServiceLocal.getModelStatus().currentModel} model loaded` 
                  : 'Download Whisper model for transcription'}
              </Text>
              <Text style={styles.instructionText}>
                • Transcription runs 100% offline
              </Text>
              <Text style={styles.instructionText}>
                • Gemini 2.5 Flash for optional AI insights
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Processing Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={processingModalVisible}
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="cube" size={48} color="#2196F3" />
            <Text style={styles.modalTitle}>Processing with Whisper</Text>
            <Text style={styles.modalStatus}>{processingStatus}</Text>
            
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${processingProgress * 100}%` },
                ]}
              />
            </View>
            
            <Text style={styles.progressText}>
              {Math.round(processingProgress * 100)}%
            </Text>
            
            <Text style={styles.modalInfo}>
              Processing locally on your device...
            </Text>
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
  content: {
    padding: 20,
  },
  modelWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  modelWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  timer: {
    fontSize: 48,
    fontWeight: '200',
    color: '#333',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f44336',
    marginRight: 8,
  },
  pausedDot: {
    backgroundColor: '#ff9800',
  },
  recordingText: {
    fontSize: 16,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
  },
  modelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  modelInfoText: {
    fontSize: 12,
    color: '#1976D2',
  },
  controls: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 8,
  },
  activeControls: {
    flexDirection: 'row',
    gap: 20,
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  instructions: {
    marginTop: 30,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  modalStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
  },
  progressText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 8,
  },
  modalInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
});