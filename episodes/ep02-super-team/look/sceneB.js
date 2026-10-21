// 风格 B 试画面:白底宣纸 + 水墨。镜头取"五个人十条线,十个人四十五条"。
import { renderer } from './core.js';
import { ramp, rng, SERIF, W, H, CINNABAR } from './overlay.js';

export const A = 58.2, B = 65.5;
const INK = '#1b1714';

// xuan paper, drawn once
const paper = document.createElement('canvas'); paper.width = W; paper.height = H;
{ const x = paper.getContext('2d'); const R = rng(3);
  x.fillStyle = '#ece3cf'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 26000; i++) { x.globalAlpha = .025 + R() * .05; x.strokeStyle = R() < .55 ? '#b9a988' : '#fffaf0'; x.lineWidth = .6 + R(); const px = R() * W, py = R() * H, a = R() * 6.28, l = 4 + R() * 26;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + .5) * l * .5, py + Math.sin(a + .5) * l * .5, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  // distant ink-wash hills
  x.globalAlpha = 1; x.filter = 'blur(18px)';
  for (const [y0, a, amp] of [[560, .07, 90], [640, .1, 70]]) { x.fillStyle = `rgba(40,36,32,${a})`; x.beginPath(); x.moveTo(0, H);
    for (let px = 0; px <= W; px += 20) x.lineTo(px, y0 - amp * (Math.sin(px * .006 + y0) * .6 + Math.sin(px * .017) * .4)); x.lineTo(W, H); x.fill(); }
  x.filter = 'none';
  const v = x.createRadialGradient(W / 2, H * .45, H * .25, W / 2, H * .5, H * .75); v.addColorStop(0, 'rgba(120,95,60,0)'); v.addColorStop(1, 'rgba(120,95,60,.28)'); x.fillStyle = v; x.fillRect(0, 0, W, H); }

// ten ink figures in a ring, 45 dry-brush strokes between them
const N = 10, CX = 540, CY = 1000, RX = 360, RY = 330;
const P = Array.from({ length: N }, (_, i) => { const a = i / N * Math.PI * 2 - Math.PI / 2 + .3; return [CX + Math.cos(a) * RX, CY + Math.sin(a) * RY]; });
const ink = document.createElement('canvas'); ink.width = W; ink.height = H;
{ const x = ink.getContext('2d'); const R = rng(11);
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    const [ax, ay] = P[i], [bx, by] = P[j]; const bend = (R() - .5) * 60;
    const mx = (ax + bx) / 2 + (by - ay) / Math.hypot(bx - ax, by - ay) * bend, my = (ay + by) / 2 - (bx - ax) / Math.hypot(bx - ax, by - ay) * bend;
    for (let s = 0; s < 5; s++) { x.globalAlpha = .06 + R() * .12; x.strokeStyle = INK; x.lineWidth = .8 + R() * 2.4; x.lineCap = 'round';
      x.setLineDash([20 + R() * 60, 2 + R() * 10]); x.beginPath(); x.moveTo(ax + (R() - .5) * 6, ay - 40 + (R() - .5) * 6);
      x.quadraticCurveTo(mx + (R() - .5) * 10, my - 40 + (R() - .5) * 10, bx + (R() - .5) * 6, by - 40 + (R() - .5) * 6); x.stroke(); }
  }
  x.setLineDash([]);
  // figures: a bleeding head, a single tapered body stroke
  P.forEach(([px, py], i) => {
    x.filter = 'blur(3px)'; x.globalAlpha = .35; x.fillStyle = INK; x.beginPath(); x.arc(px, py - 78, 30, 0, 6.283); x.fill();
    x.filter = 'none'; x.globalAlpha = .92; x.beginPath(); x.arc(px, py - 78, 22, 0, 6.283); x.fill();
    x.beginPath(); x.moveTo(px - 8, py - 52); x.quadraticCurveTo(px - 46, py - 10, px - 38, py + 40); x.quadraticCurveTo(px, py + 52, px + 38, py + 40); x.quadraticCurveTo(px + 46, py - 10, px + 8, py - 52); x.closePath();
    x.globalAlpha = .82; x.fill(); x.filter = 'blur(6px)'; x.globalAlpha = .18; x.fill(); x.filter = 'none';
  });
  // the knot at the centre gets a wash
  x.filter = 'blur(40px)'; x.globalAlpha = .18; x.fillStyle = INK; x.beginPath(); x.ellipse(CX, CY - 40, 170, 150, 0, 0, 6.283); x.fill(); x.filter = 'none'; x.globalAlpha = 1; }

export function update(t) { renderer.setClearColor(0xece3cf, 1); renderer.clear(); }

function vcol(ctx, s, x, y, size, col, a = 1, weight = 800) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.font = `${weight} ${size}px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  Array.from(s).forEach((ch, i) => ctx.fillText(ch, x, y + i * size * 1.12)); ctx.restore(); }
export function overlay(ctx, t) {
  ctx.drawImage(paper, 0, 0); ctx.drawImage(ink, 0, 0);
  // calligraphic numerals
  vcol(ctx, '四十五', 940, 300, 110, INK, .9);
  vcol(ctx, '条线', 940, 300 + 3 * 123 + 20, 54, INK, .7, 600);
  vcol(ctx, '十个人', 830, 330, 46, INK, .55, 500);
  // seal
  ctx.save(); ctx.translate(140, 330); ctx.rotate(-.06); ctx.globalAlpha = .9; ctx.fillStyle = CINNABAR; ctx.beginPath(); ctx.roundRect(-52, -52, 104, 104, 8); ctx.fill();
  ctx.fillStyle = '#ece3cf'; ctx.font = `800 40px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('人', 20, -18); ctx.fillText('月', 20, 22); ctx.fillText('神', -18, -18); ctx.fillText('话', -18, 22); ctx.restore();
  // chrome in ink
  ctx.save(); ctx.textBaseline = 'middle'; ctx.fillStyle = '#5a4630'; ctx.font = `500 30px ${SERIF}`; ctx.textAlign = 'left'; ctx.fillText('超级个体 与 超级团队 · 中', 60, 96);
  ctx.fillStyle = 'rgba(40,32,24,.5)'; ctx.font = `400 26px ${SERIF}`; ctx.textAlign = 'right'; ctx.fillText('一群人的麻烦', W - 60, 96);
  ctx.strokeStyle = 'rgba(90,70,48,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(60, 136); ctx.lineTo(W - 60, 136); ctx.stroke();
  ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(40,32,24,.5)'; ctx.font = `400 28px ${SERIF}`; ctx.fillText('沟通', 60, 184);
  ctx.fillStyle = CINNABAR; const tw = 118, th = 40, tx = W - 60 - tw, ty = H - 40 - th; ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 6); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `700 24px ${SERIF}`; ctx.textAlign = 'center'; ctx.fillText('AI 生成', tx + tw / 2, ty + th / 2 + 1); ctx.restore();
  // subtitle in ink
  const c = window.CUES.find(c => t >= c.s && t <= c.e + .2); if (!c) return;
  ctx.save(); ctx.font = `700 56px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK;
  const chars = Array.from(c.text); const lines = ['']; for (const ch of chars) { if (ctx.measureText(lines[lines.length - 1] + ch).width > 920 && !'，。,.:'.includes(ch)) lines.push(''); lines[lines.length - 1] += ch; }
  lines.forEach((ln, i) => { const y = 1725 - (lines.length - 1) * 39 + i * 78; const hl = ln.replace(/[^十四五条线]/g, '');
    ctx.fillStyle = INK; ctx.fillText(ln, W / 2, y); });
  ctx.restore();
}
