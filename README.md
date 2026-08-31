<div align="center">

# ⛈️ WeatherGPT
### *Aapka Mausam, Aapki Bhasha (आपका मौसम, आपकी भाषा)*

<p align="center">
  <strong>Hyper-Local, Conversational AI Weather Intelligence for India</strong><br>
  Built with Next.js 14 App Router • Native Multi-Lingual Speech • Multi-LLM Reasoning • Multi-Tier GPS Geocoding
</p>

---

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/Google_Gemini-2.0_Flash-4285F4?style=for-the-badge&logo=google" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/Claude-3.5_Sonnet-D97706?style=for-the-badge&logo=anthropic" alt="Claude" />
  <img src="https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel" alt="Vercel" />
</p>

<p align="center">
  <a href="#-key-features">Key Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-persona-intelligence">Persona Matrix</a> •
  <a href="#-multilingual-support">Languages</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-deployment">Deployment</a>
</p>

---

</div>

## 🌟 Overview

**WeatherGPT** is an AI-powered conversational weather platform designed specifically for India's diverse linguistic and agricultural landscape. Instead of complex meteorological graphs and raw numerical tables, WeatherGPT delivers **role-specific, conversational briefings in 6 native Indian scripts** with **two-way voice speech (STT & TTS)**, **live GPS locality detection**, and **dual-city side-by-side comparisons**.

