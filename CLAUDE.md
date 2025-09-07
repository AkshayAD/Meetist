# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Meetist is a React Native/Expo mobile meeting recorder and transcriber app focused on privacy and local processing. The app supports real-time transcription using multiple AI models (Gemini, Whisper, device speech recognition) and generates AI-powered meeting summaries.

## Development Commands

### Setup and Installation
```bash
cd meetist
npm install
```

### Running the App
```bash
# Start Expo development server
npx expo start

# Start with specific platform
npx expo start --android
npx expo start --ios

# Start with tunnel (for remote device testing)
npx expo start --tunnel
```

### Building APK
```bash
# Using EAS Build (cloud)
eas build -p android --profile preview

# Local build
eas build -p android --profile preview --local

# Using build script
./build-apk.sh
```

### Testing Real Transcription
To test real transcription functionality, you need a Gemini API key:
1. Get key from https://aistudio.google.com/apikey
2. Configure in Settings → Transcription Models
3. Default model: Gemini 2.5 Flash (free tier available)

## Architecture

### Service Layer Architecture
The app uses a modular service architecture with 15 specialized services:

- **RealTranscriptionService**: Orchestrates transcription across multiple models (Gemini, Whisper Cloud, Device Speech)
- **MeetingSummaryService**: Generates structured AI summaries with action items, timeline, and insights
- **MultiModelTranscriptionService**: Manages 12+ transcription providers including Groq, Together AI, AssemblyAI
- **WhisperModelService**: Handles Whisper model downloads and management (8 models: tiny to medium)
- **GeminiService**: Interfaces with Gemini API for AI enhancements
- **AudioService**: Manages recording and playback with expo-av

### State Management
Redux Toolkit with three main slices:
- `meetingsSlice`: Meeting CRUD operations and search
- `recordingSlice`: Recording state and audio management
- `settingsSlice`: App configuration and preferences

### Navigation Structure
- Bottom tabs: Home, Meetings, Settings
- Stack navigation for detail screens
- Main recording flow: HomeScreen → RecordingScreenReal → Meeting saved to Redux

### Data Storage Strategy
- **SQLite** (expo-sqlite): Meeting metadata and transcripts
- **MMKV** (react-native-mmkv): App settings and preferences
- **AsyncStorage**: API keys (encrypted)
- **FileSystem**: Audio files and Whisper models

## Critical Implementation Notes

### Whisper Integration Status
The app architecture for Whisper is complete but actual transcription is **simulated**:
- Models download correctly from Hugging Face
- UI shows proper transcription flow
- WhisperTranscriptionService returns placeholder text
- Full implementation requires native module (whisper.cpp binding)

### Real vs Simulated Services
- **Working**: Gemini transcription, cloud APIs, meeting management
- **Simulated**: Local Whisper processing (WhisperTranscriptionService)
- **Fallback**: Use RealTranscriptionService with Gemini for actual transcription

### API Key Management
API keys are shared between services:
- Gemini key works for all Gemini models
- Stored in AsyncStorage under 'transcription_api_keys'
- MeetingSummaryService uses same key as RealTranscriptionService

### Recording Configuration
- Format: WAV, 16kHz mono (optimized for Whisper)
- Metering enabled for waveform visualization
- Background recording supported
- Maximum duration: 3 hours

## Key Files to Understand

### Core Screens
- `RecordingScreenReal.tsx`: Main recording interface with file import
- `MeetingDetailScreenEnhanced.tsx`: Tabbed view with transcript and AI summary
- `TranscriptionSettingsScreen.tsx`: API key configuration and model selection

### Essential Services
- `RealTranscriptionService.ts`: Production transcription implementation
- `MeetingSummaryService.ts`: AI summary generation with caching
- `WhisperModelService.ts`: Model download and management (currently simulated processing)

### Components
- `AudioWaveform.tsx`: Real-time audio visualization
- `MeetingSummaryTab.tsx`: Structured summary display with collapsible sections

## Performance Constraints
- Target devices: 3-4GB RAM Android phones
- Max memory usage: 500MB during transcription
- Model sizes: Whisper tiny (39MB) to medium (1.5GB)
- Chunk-based processing for memory efficiency

## Build Configuration
- Bundle ID: com.meetist.app
- Min Android SDK: 24 (Android 7.0)
- EAS Build configured for preview and production
- GitHub Actions workflow exists but needs artifact action update

## Testing Approach
When testing transcription:
1. Use RecordingScreenReal (not older variants)
2. Configure Gemini API key first
3. Test with short audio (< 1 min) initially
4. Import audio files via document picker for consistency

## Current Branch Context
Working on branch: terragon/implement-meetist-whisper-mvp
Recent focus: Audio waveform visualization and AI meeting summaries
Status: Real transcription working with Gemini, Whisper simulation in place