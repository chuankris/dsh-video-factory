# live2d-avatar

Live2D 数字人（半身、口型同步）叠加到视频右上角。

## 模型来源（不进本仓库）

从 `chuankris/3d-companion-assistant`（companion 分支）复制：
`packages/companion-shell/public/live2d/local/` 下的 `haru/` 和 `live2dcubismcore.min.js`，放到本目录。

## 依赖

```bash
npm install pixi.js@6.5.10 pixi-live2d-display@0.4.0
pip install playwright
```

Playwright 浏览器：`playwright install chromium`（版本要匹配 playwright 包版本）。

## 用法

```bash
# 1. 起本地 HTTP 服务（render.html 的 module 加载需要）
python3 -m http.server 8765 &

# 2. 逐帧截透明 PNG（读 ../bailian-tts 生成的 mouth_timeline.json 驱动口型）
python3 capture_synced.py

# 3. ffmpeg 叠加到视频右上角（250px 宽，半身，旁白后隐藏）
ffmpeg -y -i base.mp4 -framerate 25 -i synced/s%04d.png \
  -filter_complex "[1:v]scale=250:-1[av];[0:v][av]overlay=W-w-40:165:shortest=1[v]" \
  -map "[v]" -map 0:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a copy out.mp4
```

## 要点

- `render.html`：Pixi + pixi-live2d-display 透明背景渲染，`window.__setMouth(0..1)` 驱动口型
- 半身构图：调 anchor/scale/x/y 聚焦头+肩
- 口型：`ParamMouthOpenY` 参数，逐句时间轴驱动（简单版）
- 截图用 `omit_background=True` 拿透明背景
- 中间不要经 webm/vp9（会丢 alpha），PNG 序列直接 overlay
