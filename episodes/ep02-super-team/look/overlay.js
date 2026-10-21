// 2D overlay: chrome, subtitles, typographic accents. Drawn on top of the WebGL frame.
export const W = 1080, H = 1920;
export const SERIF = "'Noto Serif CJK SC','Noto Serif CJK JP','Songti SC','STSong',serif";
export const PAPER = '#efe8d8', GOLD = '#c9a14a', GOLD_HI = '#f0d58a', CINNABAR = '#b3382c';
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ramp = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = t => t * t * (3 - 2 * t);
export const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const CUES = window.CUES;
export function ptime(i, sub) {
  const c = CUES[i]; const k = c.text.indexOf(sub);
  if (k < 0) throw new Error('phrase not found: ' + sub);
  return c.s + (c.e - c.s) * (k / c.text.length) * 0.96;
}

const HL = {
  '都说,AI 让一个人,变成一支队伍。': ['一个人', '一支队伍'],
  '这话,只说对了一半。': ['一半'],
  '另一半,才是关键。': ['另一半', '关键'],
  '所谓超级个体,就是一个人,干完了以前一个小团队的活。': ['超级个体', '一个小团队'],
  '设计、写代码、剪视频,从头跑到尾。': ['从头跑到尾'],
  '《易经》说:形而上者谓之道,形而下者谓之器。': ['道', '器'],
  '器,是拿来用的工具。道,是决定往哪走的方向。': ['工具', '方向'],
  '远在西方,亚里士多德也把本事分成两种:': ['亚里士多德', '两种'],
  '一种是技艺,知道怎么做;一种是实践智慧,知道该做什么。': ['技艺', '实践智慧'],
  '一个人带着一百把刀,会撞上三堵墙。': ['一百把刀', '三堵墙'],
  '第一堵,看不过来。刀太多,你验不完。': ['看不过来', '验不完'],
  '第二堵,倒了就停。你一病,整条线都停。': ['倒了就停', '都停'],
  '第三堵,砸了全扛。出了事,没人替你分担。': ['砸了全扛', '没人'],
  '在创作里,这种判断,有个更熟悉的名字:审美。': ['判断', '审美'],
  'AI 一秒能给你一百张图、一百个版本。': ['一百张图', '一百个版本'],
  '哪个对,哪个有味道,没有标准答案。': ['有味道', '没有标准答案'],
  '康德说,判断力是一种只能练、没法教的本事。': ['判断力', '只能练', '没法教'],
  '我让 AI 帮我写这条片子的脚本。': ['脚本'],
  '它给了好几个版本。第一版太浅,第二版太深,第三版好懂,可少了点味道。': ['太浅', '太深', '少了点味道'],
  '每一次,它都写得出来。可对不对,只有我能判。': ['写得出来', '只有我能判'],
  '而这种审美,不是凭空来的。': ['不是凭空来的'],
  '是你踩过的坑、见过的好东西、改过的无数遍,一点点练出来的。': ['踩过的坑', '好东西', '无数遍', '练出来的'],
  '别人能学走你的作品,学不走这些。': ['作品', '学不走'],
  '所以有些事,特别适合一个人干。': ['一个人干'],
  '要的是统一的品味,就算砸了,代价也不大。': ['统一的品味', '代价也不大'],
  '一支短片,一个小产品。想法到成品,一条直线。': ['一支短片', '一个小产品', '一条直线'],
  '可有些事,一个人干不了。': ['干不了'],
  '事越大,要看的越多,要扛的越重。': ['看的越多', '扛的越重'],
  '手可以无限加,脑子和肩膀,不行。': ['无限加', '不行'],
  '手可以复制,判断不能。': ['复制', '判断不能'],
  '判断,在创作里,就叫审美。': ['判断', '审美'],
  '庖丁解牛,一把刀用了十九年,宰了几千头牛,刀刃还像新磨的一样。': ['十九年', '几千头牛'],
  '他说,练了三年,眼里就没有整头牛了,只剩一条条缝。': ['三年', '缝'],
  '他对国君说:我喜欢的是道,已经超过了技。': ['道', '技'],
  '他厉害的不是力气,是知道刀该往哪走。': ['知道刀该往哪走'],
  '现在,AI 给了庖丁一百把刀。': ['AI', '一百把刀'],
  '器,可以复制了。': ['器', '复制'],
  '可刀多了,缝在哪,还得有人看。': ['缝在哪', '有人看'],
  '假设一件事,一半时间在动手,一半在想清楚、核对。': ['假设', '动手', '想清楚', '核对'],
  'AI 让动手快一百倍,总共,也只省下一半的时间。': ['一百倍', '一半'],
};

