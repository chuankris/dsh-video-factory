// 段 3 · 找人不是为了多几双手 → 手要多少有多少 → 眼睛、肩膀 → 一个想得不一样的人
import * as THREE from 'three';
import { board, terrain, pawn, clouds, knifeRing, hop, caption, toScreen, tail, ramp, smooth, ACC, INK } from './board.js';
import { ptime } from './overlay.js';

export const A = 17.56, B = 32.64;
const S = board();
const T = { hands: ptime(5, '多几双手'), many: ptime(6, '要多少有多少'), eyes: ptime(7, '眼睛'), shoulder: ptime(7, '肩膀'), diff: ptime(8, '不一样的人') };
const map = terrain(S, { seed: 31, clear: 1.9, cz: .1 });
const fog = clouds(S, { r: 1.7 });
const gold = pawn(S, 'gold'); const G = new THREE.Vector3(0, 0, .2);
const rings = [knifeRing(S, 20, .1), knifeRing(S, 30, .1), knifeRing(S, 44, .1)];
// eyes: a blue piece with a lantern
const blue = pawn(S, 'blue');
const lantern = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.3, .7) }));
const lampL = new THREE.PointLight(0xffd080, 0, 1.6, 2); S.scene.add(lantern, lampL);
// shoulders: a boulder carried by two
const green = pawn(S, 'green');
const rockGeo = new THREE.DodecahedronGeometry(.34, 1); { const p = rockGeo.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const k = 1 + .12 * Math.sin(v.x * 9) * Math.cos(v.z * 7); p.setXYZ(i, v.x * k, v.y * k * .75, v.z * k); } rockGeo.computeVertexNormals(); }
const rock = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: .85, flatShading: true, transparent: true })); rock.castShadow = true; S.scene.add(rock);
// different: a red piece walks the other way and finds a road
const red = pawn(S, 'red');
const road = map.cells.filter(e => e.x > 1.0 && Math.abs(e.z - (.1 - (e.x - 1.0) * .4)) < .16).sort((a, b) => a.x - b.x);

export const proj = {};
export function update(t) {
  S.cam(.1 + Math.sin(t * .15) * .1, 6.2, 6.4, 0, 0, -.2);
  gold.position.set(G.x, map.ground(G.x, G.z), G.z); gold.rotation.y = .3;
  // knives appear, multiply, then fade as the real answer comes
  rings.forEach((r, i) => { const t0 = i === 0 ? T.hands : T.many + (i - 1) * .35; const k = smooth(ramp(t, t0 - .1, t0 + .4)) * (1 - smooth(ramp(t, T.eyes - .6, T.eyes)));
    r.position.copy(gold.position); r.scale.setScalar(1 + i * .45); r.rotation.y = t * (.6 - i * .15) * (i % 2 ? -1 : 1); r.fade(k); });
  // eyes
  const e0 = T.eyes - .3; const ew = smooth(ramp(t, e0, e0 + 1.6)); const eShow = smooth(ramp(t, e0 - .2, e0 + .2));
  const bx = -.3 - .75 * ew, bz = .1 - .55 * ew; blue.position.set(bx, map.ground(bx, bz) + Math.abs(Math.sin((t - e0) * 9)) * .03 * (ew < 1 && ew > 0 ? 1 : 0), bz); blue.fade(eShow); blue.rotation.y = -2.0;
  lantern.position.set(bx + .1, blue.position.y + .48, bz + .02); lantern.visible = eShow > .01; lampL.position.copy(lantern.position); lampL.intensity = 1.2 * eShow;
  // shoulders
  const s0 = T.shoulder - .5; const gs = smooth(ramp(t, s0 - .3, s0 + .3));
  const gx = .55, gz = .55; green.position.set(gx, map.ground(gx, gz) + hop(t, s0, .2, .35), gz); green.fade(gs); green.rotation.y = -1.2;
  const fall = t - (T.shoulder - .1); const ry = fall < 0 ? 3 : Math.max(.78, 3 - .5 * 14 * fall * fall);
  rock.position.set((G.x + gx) / 2, map.ground(.3, .4) + ry, (G.z + gz) / 2); rock.visible = fall > -.4; rock.rotation.set(.2, t * .1, .1);
  const sq = fall > 0 && ry <= .78 ? 1 - .06 * Math.exp(-(fall - .4) * 5) : 1; gold.scale.y = sq; green.scale.y = sq;
  // a different mind
  const d0 = T.diff - .2; const rs = smooth(ramp(t, d0 - .3, d0 + .1)); const rw = smooth(ramp(t, d0 + .2, d0 + 2.2));
  const rx = .95 + .9 * rw, rz = .15 - .35 * rw; red.position.set(rx, map.ground(rx, rz), rz); red.fade(rs); red.rotation.y = 1.9;
  map.apply(e => { const i = road.indexOf(e); if (i < 0) return null; const k = ramp(t, d0 + .2 + i * .12, d0 + .5 + i * .12); return k > 0 ? { b: 'road', y: .03 * Math.sin(Math.PI * k) } : null; });
  fog.set(t, { r: 1.7 + .5 * ew + .5 * rw, cx: -.4 * ew + .8 * rw, cz: -.2 * ew - .1 * rw });
  proj.blue = toScreen(S.camera, lantern.position); proj.rock = toScreen(S.camera, rock.position); proj.red = toScreen(S.camera, red.position.clone().setY(red.position.y + .9));
  S.done(t);
}

export function overlay(ctx, t) {
  caption(ctx, '手 · 要多少有多少', 540, 420, 58, smooth(ramp(t, T.many - .1, T.many + .4)) * (1 - ramp(t, T.eyes - .6, T.eyes - .2)), { col: '#8a6a3a' });
  if (proj.blue) {
    caption(ctx, '眼睛', proj.blue[0], proj.blue[1] - 90, 54, smooth(ramp(t, T.eyes, T.eyes + .4)), { col: '#3f7fd0' });
    caption(ctx, '肩膀', proj.rock[0] - 40, proj.rock[1] + 170, 54, smooth(ramp(t, T.shoulder + .2, T.shoulder + .6)), { col: '#3fae6a' });
    caption(ctx, '不一样', Math.min(proj.red[0], 900), proj.red[1] - 40, 54, smooth(ramp(t, T.diff + .3, T.diff + .7)), { col: ACC });
  }
  tail(ctx, t, A, B, '眼睛 · 肩膀 · 不一样');
}
