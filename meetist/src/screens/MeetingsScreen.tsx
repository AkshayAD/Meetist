import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import {
  loadMeetings,
  searchMeetings,
  deleteMeeting,
  setSearchQuery,
} from '../store/slices/meetingsSlice';
import { RootStackParamList, Meeting } from '../types';
import AudioService from '../services/AudioService';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function MeetingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { meetings, isLoading, searchQuery } = useSelector(
    (state: RootState) => state.meetings
  );
  const [refreshing, setRefreshing] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  useEffect(() => {
    dispatch(loadMeetings());
  }, [dispatch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await dispatch(loadMeetings());
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setLocalSearchQuery(query);
    dispatch(setSearchQuery(query));
    
    if (query.trim()) {
      dispatch(searchMeetings(query));
    } else {
      dispatch(loadMeetings());
    }
  };

  const handleDeleteMeeting = (meeting: Meeting) => {
    Alert.alert(
      'Delete Meeting',
      `Are you sure you want to delete "${meeting.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await AudioService.deleteAudioFile(meeting.audioPath);
            await dispatch(deleteMeeting(meeting.id));
            dispatch(loadMeetings());
          },
        },
      ]
    );
  };

  const formatDate = (date: Date): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  };

  const getTranscriptionStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: 'checkmark-circle', color: '#4CAF50' };
      case 'processing':
        return { icon: 'sync', color: '#FF9800' };
      case 'error':
        return { icon: 'alert-circle', color: '#f44336' };
      default:
        return { icon: 'time', color: '#999' };
    }
  };

  const renderMeetingItem = ({ item }: { item: Meeting }) => {
    const status = getTranscriptionStatus(item.transcription.processingStatus);
    
    return (
      <TouchableOpacity
        style={styles.meetingCard}
        onPress={() => navigation.navigate('MeetingDetail', { meetingId: item.id })}
        onLongPress={() => handleDeleteMeeting(item)}
      >
        <View style={styles.meetingHeader}>
          <Text style={styles.meetingTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Ionicons
            name={status.icon as any}
            size={20}
            color={status.color}
          />
        </View>
        
        <View style={styles.meetingInfo}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text style={styles.metaText}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.metaText}>{formatDuration(item.duration)}</Text>
          </View>
        </View>

        {item.participants.length > 0 && (
          <View style={styles.participantsRow}>
            <Ionicons name="people-outline" size={14} color="#666" />
            <Text style={styles.participantsText} numberOfLines={1}>
              {item.participants.join(', ')}
            </Text>
          </View>
        )}

        {item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="folder-open-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>
        {localSearchQuery ? 'No meetings found' : 'No meetings yet'}
      </Text>
      <Text style={styles.emptySubtext}>
        {localSearchQuery
          ? 'Try a different search term'
          : 'Record your first meeting to get started'}
      </Text>
      {!localSearchQuery && (
        <TouchableOpacity
          style={styles.recordButton}
          onPress={() => navigation.navigate('Recording')}
        >
          <Ionicons name="mic" size={20} color="#fff" />
          <Text style={styles.recordButtonText}>Record Meeting</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search meetings..."
            value={localSearchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {localSearchQuery ? (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Meetings List */}
      <FlatList
        data={meetings}
        keyExtractor={(item) => item.id}
        renderItem={renderMeetingItem}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={meetings.length === 0 ? styles.emptyListContainer : styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Recording')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  meetingCard: {
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
  meetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  meetingInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  participantsText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#2196F3',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});