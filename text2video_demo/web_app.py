#!/usr/bin/env python3
"""
Web Interface for Wan2.1 Text-to-Video Generation
Standalone HTTP server with zero extra frontend dependencies.
Serves a responsive Web UI with live progress polling, MP4 video preview, and local gallery.
"""

import os
import json
import time
import pathlib
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from core import WanVideoClient, VideoGenerationError, DEFAULT_SPACE_ID, OUTPUT_DIR

PORT = int(os.getenv("PORT", "7860"))

# In-memory job state store
jobs = {}

def background_generate(job_id, prompt, size, watermark, seed, space_id):
    jobs[job_id]["status"] = "connecting"
    jobs[job_id]["message"] = f"Connecting to Space: {space_id}..."
    jobs[job_id]["progress"] = 5.0

    def on_progress(msg, pct):
        jobs[job_id]["message"] = msg
        jobs[job_id]["progress"] = round(pct, 1)

    try:
        client = WanVideoClient(space_id=space_id, timeout=450)
        result = client.generate_t2v(
            prompt=prompt,
            size=size,
            watermark=watermark,
            seed=seed,
            progress_callback=on_progress
        )
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["progress"] = 100.0
        jobs[job_id]["message"] = "Video generation complete!"
        jobs[job_id]["result"] = {
            "filename": result["filename"],
            "video_url": f"/videos/{result['filename']}",
            "elapsed_seconds": result["elapsed_seconds"],
            "resolution": result["resolution"],
            "file_size_mb": round(result["file_size_bytes"] / (1024 * 1024), 2),
            "prompt": result["prompt"]
        }
    except VideoGenerationError as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        jobs[job_id]["message"] = str(e)
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = f"Unexpected error: {str(e)}"
        jobs[job_id]["message"] = f"Unexpected error: {str(e)}"


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wan2.1 Text-to-Video AI Generator</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #0c1017;
      --bg-surface: #151c28;
      --bg-card: #1c2536;
      --border-color: #2b3952;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --primary-glow: rgba(59, 130, 246, 0.25);
      --accent: #8b5cf6;
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --radius: 12px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-base);
      color: var(--text-main);
      font-family: 'Plus Jakarta Sans', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      line-height: 1.5;
    }
    header {
      background: rgba(21, 28, 40, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-color);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .logo-area { display: flex; align-items: center; gap: 0.75rem; }
    .logo-badge {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      color: white;
      padding: 0.4rem 0.75rem;
      border-radius: 8px;
      font-weight: 800;
      font-size: 0.9rem;
      letter-spacing: 0.5px;
    }
    .brand-title { font-size: 1.15rem; font-weight: 700; }
    .brand-sub { font-size: 0.75rem; color: var(--text-muted); }

    .service-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
      padding: 0.35rem 0.85rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .pulse-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #fbbf24; box-shadow: 0 0 8px #fbbf24;
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }

    main {
      flex: 1;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 2rem;
    }
    @media (max-width: 900px) {
      main { grid-template-columns: 1fr; }
    }

    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 1.5rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.25);
    }
    .card-title {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    label {
      display: block;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 0.4rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .form-group { margin-bottom: 1.25rem; }
    textarea, select, input[type="text"], input[type="number"] {
      width: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      color: var(--text-main);
      font-family: inherit;
      font-size: 0.95rem;
      transition: all 0.2s;
    }
    textarea:focus, select:focus, input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
    }
    textarea { resize: vertical; min-height: 110px; }

    .presets {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .preset-pill {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      font-size: 0.78rem;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .preset-pill:hover {
      background: var(--primary-glow);
      color: var(--text-main);
      border-color: var(--primary);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      user-select: none;
      margin-top: 0.5rem;
    }
    .checkbox-group input { width: 16px; height: 16px; accent-color: var(--primary); }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-family: inherit;
      font-weight: 700;
      font-size: 0.95rem;
      padding: 0.85rem 1.5rem;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      width: 100%;
    }
    .btn-primary {
      background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
      color: white;
      box-shadow: 0 4px 15px var(--primary-glow);
    }
    .btn-primary:hover:not(:disabled) {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
    }

    .status-box {
      margin-top: 1.25rem;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1rem;
      display: none;
    }
    .status-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }
    .progress-bar-bg {
      height: 8px;
      background: rgba(255,255,255,0.08);
      border-radius: 999px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #10b981);
      width: 0%;
      transition: width 0.4s ease;
    }
    .status-msg {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-top: 0.6rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .error-banner {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      padding: 0.85rem;
      border-radius: 8px;
      font-size: 0.88rem;
      margin-top: 1rem;
      display: none;
    }

    .preview-card {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .video-viewport {
      background: #06090e;
      border: 1px dashed var(--border-color);
      border-radius: 8px;
      min-height: 280px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      margin-bottom: 1rem;
      position: relative;
    }
    .empty-state {
      text-align: center;
      color: var(--text-muted);
      padding: 2rem;
    }
    .empty-icon { font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.6; }
    video {
      width: 100%;
      max-height: 440px;
      display: none;
      background: black;
      border-radius: 8px;
    }
    .meta-details {
      font-size: 0.8rem;
      color: var(--text-muted);
      background: var(--bg-card);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      display: none;
    }
    .meta-item { display: flex; justify-content: space-between; margin-bottom: 0.35rem; }
    .meta-item:last-child { margin-bottom: 0; }
    .meta-label { color: var(--text-muted); }
    .meta-val { font-family: 'JetBrains Mono', monospace; color: var(--text-main); }

    .gallery-title { font-size: 0.95rem; font-weight: 700; margin: 1.5rem 0 0.75rem 0; }
    .gallery-list {
      max-height: 200px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .gallery-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8rem;
      text-decoration: none;
      color: var(--text-main);
      transition: background 0.2s;
    }
    .gallery-item:hover { background: rgba(59, 130, 246, 0.15); border-color: var(--primary); }

    .disclaimer-card {
      grid-column: 1 / -1;
      background: rgba(21, 28, 40, 0.5);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 1rem 1.5rem;
      font-size: 0.8rem;
      color: var(--text-muted);
      line-height: 1.6;
    }
    .disclaimer-card strong { color: var(--text-main); }
  </style>
</head>
<body>
  <header>
    <div class="logo-area">
      <div class="logo-badge">Wan 2.1</div>
      <div>
        <div class="brand-title">Text-to-Video Engine</div>
        <div class="brand-sub">Free Public Space Integration via gradio_client</div>
      </div>
    </div>
    <div class="service-badge" title="Connects to Hugging Face Free Public GPU Space">
      <div class="pulse-dot"></div>
      <span>Hugging Face Public Model</span>
    </div>
  </header>

  <main>
    <!-- Left: Generation Form -->
    <div class="card">
      <div class="card-title">
        <span>✨ Video Generator</span>
      </div>

      <div class="form-group">
        <label>Space Repository ID</label>
        <input type="text" id="spaceId" value="Wan-AI/Wan2.1" placeholder="Wan-AI/Wan2.1">
      </div>

      <div class="form-group">
        <label>Text Prompt</label>
        <textarea id="promptInput" placeholder="Describe the scene in detail (e.g., A majestic lion walking gracefully through golden savanna grass at golden hour, cinematic 4k)"></textarea>
        <div class="presets">
          <span class="preset-pill" onclick="setPrompt('A blooming red rose opening up in soft morning sunlight, macro time-lapse, 4k')">🌸 Blooming Rose</span>
          <span class="preset-pill" onclick="setPrompt('A golden eagle soaring over snow-covered Himalayan mountain peaks, cinematic')">🦅 Soaring Eagle</span>
          <span class="preset-pill" onclick="setPrompt('A futuristic cyberpunk city with neon holograms and flying cars in rain')">🌆 Cyberpunk City</span>
          <span class="preset-pill" onclick="setPrompt('Ocean waves crashing dramatically against jagged rocky cliffs at sunset')">🌊 Ocean Sunset</span>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Resolution</label>
          <select id="sizeSelect">
            <option value="832*1088" selected>832×1088 (Fast Portrait)</option>
            <option value="1280*720">1280×720 (16:9 Landscape)</option>
            <option value="960*960">960×960 (1:1 Square)</option>
            <option value="720*1280">720×1280 (9:16 Vertical)</option>
            <option value="1088*832">1088×832 (Landscape)</option>
          </select>
        </div>

        <div class="form-group">
          <label>Seed (-1 = Random)</label>
          <input type="number" id="seedInput" value="-1" step="1">
        </div>
      </div>

      <div class="form-group">
        <label class="checkbox-group">
          <input type="checkbox" id="watermarkCheck">
          <span>Include Wan watermark</span>
        </label>
      </div>

      <button id="generateBtn" class="btn btn-primary" onclick="startGeneration()">
        <span>🚀 Generate Video</span>
      </button>

      <div id="statusBox" class="status-box">
        <div class="status-header">
          <span id="statusTitle">Queued...</span>
          <span id="statusPercent">0%</span>
        </div>
        <div class="progress-bar-bg">
          <div id="progressBar" class="progress-bar-fill"></div>
        </div>
        <div id="statusMsg" class="status-msg">
          <span>⏳</span>
          <span id="statusText">Connecting to Space queue...</span>
        </div>
      </div>

      <div id="errorBanner" class="error-banner"></div>
    </div>

    <!-- Right: Video Preview & Local Gallery -->
    <div class="card preview-card">
      <div class="card-title">
        <span>🎬 Video Preview</span>
      </div>

      <div class="video-viewport">
        <div id="emptyState" class="empty-state">
          <div class="empty-icon">🎥</div>
          <p>Generated MP4 video will appear here.</p>
          <small>Videos are automatically saved locally.</small>
        </div>
        <video id="videoPlayer" controls autoplay loop playsinline></video>
      </div>

      <div id="metaDetails" class="meta-details">
        <div class="meta-item">
          <span class="meta-label">Resolution:</span>
          <span id="metaRes" class="meta-val">-</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">File Size:</span>
          <span id="metaSize" class="meta-val">-</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Generation Time:</span>
          <span id="metaTime" class="meta-val">-</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Local File:</span>
          <span id="metaFilename" class="meta-val">-</span>
        </div>
      </div>

      <a id="downloadBtn" class="btn btn-primary" style="display: none; text-decoration: none;" download>
        ⬇️ Download Video (MP4)
      </a>

      <div class="gallery-title">📁 Locally Saved Videos</div>
      <div id="galleryList" class="gallery-list">
        <span style="font-size:0.8rem; color:var(--text-muted);">Loading gallery...</span>
      </div>
    </div>

    <!-- Bottom: Architecture & Transparency Disclaimer -->
    <div class="disclaimer-card">
      <strong>ℹ️ Architecture & Free Model Transparency:</strong>
      This application integrates directly with the free community Space <code>Wan-AI/Wan2.1</code> hosted on Hugging Face using the official <code>gradio_client</code> Python library.
      Because this operates on shared public GPUs without paid API keys, generation requests enter the shared queue.
      If the Space was inactive, it may undergo a brief cold-start (30–60s) before processing.
      Availability, queue speed, and generation limits depend entirely on Hugging Face's public infrastructure and are not guaranteed to remain permanent or unlimited.
    </div>
  </main>

  <script>
    let activeJobId = null;
    let pollInterval = null;

    function setPrompt(text) {
      document.getElementById('promptInput').value = text;
    }

    async function refreshGallery() {
      try {
        const res = await fetch('/api/videos');
        const data = await res.json();
        const list = document.getElementById('galleryList');
        if (!data.videos || data.videos.length === 0) {
          list.innerHTML = '<span style="font-size:0.8rem; color:var(--text-muted);">No videos generated yet.</span>';
          return;
        }
        list.innerHTML = data.videos.map(v => `
          <div class="gallery-item">
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:240px;" title="${v.name}">${v.name}</span>
            <div style="display:flex; gap:0.5rem;">
              <button onclick="playLocalVideo('${v.url}', '${v.name}', '${v.size_mb}')" style="background:#3b82f6; border:none; color:white; padding:2px 8px; border-radius:4px; cursor:pointer; font-size:0.75rem;">Play</button>
              <a href="${v.url}" download="${v.name}" style="background:#2b3952; border:none; color:white; padding:2px 8px; border-radius:4px; cursor:pointer; font-size:0.75rem; text-decoration:none;">Download</a>
            </div>
          </div>
        `).join('');
      } catch (err) {
        console.error('Gallery refresh failed:', err);
      }
    }

    function playLocalVideo(url, name, sizeMb) {
      const video = document.getElementById('videoPlayer');
      const emptyState = document.getElementById('emptyState');
      const meta = document.getElementById('metaDetails');
      const dl = document.getElementById('downloadBtn');

      emptyState.style.display = 'none';
      video.style.display = 'block';
      video.src = url;
      video.load();
      video.play().catch(() => {});

      meta.style.display = 'block';
      document.getElementById('metaFilename').innerText = name;
      document.getElementById('metaSize').innerText = sizeMb + ' MB';
      document.getElementById('metaRes').innerText = 'Local Storage';
      document.getElementById('metaTime').innerText = 'Completed';

      dl.style.display = 'inline-flex';
      dl.href = url;
    }

    async function startGeneration() {
      const prompt = document.getElementById('promptInput').value.trim();
      const spaceId = document.getElementById('spaceId').value.trim() || 'Wan-AI/Wan2.1';
      const size = document.getElementById('sizeSelect').value;
      const seed = parseFloat(document.getElementById('seedInput').value) || -1;
      const watermark = document.getElementById('watermarkCheck').checked;

      if (!prompt) {
        alert('Please enter a text prompt for video generation.');
        return;
      }

      // Reset UI
      const btn = document.getElementById('generateBtn');
      const statusBox = document.getElementById('statusBox');
      const errorBanner = document.getElementById('errorBanner');
      const emptyState = document.getElementById('emptyState');
      const video = document.getElementById('videoPlayer');
      const dl = document.getElementById('downloadBtn');
      const meta = document.getElementById('metaDetails');

      btn.disabled = true;
      errorBanner.style.display = 'none';
      statusBox.style.display = 'block';
      updateProgress('Submitting to queue...', 5);

      try {
        const resp = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, spaceId, size, seed, watermark })
        });
        const data = await resp.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to submit job.');
        }

        activeJobId = data.job_id;
        startPolling(activeJobId);
      } catch (err) {
        btn.disabled = false;
        statusBox.style.display = 'none';
        errorBanner.innerText = err.message;
        errorBanner.style.display = 'block';
      }
    }

    function updateProgress(msg, pct) {
      document.getElementById('statusPercent').innerText = Math.round(pct) + '%';
      document.getElementById('progressBar').style.width = pct + '%';
      document.getElementById('statusText').innerText = msg;
    }

    function startPolling(jobId) {
      if (pollInterval) clearInterval(pollInterval);

      pollInterval = setInterval(async () => {
        try {
          const resp = await fetch(`/api/status?job_id=${jobId}`);
          const job = await resp.json();

          if (job.status === 'connecting' || job.status === 'processing') {
            updateProgress(job.message || 'Processing...', job.progress || 10);
          } else if (job.status === 'completed') {
            clearInterval(pollInterval);
            updateProgress('Finished! Video ready.', 100);
            document.getElementById('generateBtn').disabled = false;

            // Show video
            const r = job.result;
            playLocalVideo(r.video_url, r.filename, r.file_size_mb);
            document.getElementById('metaRes').innerText = r.resolution;
            document.getElementById('metaTime').innerText = r.elapsed_seconds + 's';

            refreshGallery();
          } else if (job.status === 'error') {
            clearInterval(pollInterval);
            document.getElementById('generateBtn').disabled = false;
            document.getElementById('statusBox').style.display = 'none';
            const errorBanner = document.getElementById('errorBanner');
            errorBanner.innerText = '❌ ' + (job.error || 'Video generation failed.');
            errorBanner.style.display = 'block';
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 2500);
    }

    // Initial load
    refreshGallery();
  </script>
</body>
</html>
"""

class RequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Mute regular HTTP request logging for cleaner stdout
        return

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path in ("/", "/index.html"):
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_TEMPLATE.encode("utf-8"))

        elif path == "/api/status":
            query = parse_qs(parsed.query)
            job_id = query.get("job_id", [""])[0]
            job = jobs.get(job_id, {"status": "not_found", "error": "Job not found"})
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(job).encode("utf-8"))

        elif path == "/api/videos":
            # List locally saved mp4 videos
            videos = []
            for file in sorted(OUTPUT_DIR.glob("*.mp4"), key=lambda f: f.stat().st_mtime, reverse=True):
                size_mb = round(file.stat().st_size / (1024 * 1024), 2)
                videos.append({
                    "name": file.name,
                    "url": f"/videos/{file.name}",
                    "size_mb": size_mb,
                    "created_at": file.stat().st_mtime
                })
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"videos": videos}).encode("utf-8"))

        elif path.startswith("/videos/"):
            filename = path.replace("/videos/", "").strip("/")
            file_path = OUTPUT_DIR / filename
            if file_path.exists() and file_path.is_file() and file_path.suffix == ".mp4":
                self.send_response(200)
                self.send_header("Content-Type", "video/mp4")
                self.send_header("Content-Length", str(file_path.stat().st_size))
                self.send_header("Accept-Ranges", "bytes")
                self.end_headers()
                with open(file_path, "rb") as f:
                    while chunk := f.read(65536):
                        self.wfile.write(chunk)
            else:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b"Video not found")

        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not found")

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/generate":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            data = json.loads(body) if body else {}

            prompt = data.get("prompt", "").strip()
            if not prompt:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Prompt cannot be empty"}).encode("utf-8"))
                return

            space_id = data.get("spaceId", DEFAULT_SPACE_ID).strip()
            size = data.get("size", "832*1088")
            watermark = bool(data.get("watermark", False))
            seed = float(data.get("seed", -1))

            job_id = f"job_{int(time.time() * 1000)}"
            jobs[job_id] = {
                "id": job_id,
                "status": "queued",
                "progress": 0.0,
                "message": "Enqueuing request...",
                "created_at": time.time()
            }

            # Run in worker thread
            thread = threading.Thread(
                target=background_generate,
                args=(job_id, prompt, size, watermark, seed, space_id),
                daemon=True
            )
            thread.start()

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "job_id": job_id}).encode("utf-8"))

def run_server():
    server_address = ("", PORT)
    httpd = HTTPServer(server_address, RequestHandler)
    print("\n" + "=" * 50)
    print(f"🎬 Wan2.1 Text-to-Video Web App running at:")
    print(f"👉 http://localhost:{PORT}")
    print(f"📁 Local Videos Directory: {OUTPUT_DIR}")
    print("=" * 50 + "\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
