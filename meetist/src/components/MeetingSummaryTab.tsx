import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MeetingSummaryService, { MeetingSummary } from '../services/MeetingSummaryService';
import { Meeting } from '../types';

interface MeetingSummaryTabProps {
  meeting: Meeting;
}

export default function MeetingSummaryTab({ meeting }: MeetingSummaryTabProps) {
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [progress, setProgress] = useState({ status: '', progress: 0 });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  useEffect(() => {
    loadSummary();
  }, [meeting.id]);

  const loadSummary = async (forceRegenerate = false) => {
    // Check cache first
    if (!forceRegenerate) {
      const cached = MeetingSummaryService.getCachedSummary(meeting.id);
      if (cached) {
        setSummary(cached);
        return;
      }
    }

    setIsLoading(true);
    setProgress({ status: 'Initializing...', progress: 0 });

    try {
      const newSummary = await MeetingSummaryService.generateSummary(
        meeting,
        (status, progress) => {
          setProgress({ status, progress });
        }
      );
      setSummary(newSummary);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate summary');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await MeetingSummaryService.regenerateSummary(meeting.id);
    await loadSummary(true);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#FF3B30';
      case 'medium': return '#FF9500';
      case 'low': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'decision': return 'checkmark-circle';
      case 'action': return 'flag';
      case 'milestone': return 'trophy';
      default: return 'radio-button-on';
    }
  };

  if (isLoading && !summary) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{progress.status}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress.progress}%` }]} />
        </View>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptyText}>No summary available</Text>
        <TouchableOpacity style={styles.generateButton} onPress={() => loadSummary()}>
          <Ionicons name="sparkles" size={20} color="white" />
          <Text style={styles.generateButtonText}>Generate Summary</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header Section */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Ionicons name="document-text" size={24} color="#007AFF" />
          <Text style={styles.headerTitle}>{summary.header.title}</Text>
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar" size={16} color="#8E8E93" />
            <Text style={styles.infoText}>{summary.header.date}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="time" size={16} color="#8E8E93" />
            <Text style={styles.infoText}>{summary.header.duration}</Text>
          </View>
          {summary.header.participantCount > 0 && (
            <View style={styles.infoItem}>
              <Ionicons name="people" size={16} color="#8E8E93" />
              <Text style={styles.infoText}>{summary.header.participantCount} participants</Text>
            </View>
          )}
        </View>
      </View>

      {/* Short Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Quick Summary</Text>
        <Text style={styles.summaryText}>{summary.shortSummary}</Text>
      </View>

      {/* Participants */}
      {summary.participants.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('participants')}
          >
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="people" size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Participants</Text>
            </View>
            <Ionicons 
              name={expandedSections.has('participants') ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color="#8E8E93" 
            />
          </TouchableOpacity>
          {expandedSections.has('participants') && (
            <View style={styles.participantsList}>
              {summary.participants.map((participant, index) => (
                <View key={index} style={styles.participantItem}>
                  <Ionicons name="person-circle" size={24} color="#007AFF" />
                  <Text style={styles.participantName}>{participant}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Structured Summary */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection('overview')}
        >
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="list" size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Detailed Overview</Text>
          </View>
          <Ionicons 
            name={expandedSections.has('overview') ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color="#8E8E93" 
          />
        </TouchableOpacity>
        {expandedSections.has('overview') && (
          <View style={styles.sectionContent}>
            <Text style={styles.overviewText}>{summary.structuredSummary.overview}</Text>
            
            {/* Main Topics */}
            {summary.structuredSummary.mainTopics.length > 0 && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Main Topics</Text>
                {summary.structuredSummary.mainTopics.map((topic, index) => (
                  <View key={index} style={styles.topicCard}>
                    <Text style={styles.topicTitle}>{topic.topic}</Text>
                    {topic.details.map((detail, idx) => (
                      <View key={idx} style={styles.detailItem}>
                        <Text style={styles.bulletPoint}>•</Text>
                        <Text style={styles.detailText}>{detail}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}

            {/* Decisions */}
            {summary.structuredSummary.decisions.length > 0 && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Decisions Made</Text>
                {summary.structuredSummary.decisions.map((decision, index) => (
                  <View key={index} style={styles.decisionItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                    <Text style={styles.decisionText}>{decision}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Action Items */}
      {summary.actionItems.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('actions')}
          >
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="checkbox" size={20} color="#FF3B30" />
              <Text style={styles.sectionTitle}>Action Items</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{summary.actionItems.length}</Text>
              </View>
            </View>
            <Ionicons 
              name={expandedSections.has('actions') ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color="#8E8E93" 
            />
          </TouchableOpacity>
          {expandedSections.has('actions') && (
            <View style={styles.sectionContent}>
              {summary.actionItems.map((item, index) => (
                <View key={index} style={styles.actionCard}>
                  <View style={styles.actionHeader}>
                    <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(item.priority) }]} />
                    <Text style={styles.actionTask}>{item.task}</Text>
                  </View>
                  <View style={styles.actionMeta}>
                    {item.assignee && (
                      <View style={styles.metaItem}>
                        <Ionicons name="person" size={14} color="#8E8E93" />
                        <Text style={styles.metaText}>{item.assignee}</Text>
                      </View>
                    )}
                    {item.deadline && (
                      <View style={styles.metaItem}>
                        <Ionicons name="calendar" size={14} color="#8E8E93" />
                        <Text style={styles.metaText}>{item.deadline}</Text>
                      </View>
                    )}
                    <View style={styles.metaItem}>
                      <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                        {item.priority.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Timeline */}
      {summary.timeline.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('timeline')}
          >
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="git-branch" size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Meeting Timeline</Text>
            </View>
            <Ionicons 
              name={expandedSections.has('timeline') ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color="#8E8E93" 
            />
          </TouchableOpacity>
          {expandedSections.has('timeline') && (
            <View style={styles.sectionContent}>
              {summary.timeline.map((event, index) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <Ionicons 
                      name={getTimelineIcon(event.type) as any} 
                      size={20} 
                      color="#007AFF" 
                    />
                    <View style={styles.timelineLine} />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTime}>{event.time}</Text>
                    <Text style={styles.timelineEvent}>{event.event}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Key Insights */}
      {summary.keyInsights.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('insights')}
          >
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="bulb" size={20} color="#FFD60A" />
              <Text style={styles.sectionTitle}>Key Insights</Text>
            </View>
            <Ionicons 
              name={expandedSections.has('insights') ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color="#8E8E93" 
            />
          </TouchableOpacity>
          {expandedSections.has('insights') && (
            <View style={styles.sectionContent}>
              {summary.keyInsights.map((insight, index) => (
                <View key={index} style={styles.insightCard}>
                  <Ionicons name="bulb-outline" size={16} color="#FFD60A" />
                  <Text style={styles.insightText}>{insight}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Next Steps */}
      {summary.nextSteps.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('nextSteps')}
          >
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="arrow-forward-circle" size={20} color="#34C759" />
              <Text style={styles.sectionTitle}>Next Steps</Text>
            </View>
            <Ionicons 
              name={expandedSections.has('nextSteps') ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color="#8E8E93" 
            />
          </TouchableOpacity>
          {expandedSections.has('nextSteps') && (
            <View style={styles.sectionContent}>
              {summary.nextSteps.map((step, index) => (
                <View key={index} style={styles.nextStepItem}>
                  <Text style={styles.nextStepNumber}>{index + 1}</Text>
                  <Text style={styles.nextStepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Generated with {summary.model} • {new Date(summary.generatedAt).toLocaleString()}
        </Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#8E8E93',
    marginTop: 12,
    marginBottom: 24,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  headerInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  summaryCard: {
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  badge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionContent: {
    padding: 16,
    paddingTop: 0,
  },
  participantsList: {
    padding: 16,
    paddingTop: 0,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  participantName: {
    fontSize: 15,
    color: '#333',
  },
  overviewText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 16,
  },
  subsection: {
    marginTop: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  topicCard: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  topicTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    paddingLeft: 8,
    marginBottom: 4,
  },
  bulletPoint: {
    color: '#007AFF',
    marginRight: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  decisionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  decisionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actionCard: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  actionTask: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  actionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 12,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E5EA',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  timelineEvent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFACD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  nextStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#34C759',
    color: 'white',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 14,
    fontWeight: '600',
  },
  nextStepText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#8E8E93',
  },
});