#!/usr/bin/env bash
# dsh-video-factory 依赖检查与安装提示。
set -euo pipefail

info() { printf '\033[32m[OK]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[!]\033[0m %s\n' "$*"; }
fail() { printf '\033[31m[X]\033[0m %s\n' "$*"; }

echo "== dsh-video-factory 依赖检查 =="

check_cmd() {
  if command -v "$1" >/dev/null 2>&1; then
    info "$1: $(command -v "$1")"
  else
    fail "$1: 未找到"
  fi
}
check_cmd ffmpeg
check_cmd python3
check_cmd node

echo "-- Python 包 --"
python3 -c "import numpy" 2>/dev/null && info "numpy" || warn "numpy 未装：pip3 install numpy"
python3 -c "import PIL" 2>/dev/null && info "PIL" || warn "PIL 未装：pip3 install Pillow"
python3 -c "import playwright" 2>/dev/null && info "playwright" || warn "playwright 未装：pip3 install playwright && playwright install chromium"

echo "-- 数字人依赖（live2d-avatar 子技能需要）--"
cd "$(dirname "$0")/skills/live2d-avatar" 2>/dev/null && {
  [ -d node_modules/pixi-live2d-display ] && info "pixi-live2d-display" || warn "pixi-live2d-display 未装：npm install pixi.js@6.5.10 pixi-live2d-display@0.4.0"
  [ -f live2dcubismcore.min.js ] && info "live2dcubismcore.min.js" || warn "缺少 live2dcubismcore.min.js（从 3d-companion-assistant 复制）"
  [ -d haru ] && info "haru 模型" || warn "缺少 haru 模型（从 3d-companion-assistant 复制）"
} || true

echo "-- API Key --"
if [ -n "${DASHSCOPE_API_KEY:-}" ]; then
  info "DASHSCOPE_API_KEY 已设置"
else
  warn "DASHSCOPE_API_KEY 未设置（用百炼 TTS 时需要）"
fi

echo "== 检查完成 =="
