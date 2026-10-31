import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import https from 'https';
import { fetchPibFeed, fetchArticleDetail } from './scraper.js';
import { generateGeminiStoryboard } from './geminiService.js';
import { extractAndVerifyFacts } from './factEngine.js';
import { isSupabaseConfigured } from './supabaseClient.js';
import {
  upsertArticles,
  getArticles as getDbArticles,
  saveArticleDetail,
  getFactReport,
  saveFactReport,
  getStoryboard,
  saveStoryboard,
  getDatabaseStats,
} from './dbService.js';

import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import {
  startNewsVideoGeneration,
  getNewsVideoJobStatus,
  getCachedNewsVideo,
} from './videoService.js';
import {
  createEchoSession,
  streamAudioToEchoSession,
  interruptEchoSession,
  closeEchoSession,
  isDidConfigured,
} from './didEchoService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/videos', express.static(path.join(__dirname, '../media/videos')));
app.use('/media', express.static(path.join(__dirname, '../media')));

app.get('/presenter.jpg', (req, res) => {
  const localFile = path.join(__dirname, '../public/presenter.jpg');
  if (fs.existsSync(localFile)) {
    return res.sendFile(localFile);
  }
  const mediaFile = path.join(__dirname, '../media/presenter.jpg');
  if (fs.existsSync(mediaFile)) {
    return res.sendFile(mediaFile);
  }
  res.status(404).send('Presenter image not found');
});

const getSafeLang = (l) => (['hi', 'en', 'ta', 'te', 'gu'].includes(l) ? l : 'hi');

// API Health Check with Database Status
app.get('/api/health', async (req, res) => {
  const dbStats = await getDatabaseStats();
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'BharatVani PIB Live & Archive News Engine',
    database: dbStats,
    languages: ['hi', 'en', 'ta', 'te', 'gu'],
  });
});

// API: Get PIB Feed with filters + Supabase persistence
app.get('/api/news', async (req, res) => {
  try {
    const lang = getSafeLang(req.query.lang);
    const category = req.query.category || 'all';
    const search = (req.query.search || '').trim().toLowerCase();
    const force = req.query.force === 'true';
    const useArchive = req.query.archive === 'true';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    // If historical archive mode requested and Supabase is configured
    if (useArchive && isSupabaseConfigured()) {
      const dbResult = await getDbArticles({
        lang,
        category,
        search,
        limit,
        offset,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      });

      if (dbResult && dbResult.articles.length > 0) {
        return res.json({
          success: true,
          count: dbResult.articles.length,
          total: dbResult.total,
          page,
          limit,
          lang,
          category,
          source: 'supabase_archive',
          data: dbResult.articles,
        });
      }
    }

    // Default live scrape feed
    const articles = await fetchPibFeed(lang, force);

    // Persist scraped articles to Supabase in the background
    if (isSupabaseConfigured() && articles && articles.length > 0) {
      upsertArticles(articles).catch((err) =>
        console.warn('Background Supabase article sync error:', err.message)
      );
    }

    let filtered = articles;

    // Filter by category
    if (category && category !== 'all') {
      filtered = filtered.filter((a) => a.category === category);
    }

    // Filter by search query
    if (search) {
      filtered = filtered.filter(
        (a) =>
          (a.title && a.title.toLowerCase().includes(search)) ||
          (a.description && a.description.toLowerCase().includes(search)) ||
          (a.category && a.category.toLowerCase().includes(search))
      );
    }

    res.json({
      success: true,
      count: filtered.length,
      total: articles.length,
      lang: lang,
      category: category,
      dbSynced: isSupabaseConfigured(),
      lastUpdated: new Date().toISOString(),
      data: filtered,
    });
  } catch (error) {
    console.error('Error in /api/news:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news feed',
      error: error.message,
    });
  }
});

