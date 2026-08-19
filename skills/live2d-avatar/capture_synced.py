#!/usr/bin/env python3
"""Capture the Live2D avatar with mouth synced to the narration timeline.

Reads mouth_timeline.json (list of {s,e,text}) and drives mouth openness:
  - during a narration cue: mouth opens (sine), amplitude scaled by local speech
  - during gaps: mouth closed
Renders one transparent PNG per video frame at 25 fps.
"""
import asyncio, json, math, shutil
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent
VIDEO_ROOT = ROOT.parent / "video"
W, H, FPS = 360, 420, 25

def load_timeline():
    data = json.loads((VIDEO_ROOT / "mouth_timeline.json").read_text())
    return data

def mouth_open_at(t, timeline):
    """Return mouth openness 0..1 for time t (seconds) based on cues."""
    for cue in timeline:
        if cue["s"] <= t <= cue["e"]:
            # speech: sine-driven mouth movement; brief softer at cue start/end
            dur = cue["e"] - cue["s"]
            local = t - cue["s"]
            # soft attack/release
            edge = min(1.0, local / 0.15, (cue["e"] - t) / 0.15)
            wave = 0.5 + 0.5 * math.sin(t * 16.0)
            return edge * (0.18 + wave * 0.62)
    return 0.0

async def main():
    timeline = load_timeline()
    total = timeline[-1]["e"] + 1.5
    frames = math.ceil(total * FPS)
    out = ROOT / "synced"
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path="/Users/wdj/Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium"
        )
        page = await browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
        await page.goto("http://127.0.0.1:8765/render.html")
        await page.wait_for_function("window.__avatarReady === true", timeout=15000)
        await page.wait_for_timeout(300)

        # Drive mouth via JS each frame, then screenshot.
        for i in range(frames):
            t = i / FPS
            openness = mouth_open_at(t, timeline)
            await page.evaluate(f"window.__setMouth({openness})")
            await page.wait_for_timeout(40)  # ~25fps real-time; screenshot right after
            await page.screenshot(path=str(out / f"s{i:04d}.png"), omit_background=True)
            if i % 250 == 0:
                print(f"captured {i}/{frames}", flush=True)
        await browser.close()
    print(f"done: {len(list(out.glob('*.png')))} frames to {out}")

if __name__ == "__main__":
    asyncio.run(main())
