// 可爱画风 · 小样 2 签名镜头:从云边提灯的豆豆一路拔高,路一段段亮起来,从天上看是一个"道"字
import * as THREE from 'three';
import { terrain } from './board.js';
import { cuteStage, cutify, bean, puffClouds, cuteText, cuteChrome } from './cute.js';
import { ramp, smooth, clamp, rng } from './overlay.js';

export const A = 0, B = 9;
const S = cuteStage();
const GR = 4.6;
const map = terrain(S, { seed: 93, clear: GR + .6, cz: 0, rx: 6.2, rz: 6.2 }); cutify(map);
const clouds = puffClouds(S, 2.4, 70, 8);
// clear the side facing the opening camera, so the first shot isn't a wall of cloud
clouds.children.forEach(c => { const d = Math.hypot(c.position.x, c.position.z) || 1; if ((c.position.x * .55 + c.position.z * .83) / d > .35) c.visible = false; });
const gc = document.createElement('canvas'); gc.width = gc.height = 512; const gx = gc.getContext('2d');
gx.fillStyle = '#fff'; gx.font = `900 480px 'Noto Serif CJK SC','Songti SC',serif`; gx.textAlign = 'center'; gx.textBaseline = 'middle'; gx.fillText('道', 256, 270);
const gd = gx.getImageData(0, 0, 512, 512).data;
const HP = new THREE.Vector3(.9, 0, 3.55); const R = rng(5);
const order = new Map(); map.cells.forEach(e => { const u = Math.round((e.x / (2 * GR) + .5) * 511), v = Math.round((e.z / (2 * GR) + .5) * 511);
  if (u >= 0 && v >= 0 && u < 512 && v < 512 && gd[(v * 512 + u) * 4 + 3] > 110) order.set(e, Math.hypot(e.x - HP.x, e.z - HP.z) / 9 + R() * .1); });
const roadCells = [...order.keys()];
const hero = bean(S, 'butter', { lamp: true, scale: 1.1 });
const crew = ['pink', 'lav', 'peach', 'sky', 'mint'].map(c => ({ b: bean(S, c, { lamp: true, scale: 1.6 }), e: roadCells[Math.floor(R() * roadCells.length)] }));

export function update(t) {
  const rise = smooth(ramp(t, .8, 6.8));
  const p = new THREE.Vector3(2.0, .5, 5.2).lerp(new THREE.Vector3(0, 19, 3.0), rise); p.x += Math.sin(rise * Math.PI) * 1.4;
  const look = new THREE.Vector3(.9, .25, 3.4).lerp(new THREE.Vector3(0, 0, -.1), smooth(ramp(t, 1.0, 6.2)));
  S.cam(p.x, p.y, p.z, look.x, look.y, look.z, 34);
  const grow = ramp(t, .2, 6.0) * 1.12;
  map.apply(e => { const o = order.get(e); if (o === undefined) return null; const k = clamp((grow - o) / .05); return k > 0 ? { b: 'road', h: .2, y: .05 * Math.sin(Math.PI * k) * (k < 1 ? 1 : 0) } : null; });
  hero.position.set(HP.x, map.ground(HP.x, HP.z) + Math.abs(Math.sin(t * 3)) * .02, HP.z); hero.face(S.camera);
  crew.forEach((o, i) => { const k = smooth(ramp(t, 3 + i * .3, 3.4 + i * .3)); o.b.scale.setScalar(1.6 * k); o.b.visible = k > .01; o.b.position.set(o.e.x, map.ground(o.e.x, o.e.z), o.e.z); o.b.face(S.camera); });
  const open = smooth(ramp(t, 1.0, 6.5)); clouds.scale.setScalar(THREE.MathUtils.lerp(.55, 3.4, open)); clouds.position.set(HP.x * (1 - open), -.4 * open, HP.z * (1 - open));
  clouds.mat.opacity = 1 - .5 * smooth(ramp(t, 5.5, 7));
  S.done(t);
}

export function overlay(ctx, t) {
  cuteText(ctx, '共享一个道', 540, 1560, 80, '#ff7f9f', smooth(ramp(t, 7.0, 7.7)));
  cuteChrome(ctx);
}
