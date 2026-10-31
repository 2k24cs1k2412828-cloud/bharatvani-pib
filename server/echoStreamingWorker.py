#!/usr/bin/env python3
"""
BharatVani - D-ID Echo Sessions Audio Streaming Worker
Streams external TTS audio (Hindi/English) into an active D-ID Expressive V4 Echo Session via LiveKit.

Reference: https://docs.d-id.com/docs/echo-sessions-quickstart
"""

import sys
import os
import json
import time
import asyncio
import argparse
from livekit import rtc

async def stream_audio_to_echo_session(livekit_url, echo_token, audio_file_path, audio_format="mp3", interrupt=False, timeout=30):
    if not os.path.exists(audio_file_path):
        return {"success": False, "error": f"Audio file not found: {audio_file_path}"}
    
    file_size = os.path.getsize(audio_file_path)
    if file_size == 0:
        return {"success": False, "error": "Audio file is empty"}

    room = rtc.Room()
    avatar_ready = asyncio.Event()

    def on_track_subscribed(track, publication, participant):
        # When avatar video/audio track is subscribed, the avatar is ready to accept audio
        avatar_ready.set()

    room.on("track_subscribed", on_track_subscribed)

    try:
        # 1. Connect to LiveKit host with echo_token
        connect_task = room.connect(livekit_url, echo_token)
        await asyncio.wait_for(connect_task, timeout=15)
        
        # Check if remote agent participant is already present
        for participant in room.remote_participants.values():
            if participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_AGENT or participant.identity.startswith("agent"):
                for pub in participant.track_publications.values():
                    if pub.subscribed:
                        avatar_ready.set()
                        break

        # 2. Wait until avatar tracks are ready
        try:
            await asyncio.wait_for(avatar_ready.wait(), timeout=12)
        except asyncio.TimeoutError:
            # If timeout fired, proceed anyway if agent participant is present
            has_agent = any(
                p.kind == rtc.ParticipantKind.PARTICIPANT_KIND_AGENT or p.identity.startswith("agent")
                for p in room.remote_participants.values()
            )
            if not has_agent:
                pass

        # 3. Locate agent participant identities
        avatar_identities = [
            participant.identity
            for participant in room.remote_participants.values()
            if participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_AGENT
            or participant.identity.startswith("agent")
        ]

        # 4. Open byte stream on did.audio-stream topic
        stream_attributes = {"format": audio_format}
        if interrupt:
            stream_attributes["interrupt"] = "true"

        utterance_id = f"utterance-{int(time.time() * 1000)}"
        writer = await room.local_participant.stream_bytes(
            name=utterance_id,
            topic="did.audio-stream",
            attributes=stream_attributes,
            destination_identities=avatar_identities if avatar_identities else None,
        )

        # 5. Read audio file and write to stream
        with open(audio_file_path, "rb") as f:
            audio_bytes = f.read()
            await writer.write(audio_bytes)
        
        # 6. Close stream to signal end of utterance
        await writer.aclose()

        # Brief settle time to ensure final packet flush
        await asyncio.sleep(0.3)
        await room.disconnect()

        return {
            "success": True,
            "utterance_id": utterance_id,
            "bytes_sent": len(audio_bytes),
            "format": audio_format,
            "interrupt": interrupt
        }

    except Exception as e:
        try:
            await room.disconnect()
        except Exception:
            pass
        return {"success": False, "error": str(e)}

async def send_interrupt(livekit_url, echo_token):
    room = rtc.Room()
    try:
        await asyncio.wait_for(room.connect(livekit_url, echo_token), timeout=10)
        await room.local_participant.send_text("{}", topic="did.interrupt")
        await asyncio.sleep(0.2)
        await room.disconnect()
        return {"success": True, "action": "interrupt"}
    except Exception as e:
        try:
            await room.disconnect()
        except Exception:
            pass
        return {"success": False, "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="D-ID Echo Audio Streaming Worker")
    parser.add_argument("--action", choices=["stream", "interrupt"], default="stream")
    parser.add_argument("--livekit_url", required=True, help="LiveKit Server URL")
    parser.add_argument("--echo_token", required=True, help="LiveKit Echo Token from D-ID")
    parser.add_argument("--audio_file", default="", help="Path to audio file to stream")
    parser.add_argument("--format", default="mp3", choices=["mp3", "wav", "pcm16"], help="Audio encoding format")
    parser.add_argument("--interrupt", action="store_true", help="Interrupt currently playing utterance")
    parser.add_argument("--timeout", type=int, default=30, help="Stream timeout in seconds")

    args = parser.parse_args()

    if args.action == "interrupt":
        result = asyncio.run(send_interrupt(args.livekit_url, args.echo_token))
    else:
        if not args.audio_file:
            print(json.dumps({"success": False, "error": "audio_file argument is required for streaming"}))
            sys.exit(1)
        result = asyncio.run(stream_audio_to_echo_session(
            args.livekit_url,
            args.echo_token,
            args.audio_file,
            audio_format=args.format,
            interrupt=args.interrupt,
            timeout=args.timeout
        ))

    print(json.dumps(result))
    sys.exit(0 if result.get("success") else 1)

if __name__ == "__main__":
    main()
