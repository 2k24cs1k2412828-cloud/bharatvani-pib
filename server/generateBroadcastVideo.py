#!/usr/bin/env python3
"""
BharatVani Contextual Broadcast News Video Generator
Creates high-definition 720p MP4 broadcast news videos deeply aligned
with the specific news topic (Khadi, Varanasi, Railways, Solar, Defense, etc.)
- Deep contextual topic classification
- Dynamic Ken-Burns camera motion
- TV broadcast lower-thirds & live ticker in Devanagari & English
- Robust fallback graphics when external image CDN is slow/offline
- Synchronized natural voiceover
"""

import os
import sys
import json
import argparse
import pathlib
import subprocess
import tempfile
import requests
from PIL import Image, ImageDraw, ImageFont
from gtts import gTTS

current_dir = pathlib.Path(__file__).resolve().parent
project_root = current_dir.parent

DEVANAGARI_FONT_PATH = "/usr/share/fonts/google-droid-sans-fonts/DroidSansDevanagari-Regular.ttf"
if not os.path.exists(DEVANAGARI_FONT_PATH):
    DEVANAGARI_FONT_PATH = "/usr/share/fonts/google-noto-vf/NotoSansDevanagari[wght].ttf"
SANS_FONT_PATH = "/usr/share/fonts/google-noto-vf/NotoSans[wght].ttf"

# Thematic Color Palettes for Indian National News Domains
DOMAIN_PALETTES = {
    "varanasi": {"bg_top": (88, 28, 135), "bg_bot": (30, 27, 75), "accent": (249, 115, 22), "label": "सांस्कृतिक धरोहर एवं काशी विकास"},
    "khadi": {"bg_top": (120, 53, 15), "bg_bot": (28, 25, 23), "accent": (245, 158, 11), "label": "खादी एवं ग्रामोद्योग क्रांति"},
    "railways": {"bg_top": (30, 58, 138), "bg_bot": (15, 23, 42), "accent": (56, 189, 248), "label": "भारतीय रेल आधुनिकीकरण"},
    "solar": {"bg_top": (21, 128, 61), "bg_bot": (15, 23, 42), "accent": (250, 204, 21), "label": "पीएम सूर्य घर एवं हरित ऊर्जा"},
    "space": {"bg_top": (49, 46, 129), "bg_bot": (10, 10, 26), "accent": (168, 85, 247), "label": "इसरो राष्ट्रीय अंतरिक्ष मिशन"},
    "semiconductor": {"bg_top": (14, 116, 144), "bg_bot": (15, 23, 42), "accent": (34, 211, 238), "label": "भारत सेमीकंडक्टर मिशन"},
    "defense": {"bg_top": (153, 27, 27), "bg_bot": (24, 24, 27), "accent": (239, 68, 68), "label": "राष्ट्रीय सुरक्षा एवं रक्षा शक्ति"},
    "agriculture": {"bg_top": (22, 101, 52), "bg_bot": (20, 30, 25), "accent": (132, 204, 22), "label": "कृषि एवं किसान कल्याण"},
    "health": {"bg_top": (15, 118, 110), "bg_bot": (15, 23, 42), "accent": (45, 212, 191), "label": "राष्ट्रीय स्वास्थ्य सेवा"},
    "education": {"bg_top": (109, 40, 217), "bg_bot": (24, 24, 27), "accent": (192, 132, 252), "label": "शिक्षा एवं युवा कौशल"},
    "infrastructure": {"bg_top": (3, 105, 161), "bg_bot": (15, 23, 42), "accent": (56, 189, 248), "label": "राष्ट्रीय राजमार्ग एवं आधारभूत ढांचा"},
    "women": {"bg_top": (190, 24, 93), "bg_bot": (30, 20, 28), "accent": (244, 114, 182), "label": "महिला सशक्तिकरण एवं स्वावलंबन"},
    "economy": {"bg_top": (4, 120, 87), "bg_bot": (15, 23, 42), "accent": (52, 211, 153), "label": "राष्ट्रीय अर्थव्यवस्था एवं वित्तीय विकास"},
    "governance": {"bg_top": (30, 58, 138), "bg_bot": (15, 23, 42), "accent": (245, 158, 11), "label": "राष्ट्रीय नीति एवं सरकारी निर्णय"},
}


def emit_progress(pct, msg):
    print(json.dumps({"type": "progress", "pct": round(pct, 1), "msg": msg}), flush=True)


def get_font(path, size):
    try:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    except Exception:
        pass
    return ImageFont.load_default()


