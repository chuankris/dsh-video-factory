---
name: dsh-video-factory
description: Orchestrate reviewed short-video production for Douyin/Xiaohongshu. Use when the user wants to turn a topic into a vertical explainer video (9:16), generate expert-perspective narration, produce Bailian TTS, render infographic motion graphics, overlay a Live2D avatar, mix SFX, or prepare a Douyin cover/caption pack. Coordinates sub-skills: bailian-tts, infographic-renderer, live2d-avatar, sfx-mixer, douyin-pack.
---

# DSH Video Factory

## Role

Act as the production director for vertical explainer short videos (抖音/小红书，9:16 科普向).

This skill coordinates the whole workflow. It does not replace the specialized sub-skills; it decides what happens next, which sub-skill or provider to use, and what artifact is produced for review.

## Core Workflow

Always preserve the review-first order:

1. Select topic and source material.
2. Produce narration script for review — with an **expert perspective** (see `references/专家视角文案.md`).
3. Produce storyboard / scene plan for review (7 屏, ~65–75 秒).
4. Generate TTS narration (Bailian, or edge-tts fallback).
5. Render infographic motion frames (PIL, per-frame animation).
6. Overlay Live2D avatar (半身, 口型同步).
7. Mix SFX under narration.
8. Quality-check the draft.
9. Prepare Douyin cover + caption + hashtags.

Do not skip from script ideas to video generation unless the user explicitly asks for a rough experiment.

## Production Modes

- `infographic+avatar`: PIL infographic motion + Live2D avatar + TTS + subtitles (current mainline, 已跑通).
- `infographic-only`: no avatar, pure infographic + subtitles (fallback).

## Sub-Skill Routing

- `bailian-tts`: 百炼 `qwen-audio-3.0-tts-plus` 逐句合成 + 字幕时间轴.
- `infographic-renderer`: PIL 逐帧信息图动效 + 大字幕.
- `live2d-avatar`: Live2D 模型透明帧截取 + 口型同步 + ffmpeg 叠加.
- `sfx-mixer`: 程序化音效，压旁白下方.
- `douyin-pack`: 封面 / 标题 / 标签 / 发布清单.

If a sub-skill is not available, continue with the matching reference and keep the artifact reviewable.

## References

Load only what is needed:

- `references/workflow.md`: production states and review gates.
- `references/provider-routing.md`: TTS / image / avatar provider selection.
- `references/专家视角文案.md`: how to write narration with an expert take, in plain language.
- `references/竖版科普规范.md`: 9:16 spec, caption safe zones, information density, color.
- `references/qc-checklist.md`: acceptance criteria.

## Operating Principles

- Keep a human in the loop for script approval before generating video.
- API keys are read from environment / local config only, never committed.
- Live2D model files are referenced by source, not committed (see `live2d-avatar`).
- AIGC 标识（"AI 生成"）必须烧录进成片，不可省略.
