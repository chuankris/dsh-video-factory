# sfx-mixer

程序化音效：numpy 合成 click/whoosh/spark/pop/thud，压在旁白下。

## 用法

```bash
python3 make_sfx.py
```

## 输入

- `timing.json`：场景起始时间（`scene_starts`）

## 输出

- `sfx.wav`：音效轨（24000Hz 单声道）

## 混音

```bash
ffmpeg -i video_with_narration.mp4 -i sfx.wav \
  -filter_complex "[0:a]volume=1.0[nar];[1:a]volume=0.30[sfx];[nar][sfx]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[mix]" \
  -map 0:v -map "[mix]" -c:v copy -c:a aac -b:a 160k out.mp4
```

## 要点

- 音效类型：click（卡扣）、whoosh（滑动）、spark（焊花/点亮）、pop（弹入）、thud（落盒）
- 按场景动效时间轴对齐（见 make_sfx.py 里各屏的 `place(buf, ...)`）
- `amix` 必须加 `normalize=0`，否则默认会压低旁白
- 音效权重约 0.3，旁白为主
