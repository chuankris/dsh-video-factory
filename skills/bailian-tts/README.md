# bailian-tts

百炼 `qwen-audio-3.0-tts-plus` 逐句 TTS 合成 + 字幕时间轴生成。

## 用法

```bash
export DASHSCOPE_API_KEY='你的 Token Plan key'
python3 synthesize.py
```

## 输入

- `script.txt`：旁白脚本，每句一行（空行分段）

## 输出

- `narration.wav` / `narration.mp3`：合成配音（24000Hz 单声道）
- `narration.vtt`：每句起止时间
- `mouth_timeline.json`：供数字人口型驱动
- `subtitles.ass`：字幕
- `tts_segments/`：逐句音频中间产物

## 参数（脚本顶部常量）

- `SR`：采样率 24000
- `GAP_SECONDS`：句间停顿 0.24s
- `PACE`：atempo 提速倍率（时长超目标时调大，如 1.19）

## 要点

- 逐句合成，每句最多重试 3 次（指数退避）
- 返回的 `output.audio.url` 是临时签名地址，立即下载
- 合成后 trim 掉句首尾死气，再统一 atempo 提速
- key 只从环境变量读，不落盘
