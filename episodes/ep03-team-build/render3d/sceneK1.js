// 可爱画风试做 1:豆豆们在云边提灯找路,身后的小路亮起来,一群白豆豆(AI)顺着路跑
import * as THREE from 'three';
import { terrain } from './board.js';
import { cuteStage, cutify, bean, puffClouds, cuteText, cuteChrome } from './cute.js';
import { rng } from './overlay.js';

export const A = 0, B = 10;
const S = cuteStage();
const map = terrain(S, { seed: 95, clear: 1.6, cz: 0, rx: 3.0, rz: 3.6 }); cutify(map);
const clouds = puffClouds(S, 2.9, 36);
const DIRS = [[-1.5, -1.2, 'pink'], [1.6, -.9, 'lav'], [1.2, 1.4, 'peach'], [-1.3, 1.2, 'sky']];
const curves = DIRS.map(([x, z]) => new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(x * .4 + z * .15, 0, z * .4 - x * .15), new THREE.Vector3(x, 0, z)]));
const road = map.cells.filter(e => curves.some(cv => { for (let s = 0; s <= 30; s++) { const p = cv.getPoint(s / 30); if (Math.hypot(p.x - e.x, p.z - e.z) < .16) return true; } return false; }));
const seekers = DIRS.map(([x, z, c]) => { const b = bean(S, c, { lamp: true }); return b; });
const hero = bean(S, 'butter', { scale: 1.15 });
const R = rng(4); const minis = Array.from({ length: 14 }, (_, i) => ({ b: bean(S, 'white', { scale: .55 }), c: i % 4, u: R() }));

export function update(t) {
  S.cam(.9, 3.3, 4.0, 0, 0, -.2, 38);
  map.apply(e => road.includes(e) ? { b: 'road' } : null);
  hero.position.set(0, map.ground(0, 0), 0); hero.face(S.camera);
  seekers.forEach((b, i) => { const p = curves[i].getPoint(.62); b.position.set(p.x, map.ground(p.x, p.z) + Math.abs(Math.sin(t * 4 + i)) * .02, p.z); b.face(S.camera); });
  minis.forEach(m => { const p = curves[m.c].getPoint(.15 + ((m.u + t * .08) % 1) * .7); m.b.position.set(p.x, map.ground(p.x, p.z) + Math.abs(Math.sin(t * 9 + m.u * 20)) * .025, p.z); m.b.face(S.camera); });
  clouds.rotation.y = t * .02;
  S.done(t);
}

export function overlay(ctx, t) {
  cuteText(ctx, '还没被写下来的,才是你', 540, 420, 64);
  cuteChrome(ctx);
}
