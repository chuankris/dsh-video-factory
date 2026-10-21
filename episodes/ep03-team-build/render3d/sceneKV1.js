// 可爱画风 · 小样 1 一镜到底:一个豆豆被云围着 → 四个豆豆提灯出发,身后的路亮起来 → 云散开,一群白豆豆(AI)顺着路跑
import * as THREE from 'three';
import { terrain } from './board.js';
import { cuteStage, cutify, bean, puffClouds, cuteText, cuteChrome } from './cute.js';
import { ramp, smooth, clamp, rng } from './overlay.js';

export const A = 0, B = 12;
const S = cuteStage();
const map = terrain(S, { seed: 95, clear: 1.6, cz: 0, rx: 3.4, rz: 4.0 }); cutify(map);
const clouds = puffClouds(S, 2.6, 44);
const DIRS = [[-1.9, -1.5, 'pink'], [2.0, -1.1, 'lav'], [1.5, 1.8, 'peach'], [-1.7, 1.5, 'sky']];
const curves = DIRS.map(([x, z]) => new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(x * .4 + z * .15, 0, z * .4 - x * .15), new THREE.Vector3(x * .75 - z * .08, 0, z * .75 + x * .08), new THREE.Vector3(x, 0, z)]));
// for every tile on a route: which route, and how far along it
const onRoute = new Map(); map.cells.forEach(e => { let best = .17, hit = null; curves.forEach((cv, j) => { for (let s = 0; s <= 50; s++) { const p = cv.getPoint(s / 50); const d = Math.hypot(p.x - e.x, p.z - e.z); if (d < best) { best = d; hit = { j, u: s / 50 }; } } }); if (hit) onRoute.set(e, hit); });
const hero = bean(S, 'butter', { scale: 1.2 });
const seekers = DIRS.map(([, , c]) => bean(S, c, { lamp: true }));
const R = rng(4); const minis = Array.from({ length: 40 }, (_, i) => ({ b: bean(S, 'white', { scale: .5 }), c: i % 4, u: R(), ph: R() * 6 }));

export function update(t) {
  // one camera move: close on the lone bean, then up and around over the whole island
  const up = smooth(ramp(t, 2.0, 9.6)); const ang = -.25 + t * .05;
  const r = THREE.MathUtils.lerp(1.5, 6.4, up), h = THREE.MathUtils.lerp(.55, 5.2, up);
  S.cam(Math.sin(ang) * r * .5, h, Math.cos(ang) * r, 0, THREE.MathUtils.lerp(.25, 0, up), THREE.MathUtils.lerp(0, -.3, up), THREE.MathUtils.lerp(30, 38, up));
  const walk = smooth(ramp(t, 3.2, 8.4)), open = smooth(ramp(t, 3.0, 9.0));
  map.apply(e => { const r0 = onRoute.get(e); if (!r0) return null; const k = clamp((walk * .95 - r0.u) / .06 + 1); return k > 0 ? { b: 'road', h: .18, y: .03 * Math.sin(Math.PI * Math.min(1, k)) * (k < 1 ? 1 : 0) } : null; });
  hero.position.set(0, map.ground(0, 0) + Math.abs(Math.sin(t * 2.2)) * .015, 0); hero.face(S.camera);
  hero.rotation.z = t < 3 ? Math.sin(t * 1.6) * .06 : 0; // a little lonely sway before the others arrive
  seekers.forEach((b, i) => { const pop = smooth(ramp(t, 2.4 + i * .15, 2.9 + i * .15)); const p = curves[i].getPoint(walk * .95);
    b.position.set(p.x * pop, map.ground(p.x, p.z) + Math.abs(Math.sin(t * 9 + i)) * .05 * (walk > 0 && walk < 1 ? 1 : .3), p.z * pop); b.scale.setScalar(pop); b.visible = pop > .01; b.face(S.camera); });
  const flow = smooth(ramp(t, 8.0, 9.6));
  minis.forEach(m => { const u = .08 + ((m.u + t * .07) % 1) * .82; const p = curves[m.c].getPoint(u); const k = flow * smooth(clamp((walk * .95 - u) * 8));
    m.b.visible = k > .02; m.b.scale.setScalar(.5 * k); m.b.position.set(p.x, map.ground(p.x, p.z) + Math.abs(Math.sin(t * 10 + m.ph)) * .03, p.z); m.b.face(S.camera); });
  clouds.scale.setScalar(THREE.MathUtils.lerp(.42, 1.25, open)); clouds.rotation.y = t * .03; clouds.position.y = -.1 * open;
  S.done(t);
}

export function overlay(ctx, t) {
  cuteText(ctx, '还没被写下来的,才是你', 540, 420, 66, '#5a4a8a', smooth(ramp(t, 9.8, 10.4)));
  cuteChrome(ctx);
}
