import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { loadMeetings } from '../store/slices/meetingsSlice';
import { RootStackParamList } from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { meetings } = useSelector((state: RootState) => state.meetings);

  useEffect(() => {
    dispatch(loadMeetings());
  }, [dispatch]);

  const recentMeetings = meetings.slice(0, 5);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const meetingDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - meetingDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return meetingDate.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="mic" size={24} color="#2196F3" />
            <Text style={styles.statNumber}>{meetings.length}</Text>
            <Text style={styles.statLabel}>Total Meetings</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>
              {Math.floor(
                meetings.reduce((acc, m) => acc + m.duration, 0) / 60
              )}
            </Text>
            <Text style={styles.statLabel}>Minutes Recorded</Text>
          </View>
        </View>

        {/* Recent Meetings */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Recent Meetings</Text>
          {recentMeetings.length > 0 ? (
            <FlatList
              data={recentMeetings}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.meetingCard}
                  onPress={() =>
                    navigation.navigate('MeetingDetail', { meetingId: item.id })
                  }
                >
                  <View style={styles.meetingInfo}>
                    <Text style={styles.meetingTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={styles.meetingMeta}>
                      <Text style={styles.meetingDate}>
                        {formatDate(item.date)}
                      </Text>
                      <Text style={styles.meetingDuration}>
                        {formatDuration(item.duration)}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No meetings yet</Text>
              <Text style={styles.emptySubtext}>
                Tap the record button to start
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Recording')}
      >
        <Ionicons name="mic" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sectionContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  meetingCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  meetingInfo: {
    flex: 1,
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  meetingMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  meetingDate: {
    fontSize: 12,
    color: '#666',
  },
  meetingDuration: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
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