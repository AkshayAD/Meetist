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
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp, StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { loadMeeting, deleteMeeting } from '../store/slices/meetingsSlice';
import { RootStackParamList } from '../types';
import AudioService from '../services/AudioService';
import MeetingSummaryTab from '../components/MeetingSummaryTab';
import MeetingSummaryService from '../services/MeetingSummaryService';
import RealTranscriptionService from '../services/RealTranscriptionService';
import * as FileSystem from 'expo-file-system';

type Props = StackScreenProps<RootStackParamList, 'MeetingDetail'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'MeetingDetail'>;

const { width: screenWidth } = Dimensions.get('window');

export default function MeetingDetailScreenEnhanced() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  
  const { meetingId } = route.params;
  const { currentMeeting, isLoading } = useSelector(
    (state: RootState) => state.meetings
  );

  const [activeTab, setActiveTab] = useState<'transcript' | 'summary'>('transcript');
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);

  useEffect(() => {
    dispatch(loadMeeting(meetingId));
    checkApiKeyConfiguration();
  }, [dispatch, meetingId]);

  const checkApiKeyConfiguration = async () => {
    // Check if Gemini API key is configured for summary
    const geminiKey = RealTranscriptionService.getApiKey('gemini');
    const summaryKey = MeetingSummaryService.getApiKey();
    setApiKeyConfigured(!!(geminiKey || summaryKey));
  };

  const formatDate = (date: Date | string): string => {
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

  const handleShare = async () => {
    if (!currentMeeting) return;

    try {
      const transcriptContent = `
Meeting: ${currentMeeting.title}
Date: ${formatDate(currentMeeting.date)}
Duration: ${formatDuration(currentMeeting.duration)}

Transcript:
${currentMeeting.transcription.text}

${currentMeeting.tags.length > 0 ? `Tags: ${currentMeeting.tags.join(', ')}` : ''}
      `.trim();

      await Share.share({
        message: transcriptContent,
        title: currentMeeting.title,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share meeting');
    }
  };

  const handleExport = async () => {
    if (!currentMeeting) return;

    try {
      const fileName = `${currentMeeting.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.txt`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      const content = `
Meeting: ${currentMeeting.title}
Date: ${formatDate(currentMeeting.date)}
Duration: ${formatDuration(currentMeeting.duration)}
${currentMeeting.participants.length > 0 ? `Participants: ${currentMeeting.participants.join(', ')}` : ''}
${currentMeeting.tags.length > 0 ? `Tags: ${currentMeeting.tags.join(', ')}` : ''}

===============================================
TRANSCRIPT
===============================================

${currentMeeting.transcription.text}

${currentMeeting.transcription.segments && currentMeeting.transcription.segments.length > 0 ? `
===============================================
SEGMENTS
===============================================

${currentMeeting.transcription.segments.map((segment, index) => 
  `[${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}]\n${segment.text}`
).join('\n\n')}` : ''}
      `.trim();

      await FileSystem.writeAsStringAsync(filePath, content);
      
      Alert.alert(
        'Export Successful',
        `Meeting transcript exported to: ${fileName}`,
        [
          {
            text: 'Share',
            onPress: () => Share.share({ url: filePath, title: fileName }),
          },
          { text: 'OK' },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export meeting transcript');
    }
  };

  const TabButton = ({ 
    title, 
    isActive, 
    onPress, 
    icon 
  }: { 
    title: string; 
    isActive: boolean; 
    onPress: () => void; 
    icon: string;
  }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.activeTabButton]}
      onPress={onPress}
    >
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={isActive ? '#007AFF' : '#8E8E93'} 
      />
      <Text style={[styles.tabButtonText, isActive && styles.activeTabButtonText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading || !currentMeeting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{currentMeeting.title}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerAction}>
            <Ionicons name="share-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerAction}>
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Meeting Info */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar" size={16} color="#8E8E93" />
            <Text style={styles.infoText}>{formatDate(currentMeeting.date)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="time" size={16} color="#8E8E93" />
            <Text style={styles.infoText}>{formatDuration(currentMeeting.duration)}</Text>
          </View>
        </View>
        
        {/* Audio Player */}
        <View style={styles.audioPlayer}>
          <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
            <Ionicons 
              name={isPlaying ? 'pause-circle' : 'play-circle'} 
              size={48} 
              color="#007AFF" 
            />
          </TouchableOpacity>
          <View style={styles.audioInfo}>
            <Text style={styles.audioTitle}>Audio Recording</Text>
            <Text style={styles.audioSubtitle}>Tap to {isPlaying ? 'pause' : 'play'}</Text>
          </View>
          <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
            <Ionicons name="download-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TabButton
          title="Transcript"
          isActive={activeTab === 'transcript'}
          onPress={() => setActiveTab('transcript')}
          icon="document-text"
        />
        <TabButton
          title="AI Summary"
          isActive={activeTab === 'summary'}
          onPress={() => setActiveTab('summary')}
          icon="sparkles"
        />
      </View>

      {/* Tab Content */}
      {activeTab === 'transcript' ? (
        <ScrollView style={styles.tabContent}>
          <View style={styles.transcriptContainer}>
            {currentMeeting.transcription.segments && currentMeeting.transcription.segments.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Transcript with Timestamps</Text>
                {currentMeeting.transcription.segments.map((segment, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.segmentCard,
                      selectedSegment === index && styles.selectedSegment,
                    ]}
                    onPress={() => setSelectedSegment(index)}
                  >
                    <View style={styles.segmentHeader}>
                      <Text style={styles.segmentTime}>
                        {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                      </Text>
                      {segment.speaker && (
                        <Text style={styles.segmentSpeaker}>{segment.speaker}</Text>
                      )}
                    </View>
                    <Text style={styles.segmentText}>{segment.text}</Text>
                    {segment.confidence && (
                      <View style={styles.confidenceBar}>
                        <View 
                          style={[
                            styles.confidenceFill,
                            { width: `${segment.confidence * 100}%` }
                          ]} 
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Full Transcript</Text>
                <View style={styles.fullTranscriptCard}>
                  <Text style={styles.transcriptText}>
                    {currentMeeting.transcription.text}
                  </Text>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.tabContent}>
          {apiKeyConfigured ? (
            <MeetingSummaryTab meeting={currentMeeting} />
          ) : (
            <View style={styles.apiKeyPrompt}>
              <Ionicons name="key-outline" size={64} color="#C7C7CC" />
              <Text style={styles.apiKeyPromptTitle}>API Key Required</Text>
              <Text style={styles.apiKeyPromptText}>
                To generate AI summaries, please configure your Gemini API key in settings.
              </Text>
              <TouchableOpacity 
                style={styles.configureButton}
                onPress={() => navigation.navigate('TranscriptionSettings' as any)}
              >
                <Text style={styles.configureButtonText}>Configure API Key</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 12,
    color: '#000',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerAction: {
    padding: 4,
  },
  infoCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
  },
  audioPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  playButton: {
    marginRight: 12,
  },
  audioInfo: {
    flex: 1,
  },
  audioTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  audioSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  exportButton: {
    padding: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#007AFF',
  },
  tabButtonText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: '#007AFF',
  },
  tabContent: {
    flex: 1,
  },
  transcriptContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  segmentCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  selectedSegment: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  segmentTime: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  segmentSpeaker: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  segmentText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  confidenceBar: {
    height: 2,
    backgroundColor: '#E5E5EA',
    borderRadius: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  fullTranscriptCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
  },
  transcriptText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
  },
  apiKeyPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  apiKeyPromptTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  apiKeyPromptText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  configureButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  configureButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});