export function drawChrome(ctx, label, a = 1) {
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = rgba(GOLD, .85); ctx.font = `500 30px ${SERIF}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('超级个体 与 超级团队 · 中', 60, 96);
  ctx.fillStyle = rgba(PAPER, .5); ctx.font = `400 26px ${SERIF}`; ctx.textAlign = 'right'; ctx.fillText('一群人的麻烦', W - 60, 96);
  ctx.strokeStyle = rgba(GOLD, .3); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(60, 136); ctx.lineTo(W - 60, 136); ctx.stroke();
  if (label) { ctx.textAlign = 'left'; ctx.fillStyle = rgba(PAPER, .5); ctx.font = `400 28px ${SERIF}`; ctx.fillText(label, 60, 184); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = CINNABAR; const tw = 118, th = 40, tx = W - 60 - tw, ty = H - 40 - th; ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 6); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `700 24px ${SERIF}`; ctx.textAlign = 'center'; ctx.fillText('AI 生成', tx + tw / 2, ty + th / 2 + 1);
  ctx.restore();
}

export function drawSubtitle(ctx, t) {
  let idx = -1; for (let i = 0; i < CUES.length; i++) if (t >= CUES[i].s - .02 && t <= CUES[i].e + .22) idx = i;
  if (idx < 0) return;
  const c = CUES[idx];
  const a = ramp(t, c.s - .02, c.s + .14) * (1 - ramp(t, c.e + .05, c.e + .22));
  if (a <= 0) return;
  const chars = Array.from(c.text); const hl = HL[c.text] || []; const flag = new Array(chars.length).fill(false);
  hl.forEach(h => { const k = c.text.indexOf(h); if (k >= 0) for (let j = k; j < k + Array.from(h).length; j++) flag[j] = true; });
  ctx.save(); ctx.font = `700 56px ${SERIF}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const maxW = 920; const lines = [[]]; let w = 0; const noStart = new Set('，。、；：！？,.;:!?)」』”’》'.split(''));
  chars.forEach((ch, j) => { const cw = ctx.measureText(ch).width;
    if (w + cw > maxW && !noStart.has(ch)) { lines.push([]); w = 0; }
    lines[lines.length - 1].push({ ch, cw, hl: flag[j] }); w += cw; });
  const lh = 78; const y0 = 1725 - (lines.length - 1) * lh / 2;
  // soft dark band behind subtitles for legibility over bright particles
  const g = ctx.createLinearGradient(0, y0 - 140, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.45, `rgba(0,0,0,${.55 * a})`); g.addColorStop(1, `rgba(0,0,0,${.7 * a})`);
  ctx.fillStyle = g; ctx.fillRect(0, y0 - 140, W, H - y0 + 140);
  lines.forEach((ln, li) => { const lw = ln.reduce((s, o) => s + o.cw, 0); let x = (W - lw) / 2; const y = y0 + li * lh;
    ln.forEach(o => { ctx.globalAlpha = a;
      ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineJoin = 'round'; ctx.strokeText(o.ch, x, y);
      ctx.fillStyle = o.hl ? GOLD_HI : PAPER; ctx.fillText(o.ch, x, y); x += o.cw; }); });
  ctx.restore();
}

// vertical (竖排) text, top-to-bottom; per-character reveal
export function vtext(ctx, str, x, y, size, color, alpha, reveal = 1, gap = 1.18, weight = 600, glow = 0) {
  const chars = Array.from(str); const n = chars.length;
  ctx.save(); ctx.font = `${weight} ${size}px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
  chars.forEach((ch, i) => {
    const k = clamp(reveal * n - i); if (k <= 0) return;
    ctx.globalAlpha = alpha * k; ctx.fillStyle = color;
    ctx.fillText(ch, x, y + i * size * gap + (1 - k) * 10);
  });
  ctx.restore();
}

export function seal(ctx, str, x, y, size, alpha, rot = -.08) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot);
  const s = size; ctx.strokeStyle = CINNABAR; ctx.lineWidth = s * .07; ctx.strokeRect(-s / 2, -s / 2, s, s);
  ctx.fillStyle = CINNABAR; ctx.font = `800 ${s * .38}px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const ch = Array.from(str);
  if (ch.length === 2) { ctx.fillText(ch[0], 0, -s * .2); ctx.fillText(ch[1], 0, s * .22); } else ctx.fillText(str, 0, 0);
  ctx.restore();
}
