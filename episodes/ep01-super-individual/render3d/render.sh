#!/bin/bash
# 用法: ./render.sh          渲染两段样片并合成
#       ./render.sh still 0 33.0   出一张静帧检查
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "需要 Node.js: brew install node"; exit 1; }
command -v ffmpeg >/dev/null || { echo "需要 ffmpeg: brew install ffmpeg"; exit 1; }
[ -d node_modules/three ] || npm install
[ -d "$HOME/Library/Caches/ms-playwright" ] || npx playwright install chromium
if [ "$1" = "still" ]; then node render3d.mjs still "$2" "${@:3}"; exit; fi
node render3d.mjs video 0 seg0.mp4 2>&1 | grep -v serialize
node render3d.mjs video 1 seg1.mp4 2>&1 | grep -v serialize
WAV=../narration.wav
ffmpeg -y -v error -i "$WAV" -filter_complex "[0:a]atrim=17.6:42.35,asetpts=PTS-STARTPTS[a];[0:a]atrim=64.0:87.2,asetpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000[o]" -map "[o]" cut.wav
printf "file 'seg0.mp4'\nfile 'seg1.mp4'\n" > list.txt
ffmpeg -y -v error -f concat -safe 0 -i list.txt -i cut.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -shortest sample_v2.mp4
echo "完成: $(pwd)/sample_v2.mp4"
