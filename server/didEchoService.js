import 'dotenv/config';
import axios from 'axios';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory registry of active D-ID Echo Sessions
// Key: sessionId -> { sessionId, agentId, livekitHost, sessionToken, echoToken, storyId, lang, createdAt, lastActivity }
const activeSessions = new Map();

// Configuration
const DID_BASE_URL = process.env.DID_BASE_URL || 'https://api.d-id.com';
const DID_API_KEY = process.env.DID_API_KEY || '';
const DID_AGENT_ID = process.env.DID_AGENT_ID || '';

/**
 * Checks whether D-ID credentials are configured on this server.
 */
export function isDidConfigured() {
  return Boolean(DID_API_KEY && DID_AGENT_ID);
}

/**
 * Gets the basic authorization header for D-ID API calls.
 */
function getDidAuthHeader() {
  if (!DID_API_KEY) return null;
  // If user provided raw API key without "Basic", format it appropriately
  if (DID_API_KEY.startsWith('Basic ')) {
    return DID_API_KEY;
  }
  return `Basic ${DID_API_KEY}`;
}

/**
 * Create a new D-ID Echo Session for real-time external audio ingestion.
 * Returns credentials for the frontend (session_url, session_token) while
 * keeping echo_token and API keys strictly on the server.
 */
export async function createEchoSession({ storyId = 'general', lang = 'hi' } = {}) {
  if (!isDidConfigured()) {
    return {
      success: false,
      configured: false,
      message: 'D-ID API credentials not configured. Using high-fidelity local presenter fallback.',
      presenter: {
        name: lang === 'hi' ? 'अवनी शर्मा' : 'Avani Sharma',
        title: lang === 'hi' ? 'वरिष्ठ राष्ट्रीय समाचार एंकर' : 'Senior National News Anchor',
        avatarUrl: '/presenter.jpg',
        mode: 'fallback_photorealistic',
      },
    };
  }

  try {
    const authHeader = getDidAuthHeader();
    const agentEndpoint = `${DID_BASE_URL}/v2/agents/${DID_AGENT_ID}/sessions`;

    const response = await axios.post(
      agentEndpoint,
      { session_type: 'echo' },
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 15000,
      }
    );

    const sessionData = response.data;
    const sessionId = sessionData.id || `sess_${Date.now()}`;
    const sessionUrl = sessionData.session_url;
    const sessionToken = sessionData.session_token;
    const echoToken = sessionData.echo_token;

    if (!sessionUrl || !echoToken) {
      throw new Error('D-ID API did not return valid session_url or echo_token');
    }

    const livekitHost = sessionUrl.split('/room/')[0];

    // Store private session record in memory
    activeSessions.set(sessionId, {
      sessionId,
      agentId: DID_AGENT_ID,
      livekitHost,
      sessionToken,
      echoToken,
      storyId,
      lang,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    });

    // Clean up sessions older than 2 hours
    cleanupExpiredSessions();

    return {
      success: true,
      configured: true,
      sessionId,
      sessionUrl,
      sessionToken,
      presenter: {
        name: lang === 'hi' ? 'अवनी शर्मा' : 'Avani Sharma',
        title: lang === 'hi' ? 'वरिष्ठ राष्ट्रीय समाचार एंकर' : 'Senior National News Anchor',
        avatarUrl: '/presenter.jpg',
        mode: 'did_expressive_v4_echo',
      },
    };
  } catch (error) {
    console.error('Error creating D-ID Echo session:', error.response?.data || error.message);
    return {
      success: false,
      configured: true,
      error: error.response?.data?.message || error.message,
      message: 'Failed to create D-ID Echo session. Falling back to local photorealistic presenter.',
      presenter: {
        name: lang === 'hi' ? 'अवनी शर्मा' : 'Avani Sharma',
        title: lang === 'hi' ? 'वरिष्ठ राष्ट्रीय समाचार एंकर' : 'Senior National News Anchor',
        avatarUrl: '/presenter.jpg',
        mode: 'fallback_photorealistic',
      },
    };
  }
}

/**
 * Streams an audio file/buffer into an active Echo session via the Python LiveKit worker.
 */
export async function streamAudioToEchoSession({
  sessionId,
  audioFilePath,
  format = 'mp3',
  interrupt = false,
}) {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found or has expired`);
  }

  session.lastActivity = Date.now();

  const workerScript = path.join(__dirname, 'echoStreamingWorker.py');
  const args = [
    workerScript,
    '--action', 'stream',
    '--livekit_url', session.livekitHost,
    '--echo_token', session.echoToken,
    '--audio_file', audioFilePath,
    '--format', format,
  ];

  if (interrupt) {
    args.push('--interrupt');
  }

  return new Promise((resolve, reject) => {
    const pythonProc = spawn('python3', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdoutData = '';
    let stderrData = '';

    pythonProc.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    pythonProc.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    pythonProc.on('close', (code) => {
      if (code === 0) {
        try {
          const parsed = JSON.parse(stdoutData.trim());
          resolve(parsed);
        } catch {
          resolve({ success: true, raw: stdoutData.trim() });
        }
      } else {
        reject(new Error(`Echo worker failed (code ${code}): ${stderrData || stdoutData}`));
      }
    });

    pythonProc.on('error', (err) => {
      reject(new Error(`Failed to spawn echo streaming worker: ${err.message}`));
    });
  });
}

/**
 * Sends an interrupt signal to stop currently playing utterance in an active session.
 */
export async function interruptEchoSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (!session) return { success: false, error: 'Session not found' };

  session.lastActivity = Date.now();

  const workerScript = path.join(__dirname, 'echoStreamingWorker.py');
  const args = [
    workerScript,
    '--action', 'interrupt',
    '--livekit_url', session.livekitHost,
    '--echo_token', session.echoToken,
  ];

  return new Promise((resolve) => {
    const pythonProc = spawn('python3', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    pythonProc.stdout.on('data', (c) => (stdout += c.toString()));
    pythonProc.on('close', (code) => {
      resolve({ success: code === 0 });
    });
    pythonProc.on('error', () => {
      resolve({ success: false });
    });
  });
}

/**
 * Closes a D-ID Echo session and frees resources.
 */
export async function closeEchoSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (!session) return { success: true };

  activeSessions.delete(sessionId);

  try {
    const authHeader = getDidAuthHeader();
    if (authHeader && session.agentId) {
      await axios.delete(
        `${DID_BASE_URL}/v2/agents/${session.agentId}/sessions/${sessionId}`,
        {
          headers: { Authorization: authHeader },
          timeout: 5000,
        }
      ).catch(() => {});
    }
  } catch {}

  return { success: true };
}

/**
 * Cleans up stale sessions older than 2 hours.
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  const maxAge = 2 * 60 * 60 * 1000;
  for (const [id, s] of activeSessions.entries()) {
    if (now - s.lastActivity > maxAge) {
      closeEchoSession(id).catch(() => {});
    }
  }
}
