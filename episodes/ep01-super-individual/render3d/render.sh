#!/bin/bash
# 用法: ./render.sh          渲染两段样片并合成
#       ./render.sh still 0 33.0   出一张静帧检查(段号也可以是 0102、05 这类新段)
#       ./render.sh full           出全片 ep01_full.mp4(见下方说明)
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "需要 Node.js: brew install node"; exit 1; }
command -v ffmpeg >/dev/null || { echo "需要 ffmpeg: brew install ffmpeg"; exit 1; }
[ -d node_modules/three ] || npm install
[ -d "$HOME/Library/Caches/ms-playwright" ] || npx playwright install chromium
if [ "$1" = "still" ]; then node render3d.mjs still "$2" "${@:3}"; exit; fi
# ./render.sh full            渲染全片 11 段(还没做的段用占位画面),配整条旁白
# ./render.sh full 05 08      只重渲这几段,其余复用已有的 full_*.mp4
# 段边界都在 0.04 秒(一帧)的整数倍上,拼接后音画不漂。段号 0 = scene34.js,1 = scene67.js
if [ "$1" = "full" ]; then
  shift; ONLY=" $* "
  SEGS="0102:0:17.6 0:17.6:42.36 05:42.36:64.0 1:64.0:87.2 08:87.2:105.72 09:105.72:123.0 10:123.0:137.32 11:137.32:149.24 12:149.24:161.52 1314:161.52:178.96 15:178.96:188.44"
  : > list.txt
  for e in $SEGS; do IFS=: read -r name a b <<< "$e"
    mod=$name; [ "$name" = 0 ] || [ "$name" = 1 ] || [ -f "scene$name.js" ] || mod=stub
    out=full_$name.mp4
    if [ "$ONLY" = "  " ] || [[ "$ONLY" == *" $name "* ]] || [ ! -f "$out" ]; then
      echo "== 段 $name ($mod) $a–$b"; node render3d.mjs video "$mod" "$out" "$a" "$b" 2>&1 | grep -v serialize
    fi
    echo "file '$out'" >> list.txt
  done
  ffmpeg -y -v error -i ../narration.wav -af "loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000" full.wav
  ffmpeg -y -v error -f concat -safe 0 -i list.txt -i full.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -shortest ep01_full.mp4
  echo "完成: $(pwd)/ep01_full.mp4"; exit
fi
node render3d.mjs video 0 seg0.mp4 2>&1 | grep -v serialize
node render3d.mjs video 1 seg1.mp4 2>&1 | grep -v serialize
WAV=../narration.wav
ffmpeg -y -v error -i "$WAV" -filter_complex "[0:a]atrim=17.6:42.35,asetpts=PTS-STARTPTS[a];[0:a]atrim=64.0:87.2,asetpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000[o]" -map "[o]" cut.wav
printf "file 'seg0.mp4'\nfile 'seg1.mp4'\n" > list.txt
ffmpeg -y -v error -f concat -safe 0 -i list.txt -i cut.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -shortest sample_v2.mp4
echo "完成: $(pwd)/sample_v2.mp4"
