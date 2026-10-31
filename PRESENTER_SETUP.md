# BharatVani - Photorealistic Real-Time AI News Presenter

## Overview

BharatVani features a **Photorealistic Real-Time AI News Presenter** ("Avani Sharma") designed for national news broadcasts. The presenter replaces traditional cartoon/3D avatars with an adult Indian female news anchor dressed in a formal dark navy-blue blazer with subtle lapel microphone, broadcasting from a clean newsroom studio.

---

## Architecture & Technology Stack

The integration uses **D-ID Expressive V4 with Echo Sessions** connected via **LiveKit Realtime Transport**:

```
 ┌─────────────────────────────────────────────────────────────┐
 │                      BharatVani UI                          │
 │              (PhotorealisticPresenter.jsx)                  │
 └──────────────────────────────┬──────────────────────────────┘
                                │
        1. POST /api/anchor/session (storyId, lang)
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                    Node.js / Express                        │
 │            (/api/anchor/session, speak, close)              │
 └──────────────┬──────────────────────────────┬───────────────┘
                │                              │
 2. POST /v2/agents/:id/sessions               │ 4. Spawns isolated
    (session_type: "echo")                     │    streaming worker
                ▼                              ▼
 ┌──────────────────────────────┐  ┌───────────────────────────┐
 │          D-ID API            │  │   Python LiveKit Worker   │
 │   Returns session_url,       │  │ (echoStreamingWorker.py)  │
 │   session_token, echo_token  │  │ Streams TTS audio bytes   │
 └──────────────┬───────────────┘  └───────────┬───────────────┘
                │                              │
 3. Returns session_url &                      │ 5. Streams MP3 on
    session_token to client                    │    did.audio-stream
                │                              │
                ▼                              ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                 LiveKit Realtime Room                       │
 │  • Client attaches video/audio tracks to <video> element    │
 │  • Expressive V4 Avatar performs real-time lip-sync         │
 └─────────────────────────────────────────────────────────────┘
```

### Key Technical Decisions:
1. **D-ID Echo Sessions**:
   - Skips D-ID's internal STT, LLM, and TTS engines.
   - Preserves 100% of BharatVani's existing PIB-grounded Hindi and English TTS audio.
   - Prevents duplicate audio playback by letting the avatar speak the exact synthesized audio.
2. **Hybrid Node.js + Python Worker Architecture**:
   - The primary application logic, authentication, sessions, and APIs remain in **Node.js/Express**.
   - LiveKit RTC byte streaming (`stream_bytes` on `did.audio-stream`) is handled by a lightweight Python worker (`server/echoStreamingWorker.py`) utilizing `livekit` RTC v1.2+, matching the official D-ID specification.
3. **Security**:
   - `echo_token` and `DID_API_KEY` are kept strictly server-side.
   - The client only receives `session_url` and `session_token`.
4. **Resilient Production Fallback**:
   - If D-ID credentials are not configured or the connection times out, the presenter automatically engages **Photorealistic Studio Mode** with natural breathing, dynamic lighting, and audio-synchronized waveform indicators.
   - Evaluators can toggle between **Photorealistic Mode** and **Classic 3D Mode** via the upper-right control badge.

---

## Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# D-ID Expressive V4 & Echo Sessions
DID_BASE_URL=https://api.d-id.com
DID_API_KEY=your_did_api_key_here
DID_AGENT_ID=your_did_expressive_v4_agent_id
```

### Obtaining D-ID Credentials:
1. Log in to [D-ID Studio / Developer Portal](https://studio.d-id.com/).
2. Navigate to **API Keys** and generate a key.
3. Under **Agents**, create an Expressive V4 Agent using the generated BharatVani presenter portrait (`public/presenter.jpg`).
4. Copy the resulting `agent_id` (e.g., `agt_...`) into `DID_AGENT_ID`.

---

## Audio Format Conversion & Utterance Lifecycle

- **Format**: MP3 (supported natively by D-ID Echo without transcoding).
- **Utterance Stream**:
  1. Frontend sends text to `/api/anchor/speak`.
  2. Server fetches or caches the natural TTS audio buffer from Google TTS via `/api/tts`.
  3. Worker opens byte stream `did.audio-stream` with attribute `{"format": "mp3"}`.
  4. Worker writes audio bytes and closes stream (`aclose()`) to signal utterance completion.
  5. If the user pauses or switches stories, `/api/anchor/interrupt` sends a `did.interrupt` message or sets `{"interrupt": "true"}` to stop audio immediately.

---

## Multilingual Support

- **Hindi (`hi`)**:
  - TTS: Natural Hindi female voice (`hi-IN`).
  - Presenter Badge: "अवनी शर्मा | वरिष्ठ राष्ट्रीय समाचार एंकर (पीआईबी सत्यापित)".
- **English (`en`)**:
  - TTS: Natural English female voice (`en-IN`).
  - Presenter Badge: "Avani Sharma | Senior National News Anchor (PIB Grounded)".
- **Audio Verification**:
  - Tested with `/api/tts?text=भारतवाणी में आपका स्वागत है&lang=hi` (200 OK, 21.8 KB audio/mpeg).
  - Tested with `/api/tts?text=Welcome to BharatVani National News Broadcast&lang=en` (200 OK, 29.3 KB audio/mpeg).

---

## Operational Costs & Session Management

- **Echo Sessions**: Billed by live connected minutes (refer to your D-ID subscription tier).
- **Session Cleanup**:
  - Sessions automatically close when the user navigates away or modal unmounts.
  - Background server garbage collector clears inactive sessions older than 2 hours.
  - Inactivity timeout prevents dangling sessions if a tab is closed unexpectedly.