```
   ┌──────────────────────────────────────────────────────────┐
   │ 🛰️ Satellite Weather + 📍 Live GPS Coordinates           │
   └──────────────────────────┬───────────────────────────────┘
                              ▼
   ┌──────────────────────────────────────────────────────────┐
   │ 🧠 Generative AI Meteorological Reasoning Engine         │
   │    • Gemini 1.5/2.0 Flash • Claude 3.5 • GPT-4o-mini     │
   └──────────────────────────┬───────────────────────────────┘
                              ▼
   ┌──────────────────────────────────────────────────────────┐
   │ 🗣️ Native Indian TTS Audio Stream + Local Script Output  │
   │   বাংলা • हिंदी • தமிழ் • తెలుగు • मराठी • English        │
   └──────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 📍 1. Hyper-Local GPS & 4-Tier Geocoding
- **Instant GPS Detection**: One-click acquisition of exact latitude and longitude with zero manual city typing required.
- **4-Tier Fallback Reverse Geocoding Engine**:
  1. *BigDataCloud Client-side Geolocation API* (Sub-locality precision)
  2. *OpenStreetMap Nominatim Engine*
  3. *Google Maps Reverse Geocoding API*
  4. *Haversine Nearest-Distance Matcher* across 100+ major Indian cities

### 🧠 2. Persona-Tailored Meteorological Intelligence
WeatherGPT dynamically tailors its advice, tone, and focal parameters according to the user's role:
- 🌾 **Farmer (किसान / কৃষক)**: Soil moisture, irrigation windows, fertilizer scheduling, rainfall forecasts, and pest advisories.
- 🎣 **Fisherman (मछुआरा / জেলে)**: Coastal wind speeds (knots), high tide warnings, wave heights, squalls, and deep-sea safety.
- 🚨 **Disaster Manager (आपदा प्रबंधक / দুর্যোগ ব্যবস্থাপক)**: IMD alert tracking, cyclone trajectories, flooding risks, and emergency shelters.
- 👤 **Citizen (नागरिक)**: Daily commute feasibility, clothing choices, umbrella alerts, and outdoor travel advice.

### 🎙️ 3. Full-Fidelity Voice Speech (STT & TTS)
- **Speech-to-Text (STT)**: Speak naturally in Bengali, Hindi, Tamil, Telugu, Marathi, or English with live pulsing microphone feedback.
- **Serverless Native TTS Audio Streaming (`/api/tts`)**:
  - Automatically strips emojis and raw formatting so voice never stutters.
  - Expands symbols (`২৯°C` ➔ *২৯ ডিগ্রি সেলসিয়াস*, `৯১%` ➔ *৯১ শতাংশ*, `১৬ কিমি/ঘণ্টা` ➔ *১৬ কিলোমিটার প্রতি ঘণ্টা*).
  - Streams continuous concatenated MP3 audio without browser autoplay interruptions.

### ⚖️ 4. Dual-City Compare Mode
- Side-by-side comparative analysis between your current location and any second Indian city (e.g., *Kolkata vs Mumbai*, *Delhi vs Chennai*).
- Compares real-time temperature, feels-like index, humidity, wind velocity, and UV ratings.

### 📅 5. 7-Day Outlook & 24-Hour Timeline Sliders
- Interactive, responsive card sliders with visual rain probability bars and sunrise/sunset timings.

---

## 🇮🇳 Supported Languages

| Language | Native Script | Voice STT | Native Audio TTS |
| :--- | :--- | :---: | :---: |
| **Hindi** | हिंदी | ✅ | ✅ |
| **Bengali** | বাংলা | ✅ | ✅ |
| **Tamil** | தமிழ் | ✅ | ✅ |
| **Telugu** | తెలుగు | ✅ | ✅ |
| **Marathi** | मराठी | ✅ | ✅ |
| **English** | English (IN/Global) | ✅ | ✅ |

---

## 🏗️ Project Architecture

```
d:\Weather GPT\
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.js          # Multi-LLM dispatcher (Gemini, Claude, OpenAI)
│   │   │   └── tts/route.js           # Serverless Native Indian TTS MP3 Audio Streamer
│   │   ├── globals.css                # Weather tint design tokens & animations
│   │   ├── layout.jsx                 # Root layout with Noto Indian Google Fonts
│   │   └── page.jsx                   # Main WeatherGPT orchestrator
│   ├── components/
│   │   ├── Sidebar/                   # Search, Persona selector, Weather widget
│   │   ├── Header/                    # Live GPS indicator, city title, compare mode
│   │   ├── Chat/                      # Message bubbles, TTS player, Quick chips
│   │   ├── Forecast/                  # 7-day & 24-hour sliders
│   │   ├── Modals/                    # Compare cities modal & GPS permission overlay
│   │   └── UI/                        # Alert banner, Toast notifications, ErrorBoundary
│   ├── hooks/
│   │   ├── useGeolocation.js          # GPS auto-detect state machine
│   │   ├── useWeather.js              # Google Weather & Open-Meteo fallback
│   │   ├── useSpeechRecognition.js    # STT voice recording
│   │   └── useSpeechSynthesis.js      # Continuous audio streaming hook
│   └── lib/
│       ├── config.js                  # Environment variable manager
│       ├── constants.js               # Indian cities DB, WMO weather table
│       ├── i18n.js                    # 6-language native UI dictionary
│       ├── geocoding.js               # 4-tier reverse geocoding engine
│       ├── weatherApi.js              # Google Weather & Open-Meteo normalizer
│       ├── llmService.js              # Meteorological reasoning engine
│       └── speech.js                  # Clean audio script processor
├── .env.example                       # Environment variables template
├── package.json                       # Next.js 14 & React 18 dependencies
├── vercel.json                        # Vercel deployment configuration
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/devashishgorai/WeatherGpt.git
cd WeatherGpt
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your API keys in `.env.local`:
```env
# 1. Google Maps & Weather API Key
NEXT_PUBLIC_GOOGLE_API_KEY=your_google_maps_api_key

# 2. Google Gemini API Key (100% Free from https://aistudio.google.com/)
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

# 3. Anthropic Claude Key (Optional)
NEXT_PUBLIC_CLAUDE_API_KEY=

# 4. OpenAI Key (Optional)
NEXT_PUBLIC_OPENAI_API_KEY=
```

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 5. Build for Production
```bash
npm run build
npm start
```

---

## 🌐 Deployment on Vercel

1. Push your code to your GitHub repository.
2. Go to **[https://vercel.com/new](https://vercel.com/new)** and import your repository.
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_GOOGLE_API_KEY`
   - `NEXT_PUBLIC_GEMINI_API_KEY`
4. Click **Deploy**. Vercel will automatically build and host your Next.js App Router application!

---

## 🔒 Privacy & Data Usage
- **Zero Location Tracking**: GPS coordinates are requested strictly locally in the browser to query meteorological radar data and are never stored or shared.
- **Local Fallback**: WeatherGPT functions seamlessly with smart built-in meteorological intelligence even when offline or without an active LLM key.

---

<div align="center">

Made with ❤️ for **Smart India Hackathon 2026**<br>
*Empowering citizens, farmers, and fishermen with accessible weather intelligence.*

</div>