def classify_topic(text=""):
    t = text.lower()
    if any(k in t for k in ["वाराणसी", "काशी", "घाट", "मंदिर", "varanasi", "kashi", "ghat", "banaras"]):
        return "varanasi"
    if any(k in t for k in ["खादी", "ग्रामोद्योग", "कारीगर", "शिल्प", "हथकरघा", "बुनकर", "khadi", "artisan", "handloom"]):
        return "khadi"
    if any(k in t for k in ["रेल", "ट्रेन", "वंदे भारत", "स्टेशन", "railway", "train", "vande bharat", "metro"]):
        return "railways"
    if any(k in t for k in ["सोलर", "सूर्य", "सौर", "नवीकरणीय", "solar", "rooftop", "renewable"]):
        return "solar"
    if any(k in t for k in ["अंतरिक्ष", "इसरो", "रॉकेट", "उपग्रह", "space", "isro", "satellite", "rocket"]):
        return "space"
    if any(k in t for k in ["सेमीकंडक्टर", "चिप", "इलेक्ट्रॉनिक्स", "semiconductor", "chip", "electronics"]):
        return "semiconductor"
    if any(k in t for k in ["रक्षा", "सेना", "वायुसेना", "नौसेना", "defense", "army", "navy", "military"]):
        return "defense"
    if any(k in t for k in ["किसान", "कृषि", "फसल", "एमएसपी", "farmer", "agriculture", "kisan", "crop"]):
        return "agriculture"
    if any(k in t for k in ["स्वास्थ्य", "आयुष्मान", "अस्पताल", "health", "hospital", "doctor", "medical"]):
        return "health"
    if any(k in t for k in ["शिक्षा", "विश्वविद्यालय", "छात्र", "school", "college", "education", "student"]):
        return "education"
    if any(k in t for k in ["राजमार्ग", "सड़क", "एक्सप्रेसवे", "highway", "road", "expressway", "bridge"]):
        return "infrastructure"
    if any(k in t for k in ["महिला", "लखपति दीदी", "स्वयं सहायता", "women", "shg", "lakhpati"]):
        return "women"
    if any(k in t for k in ["अर्थव्यवस्था", "बजट", "जीडीपी", "बैंक", "economy", "budget", "finance"]):
        return "economy"
    return "governance"


def create_broadcast_background(topic_key, width=1280, height=720):
    """Creates a high-end, studio-grade television news graphic backdrop"""
    pal = DOMAIN_PALETTES.get(topic_key, DOMAIN_PALETTES["governance"])
    img = Image.new("RGBA", (width, height), (15, 23, 42, 255))
    draw = ImageDraw.Draw(img)

    r1, g1, b1 = pal["bg_top"]
    r2, g2, b2 = pal["bg_bot"]

    # Smooth vertical studio gradient
    for y in range(height):
        factor = y / height
        r = int(r1 + (r2 - r1) * factor)
        g = int(g1 + (g2 - g1) * factor)
        b = int(b1 + (b2 - b1) * factor)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    # Architectural TV grid / studio geometric accent lines
    accent_rgb = pal["accent"]
    for x in range(0, width, 160):
        draw.line([(x, 0), (x, height)], fill=(accent_rgb[0], accent_rgb[1], accent_rgb[2], 18), width=1)
    for y in range(0, height, 120):
        draw.line([(0, y), (width, y)], fill=(accent_rgb[0], accent_rgb[1], accent_rgb[2], 15), width=1)

    # Ambient studio glow orb at center
    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    cx, cy = int(width * 0.5), int(height * 0.35)
    for rad in range(350, 0, -25):
        alpha = int((350 - rad) / 350 * 35)
        glow_draw.ellipse(
            [(cx - rad, cy - rad), (cx + rad, cy + rad)],
            fill=(accent_rgb[0], accent_rgb[1], accent_rgb[2], alpha)
        )
    img = Image.alpha_composite(img, glow)
    return img


def fetch_or_render_background(image_url, topic_key, tmp_dir):
    """Attempts fast download of visual; falls back instantly to rich broadcast backdrop"""
    if image_url and image_url.startswith("http"):
        try:
            headers = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"}
            resp = requests.get(image_url, headers=headers, timeout=3.5)
            if resp.status_code == 200 and len(resp.content) > 2000:
                tmp_path = os.path.join(tmp_dir, f"dl_{os.urandom(4).hex()}.jpg")
                with open(tmp_path, "wb") as f:
                    f.write(resp.content)
                img = Image.open(tmp_path).convert("RGBA")
                return img.resize((1280, 720), Image.Resampling.LANCZOS)
        except Exception:
            pass

    return create_broadcast_background(topic_key)


