import { glCanvas } from './core.js';
const seg = new URLSearchParams(location.search).get('seg') || '0';
const t0 = performance.now();
// '0' / '1' keep the sample commands working; anything else loads scene<seg>.js ('stub' = placeholder)
const MOD = { '0': './scene34.js', '1': './scene67.js', stub: './stub.js' };
const S = await import(MOD[seg] || `./scene${seg}.js`);
const out = document.getElementById('out'); const ctx = out.getContext('2d');
window.SEG = { a: S.A, b: S.B };
window.draw = (t) => { S.update(t); ctx.drawImage(glCanvas, 0, 0); S.overlay(ctx, t); };
window.buildMs = performance.now() - t0;
window.ready = true;
