#!/usr/bin/env python3
"""
BharatVani High-Fidelity Broadcast TTS Engine (Exact Match to Video AI Voice)
Uses gTTS (Google Text-to-Speech) for full-length, crystal-clear Indian news audio.
"""

import sys
import os
import argparse
from gtts import gTTS

def main():
    parser = argparse.ArgumentParser(description="BharatVani Broadcast TTS Generator")
    parser.add_argument("--text", required=True, help="Text to speak")
    parser.add_argument("--lang", default="hi", help="Language code (hi, en, ta, te, gu)")
    parser.add_argument("--output", default="", help="Output MP3 file path")
    args = parser.parse_args()

    clean_text = args.text.strip()
    if not clean_text:
        sys.exit(1)

    lang_code = args.lang.lower()
    if lang_code not in ["hi", "en", "ta", "te", "gu"]:
        lang_code = "hi"

    try:
        if lang_code == "en":
            tts = gTTS(clean_text, lang="en", tld="co.in")
        else:
            tts = gTTS(clean_text, lang=lang_code)

        if args.output:
            tts.save(args.output)
        else:
            tts.write_to_fp(sys.stdout.buffer)
    except Exception as e:
        sys.stderr.write(f"TTS Error: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