def render_scene_frame(base_img, headline, ministry, topic_key, lang="hi", scene_idx=1, total_scenes=3):
    """Composites a professional television lower-third and broadcast news banners"""
    overlay = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    pal = DOMAIN_PALETTES.get(topic_key, DOMAIN_PALETTES["governance"])
    topic_label = pal["label"]
    is_hindi = lang in ["hi", "hindi", "HINDI"]

    font_sans = get_font(SANS_FONT_PATH, 19)
    font_sans_bold = get_font(SANS_FONT_PATH, 20)
    font_headline = get_font(DEVANAGARI_FONT_PATH if is_hindi else SANS_FONT_PATH, 28)
    font_badge = get_font(DEVANAGARI_FONT_PATH if is_hindi else SANS_FONT_PATH, 16)

    # 1. Top Left: LIVE RED BROADCAST STRIP
    draw.rectangle([(40, 30), (280, 72)], fill=(220, 38, 38, 245))
    draw.text((54, 38), "🔴 भारतवाणी लाइव" if is_hindi else "🔴 BHARATVANI LIVE", fill=(255, 255, 255, 255), font=font_sans_bold)

    # Top Topic Pill
    draw.rectangle([(290, 30), (620, 72)], fill=(15, 23, 42, 230))
    draw.text((306, 40), f"📌 {topic_label[:28]}", fill=(pal["accent"][0], pal["accent"][1], pal["accent"][2], 255), font=font_badge)

    # Top Right: Scene Counter
    draw.rectangle([(1110, 30), (1240, 72)], fill=(15, 23, 42, 225))
    draw.text((1140, 40), f"{scene_idx}/{total_scenes}", fill=(255, 255, 255, 255), font=font_sans)

    # 2. Lower Third Box
    draw.rectangle([(40, 500), (1240, 678)], fill=(15, 23, 42, 238))
    # Glowing top accent line
    draw.rectangle([(40, 500), (1240, 506)], fill=(pal["accent"][0], pal["accent"][1], pal["accent"][2], 255))

    # Ministry Tag
    min_tag = (ministry or ("भारत सरकार" if is_hindi else "Government of India")).upper()
    draw.text((64, 518), f"🏛️ {min_tag}", fill=(56, 189, 248, 255), font=font_badge)

    # Word wrapping for headline (max 2 lines)
    words = headline.split(" ")
    lines = []
    curr_line = []
    for w in words:
        curr_line.append(w)
        if len(" ".join(curr_line)) > 40:
            lines.append(" ".join(curr_line[:-1]))
            curr_line = [w]
    if curr_line:
        lines.append(" ".join(curr_line))

    y_pos = 554
    for line in lines[:2]:
        draw.text((64, y_pos), line, fill=(255, 255, 255, 255), font=font_headline)
        y_pos += 42

    # Bottom Ticker Line (National News Tricolor Green)
    draw.rectangle([(40, 674), (1240, 678)], fill=(22, 163, 74, 255))

    return Image.alpha_composite(base_img, overlay).convert("RGB")


def render_scene_clip(scene, ministry, topic_key, lang, scene_idx, total_scenes, tmp_dir):
    headline = scene.get("headline", "")
    narration = scene.get("narration") or headline
    image_url = scene.get("visualImage")

    base_img = fetch_or_render_background(image_url, topic_key, tmp_dir)
    framed = render_scene_frame(base_img, headline, ministry, topic_key, lang, scene_idx, total_scenes)
    frame_path = os.path.join(tmp_dir, f"frame_{scene_idx}.jpg")
    framed.save(frame_path, quality=95)

    # Voiceover Audio
    audio_path = os.path.join(tmp_dir, f"audio_{scene_idx}.mp3")
    speech_lang = "hi" if lang in ["hi", "hindi", "HINDI"] else "en"
    clean_text = f"{headline}. {narration}"

    try:
        tts = gTTS(clean_text, lang=speech_lang)
        tts.save(audio_path)
    except Exception:
        tts = gTTS(headline, lang=speech_lang)
        tts.save(audio_path)

    try:
        dur_str = subprocess.check_output([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", audio_path
        ]).decode().strip()
        dur = float(dur_str)
    except Exception:
        dur = 6.0

    frames = max(int(dur * 25) + 5, 50)
    clip_output = os.path.join(tmp_dir, f"clip_{scene_idx}.mp4")

    # Camera Zoom Dynamics
    if scene_idx % 2 == 1:
        zoom_expr = "zoompan=z='min(zoom+0.0009,1.14)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
    else:
        zoom_expr = "zoompan=z='max(1.14-0.0009*on,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"

    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-i", frame_path,
        "-i", audio_path,
        "-filter_complex",
        f"[0:v]{zoom_expr}:d={frames}:s=1280x720:fps=25[v]",
        "-map", "[v]", "-map", "1:a",
        "-c:v", "libopenh264",
        "-c:a", "aac",
        "-b:a", "128k",
        "-pix_fmt", "yuv420p",
        "-shortest",
        "-movflags", "+faststart",
        clip_output
    ]

    subprocess.run(cmd, capture_output=True, check=True)
    return clip_output


