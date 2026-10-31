import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { isSupabaseConfigured, supabase } from './supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PYTHON_PATH = fs.existsSync(path.join(PROJECT_ROOT, 'text2video_demo', 'venv', 'bin', 'python'))
  ? path.join(PROJECT_ROOT, 'text2video_demo', 'venv', 'bin', 'python')
  : 'python3';
const SCRIPT_PATH = path.join(__dirname, 'generateBroadcastVideo.py');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'media', 'videos');

// In-memory active job tracker: articleId -> { status, progress, message, videoUrl, error }
const activeJobs = new Map();

/**
 * Derives a cinematic, photorealistic visual prompt in English for the news video
 */
export function deriveNewsVisualPrompt(article = {}) {
  const title = (article.title || '').toLowerCase();
  const desc = (article.description || '').toLowerCase();
  const ministry = article.ministry || 'Government of India';
  const combined = `${title} ${desc}`.toLowerCase();

  if (/railway|train|vande bharat|station|track|bullet train|metro/i.test(combined)) {
    return 'Cinematic wide drone shot of sleek white modern Indian Vande Bharat high-speed train moving gracefully across a scenic viaduct at sunrise, photorealistic 4k, broadcast documentary footage, no text';
  }
  if (/solar|rooftop|surya|clean energy|renewable|green energy|wind|turbine/i.test(combined)) {
    return 'Gleaming rooftop solar panel array on Indian residential homes under clear blue sky, clean energy revolution, photorealistic 4k, cinematic broadcast b-roll, no text';
  }
  if (/farmer|kisan|agriculture|wheat|paddy|crop|harvest|krishi|millet/i.test(combined)) {
    return 'Prosperous Indian farmers working in golden wheat fields with modern tractors, warm sunset glow, photorealistic 4k, cinematic documentary style, no text';
  }
  if (/isro|satellite|space|rocket|chandrayaan|gaganyaan|launch/i.test(combined)) {
    return 'Powerful Indian space rocket launch with brilliant plume rising into sky, dramatic cinematic lighting, photorealistic 4k, no text';
  }
  if (/semiconductor|chip|ai|technology|digital|cyber|5g|telecom/i.test(combined)) {
    return 'Futuristic cleanroom facility with glowing silicon microchips and advanced Indian technology, 4k photorealistic, no text';
  }
  if (/hospital|health|doctor|medicine|ayushman|vaccine|pharma|clinic/i.test(combined)) {
    return 'Modern Indian clean hospital facility, doctors and healthcare specialists at work, bright ambient lighting, photorealistic 4k, no text';
  }
  if (/highway|road|expressway|bridge|tunnel|infrastructure|port|cargo/i.test(combined)) {
    return 'Multi-lane modern Indian national expressway with moving traffic through scenic mountain valley, 4k cinematic, no text';
  }
  if (/education|student|laptop|school|college|university|nep/i.test(combined)) {
    return 'Smiling Indian students using digital laptops in modern sunlit university classroom, photorealistic 4k, no text';
  }
  if (/women|shg|lakhpati didi|empowerment|artisan/i.test(combined)) {
    return 'Confident Indian women entrepreneurs collaborating in vibrant village center, bright sunlight, photorealistic 4k, no text';
  }
  if (/defense|army|navy|air force|fighter jet|tejas/i.test(combined)) {
    return 'Supersonic Indian defense fighter aircraft soaring gracefully in sky, powerful flight motion, photorealistic 4k, no text';
  }

  return `Cinematic broadcast news footage of ${ministry} development initiative in India, modern national progress, photorealistic 4k, crisp lighting, no text`;
}

/**
 * Checks if a news video is already generated and cached locally
 */
