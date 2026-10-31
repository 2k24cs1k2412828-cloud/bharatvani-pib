# Wan2.1 Text-to-Video Generation System

A minimal, working text-to-video generation system integrating the free public Hugging Face Space **[`Wan-AI/Wan2.1`](https://huggingface.co/spaces/Wan-AI/Wan2.1)** using Python's official `gradio_client` library.

---

## 🌟 Key Features

1. **Zero Paid APIs / No Billing Required:** Directly connects to the public community Hugging Face Space `Wan-AI/Wan2.1`.
2. **Inspected Endpoint Discovery:** Endpoints were discovered directly from `client.view_api()`:
   - Async Generation: `/t2v_generation_async` with parameters `(prompt, size, watermark_wan, seed)`
   - Status & Video Polling: `/status_refresh` returning `(video_data, cost_timesecs, estimated_waiting_timesecs, slider_progress)`
3. **Resilient Space & Queue Handling:**
   - Detects sleeping spaces and provides a user-friendly wait message.
   - Handles public GPU queue congestion and timeouts gracefully.
   - Manages rate limits with informative banners.
4. **Configurable Space ID:** Easily switchable to other community mirrors or replacement models via `WAN_SPACE_ID` in `.env` or directly in the UI.
5. **Local MP4 Persistence:** Automatically saves generated videos locally to `generated_videos/` with timestamps and prompt tags.
6. **Dual Interfaces Provided:**
   - 🌐 **Web UI (`web_app.py`):** Standalone browser interface with real-time progress bar, resolution picker, prompt presets, HTML5 video preview player, and local video gallery.
   - 💻 **CLI Tool (`generate_cli.py`):** Terminal command line tool with live progress bar.

---

## 📁 Project Structure

```text
text2video_demo/
├── core.py               # Core client logic, gradio_client integration, queue polling & MP4 saver
├── web_app.py            # Responsive Web UI & HTTP server
├── generate_cli.py       # Command-line interface with progress bar
├── inspect_space.py      # Utility script to inspect Space API schema with client.view_api()
├── api_spec.json         # Dump of inspected Space endpoints & parameters
├── requirements.txt      # Python dependencies (gradio_client, requests, python-dotenv)
├── .env.example          # Sample environment configuration
├── generated_videos/     # Directory where output MP4 videos are saved locally
└── venv/                 # Python virtual environment
```

---

## 🚀 Quick Setup & Installation

### Step 1: Open Terminal and Navigate to the folder
```bash
cd "/home/mayanksoni/Documents/PROJECT_SOURCECODE/PIB - BHARATBANI/text2video_demo"
```

### Step 2: Create and Activate Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Required Dependencies
```bash
pip install -r requirements.txt
```

---

## 💻 How to Run

### Option A: Launch the Web UI
```bash
python web_app.py
```
Open your browser and navigate to:
👉 **[http://localhost:7860](http://localhost:7860)**

- Type a prompt or click one of the quick presets (e.g. *Blooming Rose*, *Soaring Eagle*, *Cyberpunk City*).
- Select your desired resolution (`832*1088`, `1280*720`, `960*960`, etc.).
- Click **🚀 Generate Video**.
- Watch the live progress percentage and status updates.
- Once finished, the video plays automatically in the player, with a direct **Download MP4** button and entry in the local gallery.

---

### Option B: Run via Terminal CLI
```bash
python generate_cli.py "A majestic golden eagle soaring over snowy mountain peaks" --size "832*1088"
```
Optional CLI parameters:
- `--size`: Resolution (`832*1088` default, `1280*720`, `960*960`, `720*1280`, `1088*832`)
- `--space`: Target Hugging Face Space (default: `Wan-AI/Wan2.1`)
- `--watermark`: Include Wan watermark
- `--seed`: Generation seed (`-1` for random)
- `--timeout`: Maximum wait time in seconds (default: `450`)

---

## 🔍 Verified API Schema (`client.view_api()`)

The Space `Wan-AI/Wan2.1` exposes the following endpoints:

| Endpoint | Parameters | Returns | Role |
|---|---|---|---|
| `/t2v_generation_async` | `prompt` (str, required)<br>`size` (str, enum)<br>`watermark_wan` (bool)<br>`seed` (float) | `(cost_timesecs, estimated_waiting_timesecs)` | Initiates text-to-video generation job |
| `/status_refresh` | None | `(generated_video, cost_timesecs, est_wait, slider_progress)` | Polls job progress, queue wait time, and retrieves generated video dict |
| `/online_process_change` | None | `generated_video` | Alternative video output hook |

---

## ⚠️ Free Public Space Transparency Notice

- **Public Shared GPU:** This tool connects to a public community Hugging Face Space. There are no paid API keys or subscription fees required.
- **Queue Wait Times:** Generation time depends directly on public queue demand. When traffic is high, your request will be queued behind earlier submissions.
- **Cold Starts (Sleeping Spaces):** If the Space was inactive, Hugging Face temporarily puts the GPU container to sleep. It may take 30–60 seconds to spin up.
- **Availability:** Hugging Face community spaces are operated by their authors and community maintainers. Service availability is subject to Hugging Face's public usage terms and is not guaranteed to be unlimited or permanent. You can change `WAN_SPACE_ID` in `.env` if another mirror is preferred.
