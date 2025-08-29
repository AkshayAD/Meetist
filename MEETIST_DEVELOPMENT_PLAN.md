# Meetist MVP Development Plan

## Executive Summary
Meetist is a privacy-focused mobile meeting recorder and transcriber that uses local Whisper AI for transcription, designed to work efficiently on mobile devices with less than 4GB RAM.

## Phase 1: Project Setup & Core Structure (Day 1-2)

### Objectives
- Initialize React Native Expo project
- Set up project structure
- Configure development environment
- Implement basic navigation

### Tasks
1. **Project Initialization**
   - Create React Native Expo project
   - Configure TypeScript support
   - Set up ESLint and Prettier
   - Configure git repository

2. **Core Dependencies**
   - React Navigation for app navigation
   - Redux Toolkit for state management
   - React Native MMKV for efficient local storage
   - React Native Audio Recorder Player
   - Whisper React Native (local model)

3. **Project Structure**
   ```
   meetist/
   ├── src/
   │   ├── components/
   │   │   ├── Recording/
   │   │   ├── Transcription/
   │   │   ├── MeetingList/
   │   │   └── Common/
   │   ├── screens/
   │   │   ├── HomeScreen.tsx
   │   │   ├── RecordingScreen.tsx
   │   │   ├── MeetingsScreen.tsx
   │   │   └── SettingsScreen.tsx
   │   ├── services/
   │   │   ├── AudioService.ts
   │   │   ├── WhisperService.ts
   │   │   └── StorageService.ts
   │   ├── store/
   │   │   └── slices/
   │   ├── utils/
   │   └── types/
   ├── assets/
   ├── android/
   ├── ios/
   └── app.json
   ```

## Phase 2: Local Whisper Integration & Audio Recording (Day 3-5)

### Objectives
- Integrate Whisper.cpp for React Native
- Implement audio recording functionality
- Optimize for memory usage (<4GB RAM)

### Tasks
1. **Whisper Model Selection**
   - Use Whisper Tiny or Base model (39MB-74MB)
   - Implement model downloading and caching
   - Configure for mobile optimization

2. **Audio Recording Implementation**
   - High-quality audio capture (16kHz sample rate for Whisper)
   - Background recording support
   - Audio format: WAV (for direct Whisper processing)
   - Maximum recording: 3 hours
   - Pause/Resume functionality

3. **Memory Optimization**
   - Chunk-based audio processing
   - Stream processing instead of full file loading
   - Efficient memory management
   - Background task handling

### Technical Specifications
- Model: whisper-tiny.en (39 MB) or whisper-base.en (74 MB)
- Audio: 16kHz, mono, WAV format
- Processing: 30-second chunks for transcription
- Memory limit: Max 512MB for transcription process

## Phase 3: Transcription & Meeting Management (Day 6-8)

### Objectives
- Implement real-time transcription
- Create meeting management system
- Build local database

### Tasks
1. **Transcription Service**
   - Real-time transcription during recording
   - Post-recording batch processing
   - Speaker diarization (basic)
   - Timestamp synchronization

2. **Meeting Management**
   - Meeting CRUD operations
   - Search functionality
   - Tags and categories
   - Meeting metadata

3. **Local Storage**
   - SQLite for meeting metadata
   - File system for audio files
   - MMKV for app settings
   - Efficient indexing for search

### Data Model
```typescript
interface Meeting {
  id: string;
  title: string;
  date: Date;
  duration: number;
  audioPath: string;
  transcription: {
    text: string;
    segments: TranscriptionSegment[];
  };
  tags: string[];
  participants: string[];
}

interface TranscriptionSegment {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}
```

## Phase 4: UI/UX Implementation (Day 9-11)

### Objectives
- Create intuitive user interface
- Implement Material Design 3
- Ensure smooth performance

### Key Screens
1. **Home Screen**
   - Prominent record button
   - Recent meetings list
   - Quick stats