export function getCachedNewsVideo(articleId) {
  if (!articleId) return null;
  const cleanId = String(articleId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `news_${cleanId}.mp4`;
  const filePath = path.join(OUTPUT_DIR, filename);

  if (fs.existsSync(filePath)) {
    try {
      const stats = fs.statSync(filePath);
      if (stats.size > 20000) {
        return {
          filename,
          videoUrl: `/videos/${filename}`,
          fileSizeBytes: stats.size,
          cached: true,
        };
      }
    } catch (e) {
      // Ignore stat error
    }
  }
  return null;
}

/**
 * Get current generation status of a news video
 */
export function getNewsVideoJobStatus(articleId) {
  if (!articleId) return { status: 'not_found' };
  const cleanId = String(articleId).replace(/[^a-zA-Z0-9_-]/g, '_');

  // 1. Check disk first (if finished earlier)
  const cached = getCachedNewsVideo(cleanId);
  if (cached) {
    return {
      status: 'completed',
      progress: 100,
      message: 'Video ready',
      videoUrl: cached.videoUrl,
      filename: cached.filename,
      cached: true,
    };
  }

  // 2. Check in-flight jobs
  const job = activeJobs.get(cleanId);
  if (job) {
    return job;
  }

  return {
    status: 'idle',
    progress: 0,
    message: 'No video generation in progress',
  };
}

/**
 * Trigger background AI broadcast news video generation
 */
export function startNewsVideoGeneration({ article, articleId, prompt, size = '1280*720', storyboard, lang = 'hi' }) {
  const targetId = articleId || article?.id || article?.prid;
  if (!targetId) {
    throw new Error('articleId is required');
  }

  const cleanId = String(targetId).replace(/[^a-zA-Z0-9_-]/g, '_');

  // Check if video already exists on disk
  const cached = getCachedNewsVideo(cleanId);
  if (cached) {
    return {
      status: 'completed',
      progress: 100,
      message: 'Video already generated and cached',
      videoUrl: cached.videoUrl,
      filename: cached.filename,
      cached: true,
    };
  }

  // Check if job is already running
  if (activeJobs.has(cleanId)) {
    const existing = activeJobs.get(cleanId);
    if (existing.status === 'processing' || existing.status === 'starting') {
      return existing;
    }
  }

  const title = article?.title || targetId;
  const ministry = article?.ministry || (lang === 'en' ? 'Government of India' : 'भारत सरकार');

  const jobState = {
    status: 'starting',
    progress: 10.0,
    message: 'Initiating AI broadcast news video compilation...',
    videoUrl: null,
    error: null,
    startedAt: Date.now(),
  };

  activeJobs.set(cleanId, jobState);

  // Write scenes to temp file if available
  let scenesArg = [];
  const scenes = storyboard?.scenes || article?.scenes;
  if (scenes && Array.isArray(scenes) && scenes.length > 0) {
    const tmpScenesFile = path.join('/tmp', `scenes_${cleanId}.json`);
    try {
      fs.writeFileSync(tmpScenesFile, JSON.stringify(scenes), 'utf8');
      scenesArg = ['--scenes_json', tmpScenesFile];
    } catch (e) {
      console.warn('Failed to write scenes json to tmp:', e.message);
    }
  }

  const args = [
    SCRIPT_PATH,
    '--article_id', cleanId,
    '--title', title,
    '--ministry', ministry,
    '--lang', lang === 'en' ? 'en' : 'hi',
    '--output_dir', OUTPUT_DIR,
    ...scenesArg,
  ];

  // Spawn Python broadcast video generator in background
  const child = spawn('python3', args, {
    cwd: PROJECT_ROOT,
    env: process.env,
  });

  child.stdout.on('data', (chunk) => {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line.trim());
        if (data.type === 'progress') {
          jobState.status = 'processing';
          jobState.progress = Math.max(jobState.progress, data.pct || 15);
          jobState.message = data.msg || 'Compiling broadcast video...';
        } else if (data.type === 'completed') {
          jobState.status = 'completed';
          jobState.progress = 100;
          jobState.message = 'Video generation complete!';
          jobState.videoUrl = data.video_url;
          jobState.filename = data.filename;

          // Update Supabase in background
          if (isSupabaseConfigured()) {
            supabase
              .from('storyboards')
              .update({ video_url: data.video_url })
              .eq('article_id', targetId)
              .then(() => console.log(`[Supabase] Updated video_url for article ${targetId}`))
              .catch((err) => console.warn('[Supabase] video_url update error:', err.message));
          }
        } else if (data.type === 'error') {
          jobState.status = 'error';
          jobState.error = data.error;
          jobState.message = data.error;
        }
      } catch (e) {
        // Line is not JSON
      }
    }
  });

  child.stderr.on('data', (chunk) => {
    console.warn(`[Broadcast Video stderr] ${chunk.toString().trim()}`);
  });

  child.on('close', (code) => {
    if (code !== 0 && jobState.status !== 'completed') {
      jobState.status = 'error';
      if (!jobState.error) {
        jobState.error = `Video generation worker exited with code ${code}`;
        jobState.message = jobState.error;
      }
    }
  });

  return jobState;
}

