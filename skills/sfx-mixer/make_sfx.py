#!/usr/bin/env python3
"""Programmatic SFX layer: synthesize light action cues and mix under narration."""
import json, math
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SR = 24000  # match narration.mp3

# scene_starts from timing.json (global seconds)
def starts():
    d = json.loads((ROOT / "timing.json").read_text(encoding="utf-8"))
    return d["scene_starts"]

def env(n, attack=0.004, release=0.08):
    t = np.arange(n) / SR
    a = np.clip(t / attack, 0, 1)
    r = np.clip((n / SR - t) / release, 0, 1)
    return (a * r) ** 2

def click(f=2600):
    n = int(SR * 0.09)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 60)
    return x * env(n, 0.002, 0.06)

def whoosh(up=True, dur=0.35, f0=300, f1=1800):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = np.linspace(f0, f1, n) if up else np.linspace(f1, f0, n)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return x * env(n, 0.03, 0.12)

def spark(dur=0.22):
    n = int(SR * dur)
    rng = np.random.default_rng(7)
    x = rng.uniform(-1, 1, n)
    # high-pass-ish: emphasize crackle
    x = np.diff(x, prepend=0)
    return (x / (np.abs(x).max() + 1e-9)) * env(n, 0.003, 0.09)

def pop(f=180):
    n = int(SR * 0.14)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 40)
    return x * env(n, 0.002, 0.08)

def thud(f=90):
    n = int(SR * 0.30)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 18)
    return x * env(n, 0.004, 0.14)

def place(buf, sig, t, gain):
    i = int(t * SR)
    if i >= len(buf):
        return
    seg = sig[: max(0, len(buf) - i)]
    buf[i:i + len(seg)] += seg * gain

def main():
    S = starts()
    total = S[-1]
    buf = np.zeros(int(total * SR) + SR, dtype=np.float32)

    def g(t):
        return t

    # 01 hook (start S[0]=0.1): 3 parts drop (pop), weld sparks
    for i, dt in enumerate([0.25, 1.1, 1.95]):
        place(buf, pop(), g(S[0] + dt), 0.5)
    for i, dt in enumerate([3.0, 3.12, 3.24]):
        place(buf, spark(), g(S[0] + dt), 0.32)

    # 02 harness: arrow grow (whoosh), 3 cards pop, conclusion chime
    place(buf, whoosh(True, 0.3, 200, 900), g(S[1] + 2.45), 0.28)
    for i, dt in enumerate([3.15, 3.6, 4.05]):
        place(buf, pop(220), g(S[1] + dt), 0.4)

    # 03 plugins: 4 slide-in (whoosh), 4 latch clicks
    for i, dt in enumerate([4.45, 4.75, 5.05, 5.35]):
        place(buf, whoosh(True, 0.28, 300, 1500), g(S[2] + dt), 0.3)
    for i, dt in enumerate([5.05, 5.35, 5.65, 5.95]):
        place(buf, click(), g(S[2] + dt), 0.4)

    # 04 temporal: receipt out (pop), arrow (whoosh), right card (pop)
    place(buf, pop(240), g(S[3] + 1.45), 0.35)
    place(buf, whoosh(True, 0.25, 250, 1000), g(S[3] + 2.55), 0.25)
    place(buf, pop(240), g(S[3] + 3.55), 0.35)

    # 05 spatial: A roll in (whoosh), B roll in, light-up (spark), B removed (whoosh down)
    place(buf, whoosh(True, 0.3, 220, 800), g(S[4] + 0.8), 0.28)
    place(buf, whoosh(True, 0.3, 220, 800), g(S[4] + 1.75), 0.28)
    place(buf, spark(0.18), g(S[4] + 2.55), 0.3)
    place(buf, whoosh(False, 0.3, 220, 800), g(S[4] + 4.55), 0.28)

    # 06 contrast: old module out (whoosh down), new module in (whoosh up + click), green flash (spark)
    place(buf, whoosh(False, 0.3, 200, 900), g(S[5] + 1.0), 0.26)
    place(buf, whoosh(True, 0.3, 200, 900), g(S[5] + 2.0), 0.26)
    place(buf, click(), g(S[5] + 2.5), 0.4)
    place(buf, spark(0.16), g(S[5] + 2.85), 0.26)

    # 07 finale: 3 blocks drop (thud), building grow (whoosh), capsule (pop)
    for i, dt in enumerate([0.35, 0.85, 1.35]):
        place(buf, thud(), g(S[6] + dt), 0.5)
    place(buf, whoosh(True, 0.5, 150, 600), g(S[6] + 3.0), 0.24)
    place(buf, pop(200), g(S[6] + 7.0), 0.42)

    # normalize & write
    peak = np.abs(buf).max() or 1
    buf = buf / peak * 0.9
    out = ROOT / "sfx.wav"
    import wave
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((buf * 32767).astype(np.int16).tobytes())
    print(f"wrote {out} ({len(buf)/SR:.2f}s)")

if __name__ == "__main__":
    main()