// API: Dedicated Historical Archive Endpoint
app.get('/api/news/archive', async (req, res) => {
  try {
    const lang = getSafeLang(req.query.lang);
    const category = req.query.category || 'all';
    const search = (req.query.search || '').trim().toLowerCase();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const dbResult = await getDbArticles({
      lang,
      category,
      search,
      limit,
      offset,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    });

    if (dbResult) {
      return res.json({
        success: true,
        count: dbResult.articles.length,
        total: dbResult.total,
        page,
        limit,
        lang,
        category,
        data: dbResult.articles,
      });
    }

    // Fallback if DB not configured: return current live feed
    const articles = await fetchPibFeed(lang, false);
    res.json({
      success: true,
      count: articles.length,
      total: articles.length,
      page: 1,
      limit: articles.length,
      lang,
      category,
      fallback: true,
      data: articles,
    });
  } catch (error) {
    console.error('Error in /api/news/archive:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to query news archive',
      error: error.message,
    });
  }
});

// API: Get Full Article Detail
app.get('/api/news/detail', async (req, res) => {
  try {
    const prid = req.query.prid || req.query.id;
    const lang = getSafeLang(req.query.lang);

    if (!prid) {
      return res.status(400).json({
        success: false,
        message: 'PRID parameter is required',
      });
    }

    const detail = await fetchArticleDetail(prid, lang);

    // Save detailed paragraphs & takeaways to Supabase if configured
    if (isSupabaseConfigured() && detail) {
      saveArticleDetail(prid, lang, detail).catch((err) =>
        console.warn('Background Supabase saveArticleDetail error:', err.message)
      );
    }

    res.json({
      success: true,
      data: detail,
    });
  } catch (error) {
    console.error('Error in /api/news/detail:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch article detail',
      error: error.message,
    });
  }
});

// API: Generate AI Visual Video Storyboard (with DB Cache)
app.post('/api/ai/storyboard', async (req, res) => {
  try {
    const { article, apiKey, lang } = req.body;

    if (!article) {
      return res.status(400).json({
        success: false,
        message: 'Article object is required in request body',
      });
    }

    const language = getSafeLang(lang || article.lang);
    const articleId = article.id || article.prid;

    // Check Supabase Cache first to save Gemini quotas & time
    if (isSupabaseConfigured() && articleId) {
      const cachedStoryboard = await getStoryboard(articleId, language);
      if (cachedStoryboard) {
        const cachedVideo = getCachedNewsVideo(articleId);
        if (cachedVideo) {
          cachedStoryboard.videoUrl = cachedVideo.videoUrl;
        }
        return res.json({
          success: true,
          cached: true,
          data: cachedStoryboard,
        });
      }
    }

    const keyToUse = process.env.GEMINI_API_KEY || apiKey;
    const storyboard = await generateGeminiStoryboard(article, keyToUse, language);

    // Attach cached video URL if present on disk
    const cachedVideo = getCachedNewsVideo(articleId);
    if (cachedVideo) {
      storyboard.videoUrl = cachedVideo.videoUrl;
    }

    // Persist to Supabase in background
    if (isSupabaseConfigured() && articleId && storyboard) {
      saveStoryboard(articleId, language, storyboard).catch((err) =>
        console.warn('Supabase saveStoryboard cache error:', err.message)
      );
    }

    // Auto-trigger broadcast MP4 video compilation in background if not already cached
    if (!cachedVideo && articleId && storyboard) {
      try {
        startNewsVideoGeneration({
          article,
          articleId,
          storyboard,
          lang: language,
        });
      } catch (vidErr) {
        console.warn('Auto video trigger warning:', vidErr.message);
      }
    }

    res.json({
      success: true,
      cached: false,
      data: storyboard,
    });
  } catch (error) {
    console.error('Error in /api/ai/storyboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI storyboard',
      error: error.message,
    });
  }
});

