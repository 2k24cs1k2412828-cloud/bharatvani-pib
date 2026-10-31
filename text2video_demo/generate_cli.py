#!/usr/bin/env python3
"""
CLI Tool for Wan2.1 Text-to-Video Generation
Usage:
  python generate_cli.py "A majestic eagle flying above snowy peaks at sunset"
  python generate_cli.py --help
"""

import sys
import argparse
from core import WanVideoClient, VideoGenerationError, DEFAULT_SPACE_ID

def print_progress(status: str, pct: float):
    bars = int(pct / 4)
    bar_str = "█" * bars + "-" * (25 - bars)
    sys.stdout.write(f"\r[{bar_str}] {pct:5.1f}% | {status}")
    sys.stdout.flush()

def main():
    parser = argparse.ArgumentParser(description="Wan2.1 Free Text-to-Video Generator")
    parser.add_argument("prompt", type=str, help="Text description of the video to generate")
    parser.add_argument("--space", type=str, default=DEFAULT_SPACE_ID, help="Hugging Face Space ID (default: Wan-AI/Wan2.1)")
    parser.add_argument("--size", type=str, default="832*1088", choices=['1280*720', '960*960', '720*1280', '1088*832', '832*1088'], help="Video resolution")
    parser.add_argument("--watermark", action="store_true", help="Include Wan watermark")
    parser.add_argument("--seed", type=float, default=-1, help="Seed for generation (-1 for random)")
    parser.add_argument("--timeout", type=int, default=450, help="Max wait time in seconds")

    args = parser.parse_args()

    print(f"\n==========================================")
    print(f"🎬 Wan2.1 Text-to-Video Generator")
    print(f"Space ID:   {args.space}")
    print(f"Prompt:     {args.prompt}")
    print(f"Resolution: {args.size}")
    print(f"==========================================\n")

    try:
        client = WanVideoClient(space_id=args.space, timeout=args.timeout)
        result = client.generate_t2v(
            prompt=args.prompt,
            size=args.size,
            watermark=args.watermark,
            seed=args.seed,
            progress_callback=print_progress,
        )
        print("\n\n✅ Generation succeeded!")
        print(f"📁 Local Video File: {result['local_path']}")
        print(f"⏱️ Time taken:       {result['elapsed_seconds']} seconds")
        print(f"📦 File size:        {result['file_size_bytes'] / (1024*1024):.2f} MB")
    except VideoGenerationError as e:
        print(f"\n\n❌ Error: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Cancelled by user.")
        sys.exit(0)

if __name__ == "__main__":
    main()
