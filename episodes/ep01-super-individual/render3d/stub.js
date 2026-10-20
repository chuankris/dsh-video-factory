// Placeholder for beats not built yet: black frame + chrome + subtitles, so the full cut stays in sync.
import { renderer } from './core.js';
import { drawChrome, drawSubtitle, rgba, PAPER, SERIF, W } from './overlay.js';

export const A = 0, B = 188.44;

export function update(t) { renderer.setClearColor(0x050506, 1); renderer.clear(); }

export function overlay(ctx, t) {
  ctx.save(); ctx.fillStyle = rgba(PAPER, .25); ctx.font = `400 34px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`镜头待制作 · ${t.toFixed(1)}s`, W / 2, 900); ctx.restore();
  drawChrome(ctx, '', .9);
  drawSubtitle(ctx, t);
}
