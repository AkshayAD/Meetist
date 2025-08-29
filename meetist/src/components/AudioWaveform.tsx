import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { Canvas, Path, Skia, useFont } from '@shopify/react-native-skia';

interface AudioWaveformProps {
  isRecording: boolean;
  audioLevel?: number; // 0-1 normalized audio level
  color?: string;
  backgroundColor?: string;
  height?: number;
  showTimer?: boolean;
  duration?: number;
}

const WAVEFORM_SAMPLES = 50;
const UPDATE_INTERVAL = 100; // ms

export default function AudioWaveform({
  isRecording,
  audioLevel = 0,
  color = '#FF3B30',
  backgroundColor = '#F5F5F5',
  height = 100,
  showTimer = true,
  duration = 0,
}: AudioWaveformProps) {
  const [waveformData, setWaveformData] = useState<number[]>(
    new Array(WAVEFORM_SAMPLES).fill(0)
  );
  const animationRef = useRef<NodeJS.Timeout>();
  const { width } = Dimensions.get('window');

  useEffect(() => {
    if (isRecording) {
      // Start waveform animation
      animationRef.current = setInterval(() => {
        setWaveformData(prev => {
          const newData = [...prev];
          newData.shift();
          
          // Add new sample with some randomness for visual effect
          const baseLevel = audioLevel || Math.random() * 0.3;
          const variation = (Math.random() - 0.5) * 0.2;
          const newSample = Math.max(0, Math.min(1, baseLevel + variation));
          newData.push(newSample);
          
          return newData;
        });
      }, UPDATE_INTERVAL);
    } else {
      // Stop animation and gradually reduce levels
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
      
      // Smooth fade out
      const fadeOut = setInterval(() => {
        setWaveformData(prev => {
          const newData = prev.map(v => v * 0.9);
          if (Math.max(...newData) < 0.01) {
            clearInterval(fadeOut);
            return new Array(WAVEFORM_SAMPLES).fill(0);
          }
          return newData;
        });
      }, 50);
      
      return () => clearInterval(fadeOut);
    }

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isRecording, audioLevel]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Create path for waveform
  const createWaveformPath = () => {
    const path = Skia.Path.Make();
    const barWidth = width / WAVEFORM_SAMPLES;
    const centerY = height / 2;

    waveformData.forEach((value, index) => {
      const x = index * barWidth;
      const barHeight = value * (height * 0.8); // 80% of container height
      
      // Draw mirrored bars for symmetric waveform
      path.addRect({
        x: x,
        y: centerY - barHeight / 2,
        width: barWidth * 0.6,
        height: barHeight,
      });
    });

    return path;
  };

  return (
    <View style={[styles.container, { height, backgroundColor }]}>
      <Canvas style={StyleSheet.absoluteFillObject}>
        <Path path={createWaveformPath()} color={color} style="fill" />
      </Canvas>
      
      {showTimer && (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatDuration(duration)}</Text>
        </View>
      )}
      
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={[styles.recordingDot, { backgroundColor: color }]} />
          <Text style={styles.recordingText}>Recording</Text>
        </View>
      )}
    </View>
  );
}

// Fallback component if Skia is not available
export function SimpleAudioWaveform({
  isRecording,
  audioLevel = 0,
  color = '#FF3B30',
  backgroundColor = '#F5F5F5',
  height = 100,
  showTimer = true,
  duration = 0,
}: AudioWaveformProps) {
  const [bars, setBars] = useState<number[]>(new Array(20).fill(0.1));
  const animationRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isRecording) {
      animationRef.current = setInterval(() => {
        setBars(prev => 
          prev.map(() => 0.2 + Math.random() * 0.8 * (audioLevel || 0.5))
        );
      }, 100);
    } else {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
      setBars(new Array(20).fill(0.1));
    }

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isRecording, audioLevel]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { height, backgroundColor }]}>
      <View style={styles.barsContainer}>
        {bars.map((barHeight, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: `${barHeight * 100}%`,
                backgroundColor: color,
                opacity: isRecording ? 1 : 0.3,
              },
            ]}
          />
        ))}
      </View>
      
      {showTimer && (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatDuration(duration)}</Text>
        </View>
      )}
      
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={[styles.recordingDot, { backgroundColor: color }]} />
          <Text style={styles.recordingText}>Recording</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    height: '100%',
    paddingHorizontal: 10,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
    minHeight: 4,
  },
  timerContainer: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 8,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
});