// API: Generate AI News Video (Broadcast MP4)
app.post('/api/ai/news-video/generate', async (req, res) => {
  try {
    const { article, articleId, prompt, size, storyboard, lang } = req.body;
    const targetId = articleId || article?.id || article?.prid;
    if (!targetId) {
      return res.status(400).json({ success: false, error: 'article or articleId is required' });
    }

    const job = startNewsVideoGeneration({
      article,
      articleId: targetId,
      prompt,
      size,
      storyboard,
      lang: lang || 'hi',
    });
    res.json({
      success: true,
      articleId: targetId,
      job,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Check News Video Status
app.get('/api/ai/news-video/status/:articleId', async (req, res) => {
  try {
    const { articleId } = req.params;
    const status = getNewsVideoJobStatus(articleId);
    res.json({
      success: true,
      articleId,
      ...status,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// API: Fact Verification & Grounded Entity-Claim Extraction (with DB Cache)
app.post('/api/news/factcheck', async (req, res) => {
  try {
    const { article, rawText, lang } = req.body;

    if (!article) {
      return res.status(400).json({
        success: false,
        message: 'Article object is required in request body',
      });
    }

    const language = getSafeLang(lang || article.lang);
    const articleId = article.id || article.prid;

    // Check Supabase Cache first
    if (isSupabaseConfigured() && articleId) {
      const cachedReport = await getFactReport(articleId, language);
      if (cachedReport) {
        return res.json({
          success: true,
          cached: true,
          data: cachedReport,
        });
      }
    }

    const factReport = await extractAndVerifyFacts({
      article,
      rawText,
      lang: language,
    });

    // Save verified report to Supabase
    if (isSupabaseConfigured() && articleId && factReport) {
      saveFactReport(articleId, language, factReport).catch((err) =>
        console.warn('Supabase saveFactReport error:', err.message)
      );
    }

    res.json({
      success: true,
      cached: false,
      data: factReport,
    });
  } catch (error) {
    console.error('Error in /api/news/factcheck:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify facts',
      error: error.message,
    });
  }
});

// Audio cache directory for persistent instant playback
const AUDIO_CACHE_DIR = path.join(__dirname, '../media/audio_cache');
if (!fs.existsSync(AUDIO_CACHE_DIR)) {
  try {
    fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
  } catch {}
}

// In-memory TTS audio cache for instant playback
const ttsCache = new Map();

// Helper to generate and cache broadcast-quality TTS audio buffer (exact match to video AI voice)
async function fetchTtsAudioBuffer(text, lang = 'hi') {
  const safeLang = getSafeLang(lang);
  const cleanText = (text || '')
    .replace(/[*#_~`]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 1500)
    .trim();

  if (!cleanText) return null;
  const hash = crypto.createHash('md5').update(`${safeLang}_${cleanText}`).digest('hex');

  // 1. Check in-memory cache
  if (ttsCache.has(hash)) {
    return ttsCache.get(hash);
  }

  // 2. Check disk file cache
  const cachedFilePath = path.join(AUDIO_CACHE_DIR, `${hash}.mp3`);
  if (fs.existsSync(cachedFilePath)) {
    try {
      const fileBuf = fs.readFileSync(cachedFilePath);
      if (fileBuf && fileBuf.length > 500) {
        ttsCache.set(hash, fileBuf);
        return fileBuf;
      }
    } catch {}
  }

  // 3. Generate high-fidelity broadcast voice using gTTS (exact same engine as video AI voice)
  try {
    const generatorScript = path.join(__dirname, 'generateTts.py');
    const pyProcess = spawn('python3', [
      generatorScript,
      '--text', cleanText,
      '--lang', safeLang,
      '--output', cachedFilePath,
    ]);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pyProcess.kill();
        reject(new Error('TTS generation timed out'));
      }, 12000);

      pyProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0 && fs.existsSync(cachedFilePath)) {
          resolve();
        } else {
          reject(new Error(`TTS generator exited with code ${code}`));
        }
      });

      pyProcess.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    if (fs.existsSync(cachedFilePath)) {
      const buffer = fs.readFileSync(cachedFilePath);
      if (ttsCache.size > 200) {
        const firstKey = ttsCache.keys().next().value;
        ttsCache.delete(firstKey);
      }
      ttsCache.set(hash, buffer);
      return buffer;
    }
  } catch (pyErr) {
    console.warn('[TTS] gTTS generator fallback:', pyErr.message);
  }

  // 4. Fallback to Google web TTS stream if Python generator was unavailable
  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${safeLang}&client=tw-ob&q=${encodeURIComponent(cleanText.slice(0, 200))}`;
    const response = await axios.get(ttsUrl, {
      responseType: 'arraybuffer',
      httpsAgent: new https.Agent({ family: 4 }),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
        Accept: '*/*',
      },
      timeout: 10000,
    });

    const buffer = Buffer.from(response.data);
    ttsCache.set(hash, buffer);
    return buffer;
  } catch (fallbackErr) {
    console.error('Fallback TTS error:', fallbackErr.message);
    return null;
  }
}

// API: Natural Indian Female Voice Audio Stream (Broadcast Quality Matching Video AI)
app.get('/api/tts', async (req, res) => {
  try {
    const text = (req.query.text || '').trim();
    const lang = getSafeLang(req.query.lang);

    if (!text) {
      return res.status(400).send('Text is required');
    }

    const buffer = await fetchTtsAudioBuffer(text, lang);
    if (!buffer) {
      return res.status(500).json({ error: 'Failed to generate speech audio' });
    }

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
    });

    return res.send(buffer);
  } catch (error) {
    console.error('Error in /api/tts:', error.message);
    res.status(500).json({ error: 'Failed to generate speech audio' });
  }
});

// ==============================================================================
// D-ID Echo Sessions & Photorealistic Real-Time Presenter Routes
// ==============================================================================

// API: Check Anchor & D-ID Service Status
app.get('/api/anchor/status', (req, res) => {
  res.json({
    success: true,
    configured: isDidConfigured(),
    provider: 'd-id-expressive-v4-echo',
    presenterName: 'Avani Sharma',
    photoUrl: '/presenter.jpg',
    features: ['realtime_echo_lip_sync', 'livekit_streaming', 'hindi_english_tts'],
  });
});

// API: Initialize or Join a D-ID Echo Session
app.post('/api/anchor/session', async (req, res) => {
  try {
    const { storyId, lang } = req.body || {};
    const safeLang = getSafeLang(lang);
    const sessionResult = await createEchoSession({ storyId, lang: safeLang });
    res.json(sessionResult);
  } catch (err) {
    console.error('Error in /api/anchor/session:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Stream Text-to-Speech Utterance into D-ID Echo Session
app.post('/api/anchor/speak', async (req, res) => {
  try {
    const { sessionId, text, lang, interrupt } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'text is required' });
    }

    const safeLang = getSafeLang(lang);
    const audioBuffer = await fetchTtsAudioBuffer(text, safeLang);
    if (!audioBuffer) {
      return res.status(500).json({ success: false, error: 'Failed to synthesize TTS audio' });
    }

    // Save temporary audio file for Python streaming worker
    const tmpAudioPath = path.join(os.tmpdir(), `echo_audio_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);
    fs.writeFileSync(tmpAudioPath, audioBuffer);

    try {
      const streamResult = await streamAudioToEchoSession({
        sessionId,
        audioFilePath: tmpAudioPath,
        format: 'mp3',
        interrupt: Boolean(interrupt),
      });
      res.json(streamResult);
    } finally {
      // Always cleanup temp audio file
      try {
        if (fs.existsSync(tmpAudioPath)) fs.unlinkSync(tmpAudioPath);
      } catch {}
    }
  } catch (err) {
    console.error('Error in /api/anchor/speak:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Send Interrupt Signal to Stop Speech in Active Session
app.post('/api/anchor/interrupt', async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId is required' });
    const result = await interruptEchoSession(sessionId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Close D-ID Echo Session
app.post('/api/anchor/close', async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (sessionId) {
      await closeEchoSession(sessionId);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`📡 PIB News API Server running on port ${PORT}`);
  console.log(`🌐 Ready to serve news at http://localhost:${PORT}/api/news`);
});
