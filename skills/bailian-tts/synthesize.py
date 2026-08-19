#!/usr/bin/env python3
"""Generate sentence-level Bailian TTS and rebuild narration timing assets.

The API key is read only from DASHSCOPE_API_KEY. It is never persisted.
"""
import argparse
import json
import math
import os
import subprocess
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
SEGMENTS = ROOT / "tts_segments"
ENDPOINT = (
    "https://token-plan.cn-beijing.maas.aliyuncs.com"
    "/api/v1/services/audio/tts/SpeechSynthesizer"
)
SR = 24000
GAP_SECONDS = 0.24
PACE = 1.19


def post_json(url, payload, api_key, timeout=120):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.status, json.loads(response.read().decode("utf-8"))


def download(url, target, timeout=120):
    # The signed URL is intentionally never printed or stored outside this fetch.
    with urllib.request.urlopen(url, timeout=timeout) as response:
        target.write_bytes(response.read())


def synthesize(index, total, text, api_key):
    raw = SEGMENTS / f"{index:02d}_raw.wav"
    normalized = SEGMENTS / f"{index:02d}.wav"
    payload = {
        "model": "qwen-audio-3.0-tts-plus",
        "input": {
            "text": text,
            "voice": "longanlingxin",
            "format": "wav",
            "sample_rate": SR,
            "instruction": "用温暖、自然、清晰的科普讲解语气朗读，语速稍快但不急促；英文和缩写要读得清楚。",
        },
    }
    last_error = None
    for attempt in range(3):
        try:
            status, result = post_json(ENDPOINT, payload, api_key)
            audio_url = result.get("output", {}).get("audio", {}).get("url")
            if status != 200 or not audio_url:
                raise RuntimeError(f"HTTP {status}; missing audio URL")
            download(audio_url, raw)
            subprocess.run(
                [
                    "ffmpeg", "-y", "-loglevel", "error", "-i", str(raw),
                    "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", str(normalized),
                ],
                check=True,
            )
            request_id = result.get("request_id", "unknown")
            print(f"sentence {index:02d}/{total:02d} ok; request_id={request_id}", flush=True)
            return normalized
        except (urllib.error.URLError, TimeoutError, RuntimeError, subprocess.CalledProcessError) as exc:
            last_error = exc
            if attempt < 2:
                delay = 2 ** attempt
                print(f"sentence {index:02d} retry {attempt + 1}/2 after {delay}s", flush=True)
                time.sleep(delay)
    raise RuntimeError(f"sentence {index:02d} failed after retries: {last_error}")


def read_pcm(path):
    with wave.open(str(path), "rb") as wav:
        if wav.getnchannels() != 1 or wav.getsampwidth() != 2 or wav.getframerate() != SR:
            raise RuntimeError(f"unexpected WAV format: {path}")
        return np.frombuffer(wav.readframes(wav.getnframes()), dtype="<i2").copy()


def trim_edges(samples):
    """Remove generated dead air while retaining a small natural edge pad."""
    frame = max(1, int(SR * 0.01))
    usable = len(samples) - len(samples) % frame
    if usable <= 0:
        return samples
    blocks = samples[:usable].astype(np.float32).reshape(-1, frame)
    rms = np.sqrt(np.mean(blocks * blocks, axis=1))
    active = np.flatnonzero(rms >= 90.0)  # about -51 dBFS
    if not len(active):
        return samples
    start = max(0, active[0] * frame - int(SR * 0.04))
    end = min(len(samples), (active[-1] + 1) * frame + int(SR * 0.08))
    return samples[start:end]


def pace_clip(index, path):
    paced = SEGMENTS / f"{index:02d}_paced.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(path),
         "-af", f"atempo={PACE}", "-ac", "1", "-ar", str(SR),
         "-c:a", "pcm_s16le", str(paced)],
        check=True,
    )
    return paced


def vtt_time(seconds):
    ms = int(round(seconds * 1000))
    h, rem = divmod(ms, 3_600_000)
    m, rem = divmod(rem, 60_000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def ass_time(seconds):
    cs = int(round(seconds * 100))
    h, rem = divmod(cs, 360_000)
    m, rem = divmod(rem, 6000)
    s, cs = divmod(rem, 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def write_ass(cues):
    header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,Heiti SC,54,&H00FFFFFF,&H00FFFFFF,&H00162F49,&HEB162F49,-1,0,0,0,100,100,1,0,3,3,0,2,70,70,105,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
"""
    rows = [
        f"Dialogue: 0,{ass_time(c['s'])},{ass_time(c['e'])},Default,,0,0,0,,{c['text']}"
        for c in cues
    ]
    (ROOT / "subtitles.ass").write_text(header + "\n".join(rows) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--assemble-only", action="store_true")
    args = parser.parse_args()
    api_key = os.environ.get("DASHSCOPE_API_KEY")
    if not args.assemble_only and not api_key:
        raise SystemExit("DASHSCOPE_API_KEY is required")
    lines = [line.strip() for line in (ROOT / "script.txt").read_text(encoding="utf-8").splitlines() if line.strip()]
    if not lines:
        raise SystemExit("script.txt has no narration sentences")
    SEGMENTS.mkdir(exist_ok=True)

    sources = []
    for i, text in enumerate(lines, 1):
        source = SEGMENTS / f"{i:02d}.wav" if args.assemble_only else synthesize(i, len(lines), text, api_key)
        if not source.exists():
            raise SystemExit(f"missing TTS segment: {source}")
        sources.append(source)
    clips = [trim_edges(read_pcm(pace_clip(i, source))) for i, source in enumerate(sources, 1)]

    gap = np.zeros(int(round(GAP_SECONDS * SR)), dtype=np.int16)
    merged = []
    cues = []
    cursor = 0
    for i, (text, clip) in enumerate(zip(lines, clips)):
        start = cursor / SR
        merged.append(clip)
        cursor += len(clip)
        end = cursor / SR
        cues.append({"s": round(start, 3), "e": round(end, 3), "text": text})
        if i != len(clips) - 1:
            merged.append(gap)
            cursor += len(gap)
    audio = np.concatenate(merged)
    with wave.open(str(ROOT / "narration.wav"), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SR)
        wav.writeframes(audio.astype("<i2").tobytes())
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(ROOT / "narration.wav"),
         "-ac", "1", "-ar", str(SR), "-b:a", "160k", str(ROOT / "narration.mp3")],
        check=True,
    )

    vtt = []
    for i, cue in enumerate(cues, 1):
        vtt.extend([str(i), f"{vtt_time(cue['s'])} --> {vtt_time(cue['e'])}", cue["text"], ""])
    (ROOT / "narration.vtt").write_text("\n".join(vtt) + "\n", encoding="utf-8")
    (ROOT / "mouth_timeline.json").write_text(
        json.dumps(cues, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    write_ass(cues)
    print(f"narration complete: {len(audio) / SR:.3f}s, {len(cues)} cues", flush=True)


if __name__ == "__main__":
    main()
