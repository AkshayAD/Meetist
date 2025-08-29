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
import TranscriptionService from '../services/TranscriptionService';
import { Meeting, TranscriptionSegment } from '../types';
import { RootStackParamList } from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Recording'>;

export default function RecordingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { isRecording, isPaused, duration } = useSelector(
    (state: RootState) => state.recording
  );
  const { autoTranscribe } = useSelector((state: RootState) => state.settings);

  const [title, setTitle] = useState('');
  const [participants, setParticipants] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptionSegment[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    const success = await AudioService.startRecording();
    if (success) {
      dispatch(startRecording());
      
      // Start real-time transcription if enabled
      if (autoTranscribe) {
        setIsTranscribing(true);
        const transcriptionStarted = await TranscriptionService.startRealtimeTranscription(
          (text) => setLiveTranscript(text),
          (segments) => setTranscriptSegments(segments)
        );
        
        if (!transcriptionStarted) {
          console.log('Real-time transcription not available, will process after recording');
        }
      }
    } else {
      Alert.alert('Error', 'Failed to start recording. Please check permissions.');
    }
  };

  const handlePauseResume = async () => {
    if (isPaused) {
      await AudioService.resumeRecording();
      dispatch(resumeRecording());
      if (isTranscribing) {
        await TranscriptionService.startRealtimeTranscription(
          (text) => setLiveTranscript(text),
          (segments) => setTranscriptSegments(segments)
        );
      }
    } else {
      await AudioService.pauseRecording();
      dispatch(pauseRecording());
      if (isTranscribing) {
        await TranscriptionService.stopRealtimeTranscription();
      }
    }
  };

  const handleStopRecording = async () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a title for this meeting.');
      return;
    }

    setIsSaving(true);
    
    // Stop transcription
    let finalTranscript = liveTranscript;
    if (isTranscribing) {
      finalTranscript = await TranscriptionService.stopRealtimeTranscription();
      setIsTranscribing(false);
    }
    
    const audioUri = await AudioService.stopRecording();
    
    if (audioUri) {
      dispatch(stopRecording(audioUri));
      
      // Process transcript with Gemini if available
      let processedTranscript = finalTranscript;
      let insights = null;
      
      if (finalTranscript && autoTranscribe) {
        try {
          processedTranscript = await TranscriptionService.processWithGemini(
            finalTranscript,
            'transcribe'
          );
          
          insights = await TranscriptionService.getMeetingInsights(processedTranscript);
        } catch (error) {
          console.log('Gemini processing skipped:', error);
        }
      }
      
      // Create meeting object
      const meeting: Meeting = {
        id: `meeting_${Date.now()}`,
        title: title.trim(),
        date: new Date(),
        duration,
        audioPath: audioUri,
        transcription: {
          text: processedTranscript || '',
          segments: transcriptSegments,
          language: 'en',
          processingStatus: processedTranscript ? 'completed' : 'pending',
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
        `Your meeting has been saved${processedTranscript ? ' with transcript' : ''}.`,
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
    setLiveTranscript('');
    setTranscriptSegments([]);
  };

  const handleCancel = async () => {
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
              if (isTranscribing) {
                await TranscriptionService.stopRealtimeTranscription();
              }
              await AudioService.stopRecording();
              dispatch(resetRecording());
              setLiveTranscript('');
              setTranscriptSegments([]);
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
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
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

        {/* Live Transcript */}
        {isRecording && liveTranscript && (
          <View style={styles.transcriptContainer}>
            <View style={styles.transcriptHeader}>
              <Text style={styles.transcriptLabel}>Live Transcript</Text>
              {isTranscribing && (
                <View style={styles.transcribingIndicator}>
                  <ActivityIndicator size="small" color="#2196F3" />
                  <Text style={styles.transcribingText}>Listening...</Text>
                </View>
              )}
            </View>
            <ScrollView style={styles.transcriptScroll} nestedScrollEnabled>
              <Text style={styles.transcriptText}>{liveTranscript}</Text>
            </ScrollView>
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
              • Enter a title before starting the recording
            </Text>
            <Text style={styles.instructionText}>
              • {autoTranscribe ? 'Live transcription enabled' : 'Live transcription disabled (enable in Settings)'}
            </Text>
            <Text style={styles.instructionText}>
              • Maximum recording duration: 3 hours
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
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
  transcriptContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    maxHeight: 200,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transcriptLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  transcribingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transcribingText: {
    fontSize: 12,
    color: '#2196F3',
  },
  transcriptScroll: {
    maxHeight: 120,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
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
});