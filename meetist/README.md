# Meetist - Mobile Meeting Assistant

A privacy-focused mobile meeting recorder and transcriber that uses local Whisper AI for on-device transcription, designed to work efficiently on mobile devices with less than 4GB RAM.

## Features

### ✅ Phase 1 Complete (Current)
- **Audio Recording**: High-quality WAV recording optimized for Whisper (16kHz mono)
- **Meeting Management**: Create, read, update, delete meetings with metadata
- **Local Storage**: SQLite for meetings, MMKV for settings
- **Search**: Full-text search across meeting titles and transcripts
- **Settings**: Configurable audio quality, Whisper model selection
- **Export**: Share meeting transcripts as text files

### 🚧 Phase 2 (In Progress)
- Local Whisper transcription using whisper.cpp
- Real-time transcription display
- Speaker diarization
- Waveform visualization

### 📋 Phase 3-5 (Planned)
- Summary generation
- Action items extraction
- Multiple language support
- Cloud backup option

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation 6
- **Storage**: SQLite + MMKV
- **Audio**: Expo AV
- **Transcription**: Whisper (local, coming in Phase 2)

## Project Structure

```
meetist/
├── src/
│   ├── components/      # Reusable UI components
│   ├── screens/         # App screens
│   ├── services/        # Business logic services
│   ├── store/          # Redux store and slices
│   ├── navigation/     # Navigation configuration
│   └── types/          # TypeScript type definitions
├── assets/             # Images and static files
└── app.json           # Expo configuration
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web
```

## Memory Optimization

The app is optimized to run on devices with <4GB RAM:
- Uses Whisper Tiny model (39MB) by default
- Processes audio in 30-second chunks
- Efficient memory management with stream processing
- Peak RAM usage: <500MB during transcription

## Development Status

### Phase 1 ✅ Complete
- Project setup and architecture
- Core recording functionality
- Meeting management system
- UI/UX implementation
- Local storage

### Phase 2 🚧 Next
- Whisper model integration
- Real-time transcription
- Audio processing optimization

### Phase 3 📋 Planned
- Enhanced AI features
- Export formats
- Cloud sync

## Configuration

### Audio Settings
- **Format**: WAV (16kHz, mono)
- **Quality**: Low/Medium/High
- **Max Duration**: 3 hours

### Whisper Models
- **Tiny**: 39MB (faster, less accurate)
- **Base**: 74MB (balanced speed/accuracy)

## Performance Targets

- App size: <50MB (including Whisper model)
- Cold start: <3 seconds
- Transcription: <1 minute per 5 minutes of audio
- Battery usage: <5% per hour of recording

## License

Private - All rights reserved

## Contact

For questions or support, please contact the development team.