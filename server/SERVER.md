# 🖥️ Server — File-by-File Reference

> **Stack:** Node.js (ESM) · Express · Axios · Cheerio · xml2js · Google Gemini API  
> **Entry point:** `server/index.js` · **Port:** `5000` (configurable via `.env`)

---

## File Overview

| File | Role | Depends On |
|---|---|---|
| `index.js` | HTTP API server — all routes live here | scraper, geminiService, factEngine, dbService, supabaseClient |
| `supabaseClient.js` | Supabase PostgreSQL client + connectivity check | `@supabase/supabase-js` |
| `dbService.js` | Database persistence for news archive, fact cache & storyboards | `supabaseClient.js` |
| `scraper.js` | Fetches & parses live PIB press releases | *(none)* |
| `geminiService.js` | Generates AI video storyboards via Gemini | *(none)* |
| `factEngine.js` | Fact-checks and verifies claims in articles | documentParser, entityLinker |
| `documentParser.js` | Splits article text into searchable chunks | *(none)* |
| `entityLinker.js` | Maps text mentions to canonical Gov of India entities | *(none)* |

---

## 1. `index.js`

**The main Express server. All API routes are defined here.**  
It imports from the other 3 service files and wires them up as HTTP endpoints.

### Routes

| Method | Endpoint | What it does |
|---|---|---|
| `GET` | `/api/health` | Simple health-check — returns `{ status: "online" }` |
| `GET` | `/api/news` | Returns live PIB articles. Accepts `?lang=hi|en`, `?category=`, `?search=`, `?force=true` |
| `GET` | `/api/news/detail` | Returns full article content by PRID. Accepts `?prid=` and `?lang=` |
| `POST` | `/api/ai/storyboard` | Sends article to Gemini and returns a 3-scene visual storyboard |
| `POST` | `/api/news/factcheck` | Extracts and verifies factual claims from an article |
| `GET` | `/api/tts` | Converts text to speech (MP3) via Google Translate TTS. Accepts `?text=` and `?lang=` |

### Key Behaviours
- **CORS enabled** — the React frontend on `localhost:5173` can freely call this server.
- **In-memory TTS cache** — audio clips are cached (max 200 items) to avoid repeated TTS calls.
- **`GEMINI_API_KEY`** is read from `.env`; if missing, AI routes fall back to a built-in smart engine.

---

## 2. `scraper.js`

**Fetches live press releases from PIB (Press Information Bureau) — this is the core data source.**

### What it fetches

| Language | Source URL | Method |
|---|---|---|
| Hindi | `pib.gov.in/RssMain.aspx?ModId=6&Lang=2&Regid=3` | RSS/XML parsing via `xml2js` |
| English | `pib.gov.in/Allrel.aspx?reg=3&lang=1` | HTML scraping via `cheerio` |

### In-memory Cache
- Results are cached for **3 minutes** (`CACHE_TTL_MS = 3 * 60 * 1000`).
- Pass `?force=true` to the `/api/news` route to bypass cache and re-fetch immediately.
- Article detail pages are also cached indefinitely in a `Map()` (keyed by `PRID_lang`).

### Exported Functions

| Function | What it does |
|---|---|
| `fetchPibFeed(lang, forceRefresh)` | Main fetch — returns array of article objects for Hindi or English |
| `fetchArticleDetail(prid, lang)` | Scrapes the full `PressReleasePage.aspx?PRID=...` page and returns paragraphs, ministry, date, images |
| `categorizeArticle(title, desc, ministry)` | Regex-based classifier — returns one of: `agriculture`, `technology`, `economy`, `health`, `environment`, `governance` |
| `generateKeyPoints(paragraphs, title, lang)` | Picks up to 3 short sentences from the article as quick takeaways |
| `isHindiText(str)` | Returns `true` if the string contains Devanagari Unicode characters |

### Fallback Data
- If the live fetch **fails or times out**, `getFallbackData(lang)` returns 6–7 hardcoded seed articles so the app never shows an empty screen.
- **Known issue:** English live results are supplemented with fallback data even on a successful fetch (may show slightly stale articles).

---

## 3. `geminiService.js`

**Generates a 3-scene AI video storyboard for any article using Google Gemini 2.5 Flash.**

### How it works
1. Sends the article title, description, category and ministry to **Gemini 2.5 Flash**.
2. Receives a JSON array of 3 scenes — each with a `headline`, `narration` script, `keyPoints` badges, and an `accentColor`.
3. Maps a curated **Unsplash thematic image** to each scene based on the article category.

### Exported Functions

| Function | What it does |
|---|---|
| `generateGeminiStoryboard(article, apiKey, lang)` | Calls Gemini API → returns storyboard object |
| `generateFallbackStoryboard(article, lang)` | Returns a pre-written 3-scene storyboard when Gemini is unavailable or key is missing |

