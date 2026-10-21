#!/bin/bash
# 第二集渲染。用法:
#       bash render.sh still 05 55.0   出一张静帧检查
#       bash render.sh full            出全片 ep02_full.mp4(见下方说明)
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "需要 Node.js: brew install node"; exit 1; }
command -v ffmpeg >/dev/null || { echo "需要 ffmpeg: brew install ffmpeg"; exit 1; }
[ -d node_modules/three ] || npm install
[ -d "$HOME/Library/Caches/ms-playwright" ] || npx playwright install chromium
if [ "$1" = "still" ]; then node render3d.mjs still "$2" "${@:3}"; exit; fi
# ./render.sh full            渲染全片 11 段(还没做的段用占位画面),配整条旁白
# ./render.sh full 05 08      只重渲这几段,其余复用已有的 full_*.mp4
# 段边界都在 0.04 秒(一帧)的整数倍上,拼接后音画不漂。
if [ "$1" = "full" ]; then
  shift; ONLY=" $* "
  SEGS="01:0:6.72 02:6.72:17.56 03:17.56:32.64 04:32.64:51.12 05:51.12:64.12 06:64.12:88.08 07:88.08:106.8 08:106.8:114.52 09:114.52:125.44 10:125.44:138.64 11:138.64:149.56"
  : > list.txt
  for e in $SEGS; do IFS=: read -r name a b <<< "$e"
    mod=$name; [ -f "scene$name.js" ] || mod=stub
    out=full_$name.mp4
    if [ "$ONLY" = "  " ] || [[ "$ONLY" == *" $name "* ]] || [ ! -f "$out" ]; then
      echo "== 段 $name ($mod) $a–$b"; node render3d.mjs video "$mod" "$out" "$a" "$b" 2>&1 | grep -v serialize
    fi
    echo "file '$out'" >> list.txt
  done
  ffmpeg -y -v error -i ../narration.wav -af "loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000" full.wav
  ffmpeg -y -v error -f concat -safe 0 -i list.txt -i full.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -shortest ep02_full.mp4
  echo "完成: $(pwd)/ep02_full.mp4"; exit
fi
echo "用法: bash render.sh still <段号> <秒...> | bash render.sh full [段号...]"
