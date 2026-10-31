<div align="center">

# 🇮🇳 BharatVani — भारतवाणी

### AI-Powered Government News Intelligence Platform

**Live PIB Press Releases · Bilingual (Hindi + English) · Grounded Fact Verification · AI Video Storyboard · Natural Voice Audio · 3D News Anchor**

---

> *"Transforming complex government press releases into accessible, verified, multimodal news for every Indian citizen — from rural farmers to technical professionals."*

---

**Smart India Hackathon 2025–26 | Problem Statement: Accessible Government Communication**

</div>

---

## 📋 Table of Contents

1. [Problem Statement](#-problem-statement)
2. [Solution Overview](#-solution-overview)
3. [Key Features](#-key-features)
4. [System Architecture](#-system-architecture)
5. [Application Flow](#-application-flow)
6. [Technology Stack](#-technology-stack)
7. [Repository Structure](#-repository-structure)
8. [Backend API Reference](#-backend-api-reference)
9. [Core Engine Modules](#-core-engine-modules)
10. [Setup & Running](#-setup--running)

---

## 🎯 Problem Statement

The **Press Information Bureau (PIB)** of the Government of India issues hundreds of press releases every week. These contain crucial policy updates, scheme benefits, budget allocations and program outcomes.

**The gap:**
- Dense, bureaucratic language inaccessible to 65%+ of India's rural population
- No audio format for visually impaired or low-literacy citizens
- No quick fact-verification layer — misinformation spreads fast
- No unified bilingual (Hindi + English) access point
- Complex financial figures buried in long paragraphs

**BharatVani solves all of the above — in one platform.**

---

## 💡 Solution Overview

BharatVani is a full-stack web application that:

1. **Fetches live PIB press releases** in real-time via RSS and HTML scraping
2. **Transforms** them into Kisan-friendly summaries AND technical deep-dives
3. **Verifies facts** deterministically — no AI hallucination on numbers
4. **Narrates** articles in a natural Indian female voice
5. **Generates** AI-powered 3-scene video news bulletins via Gemini
6. **Animates** a 3D news anchor with real-time lip-sync

### Core Design Principle: **"LLM Proposes. Deterministic Code Verifies."**

Every financial figure (₹, Crore, Lakh), every percentage (%), every date and quantity is cross-verified against the official PIB source text using exact token matching. **Zero hallucination on facts.**

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📡 **Live PIB Feed** | Real-time Hindi (RSS) + English (HTML scrape) press releases, cached for 3 mins |
| 🌾 **Kisan Mode** | Simplified bullet takeaways, large fonts, audio-first for rural citizens |
| 💻 **Pro/Engineer Mode** | Full press release text, PRID, ministry metadata, policy depth |
| 🔊 **Natural Female Voice** | Google TTS-powered Indian female voice narration with in-memory audio cache |
| 🎬 **AI Video Storyboard** | Gemini 2.5 Flash generates a 3-scene broadcast-style bulletin per article |
| 🧠 **3D AI News Anchor** | Canvas-based 3D animated anchor with Web Audio API real-time lip-sync (60 FPS) |
| ✅ **Fact Verification** | Atomic claim extraction + Jaccard token grounding + number existence check |
| 🔖 **Bookmarks** | Save articles to localStorage for offline reading |
| 🌐 **Bilingual** | 100% separated Hindi and English feeds, UI, audio, and fact sheets |
| 🌓 **Dark / Light Mode** | Full theme toggle with CSS variables |
| 📱 **Responsive** | Mobile-first responsive layout |

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BHARATVANI — SYSTEM ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────┐
  │   OFFICIAL DATA SOURCES  │
  │  pib.gov.in (RSS + HTML) │
  └────────────┬────────────┘
               │  HTTP Fetch (Axios)
               ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                     BACKEND — Node.js / Express (Port 5000)              │
  │                                                                           │
  │  ┌──────────────┐   ┌──────────────────┐   ┌──────────────────────────┐ │
  │  │  scraper.js  │   │ documentParser.js│   │    entityLinker.js        │ │
  │  │              │   │                  │   │                           │ │
  │  │ • RSS/XML    │   │ • Sentence chunk │   │ • Ministry registry       │ │
  │  │   (Hindi)    │   │ • Number extract │   │ • Scheme registry         │ │
  │  │ • HTML scrape│   │ • Money/% regex  │   │ • Institution registry    │ │
  │  │   (English)  │   │ • normalizeText  │   │ • Alias → Canonical map   │ │
  │  │ • 3min cache │   └────────┬─────────┘   └────────────┬─────────────┘ │
  │  │ • Fallback   │            │                           │               │
  │  └──────┬───────┘            └────────────┬──────────────┘               │
  │         │                                 ▼                              │
  │         │                    ┌────────────────────────┐                  │
  │         │                    │      factEngine.js      │                  │
  │         │                    │                        │                  │
  │         │                    │  Step 1: Parse chunks  │                  │
  │         │                    │  Step 2: Gemini Flash  │◄─── Gemini API   │
  │         │                    │          proposes claims│                  │
  │         │                    │  Step 3: Deterministic │                  │
  │         │                    │          verification  │                  │
  │         │                    └────────────────────────┘                  │
  │         │                                                                │
  │         │              ┌─────────────────────────┐                      │
  │         │              │    geminiService.js       │◄─── Gemini API      │
  │         │              │                          │                      │
  │         │              │ • 3-scene storyboard     │                      │
  │         │              │ • Thematic Unsplash imgs  │                      │
  │         │              │ • Smart fallback engine  │                      │
  │         │              └─────────────────────────┘                      │
  │         │                                                                │
  │         │    ┌──────────────────────────────────────────────────────┐   │
  │         └───►│                  index.js (Express Router)            │   │
  │              │                                                       │   │
  │              │  GET  /api/health         GET  /api/news              │   │
  │              │  GET  /api/news/detail    POST /api/ai/storyboard     │   │
  │              │  POST /api/news/factcheck GET  /api/tts               │   │
  │              └────────────────────────────┬──────────────────────────┘   │
  └───────────────────────────────────────────┼─────────────────────────────┘
                                              │ HTTP JSON / MP3
                                              ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                    FRONTEND — React 18 + Vite (Port 5173)                │
  │                                                                           │
  │  ┌────────────┐  ┌─────────────┐  ┌───────────────┐  ┌──────────────┐  │
  │  │  App.jsx   │  │  Navbar.jsx │  │ HeroBanner.jsx│  │NewsCard.jsx  │  │
  │  │            │  │             │  │               │  │              │  │
  │  │ • Global   │  │ • Lang tog. │  │ • Lead story  │  │ • Kisan box  │  │
  │  │   state    │  │ • Mode tog. │  │ • Hero image  │  │ • Read more  │  │
  │  │ • API calls│  │ • Theme tog.│  │ • Audio btn   │  │ • Audio btn  │  │
  │  │ • localStorage│ • Tricolor │  │ • Watch btn   │  │ • Facts btn  │  │
  │  └────────────┘  └─────────────┘  └───────────────┘  └──────────────┘  │
  │                                                                           │
  │  ┌──────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
  │  │ ArticleModal.jsx │  │ VideoPlayerModal.jsx │  │ FactSheetModal.jsx  │ │
  │  │                  │  │                     │  │                     │ │
  │  │ • Full PR text   │  │ • 3-scene bulletin  │  │ • Atomic claims     │ │
  │  │ • Ministry tags  │  │ • NewsAnchor3D      │  │ • Evidence quotes   │ │
  │  │ • Audio read     │  │ • Live subtitles    │  │ • Grounding scores  │ │
  │  │ • Official links │  │ • Scene navigation  │  │ • Entity registry   │ │
  │  └──────────────────┘  └─────────────────────┘  └─────────────────────┘ │
  │                                                                           │
  │  ┌────────────────────────────┐  ┌───────────────────────────────────┐  │
  │  │     AudioPlayerBar.jsx     │  │       NewsAnchor3D.jsx             │  │
  │  │                            │  │                                   │  │
  │  │ • Floating bottom bar      │  │ • Canvas 2D / Three.js render     │  │
  │  │ • Play / Pause / Stop      │  │ • 60 FPS animation loop           │  │
  │  │ • Speed control (0.5–2x)   │  │ • Web Audio API lip-sync          │  │
  │  │ • Progress indicator       │  │ • Blink + breathing micro-anims   │  │
  │  └────────────────────────────┘  └───────────────────────────────────┘  │
  └─────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────┐
  │                         UTILITY LAYER (src/utils/)                        │
  │                                                                           │
  │  voiceEngine.js                    lipSyncEngine.js                       │
  │  • Stream MP3 from /api/tts        • Web Audio API AnalyserNode           │
  │  • In-memory audio cache           • FFT frequency band extraction        │
  │  • Subscribe/publish audio events  • Mouth blendshape weight calculation  │
  │  • Pause / resume / stop control   • getLipSyncWeights() per audio frame  │
  └─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Application Flow

### Flow 1 — User Reads a News Article (Kisan Mode)

```
User opens BharatVani
        │
        ▼
App.jsx loads → fetchNews() called → GET /api/news?lang=hi
        │
        ▼
scraper.js fetches PIB Hindi RSS → xml2js parses → 20 articles returned
        │
        ▼
Articles rendered as NewsCards in grid
        │
  [User clicks "पढ़ें" on a card]
        │
        ▼
ArticleModal opens → GET /api/news/detail?prid=XXXXXX&lang=hi
        │
        ▼
scraper.fetchArticleDetail() scrapes PressReleasePage.aspx
→ Returns: { title, ministry, paragraphs[], keyTakeaways[], images[] }
        │
        ▼
Kisan Mode: shows 3 keyTakeaways bullets + large font
Pro Mode  : shows full paragraphs + ministry tag + PRID
        │
  [User clicks 🔊 Audio]
        │
        ▼
voiceEngine.speakFemaleVoice() → GET /api/tts?text=...&lang=hi
→ Streams MP3 from Google TTS
→ AudioPlayerBar floats up with play/pause/speed controls
```

---

### Flow 2 — User Watches AI Video Bulletin

```
[User clicks 🎬 "Video Bulletin" on any card]
        │
        ▼
VideoPlayerModal opens → POST /api/ai/storyboard
→ Body: { article: {...}, lang: "hi" }
        │
        ▼
geminiService.generateGeminiStoryboard()
→ Sends prompt to Gemini 2.5 Flash
→ Gemini returns 3-scene JSON:
   Scene 1: { headline, narration, keyPoints, accentColor }
   Scene 2: { ... }
   Scene 3: { ... }
        │
        ▼
Each scene gets a thematic Unsplash image (THEME_VISUALS map)
        │
        ▼
VideoPlayerModal renders scenes with:
  • Scene image + accent gradient overlay
  • Headline + keyPoints badges
  • Live synchronized subtitles (narration text)
  • NewsAnchor3D canvas — 60 FPS animated female anchor
        │
        ▼
Web Audio API AnalyserNode reads audio frequency bands
→ lipSyncEngine.getLipSyncWeights() calculates jaw/mouth weights
→ NewsAnchor3D mouth opens/closes in sync with spoken audio
```

---

### Flow 3 — User Verifies Facts

```
[User clicks ✅ "तथ्य जांचें / Fact Check" on a card]
        │
        ▼
FactSheetModal opens → POST /api/news/factcheck
→ Body: { article: {...}, rawText: "...", lang: "hi" }
        │
        ▼
factEngine.extractAndVerifyFacts() runs 3-step pipeline:

  STEP 1 — DETERMINISTIC PARSE
  documentParser.parseDocumentChunks(rawText)
  → Splits text into sentence-level chunks at . और । boundaries
  → For each chunk, regex-extracts: money, %, quantities, dates
  
  entityLinker.linkEntities(rawText)
  → Scans for ministry/scheme/institution aliases
  → Returns canonical entities: { Ministry of Agriculture, PM-KISAN, ... }
  
  ─────────────────────────────────────────────
  
  STEP 2 — LLM CLAIM EXTRACTION (Gemini 2.5 Flash)
  → Prompt: "Extract 3-4 atomic factual claims with evidence quotes"
  → Returns: [ { claimId, statement, subject, action, targetQuantity, evidenceQuote } ]
  
  Fallback (no API key): rule-based extractor from first 4 chunks
  
  ─────────────────────────────────────────────
  
  STEP 3 — DETERMINISTIC VERIFICATION
  For each proposed claim:
    a) Does evidenceQuote exist as substring in source? → score 1.0
    b) Jaccard token overlap >= 0.45? → VERIFIED_GROUNDED
    c) Does targetQuantity number exist in raw source text? → numberVerified
  
  → Status: VERIFIED_GROUNDED ✅  or  UNVERIFIED_FLAGGED ⚠️
        │
        ▼
FactSheetModal renders:
  • Atomic claims with grounding scores (0–100%)
  • Evidence sentences highlighted
  • Deterministic figures table (₹, %, quantities)
  • Canonical entity cards with official portal links
```

---

### Flow 4 — Language & Mode Toggle

```
User clicks HI ↔ EN toggle in Navbar
        │
        ▼
setLang('en') in App.jsx
→ localStorage persists setting
→ fetchNews() re-called with lang=en
→ /api/news?lang=en → scraper.fetchPibFeed('en')
→ HTML scrape of pib.gov.in/Allrel.aspx?lang=1
→ All UI text swaps via translations[lang] dictionary
→ Audio TTS calls switch to &lang=en

User clicks 🌾 Kisan ↔ 💻 Pro toggle
        │
        ▼
setMode('kisan' | 'pro') in App.jsx
→ NewsCard renders: Kisan=keyTakeaways, Pro=description
→ ArticleModal renders: Kisan=3 bullets, Pro=full paragraphs
→ Font scale applied globally via CSS variable
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18 + Vite 6 | Component UI, SPA routing, fast HMR |
| **Styling** | Vanilla CSS (CSS Variables) | Editorial design system, dark/light mode |
| **Icons** | Lucide React | Consistent SVG icon set |
| **3D Rendering** | Canvas 2D API + Three.js (optional) | 3D news anchor animation |
| **Audio** | Web Audio API + AnalyserNode | Real-time lip-sync frequency analysis |
| **Backend** | Node.js + Express | REST API server, TTS proxy, news router |
| **HTTP Client** | Axios | PIB scraping, Gemini API calls |
| **HTML Parsing** | Cheerio | English PIB HTML scraping |
| **XML Parsing** | xml2js | Hindi PIB RSS/XML parsing |
| **AI / LLM** | Google Gemini 2.5 Flash | Storyboard generation, fact extraction |
| **TTS** | Google Translate TTS (via proxy) | Natural Indian female audio |
| **State Persistence** | localStorage | Lang, mode, theme, bookmarks |
| **Build Tool** | Vite 6 | Production bundle + dev server |
| **Process Manager** | concurrently | Run Express + Vite side-by-side |

---

## 📁 Repository Structure

```
mayank/
├── index.html                    # HTML5 entry with Google Fonts, SEO meta tags
├── package.json                  # npm scripts: dev, server, client, build
├── vite.config.js                # Vite config with /api proxy to port 5000
├── .env                          # PORT=5000, GEMINI_API_KEY
│
├── server/                       # Node.js Backend (ESM)
│   ├── index.js                  # Express server: all 6 API routes + TTS cache
│   ├── scraper.js                # PIB scraper: RSS (Hindi) + HTML (English) + detail parser
│   ├── geminiService.js          # Gemini 2.5 Flash storyboard generator + THEME_VISUALS
│   ├── factEngine.js             # 3-step fact pipeline: parse → LLM → deterministic verify
│   ├── documentParser.js         # Text chunker + number regex extractor (₹, %, MW, dates)
│   ├── entityLinker.js           # Canonical GoI registry: ministries, schemes, institutions
│   └── SERVER.md                 # Detailed server file documentation
│
└── src/                          # React 18 Frontend
    ├── main.jsx                  # React DOM root mount
    ├── App.jsx                   # Global state: lang, mode, theme, articles, audio, modals
    ├── index.css                 # Full design system: tokens, layouts, dark/light, animations
    ├── translations.js           # Complete Hindi ↔ English UI string dictionary
    │
    ├── components/
    │   ├── Navbar.jsx            # GOI masthead, tricolor ribbon, lang/mode/theme toggles
    │   ├── HeroBanner.jsx        # Lead story spotlight with 16:9 image + CTA buttons
    │   ├── CategoryPills.jsx     # Section tabs: All, Agriculture, Economy, Tech, Health, etc.
    │   ├── SearchBar.jsx         # Real-time article search with result counter
    │   ├── NewsCard.jsx          # Article card: Kisan callout box + action toolbar
    │   ├── ArticleModal.jsx      # Full press release reading drawer
    │   ├── VideoPlayerModal.jsx  # 3-scene AI video bulletin player + subtitles
    │   ├── FactSheetModal.jsx    # Fact verification drawer: claims, figures, entities
    │   ├── NewsAnchor3D.jsx      # 3D Canvas news anchor + 60 FPS lip-sync animation
    │   ├── AudioPlayerBar.jsx    # Floating bottom audio player: play/pause/speed
    │   ├── ApiKeyModal.jsx       # Gemini API key input and validation modal
    │   └── Footer.jsx            # Attribution, accessibility notice, official links
    │
    └── utils/
        ├── voiceEngine.js        # TTS streaming: speakFemaleVoice(), pause, resume, stop
        └── lipSyncEngine.js      # Web Audio API: FFT analysis → mouth blendshape weights
```

---

## 📡 Backend API Reference

| Method | Endpoint | Query / Body | Response |
|---|---|---|---|
| `GET` | `/api/health` | — | `{ status: "online", timestamp }` |
| `GET` | `/api/news` | `?lang=hi\|en&category=&search=&force=true` | `{ data: Article[], total, count }` |
| `GET` | `/api/news/detail` | `?prid=XXXXXX&lang=hi` | `{ data: { title, ministry, paragraphs[], keyTakeaways[], images[] } }` |
| `POST` | `/api/ai/storyboard` | `{ article, lang }` | `{ data: { scenes[3], title, category } }` |
| `POST` | `/api/news/factcheck` | `{ article, rawText, lang }` | `{ data: { atomicClaims[], deterministicFigures[], canonicalEntities[] } }` |
| `GET` | `/api/tts` | `?text=...&lang=hi\|en` | MP3 audio stream |

### Article Object Schema
```json
{
  "id": "2301420",
  "prid": "2301420",
  "title": "प्रधानमंत्री जनजातीय विकास मिशन",
  "link": "https://pib.gov.in/PressReleasePage.aspx?PRID=2301420",
  "iframeLink": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=2301420",
  "pubDate": "2026-08-20T06:30:00.000Z",
  "description": "...",
  "category": "governance",
  "lang": "hi",
  "source": "Press Information Bureau (PIB), GoI"
}
```

---

## ⚙️ Core Engine Modules

### 1. `documentParser.js` — Text Intelligence Layer

Splits raw article text into verifiable sentence-level chunks and extracts all numerical data using strict regex patterns.

**NUMBER_PATTERNS regex coverage:**

| Pattern | Captures |
|---|---|
| `money` | ₹, Rs, INR, करोड़, लाख, crore, lakh, million, billion |
| `percentage` | %, प्रतिशत, percent |
| `quantity` | MW, GW, tonnes, टन, hectares, हेक्टेयर, districts, जिले, farmers, pumps |
| `date` | `19 August 2026`, `2026-27`, `FY26`, Hindi month names |

---

### 2. `entityLinker.js` — Government Entity Registry

Canonical registry of Government of India entities. Maps any alias mention in article text to a fully verified canonical record.

```
"कृषि मंत्रालय" ──► Ministry of Agriculture and Farmers Welfare
                       { id: "min-agri", portalUrl: "agricoop.gov.in", type: "MINISTRY" }

"पीएम-किसान" ────► Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)
                       { id: "scheme-pm-kisan", allocationStandard: "₹6,000/year", type: "SCHEME" }

"इसरो" ──────────► Indian Space Research Organisation (ISRO)
                       { id: "inst-isro", type: "INSTITUTION" }
```

**Registry Coverage:** 7 Ministries · 4 Flagship Schemes · 5 Apex Institutions

---

### 3. `factEngine.js` — Grounded Verification Pipeline

Implements the zero-hallucination principle for government fact-checking.

```
         INPUT: Article text + metadata
              │
              ▼
    ┌─────────────────────┐
    │  STEP 1: PARSE      │  documentParser → chunks[] + figures[]
    │  STEP 2: LLM        │  Gemini 2.5 Flash → proposedClaims[]
    │  STEP 3: VERIFY     │  Jaccard score + substring match
    └─────────────────────┘
              │
              ▼
    OUTPUT: {
      atomicClaims[]:     { statement, evidenceQuote, status, groundingScore }
      deterministicFigures[]: { type, value, sourceSentence, verified: true }
      canonicalEntities[]:    { name, portalUrl, type, verified: true }
    }
```

**Verification Scoring:**
- Exact substring match → `score: 1.0` → `VERIFIED_GROUNDED ✅`
- Jaccard token overlap ≥ 0.45 → `VERIFIED_GROUNDED ✅`
- Below threshold → `UNVERIFIED_FLAGGED ⚠️`

---

### 4. `geminiService.js` — AI Storyboard Engine

Generates broadcast-quality 3-scene video storyboards from any PIB article.

```
Article { title, description, category, ministry }
    │
    ▼
Gemini 2.5 Flash (responseMimeType: application/json)
    │
    ▼
3 Scenes × { headline, narration, keyPoints[], accentColor }
    │
    ▼
+ THEME_VISUALS[category][sceneIndex]  ← Curated Unsplash CDN images
    │
    ▼
VideoPlayerModal renders with live subtitles + 3D news anchor
```

**Smart fallback:** If Gemini is unavailable or API key missing, `generateFallbackStoryboard()` produces a content-aware 3-scene storyboard using article metadata — zero dependency on external AI.

---

### 5. `NewsAnchor3D.jsx` + `lipSyncEngine.js` — Live Lip-Sync Animation

Real-time Canvas 2D animation of a 3D-style news anchor driven by actual speech audio.

```
Audio Element (MP3 from /api/tts)
    │
    ▼
Web Audio API: AudioContext → MediaElementSourceNode → AnalyserNode
    │
    ▼
lipSyncEngine.getLipSyncWeights(analyserNode)
→ FFT frequency data → extract formant bands (vocal energy)
→ Calculate { jawOpen: 0–1, mouthWidth: 0–1 }
    │
    ▼
NewsAnchor3D Canvas (60 FPS requestAnimationFrame loop)
→ Draw anchor face geometry
→ Apply mouth open/close blendshapes in sync
→ Blink timer (random 3–7 sec intervals)
→ Breathing sway + head accent micro-animations
```

---

## 🚀 Setup & Running

### Prerequisites
- Node.js v18+ 
- npm v9+
- Google Gemini API Key (free tier works — for AI features)

### 1. Install Dependencies
```bash
cd mayank
npm install
```

### 2. Configure Environment
```bash
# .env file (already present)
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run in Development
```bash
npm run dev
# Starts backend (Express) + frontend (Vite) concurrently
```

| Service | URL |
|---|---|
| Frontend App | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| Health Check | http://localhost:5000/api/health |
| Live Hindi Feed | http://localhost:5000/api/news?lang=hi |
| Live English Feed | http://localhost:5000/api/news?lang=en |

### 4. Individual Scripts
```bash
npm run server    # Backend only (Express on port 5000)
npm run client    # Frontend only (Vite on port 5173)
npm run build     # Production build to /dist
npm run preview   # Preview production build
```

---

## 🧩 State Management (App.jsx)

All global state lives in `App.jsx` using React `useState` hooks, persisted to `localStorage`:

| State | Type | Persisted | Description |
|---|---|---|---|
| `lang` | `'hi' \| 'en'` | ✅ | Active language — drives all API calls and UI text |
| `mode` | `'kisan' \| 'pro'` | ✅ | Reading mode — changes card layout and article depth |
| `theme` | `'light' \| 'dark'` | ✅ | CSS theme token via `data-theme` attribute |
| `fontScale` | `number` | ✅ | Accessibility font size multiplier |
| `articles` | `Article[]` | ❌ | Current page feed from `/api/news` |
| `activeCategory` | `string` | ❌ | Active filter tab (`all`, `agriculture`, etc.) |
| `selectedArticle` | `Article \| null` | ❌ | Article open in reading modal |
| `videoArticle` | `Article \| null` | ❌ | Article open in video player modal |
| `factArticle` | `Article \| null` | ❌ | Article open in fact-check modal |
| `audioState` | `object` | ❌ | TTS playback: `isPlaying`, `isPaused`, `rate`, `currentArticle` |
| `bookmarks` | `Article[]` | ✅ | Bookmarked articles stored in localStorage |

---

## 🔒 Fact-Checking Philosophy

> BharatVani is built on a strict **anti-hallucination** architecture.

1. **Source-first:** Every claim is traced back to the official PIB press release text.
2. **No AI for numbers:** Financial figures, percentages and quantities are extracted by deterministic regex — never generated by AI.
3. **LLM is a proposer, not a decider:** Gemini proposes claim decompositions. A deterministic verifier either confirms or flags each one.
4. **Transparency:** Every fact shown in the FactSheet includes its exact source sentence and a grounding score (0–100%).

---

## 📜 License & Attribution

- **News Content:** Press Information Bureau (PIB), Government of India — `pib.gov.in`
- **AI Engine:** Google Gemini 2.5 Flash — `aistudio.google.com`
- **Platform:** © 2026 **BharatVani (भारतवाणी)** — Built for Smart India Hackathon

---

<div align="center">

**Made with ❤️ for every Indian citizen — from the farmer in the field to the engineer in the city.**

*BharatVani — भारत की आवाज़, हर नागरिक तक।*

</div>
