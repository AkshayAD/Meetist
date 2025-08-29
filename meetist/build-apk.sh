#!/bin/bash

# Meetist APK Build Script
# This script builds a standalone APK that can be installed on any Android device

echo "🚀 Meetist APK Builder"
echo "====================="
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "📦 Installing EAS CLI..."
    npm install -g eas-cli
fi

# Check if logged in to Expo
echo "🔐 Checking Expo authentication..."
if ! eas whoami &> /dev/null; then
    echo "Please log in to your Expo account:"
    eas login
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Select build profile
echo ""
echo "Select build profile:"
echo "1) preview - For testing (recommended)"
echo "2) production - For release"
echo "3) github - For GitHub releases"
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        PROFILE="preview"
        ;;
    2)
        PROFILE="production"
        ;;
    3)
        PROFILE="github"
        ;;
    *)
        PROFILE="preview"
        ;;
esac

echo ""
echo "🏗️ Building APK with profile: $PROFILE"
echo "This will take 10-15 minutes..."
echo ""

# Start the build
eas build --platform android --profile $PROFILE --non-interactive

# Get the build URL
echo ""
echo "✅ Build submitted successfully!"
echo ""
echo "To check build status and download APK:"
echo "1. Run: eas build:list --platform android"
echo "2. Wait for status to be 'finished'"
echo "3. Click the build URL to download the APK"
echo ""
echo "Or visit: https://expo.dev/accounts/YOUR_USERNAME/projects/meetist/builds"
echo ""
echo "The APK will be available for download once the build completes."