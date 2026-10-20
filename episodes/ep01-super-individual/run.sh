#!/usr/bin/env bash
# 第一集配音(火山 Agent Plan, 音色默认 narrator)。在你自己的终端里运行。
# key 优先读环境变量 VOLC_API_KEY / DASHSCOPE_API_KEY,否则读本目录 .env.local(已被 git 忽略)。
cd "$(dirname "$0")" || exit 1
[ -z "$DASHSCOPE_API_KEY" ] && [ -f .env.local ] && . ./.env.local && export DASHSCOPE_API_KEY
if [ -z "$DASHSCOPE_API_KEY" ]; then
  echo "请先在终端执行: export VOLC_API_KEY='你的key',或把 key 写进 .env.local"; exit 1
fi
command -v ffmpeg >/dev/null || { echo "缺少 ffmpeg"; exit 1; }
python3 -c "import numpy" 2>/dev/null || { echo "缺少 numpy,请执行: pip3 install numpy"; exit 1; }
python3 synthesize.py && echo "完成:narration.wav / narration.vtt / subtitles.ass 已生成在本文件夹"
