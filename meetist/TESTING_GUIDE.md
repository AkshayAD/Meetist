# Meetist App Testing Guide

## Overview
Meetist is a privacy-focused meeting assistant app with local Whisper transcription and Gemini AI summarization. This guide will help you set up and test the application.

## Features
- **Local Whisper Transcription**: All audio processing happens on your device
- **Multiple Whisper Models**: Choose from Tiny to Medium models based on your needs
- **Gemini AI Summaries**: Get intelligent meeting summaries and action items
- **Offline First**: Works without internet after models are downloaded
- **Privacy Focused**: Audio never leaves your device

## Setup Instructions

### 1. Prerequisites
- Node.js 18+ and npm installed
- Android Studio (for Android testing) or Xcode (for iOS)
- At least 2GB free storage for Whisper models
- Expo CLI (`npm install -g expo-cli`)

### 2. Installation

```bash
# Clone the repository
cd meetist

# Install dependencies
npm install

# Start the development server
npx expo start
```

### 3. Running on Android

#### Option A: Physical Device (Recommended)
1. Install Expo Go app from Google Play Store
2. Connect your phone to the same WiFi network as your computer
3. Scan the QR code shown in the terminal with Expo Go app

#### Option B: Android Emulator
1. Open Android Studio and start an emulator
2. Press `a` in the terminal where Expo is running
3. The app will automatically install and launch

#### Option C: Build APK
```bash
# Build development APK
npx eas build --platform android --profile development

# Build preview APK (for testing)
npx eas build --platform android --profile preview
```

### 4. First Time Setup

#### Step 1: Download Whisper Models
1. Open the app
2. Navigate to **Settings** tab
3. Tap **Whisper Models**
4. Download at least one model:
   - **Tiny Q5 (25MB)**: Fastest, good for quick tests
   - **Base Q5 (48MB)**: Recommended for balance
   - **Small Q5 (154MB)**: Better accuracy
   - **Medium Q5 (488MB)**: Best accuracy (requires good device)

#### Step 2: Configure Gemini (Optional)
1. Go to **Settings** > **Gemini API Key**
2. Enter your Gemini API key (get one from [Google AI Studio](https://makersuite.google.com/app/apikey))
3. This enables AI summaries and insights

## Using the App

### Recording a Meeting

1. **Start Recording**:
   - Tap the microphone button on the home screen
   - Or navigate to the Recording tab
   - Select your Whisper model (if not already selected)
   - Tap the red record button

2. **During Recording**:
   - Speak clearly and at a moderate pace
   - You can pause/resume as needed
   - Recording duration is shown in real-time

3. **Stop and Process**:
   - Tap the stop button
   - The app will:
     - Transcribe using local Whisper (progress shown)
     - Generate summary with Gemini (if configured)
     - Save the meeting automatically

### Viewing Meetings

1. Go to the **Meetings** tab
2. Tap any meeting to view:
   - Full transcript
   - AI-generated summary
   - Key points
   - Action items
   - Audio playback

### Managing Whisper Models

1. **Download Models**:
   - Go to Settings > Whisper Models
   - Tap Download on any model
   - Wait for download to complete (progress shown)

2. **Switch Models**:
   - In Recording screen, tap the model selector
   - Choose from downloaded models
   - Or go to Settings > Whisper Models and tap Select

3. **Delete Models**:
   - Go to Settings > Whisper Models
   - Tap Delete on any downloaded model
   - Confirms before deletion

## Model Selection Guide

| Model | Size | Speed | Accuracy | Use Case |
|-------|------|-------|----------|----------|
| Tiny Q5 | 25MB | Very Fast | Basic | Quick notes, drafts |
| Base Q5 | 48MB | Fast | Good | Daily meetings |
| Small Q5 | 154MB | Moderate | Very Good | Important meetings |
| Medium Q5 | 488MB | Slower | Excellent | Critical accuracy |

## Troubleshooting

### App Won't Start
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx expo start --clear
```

### Models Won't Download
- Check internet connection
- Ensure sufficient storage (check Settings > Storage)
- Try downloading smaller model first

### Transcription Not Working
1. Ensure at least one model is downloaded
2. Check model is selected in Recording screen
3. Grant microphone permissions when prompted
4. Try with a smaller model if device is struggling

### No Audio Recording
- Grant microphone permissions in device settings
- Close other apps using microphone
- Restart the app

## Performance Tips

1. **For Older Devices**:
   - Use Tiny or Base models
   - Close other apps while recording
   - Keep recordings under 30 minutes

2. **For Best Quality**:
   - Use Small or Medium models
   - Record in quiet environment
   - Speak clearly and consistently

3. **Storage Management**:
   - Delete unused models
   - Clear cache periodically (Settings > Clear Cache)
   - Export important transcripts

## Testing Checklist

### Basic Functionality
- [ ] App launches successfully
- [ ] Can navigate between screens
- [ ] Settings page loads

### Whisper Models
- [ ] Can view available models
- [ ] Can download a model
- [ ] Download progress displays correctly
- [ ] Can select active model
- [ ] Can delete downloaded models

### Recording
- [ ] Microphone permission requested
- [ ] Can start recording
- [ ] Timer updates during recording
- [ ] Can pause/resume recording
- [ ] Can stop recording
- [ ] Model selector shows downloaded models

### Transcription
- [ ] Transcription starts after recording stops
- [ ] Progress bar shows during transcription
- [ ] Transcript appears in meeting details
- [ ] Can switch between different models

### Meetings
- [ ] Meetings list updates after recording
- [ ] Can view meeting details
- [ ] Can play back audio
- [ ] Can see transcript and summary

### Gemini Integration
- [ ] Can configure API key
- [ ] Summaries generate after transcription
- [ ] Key points and action items appear

## Privacy & Security

- **Local Processing**: Whisper transcription happens entirely on device
- **Optional Cloud**: Only text is sent to Gemini (if configured)
- **No Audio Upload**: Audio files never leave your device
- **Secure Storage**: All data stored locally using secure storage APIs

## Known Limitations

1. **Native Whisper Binding**: Currently using a simulation. Full native binding requires additional setup
2. **iOS Support**: Optimized for Android, iOS may have limitations
3. **Large Models**: Medium and Large models may not work on all devices
4. **Real-time Transcription**: Currently batch processing only

## Getting Help

- Check the [README.md](README.md) for overview
- Review [MVP_STATUS.md](MVP_STATUS.md) for current status
- File issues on GitHub for bugs

## Next Steps

After testing basic functionality:
1. Try different Whisper models to find best balance
2. Record a real meeting to test accuracy
3. Configure Gemini for enhanced summaries
4. Export and share meeting notes

Happy testing! The app is designed to be privacy-first while providing powerful transcription capabilities.