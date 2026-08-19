# dsh-video-factory

让 DeepSeek Harness（及 Codex/Claude 子代理）把主题变成抖音/小红书竖版科普短视频的生产工厂。

- `SKILL.md`：导演 —— 全链路流程、mode、sub-skill 路由
- `references/`：方法论与规范
- `skills/`：可执行子技能脚本
- `examples/`：跑通的实例

## 快速开始

```bash
git clone https://github.com/chuankris/dsh-video-factory.git
cd dsh-video-factory
./setup.sh
```

`setup.sh` 检查并提示安装：`ffmpeg`、`python3`（numpy/PIL）、`pixi.js`/`pixi-live2d-display`（数字人）、Playwright（数字人截帧）、Node.js。

## 全链路（当前主线 `infographic+avatar`）

```text
选题/素材
→ 专家视角脚本（评审）
→ 分镜 scene plan（评审）
→ 百炼 TTS 配音（skills/bailian-tts）
→ 信息图动效渲染（skills/infographic-renderer）
→ Live2D 数字人叠加（skills/live2d-avatar）
→ 音效混音（skills/sfx-mixer）
→ QC
→ 抖音封面/文案（skills/douyin-pack）
```

## 目录结构

```text
dsh-video-factory/
  SKILL.md
  setup.sh
  references/
    workflow.md              生产状态与审阅关卡
    provider-routing.md      TTS/生图/数字人 provider 选择
    专家视角文案.md          独到观点 + 通俗表达方法论
    竖版科普规范.md          9:16、字幕安全区、信息密度、配色
    qc-checklist.md          验收清单
  skills/
    bailian-tts/             百炼 TTS 逐句合成 + 字幕时间轴
    infographic-renderer/    PIL 逐帧信息图动效
    live2d-avatar/           Live2D 数字人叠加
    sfx-mixer/               程序化音效
    douyin-pack/             封面/文案/标签
  examples/
    dsh-harness-001/         一个完整实例（DSH 科普片）
```

## 安全须知

- API Key（百炼 `DASHSCOPE_API_KEY`）从环境变量读取，**绝不进入仓库**。
- Live2D 模型文件（`.moc3` + 纹理）**不进仓库**，只在 README 里写来源和放置路径。
- 成片必须烧录 AIGC 标识（"AI 生成"）。
