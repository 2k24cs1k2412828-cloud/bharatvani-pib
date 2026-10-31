#!/usr/bin/env python3
"""
News Video Generation Script for BharatVani
Bridges the Wan2.1 Text-to-Video Engine to the Express Server
"""

import sys
import os
import json
import argparse
import pathlib

# Add text2video_demo to sys.path so core.py can be imported directly
current_dir = pathlib.Path(__file__).resolve().parent
project_root = current_dir.parent
demo_dir = project_root / "text2video_demo"
sys.path.insert(0, str(demo_dir))

try:
    from core import WanVideoClient, VideoGenerationError, DEFAULT_SPACE_ID
except ImportError as e:
    print(json.dumps({"type": "error", "error": f"Failed to import WanVideoClient: {e}"}), flush=True)
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Generate AI Video for BharatVani News")
    parser.add_argument("--article_id", required=True, help="Unique Article ID")
    parser.add_argument("--prompt", required=True, help="Visual cinematic prompt in English")
    parser.add_argument("--size", default="1280*720", help="Video resolution (e.g. 1280*720 or 832*1088)")
    parser.add_argument("--output_dir", default=str(project_root / "media" / "videos"), help="Output directory")
    args = parser.parse_args()

    output_dir = pathlib.Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    target_filename = f"news_{args.article_id}.mp4"
    target_path = output_dir / target_filename

    # If already generated and valid, return immediately
    if target_path.exists() and target_path.stat().st_size > 10000:
        print(json.dumps({
            "type": "completed",
            "video_url": f"/videos/{target_filename}",
            "filename": target_filename,
            "cached": True,
            "file_size": target_path.stat().st_size
        }), flush=True)
        return

    def on_progress(message, pct):
        print(json.dumps({
            "type": "progress",
            "pct": round(pct, 1),
            "msg": message
        }), flush=True)

    hf_token = os.getenv("HF_TOKEN") or None
    space_id = os.getenv("WAN_SPACE_ID", DEFAULT_SPACE_ID)

    try:
        client = WanVideoClient(space_id=space_id, hf_token=hf_token, timeout=450)
        on_progress("Submitting news scene to Wan2.1 Space...", 5.0)

        result = client.generate_t2v(
            prompt=args.prompt,
            size=args.size,
            watermark=False,
            seed=-1,
            progress_callback=on_progress
        )

        # Move/copy the result to our permanent news target path
        generated_source = pathlib.Path(result["local_path"])
        if generated_source.exists():
            import shutil
            shutil.copy2(str(generated_source), str(target_path))

        print(json.dumps({
            "type": "completed",
            "video_url": f"/videos/{target_filename}",
            "filename": target_filename,
            "cached": False,
            "elapsed_seconds": result.get("elapsed_seconds", 0),
            "file_size": target_path.stat().st_size if target_path.exists() else 0
        }), flush=True)

    except VideoGenerationError as e:
        print(json.dumps({"type": "error", "error": str(e)}), flush=True)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"type": "error", "error": f"Unexpected error: {str(e)}"}), flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