### `THEME_VISUALS`
A pre-curated map of **4 Unsplash image URLs per category** (`agriculture`, `technology`, `economy`, `health`, `environment`, `governance`). These are used as scene visuals.

### Fallback Behaviour
- If `apiKey` is missing/empty → immediately returns `generateFallbackStoryboard`.
- If Gemini API call fails → also falls back to `generateFallbackStoryboard`.

---

## 4. `factEngine.js`

**The fact-checking pipeline. Extracts atomic claims from an article and verifies each one against the source text.**

### Pipeline (3 steps)

```
Article Text
    │
    ▼
[Step 1] DETERMINISTIC PARSE  <─── documentParser.js
    │    Split into sentence chunks, extract numbers/figures
    │    Identify canonical entities  <─── entityLinker.js
    │
    ▼
[Step 2] LLM CLAIM EXTRACTION  <─── Gemini 2.5 Flash API
    │    Propose 3-4 atomic claims with evidence quotes
    │    (Fallback: rule-based extractor if no API key)
    │
    ▼
[Step 3] DETERMINISTIC VERIFICATION
         Check each proposed claim + number against actual source text
         Score each claim: VERIFIED_GROUNDED or UNVERIFIED_FLAGGED
```

### Exported Functions

| Function | What it does |
|---|---|
| `extractAndVerifyFacts({ article, rawText, lang, apiKey })` | Full pipeline — returns `{ atomicClaims[], deterministicFigures[], canonicalEntities[] }` |

### Verification Logic
- **Direct match:** Is the exact evidence quote a substring of the source text? → score `1.0`
- **Token overlap (Jaccard similarity):** Word-level overlap — threshold >= `0.45` → `VERIFIED_GROUNDED`
- **Number check:** Is the proposed number/figure present in the raw source text?

---

## 5. `documentParser.js`

**Pure utility — splits raw article text into structured, searchable chunks.**  
No external dependencies. Used by `factEngine.js`.

### Exported Functions

| Function | What it does |
|---|---|
| `parseDocumentChunks(rawText)` | Splits text on `.` `।` `!` `?` into sentence chunks. Each chunk has `{ id, text, charStart, charEnd, numbers[] }` |
| `extractDeterministicFigures(chunks)` | Scans chunks for money, percentages, quantities, dates using regex. Returns `figures[]` array |
| `normalizeText(text)` | Lowercases, strips markdown symbols, collapses whitespace — used for deterministic comparison |

### `NUMBER_PATTERNS` (regex constants)

| Pattern | Detects |
|---|---|
| `money` | Rs amounts, crore, lakh, INR |
| `percentage` | %, pratishat, percent |
| `quantity` | MW, GW, hectares, tonnes, districts, farmers, villages, pumps |
| `date` | 19 August 2026, 2026-27, FY26, Hindi month names |

---

## 6. `entityLinker.js`

**Maps free-text mentions of government bodies to their canonical, verified form.**  
No external dependencies. Used by `factEngine.js`.

### `CANONICAL_REGISTRY`

| Category | Entries |
|---|---|
| **Ministries** | Agriculture, Commerce & Industry, Finance, Health, MNRE, MeitY, Defence |
| **Schemes** | PM-KISAN, PM-KUSUM, Ayushman Bharat (AB-PMJAY), Digital India / DPI |
| **Institutions** | ICAR, ISRO, DRDO, RBI, PIB |

### Exported Functions

| Function | What it does |
|---|---|
| `linkEntities(text)` | Scans free text for any alias in the registry → returns matched entities with `{ type, canonicalId, name, nameHindi, portalUrl, verified: true }` |

---

## Data Flow Diagram

```
Browser (React)
      |
      |  HTTP (localhost:5000)
      v
  index.js  ------------ scraper.js ---------> pib.gov.in (RSS + HTML scrape)
      |
      |---- geminiService.js ----------------> Gemini 2.5 Flash API
      |
      +---- factEngine.js
                |
                |---- documentParser.js  (no I/O — pure text logic)
                |---- entityLinker.js    (no I/O — pure registry lookup)
                +---- Gemini 2.5 Flash API (claim extraction)
```

---

## Environment Variables (`.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port, defaults to `5000` |
| `GEMINI_API_KEY` | Yes (for AI features) | Google Gemini API key. Without it, storyboard and fact-check fall back to built-in engines |

---

## Known Issues

> **Hindi pubDate is wrong** — The PIB Hindi RSS feed does not include `<pubDate>` per item.
> The scraper falls back to `new Date().toISOString()` (server fetch time), so all Hindi articles show the same timestamp.

> **English feed mixes fallback data** — When the English HTML scraper succeeds, its ~5 live results
> are supplemented with up to 7 hardcoded fallback articles from `getFallbackData('en')`. These may be 1–2 days old.

> **PIB redirects** — `pib.gov.in` returns a 301 to `www.pib.gov.in`. Axios follows this automatically.
