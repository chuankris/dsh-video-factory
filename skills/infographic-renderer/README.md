# infographic-renderer

PIL 逐帧信息图动效渲染 + 底部大字幕。

## 用法

```bash
python3 render.py
```

## 输入

- `script.json`：7 屏配置（chapter/headline/points/line_start/line_end/visual）
- `script.txt`：旁白
- `narration.vtt`：配音时间轴
- `narration.wav`：配音音频

## 输出

- `work/frames/`：逐帧信息图（含字幕）
- 视频轨（配合 ffmpeg 合成）

## 7 个 visual 类型

`hook / harness / plugins / temporal / spatial / contrast / finale`

每个对应一个 `visual_xxx(im, t)` 函数，在 `VISUALS` 字典里注册。换文案时优先复用这 7 个类型，改屏内文字即可；语义不匹配再改函数。

## 要点

- 逐帧渲染（25fps），动效用 ease-out / overshoot 缓动
- 字幕像素级换行，英文词不拆
- 底部常驻"AI 生成"标识
- 白卡加投影，暖白底 + 深蓝 + 橙配色
