#!/bin/bash
# 第三集:一镜到底只有一个场景 sceneEP.js,分三段并行渲染再拼接(段边界在整帧上,画面连续)
set -e; cd "$(dirname "$0")"
node render3d.mjs video EP ep_a.mp4 0 44 2>&1 | grep -v serialize > log_a.txt &
node render3d.mjs video EP ep_b.mp4 44 88 2>&1 | grep -v serialize > log_b.txt &
node render3d.mjs video EP ep_c.mp4 88 131.36 2>&1 | grep -v serialize > log_c.txt &
wait
printf "file 'ep_a.mp4'\nfile 'ep_b.mp4'\nfile 'ep_c.mp4'\n" > list.txt
node ../../../skills/sfx-mixer/make_bed.mjs 131.36 bed_ep.wav 21 > /dev/null
ffmpeg -y -v error -i ../narration.wav -i bed_ep.wav -filter_complex "[0:a]loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000,asplit=2[nar][sc];[1:a]aresample=48000,volume=-9dB[bed];[bed][sc]sidechaincompress=threshold=0.02:ratio=5:attack=40:release=700[duck];[nar][duck]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]" -map "[a]" mix.wav
ffmpeg -y -v error -f concat -safe 0 -i list.txt -i mix.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -shortest ep03_full.mp4
echo "完成: $(pwd)/ep03_full.mp4"