def main():
    parser = argparse.ArgumentParser(description="Generate Aligned AI Broadcast News Video")
    parser.add_argument("--article_id", required=True, help="Unique Article ID")
    parser.add_argument("--title", required=True, help="News Title")
    parser.add_argument("--ministry", default="Government of India", help="Ministry name")
    parser.add_argument("--lang", default="hi", help="Language: 'hi' or 'en'")
    parser.add_argument("--scenes_json", default=None, help="JSON file or string of scenes")
    parser.add_argument("--output_dir", default=str(project_root / "media" / "videos"), help="Output directory")
    args = parser.parse_args()

    clean_id = args.article_id.replace("/", "_").replace(" ", "_")
    output_dir = pathlib.Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    final_video_name = f"news_{clean_id}.mp4"
    final_video_path = output_dir / final_video_name

    # If already generated and valid, return
    if final_video_path.exists() and final_video_path.stat().st_size > 30000:
        print(json.dumps({
            "type": "completed",
            "video_url": f"/videos/{final_video_name}",
            "filename": final_video_name,
            "cached": True,
            "file_size": final_video_path.stat().st_size
        }), flush=True)
        return

    emit_progress(10.0, "Analyzing news topic and preparing broadcast visuals...")
    topic_key = classify_topic(f"{args.title} {args.ministry}")

    # Parse scenes
    scenes = []
    if args.scenes_json:
        try:
            if os.path.exists(args.scenes_json):
                with open(args.scenes_json, "r", encoding="utf-8") as f:
                    scenes = json.load(f)
            else:
                scenes = json.loads(args.scenes_json)
        except Exception:
            scenes = []

    # If no scenes passed, synthesize deeply aligned scenes for this exact topic
    if not scenes or not isinstance(scenes, list):
        is_hi = args.lang in ["hi", "hindi", "HINDI"]
        pal = DOMAIN_PALETTES.get(topic_key, DOMAIN_PALETTES["governance"])
        topic_title = pal["label"]

        scenes = [
            {
                "sceneIndex": 1,
                "headline": args.title,
                "narration": f"नमस्कार, भारतवाणी राष्ट्रीय समाचार। {args.title}।" if is_hi else f"Welcome to BharatVani National News. {args.title}.",
                "visualImage": None,
            },
            {
                "sceneIndex": 2,
                "headline": f"{topic_title}: मुख्य विवरण एवं प्रभाव" if is_hi else f"{topic_key.upper()}: Key Details & Public Impact",
                "narration": f"इस महत्वपूर्ण पहल से नागरिकों और हितधारकों को सीधा लाभ मिलेगा और राष्ट्रीय प्रगति को नई दिशा मिलेगी।" if is_hi else "This initiative delivers direct public empowerment, accelerating transparent execution across the nation.",
                "visualImage": None,
            },
            {
                "sceneIndex": 3,
                "headline": "आत्मनिर्भर भारत की ओर ऐतिहासिक कदम" if is_hi else "Pivotal Milestone for National Growth",
                "narration": f"यह निर्णय देश को आत्मनिर्भर और सशक्त बनाने की दिशा में एक मील का पत्थर साबित होगा।" if is_hi else "A decisive leap towards an empowered, self-reliant India. Stay connected with BharatVani for verified coverage.",
                "visualImage": None,
            }
        ]

    with tempfile.TemporaryDirectory() as tmp_dir:
        clip_paths = []
        total_scenes = len(scenes)

        for idx, scene in enumerate(scenes, 1):
            pct = 15.0 + (idx / total_scenes) * 65.0
            emit_progress(pct, f"Compiling news scene {idx} of {total_scenes} ({pal['label'] if 'pal' in locals() else topic_key})...")
            clip = render_scene_clip(scene, args.ministry, topic_key, args.lang, idx, total_scenes, tmp_dir)
            clip_paths.append(clip)

        emit_progress(88.0, "Muxing broadcast video streams...")

        concat_txt = os.path.join(tmp_dir, "concat.txt")
        with open(concat_txt, "w") as f:
            for clip in clip_paths:
                f.write(f"file '{clip}'\n")

        final_cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", concat_txt,
            "-c", "copy",
            "-movflags", "+faststart",
            str(final_video_path)
        ]
        subprocess.run(final_cmd, capture_output=True, check=True)

    file_size = final_video_path.stat().st_size
    emit_progress(100.0, "Broadcast video generation complete!")

    print(json.dumps({
        "type": "completed",
        "video_url": f"/videos/{final_video_name}",
        "filename": final_video_name,
        "cached": False,
        "file_size": file_size
    }), flush=True)


if __name__ == "__main__":
    main()
