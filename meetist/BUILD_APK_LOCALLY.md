# Building Meetist APK

## Option 1: Quick Local Build (5 minutes)

If you have Android Studio installed, you can build locally:

```bash
# Install Expo CLI tools
npm install -g expo-cli eas-cli

# Navigate to project
cd meetist

# Install dependencies
npm install

# Prebuild Android project
npx expo prebuild --platform android

# Build APK using Gradle
cd android
./gradlew assembleRelease

# APK will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

## Option 2: EAS Build (Cloud - Recommended)

This builds in the cloud and gives you a download link:

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login to Expo (create free account at expo.dev)
eas login

# 3. Configure project (one time)
cd meetist
eas build:configure

# 4. Build APK
eas build --platform android --profile preview

# 5. Wait 10-15 minutes for build
# You'll get a URL to download the APK
```

## Option 3: Using Our Build Script

```bash
cd meetist
./build-apk.sh
# Follow the prompts
```

## Option 4: GitHub Actions (Automatic)

1. Push code to GitHub
2. Go to Actions tab
3. Run "Build APK" workflow
4. Download APK from artifacts

## Pre-built APK Download

Since I cannot directly build and upload the APK from this environment, you'll need to:

1. **Fork/Clone this repository**
2. **Run one of the build commands above**
3. **Or download from Releases** (if GitHub Actions ran)

## Quick Installation Guide

Once you have the APK:

1. **Transfer APK to your Android phone**
   - Via USB cable
   - Upload to Google Drive
   - Email to yourself
   - Or use any file transfer method

2. **Enable Unknown Sources**
   - Settings → Security → Unknown Sources → Enable
   - Or Settings → Apps → Special Access → Install Unknown Apps

3. **Install APK**
   - Open file manager
   - Navigate to APK file
   - Tap to install
   - Follow prompts

4. **First Run**
   - Open Meetist app
   - Grant microphone permissions
   - Go to Settings → AI Transcription Models
   - Select a model (Transformers.js works immediately)
   - Start recording!

## APK Features

The APK includes:
- ✅ All 12+ transcription models
- ✅ Offline Transformers.js model
- ✅ API key configuration
- ✅ Full recording capabilities
- ✅ Export functionality
- ✅ No Expo Go required

## Troubleshooting

### "App not installed" error
- Enable Unknown Sources in settings
- Uninstall any previous version
- Ensure enough storage space

### Build fails locally
- Install Android Studio
- Set ANDROID_HOME environment variable
- Run `npx expo doctor` to check setup

### EAS build fails
- Create Expo account at expo.dev
- Run `eas login`
- Check `eas.json` configuration

## File Size

Expected APK size: ~50-70 MB
- Includes React Native runtime
- Includes Transformers.js models
- All UI assets and code

## Security Note

The APK is unsigned for development. For production:
1. Generate a keystore
2. Sign the APK
3. Upload to Google Play Store

## Need Help?

1. Check build logs: `eas build:list`
2. View errors: `eas build:view [build-id]`
3. Local issues: `npx expo doctor`