2. **Recording Screen**
   - Live waveform visualization
   - Timer display
   - Real-time transcription preview
   - Control buttons

3. **Meeting Detail Screen**
   - Full transcript view
   - Audio player with seek
   - Edit capabilities
   - Export options

4. **Settings Screen**
   - Whisper model selection
   - Audio quality settings
   - Storage management
   - Privacy settings

### UI Components
- Custom recording button animation
- Audio waveform visualizer
- Transcript viewer with highlighting
- Search interface

## Phase 5: Testing & APK Generation (Day 12-14)

### Objectives
- Comprehensive testing
- Performance optimization
- APK build and distribution

### Tasks
1. **Testing**
   - Unit tests for core functions
   - Integration testing
   - Performance testing on low-end devices
   - Memory leak detection

2. **Optimization**
   - Code splitting
   - Asset optimization
   - Lazy loading
   - Cache management

3. **APK Build**
   - Configure Expo EAS Build
   - Generate signed APK
   - Test on multiple devices
   - Prepare for distribution

### Performance Targets
- App size: <50MB (including Whisper model)
- Cold start: <3 seconds
- RAM usage: <500MB during transcription
- Battery: <5% per hour of recording

## Technical Stack

### Core Technologies
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation 6
- **UI Library**: React Native Elements + Custom Components

### AI/ML
- **Transcription**: Whisper.cpp (React Native binding)
- **Model**: whisper-tiny.en or whisper-base.en
- **Processing**: On-device, no cloud dependency

### Storage
- **Database**: SQLite (via expo-sqlite)
- **Key-Value**: React Native MMKV
- **Files**: React Native File System

### Audio
- **Recording**: React Native Audio Recorder Player
- **Format**: WAV (16kHz, mono)
- **Processing**: Streaming chunks

## MVP Features

### Must Have
1. ✅ Audio recording (up to 3 hours)
2. ✅ Local transcription using Whisper
3. ✅ Meeting list and management
4. ✅ Search in transcriptions
5. ✅ Export transcript (TXT format)
6. ✅ Offline functionality

### Nice to Have (Post-MVP)
1. ⏳ Speaker diarization
2. ⏳ Summary generation
3. ⏳ Cloud backup
4. ⏳ Multiple language support
5. ⏳ Share functionality

## Resource Requirements

### Development Environment
- Node.js 18+
- React Native CLI
- Android Studio / Xcode
- 8GB RAM minimum for development
- Expo CLI

### Target Device Specifications
- Android 7.0+ (API 24+)
- RAM: 3-4GB
- Storage: 200MB free space
- CPU: Snapdragon 450 or equivalent

## Risk Mitigation

### Technical Risks
1. **Memory constraints**: Use chunked processing and optimize model size
2. **Processing speed**: Implement queue system for batch processing
3. **Battery drain**: Optimize background processing and use efficient algorithms
4. **Model accuracy**: Provide editing interface for corrections

### Mitigation Strategies
- Progressive loading of features
- Graceful degradation on low-end devices
- Comprehensive error handling
- User feedback for improvements

## Success Metrics

### Technical KPIs
- Transcription accuracy: >85% for clear audio
- Processing speed: <1 minute per 5 minutes of audio
- Memory usage: <500MB peak
- Crash rate: <1%

### User Experience KPIs
- Time to first recording: <10 seconds
- Search response: <500ms
- App responsiveness: 60fps UI

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|------------|
| Phase 1 | 2 days | Project setup, navigation |
| Phase 2 | 3 days | Audio recording, Whisper integration |
| Phase 3 | 3 days | Transcription, meeting management |
| Phase 4 | 3 days | Complete UI/UX |
| Phase 5 | 3 days | Testing, optimization, APK |
| **Total** | **14 days** | **Working MVP** |

## Next Steps
1. Initialize project with React Native Expo
2. Install and configure Whisper.cpp for React Native
3. Implement core audio recording
4. Begin iterative development following phases