// 小样 2 · 签名镜头:从迷雾边上提灯的人一路拔高,路网连起来,从天上看是一个"道"字
import * as THREE from 'three';
import { terrain, pawn, clouds } from './board.js';
import { duskBoard, glowRoads, lantern, chromeNight, bigLine, ramp, smooth, clamp, rng } from './dusk.js';
import { SERIF } from './overlay.js';

export const A = 0, B = 9;
const S = duskBoard();
const GR = 4.6; // half-size of the glyph on the map
const map = terrain(S, { seed: 93, clear: GR + .6, cz: 0, rx: 6.2, rz: 6.2, trees: true });
const fog = clouds(S, { r: 2.0 });
const glow = glowRoads(S, map);
// rasterise 道 and mark the hexes it covers
const gc = document.createElement('canvas'); gc.width = gc.height = 512; const gx = gc.getContext('2d');
gx.fillStyle = '#fff'; gx.font = `900 480px ${SERIF}`; gx.textAlign = 'center'; gx.textBaseline = 'middle'; gx.fillText('道', 256, 270);
const gd = gx.getImageData(0, 0, 512, 512).data;
const R = rng(5);
const road = map.cells.map(e => { const u = Math.round((e.x / (2 * GR) + .5) * 511), v = Math.round((e.z / (2 * GR) + .5) * 511);
  if (u < 0 || v < 0 || u > 511 || v > 511) return null; return gd[(v * 512 + u) * 4 + 3] > 110 ? { o: Math.hypot(e.x - .9, e.z - 3.4) / 9 + R() * .12 } : null; });
// the piece at the fog edge, and a few more scattered along the strokes
const hero = pawn(S, 'gold'); const HP = new THREE.Vector3(.9, 0, 3.55);
const lamp = lantern(S, hero);
const others = ['blue', 'green', 'red', 'purple', 'cyan'].map(c => pawn(S, c, { flag: false }));
const spots = map.cells.filter((e, k) => road[k] && R() < .05).slice(0, 5);

export function update(t) {
  S.nightify();
  const rise = smooth(ramp(t, .6, 6.6));
  const from = new THREE.Vector3(2.0, .55, 5.4), to = new THREE.Vector3(0, 19.5, 2.2);
  const p = from.clone().lerp(to, rise); p.x += Math.sin(rise * Math.PI) * 1.4;
  S.camera.position.copy(p); S.camera.lookAt(new THREE.Vector3(.8, .35, 3.2).lerp(new THREE.Vector3(0, 0, -.15), smooth(ramp(t, .8, 6.0))));
  S.camera.fov = 34; S.camera.updateProjectionMatrix(); S.camera.updateMatrixWorld();
  hero.position.set(HP.x, map.ground(HP.x, HP.z), HP.z); hero.rotation.y = -2.2; lamp.set(1);
  others.forEach((o, i) => { const e = spots[i] || spots[0]; o.position.set(e.x, map.ground(e.x, e.z), e.z); });
  // strokes light up from where the hero stands, finishing as the camera clears the clouds
  const grow = ramp(t, 0, 5.8) * 1.15;
  glow.set((e, k) => { const r = road[k]; if (!r) return 0; return smooth(clamp((grow - r.o) / .08)) * (.8 + .2 * Math.sin(t * 2 + k)); });
  fog.set(t, { r: THREE.MathUtils.lerp(1.6, 9.0, smooth(ramp(t, 1.0, 6.4))), cx: .9 * (1 - rise), cz: 3.4 * (1 - rise) });
  S.done(t, { bloomK: .6 + .3 * smooth(ramp(t, 5.5, 7)) });
}

export function overlay(ctx, t) {
  bigLine(ctx, '共享一个道', 1500, smooth(ramp(t, 7.0, 7.8)), { size: 72 });
  chromeNight(ctx, '', 1);
}
