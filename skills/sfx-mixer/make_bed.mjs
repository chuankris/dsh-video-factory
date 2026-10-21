// 纯代码氛围铺底:低音长音 + 远处风声 + 稀疏拨弦,Schroeder 混响。零依赖,node 直接跑。
// 用法: node make_bed.mjs <秒数> <输出.wav> [种子]
import fs from 'fs';

const DUR = parseFloat(process.argv[2] || '60'), OUT = process.argv[3] || 'bed.wav', SEED = parseInt(process.argv[4] || '7');
const SR = 48000, N = Math.round(DUR * SR);
let s = SEED >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const L = new Float32Array(N), R = new Float32Array(N);

// 1. drone: D 小调里的根音、五度、八度,慢慢呼吸
const ROOT = 73.42; // D2
const partials = [[1, .5], [1.5, .22], [2, .2], [3, .06], [4, .03]];
for (let i = 0; i < N; i++) { const t = i / SR; let v = 0;
  partials.forEach(([m, a], k) => { const lfo = .6 + .4 * Math.sin(2 * Math.PI * t / (11 + k * 3.7) + k); v += a * lfo * Math.sin(2 * Math.PI * ROOT * m * t * (1 + (k % 2 ? .0012 : -.0008))); });
  const pan = .5 + .15 * Math.sin(t * .13); L[i] += v * .18 * (1 - pan + .5); R[i] += v * .18 * (pan + .5); }

// 2. wind: 粉红噪声过低通,缓慢起伏
{ let b0 = 0, b1 = 0, b2 = 0, lpL = 0, lpR = 0;
  for (let i = 0; i < N; i++) { const t = i / SR; const w = rnd() * 2 - 1;
    b0 = .99765 * b0 + w * .099; b1 = .963 * b1 + w * .2965; b2 = .57 * b2 + w * 1.0527; const pink = (b0 + b1 + b2 + w * .1848) * .2;
    const cut = .012 + .01 * (Math.sin(t * .21) * .5 + .5); lpL += cut * (pink - lpL); lpR += cut * ((rnd() * 2 - 1) * .3 + pink * .7 - lpR);
    const g = .5 + .5 * Math.sin(t * .09 + 1); L[i] += lpL * .9 * g; R[i] += lpR * .9 * g; } }

// 3. plucks: Karplus-Strong,D 小调五声音阶,每 5–9 秒落一两个音
const SCALE = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23]; // D3 F3 G3 A3 C4 D4 F4
for (let t0 = 3 + rnd() * 2; t0 < DUR - 3; t0 += 5 + rnd() * 4) {
  const notes = rnd() < .35 ? 2 : 1;
  for (let k = 0; k < notes; k++) {
    const f = SCALE[Math.floor(rnd() * SCALE.length)], p = Math.round(SR / f); const buf = new Float32Array(p).map(() => rnd() * 2 - 1);
    const start = Math.round((t0 + k * .45) * SR), len = Math.round(4.5 * SR), pan = .25 + rnd() * .5, amp = .1 + rnd() * .05;
    let prev = 0;
    for (let i = 0; i < len && start + i < N; i++) { const j = i % p; const v = buf[j]; buf[j] = .996 * .5 * (v + prev); prev = v;
      const env = Math.min(1, i / 60); L[start + i] += v * amp * env * (1 - pan) * 2; R[start + i] += v * amp * env * pan * 2; }
  }
}

// 4. reverb: Schroeder(4 梳状 + 2 全通),湿声 35%
function reverb(x, off) {
  const y = new Float32Array(x.length);
  [1557, 1617, 1491, 1422].map(d => Math.round((d + off) * SR / 44100)).forEach(d => { const b = new Float32Array(d); let k = 0, lp = 0;
    for (let i = 0; i < x.length; i++) { const o = b[k]; lp = o * .8 + lp * .2; b[k] = x[i] + lp * .84; k = (k + 1) % d; y[i] += o * .25; } });
  [225, 556].map(d => Math.round((d + off) * SR / 44100)).forEach(d => { const b = new Float32Array(d); let k = 0;
    for (let i = 0; i < y.length; i++) { const o = b[k]; const v = y[i] + o * .5; b[k] = v; k = (k + 1) % d; y[i] = o - v * .5; } });
  return y;
}
const wl = reverb(L, 0), wr = reverb(R, 23);
// 首尾淡入淡出 3 秒,归一化到 -3 dBFS 峰值(响度在混音时再压)
let peak = 0; const out = [new Float32Array(N), new Float32Array(N)];
for (let i = 0; i < N; i++) { const f = Math.min(1, i / (3 * SR), (N - i) / (3 * SR));
  out[0][i] = (L[i] * .65 + wl[i] * .35) * f; out[1][i] = (R[i] * .65 + wr[i] * .35) * f; peak = Math.max(peak, Math.abs(out[0][i]), Math.abs(out[1][i])); }
const g = .7 / (peak || 1);
const wav = Buffer.alloc(44 + N * 4); wav.write('RIFF', 0); wav.writeUInt32LE(36 + N * 4, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[0][i] * g)) * 32767), 44 + i * 4); wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[1][i] * g)) * 32767), 46 + i * 4); }
fs.writeFileSync(OUT, wav);
console.log(`完成: ${OUT} (${DUR}s)`);
