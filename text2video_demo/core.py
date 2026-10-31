"""
Core Video Generation Engine for Wan2.1 Hugging Face Space
Uses gradio_client to interact with public free spaces without paid APIs.
"""

import os
import time
import shutil
import pathlib
import logging
from typing import Optional, Callable, Dict, Any
from gradio_client import Client
from dotenv import load_dotenv
import requests

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("wan2.1_core")

DEFAULT_SPACE_ID = "Wan-AI/Wan2.1"
OUTPUT_DIR = pathlib.Path(__file__).parent / "generated_videos"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


class VideoGenerationError(Exception):
    """Custom exception with friendly error messages."""
    pass


class WanVideoClient:
    def __init__(self, space_id: Optional[str] = None, hf_token: Optional[str] = None, timeout: int = 450):
        self.space_id = space_id or os.getenv("WAN_SPACE_ID", DEFAULT_SPACE_ID)
        self.hf_token = hf_token or os.getenv("HF_TOKEN")
        self.timeout = timeout
        self.client: Optional[Client] = None
        self._init_client()

    def _init_client(self):
        """Initializes the Gradio Client with graceful connection and sleeping space handling."""
        logger.info(f"Connecting to Space: {self.space_id}")
        try:
            if self.hf_token:
                self.client = Client(self.space_id, hf_token=self.hf_token)
            else:
                self.client = Client(self.space_id)
            logger.info("Successfully loaded Space API.")
        except Exception as e:
            err_msg = str(e)
            if "Sleeping" in err_msg or "waking up" in err_msg.lower():
                raise VideoGenerationError(
                    f"The Hugging Face Space '{self.space_id}' is currently sleeping or waking up. "
                    "Please wait 1-2 minutes for the GPU container to spin up and try again."
                )
            elif "429" in err_msg or "rate limit" in err_msg.lower():
                raise VideoGenerationError(
                    "Hugging Face rate limit reached. Please wait a few minutes before requesting again."
                )
            else:
                raise VideoGenerationError(f"Failed to connect to Space '{self.space_id}': {err_msg}")

    def inspect_endpoints(self) -> Dict[str, Any]:
        """Returns API specification for verification."""
        if not self.client:
            self._init_client()
        return self.client.view_api(return_format="dict")

    def generate_t2v(
        self,
        prompt: str,
        size: str = "832*1088",
        watermark: bool = False,
        seed: float = -1,
        progress_callback: Optional[Callable[[str, float], None]] = None,
        poll_interval: float = 3.0,
    ) -> Dict[str, Any]:
        """
        Sends prompt to /t2v_generation_async and polls /status_refresh until video is generated.
        
        Args:
            prompt: Text prompt describing the video.
            size: Resolution ('1280*720', '960*960', '720*1280', '1088*832', '832*1088')
            watermark: Whether to apply wan watermark
            seed: Random seed or -1
            progress_callback: Optional callback func(status_text: str, progress_pct: float)
            poll_interval: Seconds between status polls
            
        Returns:
            dict containing local_path, filename, duration, size, and prompt
        """
        if not prompt or not prompt.strip():
            raise VideoGenerationError("Prompt cannot be empty.")

        valid_sizes = ['1280*720', '960*960', '720*1280', '1088*832', '832*1088']
        if size not in valid_sizes:
            size = "832*1088"

        if not self.client:
            self._init_client()

        if progress_callback:
            progress_callback("Submitting prompt to Space queue...", 5.0)

        # 1. Trigger generation via verified endpoint: /t2v_generation_async
        try:
            logger.info(f"Submitting prompt: '{prompt}' (size={size}, seed={seed})")
            res = self.client.predict(
                prompt=prompt.strip(),
                size=size,
                watermark_wan=watermark,
                seed=float(seed),
                api_name="/t2v_generation_async",
            )
            logger.info(f"Async response received: {res}")
        except Exception as e:
            err_str = str(e)
            if "queue is full" in err_str.lower() or "GPU" in err_str:
                raise VideoGenerationError("The free GPU queue on Hugging Face is currently congested. Please retry in a few moments.")
            raise VideoGenerationError(f"Failed to submit generation request: {err_str}")

        start_time = time.time()
        last_progress = 10.0

        if progress_callback:
            progress_callback("Generation queued. Waiting for GPU processing...", last_progress)

        # 2. Poll /status_refresh until output video is ready
        while time.time() - start_time < self.timeout:
            time.sleep(poll_interval)
            elapsed = int(time.time() - start_time)

            try:
                status = self.client.predict(api_name="/status_refresh")
            except Exception as poll_err:
                logger.warning(f"Status poll failed (will retry): {poll_err}")
                continue

            # status format: (generated_video, cost_timesecs, estimated_waiting_timesecs, slider_progress)
            video_data = None
            progress_info = None
            est_wait = None

            if isinstance(status, (list, tuple)):
                if len(status) > 0:
                    video_data = status[0]
                if len(status) > 2:
                    est_wait = status[2]
                if len(status) > 3:
                    progress_info = status[3]

            # Parse progress percentage and label if available
            status_label = f"Processing on GPU ({elapsed}s elapsed)..."
            pct = min(15.0 + (elapsed / 60.0) * 40.0, 95.0)

            if isinstance(progress_info, dict):
                label = progress_info.get("label")
                val = progress_info.get("value")
                if label:
                    status_label = f"{label} ({elapsed}s elapsed)"
                if isinstance(val, (int, float)) and val > 0:
                    pct = max(float(val), pct)
            elif isinstance(progress_info, (int, float)):
                pct = max(float(progress_info), pct)

            if progress_callback:
                progress_callback(status_label, pct)

            # Check if video output has resolved
            video_path = self._extract_video_path(video_data)
            if video_path:
                logger.info(f"Video ready from Space: {video_path}")
                if progress_callback:
                    progress_callback("Video received! Saving to local storage...", 98.0)

                saved_local_path = self._save_video_locally(video_path, prompt)
                if progress_callback:
                    progress_callback("Completed!", 100.0)

                return {
                    "success": True,
                    "prompt": prompt,
                    "resolution": size,
                    "elapsed_seconds": elapsed,
                    "local_path": str(saved_local_path),
                    "filename": saved_local_path.name,
                    "file_size_bytes": saved_local_path.stat().st_size,
                }

        raise VideoGenerationError(
            f"Generation timed out after {self.timeout} seconds. The public Space queue may be experiencing high load."
        )

    def _extract_video_path(self, video_data: Any) -> Optional[str]:
        """Extracts valid local file path or remote URL from Gradio output."""
        if not video_data:
            return None

        # Format 1: dict(value=dict(...)) or dict(video=...)
        if isinstance(video_data, dict):
            val = video_data.get("value")
            if val is not None:
                if isinstance(val, dict):
                    # check 'video' or 'path'
                    vid = val.get("video")
                    if isinstance(vid, dict):
                        return vid.get("path") or vid.get("url")
                    if isinstance(vid, str):
                        return vid
                    return val.get("path") or val.get("url")
                elif isinstance(val, str) and (val.endswith(".mp4") or "http" in val):
                    return val

            # Check direct keys
            vid = video_data.get("video")
            if isinstance(vid, dict):
                return vid.get("path") or vid.get("url")
            elif isinstance(vid, str):
                return vid

            path = video_data.get("path")
            if path and isinstance(path, str):
                return path

            url = video_data.get("url")
            if url and isinstance(url, str):
                return url

        elif isinstance(video_data, str) and len(video_data) > 4:
            return video_data

        return None

    def _save_video_locally(self, source_path_or_url: str, prompt: str) -> pathlib.Path:
        """Copies or downloads the generated MP4 to local output directory."""
        clean_slug = "".join(c for c in prompt[:24] if c.isalnum() or c in (" ", "-", "_")).strip().replace(" ", "_")
        filename = f"wan21_{int(time.time())}_{clean_slug or 'video'}.mp4"
        dest_file = OUTPUT_DIR / filename

        if source_path_or_url.startswith("http://") or source_path_or_url.startswith("https://"):
            logger.info(f"Downloading video from URL: {source_path_or_url}")
            resp = requests.get(source_path_or_url, stream=True, timeout=120)
            resp.raise_for_status()
            with open(dest_file, "wb") as f:
                for chunk in resp.iter_content(chunk_size=16384):
                    f.write(chunk)
        else:
            # Local path downloaded by gradio_client cache
            src = pathlib.Path(source_path_or_url)
            if src.exists():
                shutil.copy2(src, dest_file)
            else:
                raise VideoGenerationError(f"Generated file not found at: {source_path_or_url}")

        logger.info(f"Saved locally to {dest_file} ({dest_file.stat().st_size} bytes)")
        return dest_file
