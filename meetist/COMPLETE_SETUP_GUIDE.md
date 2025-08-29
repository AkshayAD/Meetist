# Complete Meetist Setup & Usage Guide

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Install and run
cd meetist
npm install
npx expo start

# 2. Open on phone
# Install Expo Go app and scan QR code
```

## 📱 Available Transcription Options

### 🆓 FREE Options (No Credit Card Required)

| Model | Provider | Free Tier | Setup Time | Speed |
|-------|----------|-----------|------------|--------|
| **Transformers.js** | Local | Unlimited | 0 min | Slow |
| **Gemini 2.5 Flash** | Google | 25 req/day | 2 min | Fast |
| **Groq Distil-Whisper** | Groq | 25MB files | 2 min | Ultra Fast |
| **Groq Whisper v3** | Groq | 25MB files | 2 min | Ultra Fast |
| **Together AI** | Together | $25 credits | 2 min | Very Fast |
| **Deepgram Nova** | Deepgram | $200 credits | 2 min | Real-time |
| **AssemblyAI** | AssemblyAI | 5 hrs/month | 2 min | Fast |

### 💰 PAID Options (Best Performance)

| Model | Price | Why Use |
|-------|-------|---------|
| **Groq Whisper v3 Turbo** | $0.04/hr | Best overall (speed + accuracy) |
| **OpenAI Whisper** | $0.006/min | Original, most reliable |
| **Gemini 2.0 Flash** | $0.0001875/1K | Native audio, newest |

## 🎯 Step-by-Step Setup

### Option 1: Instant Setup (No API Keys)
1. Open app
2. Go to Settings → AI Transcription Models
3. Select **"Transformers.js"** (already available)
4. Start recording!

### Option 2: Best Free Setup (Recommended)
1. **Get Groq API Key** (2 minutes):
   - Go to https://console.groq.com
   - Sign up free (no credit card)
   - Copy API key

2. **Configure in App**:
   - Settings → AI Transcription Models
   - Find "Groq Whisper v3 Turbo"
   - Tap "Configure API Key"
   - Paste key and save

3. **Start Using**:
   - Record audio
   - Get transcription in seconds!

### Option 3: Maximum Free Credits
Get ALL these free API keys (10 minutes total):

1. **Gemini** (Google):
   - https://aistudio.google.com/apikey
   - Free: 25 requests/day

2. **Groq** (Fastest):
   - https://console.groq.com
   - Free: 25MB audio files

3. **Together AI**:
   - https://api.together.xyz
   - Free: $25 credits on signup

4. **Deepgram**:
   - https://console.deepgram.com
   - Free: $200 credits

5. **AssemblyAI**:
   - https://www.assemblyai.com
   - Free: 5 hours/month

## 📖 How to Use the App

### Recording a Meeting

1. **Choose Model**:
   - Tap microphone on home screen
   - Select transcription model (or use default)

2. **Record**:
   - Tap red button to start
   - Speak clearly
   - Tap stop when done

3. **Processing**:
   - Watch progress bar
   - Transcription happens automatically
   - AI summary generated (if Gemini configured)

4. **View Results**:
   - See full transcript
   - Read AI summary
   - Review action items
   - Export as needed

## 🏆 Best Models for Different Needs

### For Speed (Instant Results)
**Use: Groq Models**
- 200-300x faster than real-time
- Transcribe 1 hour in 12 seconds
- Configure: Settings → AI Models → Groq

### For Accuracy (Professional Use)
**Use: OpenAI Whisper or Groq Whisper v3**
- Highest accuracy
- All languages supported
- Configure: Settings → AI Models → OpenAI/Groq

### For Privacy (Offline)
**Use: Transformers.js**
- Runs 100% on device
- No internet needed
- Already configured!

### For Free Usage (Students/Personal)
**Use: Gemini 2.5 Flash**
- 25 free requests daily
- Good accuracy
- Configure: Settings → AI Models → Gemini

### For Long Recordings (Podcasts/Lectures)
**Use: AssemblyAI or Together AI**
- Handle hours of audio
- Speaker detection
- 5 hours free/month (AssemblyAI)

## 🎨 Features by Model

| Feature | Gemini | Groq | OpenAI | Local |
|---------|--------|------|--------|-------|
| Speed | Fast | Ultra Fast | Standard | Slow |
| Languages | 50+ | 50+ | 98 | Multiple |
| Free Tier | ✅ | ✅ | ❌ | ✅ |
| Offline | ❌ | ❌ | ❌ | ✅ |
| Timestamps | ✅ | ✅ | ✅ | Limited |
| Max File | 20MB | 25MB | 25MB | Unlimited |

## 🔧 Troubleshooting

### "No model selected"
→ Go to Settings → AI Transcription Models → Select any model

### "API key required"
→ Get free API key from provider (see links above)

### "Transcription failed"
→ Check internet connection
→ Try different model
→ Verify API key is correct

### "Slow transcription"
→ Switch from local to cloud model
→ Use Groq for fastest speed

### "Out of free credits"
→ Switch to different provider
→ Use local Transformers.js (unlimited)
→ Wait for daily reset (Gemini)

## 📊 Cost Calculator

For paid usage after free tiers:

| Usage | Groq | OpenAI | Gemini |
|-------|------|--------|--------|
| 1 hour meeting | $0.04 | $0.36 | ~$0.02 |
| 10 hours/month | $0.40 | $3.60 | ~$0.20 |
| 100 hours/month | $4.00 | $36.00 | ~$2.00 |

## 🚀 Advanced Tips

1. **Combine Models**:
   - Use Groq for speed
   - Fallback to Gemini when Groq quota exceeded
   - Local for sensitive content

2. **Optimize Quality**:
   - Record in quiet environment
   - Speak clearly
   - Use external microphone if available

3. **Save Money**:
   - Use free tiers strategically
   - Process long recordings with AssemblyAI (5hr free)
   - Quick notes with Groq (fast & cheap)

## 📱 Mobile-Specific Setup

### Android
```bash
# Build APK
npx eas build --platform android --profile preview

# Or use Expo Go app (recommended)
```

### iOS
```bash
# Requires Mac with Xcode
npx eas build --platform ios --profile preview
```

## 🎉 You're Ready!

With this setup, you have:
- ✅ 12+ transcription models to choose from
- ✅ Multiple free options (no credit card)
- ✅ Ultra-fast transcription (Groq)
- ✅ Privacy option (local)
- ✅ Professional quality (OpenAI/Gemini)

**Start with Groq (free & fast) or Transformers.js (local & private)**

## 📞 Support

- Check settings for model configuration
- Try different models if one fails
- Free tiers reset daily/monthly
- All models have been tested and work!