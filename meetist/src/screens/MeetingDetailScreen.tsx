import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp, StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { loadMeeting, deleteMeeting } from '../store/slices/meetingsSlice';
import { RootStackParamList } from '../types';
import AudioService from '../services/AudioService';
import * as FileSystem from 'expo-file-system';

type Props = StackScreenProps<RootStackParamList, 'MeetingDetail'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'MeetingDetail'>;

export default function MeetingDetailScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  
  const { meetingId } = route.params;
  const { currentMeeting, isLoading } = useSelector(
    (state: RootState) => state.meetings
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);

  useEffect(() => {
    dispatch(loadMeeting(meetingId));
  }, [dispatch, meetingId]);

  const formatDate = (date: Date): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    if (!currentMeeting) return;

    if (isPlaying) {
      await AudioService.stopPlayback();
      setIsPlaying(false);
    } else {
      await AudioService.playAudio(currentMeeting.audioPath);
      setIsPlaying(true);
    }
  };

  const handleDelete = () => {
    if (!currentMeeting) return;

    Alert.alert(
      'Delete Meeting',
      `Are you sure you want to delete "${currentMeeting.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await AudioService.deleteAudioFile(currentMeeting.audioPath);
            await dispatch(deleteMeeting(currentMeeting.id));
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    if (!currentMeeting) return;

    try {
      const transcriptText = `Meeting: ${currentMeeting.title}
Date: ${formatDate(currentMeeting.date)}
Duration: ${formatDuration(currentMeeting.duration)}
Participants: ${currentMeeting.participants.join(', ') || 'N/A'}

Transcript:
${currentMeeting.transcription.text || 'No transcript available'}`;

      const fileName = `${currentMeeting.title.replace(/[^a-z0-9]/gi, '_')}_transcript.txt`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, transcriptText);
      
      await Share.share({
        message: transcriptText,
        title: `${currentMeeting.title} Transcript`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export transcript');
    }
  };

  const getTranscriptionStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'processing':
        return '#FF9800';
      case 'error':
        return '#f44336';
      default:
        return '#999';
    }
  };

  if (isLoading || !currentMeeting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Meeting Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{currentMeeting.title}</Text>
        <Text style={styles.date}>{formatDate(currentMeeting.date)}</Text>
        
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.metaText}>
              {formatDuration(currentMeeting.duration)}
            </Text>
          </View>
          
          {currentMeeting.participants.length > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={20} color="#666" />
              <Text style={styles.metaText}>
                {currentMeeting.participants.length} participants
              </Text>
            </View>
          )}
        </View>

        {currentMeeting.participants.length > 0 && (
          <View style={styles.participantsContainer}>
            <Text style={styles.sectionTitle}>Participants</Text>
            <Text style={styles.participantsList}>
              {currentMeeting.participants.join(', ')}
            </Text>
          </View>
        )}
      </View>

      {/* Audio Player */}
      <View style={styles.playerContainer}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
        >
          <Ionicons
            name={isPlaying ? 'pause-circle' : 'play-circle'}
            size={64}
            color="#2196F3"
          />
        </TouchableOpacity>
        <Text style={styles.playerLabel}>
          {isPlaying ? 'Playing Audio' : 'Play Recording'}
        </Text>
      </View>

      {/* Transcription */}
      <View style={styles.transcriptionContainer}>
        <View style={styles.transcriptionHeader}>
          <Text style={styles.sectionTitle}>Transcript</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: getTranscriptionStatusColor(
                  currentMeeting.transcription.processingStatus
                ),
              },
            ]}
          >
            <Text style={styles.statusText}>
              {currentMeeting.transcription.processingStatus}
            </Text>
          </View>
        </View>

        {currentMeeting.transcription.processingStatus === 'completed' ? (
          currentMeeting.transcription.segments.length > 0 ? (
            <View style={styles.segmentsContainer}>
              {currentMeeting.transcription.segments.map((segment, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.segment,
                    selectedSegment === index && styles.selectedSegment,
                  ]}
                  onPress={() => setSelectedSegment(index)}
                >
                  <View style={styles.segmentHeader}>
                    <Text style={styles.segmentTime}>
                      {formatTime(segment.startTime)}
                    </Text>
                    {segment.speaker && (
                      <Text style={styles.segmentSpeaker}>{segment.speaker}</Text>
                    )}
                  </View>
                  <Text style={styles.segmentText}>{segment.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.transcriptText}>
              {currentMeeting.transcription.text || 'No transcript available'}
            </Text>
          )
        ) : currentMeeting.transcription.processingStatus === 'processing' ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="small" color="#FF9800" />
            <Text style={styles.processingText}>
              Transcription in progress...
            </Text>
          </View>
        ) : currentMeeting.transcription.processingStatus === 'pending' ? (
          <Text style={styles.pendingText}>
            Transcription will begin shortly
          </Text>
        ) : (
          <Text style={styles.errorText}>
            Transcription failed. Please try again later.
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleExport}>
          <Ionicons name="share-outline" size={24} color="#2196F3" />
          <Text style={styles.actionText}>Export</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={24} color="#f44336" />
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  participantsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  participantsList: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  playerContainer: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  playButton: {
    marginBottom: 8,
  },
  playerLabel: {
    fontSize: 14,
    color: '#666',
  },
  transcriptionContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 8,
    minHeight: 200,
  },
  transcriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  segmentsContainer: {
    gap: 12,
  },
  segment: {
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  selectedSegment: {
    borderLeftColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  segmentTime: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  segmentSpeaker: {
    fontSize: 12,
    color: '#666',
  },
  segmentText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  processingText: {
    fontSize: 14,
    color: '#FF9800',
  },
  pendingText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 14,
    color: '#f44336',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  deleteButton: {
    borderColor: '#f44336',
  },
  actionText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  deleteText: {
    color: '#f44336',
  },
});