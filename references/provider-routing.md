# Provider 选择

## TTS（配音）

| Provider | 效果 | 成本 | 何时用 |
|---|---|---|---|
| 百炼 `qwen-audio-3.0-tts-plus`（`longanlingxin`） | 好，女声温暖自然 | 1.4 元/万字符 | 正式成片（首选） |
| edge-tts（`zh-CN-XiaoxiaoNeural`） | 一般 | 免费 | 快速样片/兜底 |

百炼调用要点：
- 端点 `https://token-plan.cn-beijing.maas.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer`
- key 用环境变量 `DASHSCOPE_API_KEY`（Token Plan key，`sk-sp-` 前缀）
- 逐句合成，句间约 0.24s 停顿，返回 `output.audio.url` 需立即下载
- 时长超目标时，`instruction` 里写"语速稍快"，或逐句统一 atempo 提速

## 数字人

| 方案 | 效果 | 成本 | 何时用 |
|---|---|---|---|
| Live2D（pixi-live2d-display） | 半身、口型张合（简单版） | 本地、无 GPU | 当前主线 |
| MuseTalk / EchoMimic（音素级） | 更好 | 需 GPU/云端 | 进阶 |

Live2D 模型来源：`chuankris/3d-companion-assistant` 仓库 companion 分支的 `packages/companion-shell/public/live2d/local/`（Haru/Hiyori）。模型文件不塞进本仓库，用时按 README 放置。

## 信息图渲染

PIL 逐帧 + ffmpeg 合成（`infographic-renderer` 子技能）。不做重型 3D，不引入 Remotion（除非要做品牌级模板）。

## 音效

程序化合成（numpy 生成 click/whoosh/spark/pop/thud），压在旁白下约 0.3 权重。
