// 小样 1 · 一镜到底:黑暗里一个人和一百把刀 → 迷雾里一群人提灯找路 → 路连成发光的大道,光点(AI)顺着路流
import * as THREE from 'three';
import { terrain, pawn, clouds, knifeRing, hop } from './board.js';
import { duskBoard, glowRoads, lantern, streams, chromeNight, bigLine, ramp, smooth, clamp } from './dusk.js';

export const A = 0, B = 12;
const S = duskBoard();
const map = terrain(S, { seed: 91, clear: 1.2, cz: 0, rx: 3.6, rz: 4.2 });
const fog = clouds(S, { r: .6 });
const glow = glowRoads(S, map);
const hero = pawn(S, 'gold'); hero.position.set(0, map.ground(0, 0), 0);
const ring = knifeRing(S, 28, .1);
const spot = new THREE.SpotLight(0xffe0a0, 5, 8, .28, .6, 1.2); spot.position.set(.4, 3.2, 1.2); spot.target = hero; S.scene.add(spot);
// four seekers walk out toward the fog, each lighting a road behind them
const DIRS = [[-2.1, -1.6], [2.2, -1.2], [1.6, 2.0], [-1.9, 1.7]];
const seekers = ['blue', 'green', 'red', 'purple'].map((c, i) => ({ p: pawn(S, c), l: null, d: DIRS[i] }));
seekers.forEach(o => { o.l = lantern(S, o.p); });
const curves = DIRS.map(([x, z]) => new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(x * .35 + z * .12, 0, z * .35 - x * .12), new THREE.Vector3(x * .7 - z * .1, 0, z * .7 + x * .1), new THREE.Vector3(x, 0, z)]));
const roadOf = map.cells.map(e => { let best = 9, which = -1, u = 0; curves.forEach((cv, j) => { for (let s = 0; s <= 40; s++) { const p = cv.getPoint(s / 40); const d = Math.hypot(p.x - e.x, p.z - e.z); if (d < best) { best = d; which = j; u = s / 40; } } }); return best < .2 ? { j: which, u } : null; });
const flow = streams(S, curves, 2600);

export function update(t) {
  S.nightify();
  // one continuous camera: close on the lone piece, then up and back over the whole map
  const up = smooth(ramp(t, 2.2, 9.5));
  const ang = .5 + t * .06;
  const r = THREE.MathUtils.lerp(2.6, 6.8, up), h = THREE.MathUtils.lerp(1.1, 6.2, up);
  S.camera.position.set(Math.sin(ang) * r * .45, h, Math.cos(ang) * r); S.camera.lookAt(0, THREE.MathUtils.lerp(.3, 0, up), THREE.MathUtils.lerp(0, -.3, up));
  S.camera.fov = THREE.MathUtils.lerp(30, 38, up); S.camera.updateProjectionMatrix(); S.camera.updateMatrixWorld();
  const mood = smooth(ramp(t, 2.5, 5.5)); S.mood(mood);
  spot.intensity = 5 * (1 - .7 * mood);
  ring.position.copy(hero.position); ring.rotation.y = t * .8; ring.fade(1 - smooth(ramp(t, 4.5, 6.5)));
  // seekers leave at 3.5s, reach the fog edge by ~8s
  const walk = smooth(ramp(t, 3.4, 8.2));
  seekers.forEach((o, i) => { const p = curves[i].getPoint(walk * .96); o.p.position.set(p.x, map.ground(p.x, p.z) + (walk > 0 && walk < 1 ? Math.abs(Math.sin(t * 7 + i)) * .03 : 0), p.z);
    o.p.fade(smooth(ramp(t, 3.0 + i * .12, 3.5 + i * .12))); o.l.set(smooth(ramp(t, 3.2, 4.2))); });
  // roads glow behind them; once they meet, they brighten into highways
  const join = smooth(ramp(t, 8.0, 10.0));
  glow.set((e, k) => { const r0 = roadOf[k]; if (!r0) return 0; const lit = smooth(clamp((walk * .96 - r0.u) / .05 + 1)); return lit * (.45 + .55 * join); });
  flow.set(t, smooth(ramp(t, 8.6, 10.2)), 1);
  fog.set(t, { r: THREE.MathUtils.lerp(.6, 3.2, smooth(ramp(t, 2.6, 8.5))), a: smooth(ramp(t, 2.4, 4.0)) });
  S.done(t, { bloomK: .55 + .5 * join });
}

export function overlay(ctx, t) {
  bigLine(ctx, '还没被写下来的,才是你', 470, smooth(ramp(t, 9.6, 10.3)), { size: 70 });
  chromeNight(ctx, '', 1);
}
