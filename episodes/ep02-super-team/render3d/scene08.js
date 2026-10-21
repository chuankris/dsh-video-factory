// 段 8 · 我们团队也试过一起干 → 后来各干各的,定期碰一次,看看谁折腾出了什么
import * as THREE from 'three';
import { board, hop, caption, tail, ramp, smooth, clamp, ACC, INK } from './board.js';
import { setup } from './team.js';
import { ptime } from './overlay.js';

export const A = 106.8, B = 114.52;
const S = board();
const T = { together: ptime(28, '大家一起干'), apart: ptime(29, '各干各的'), meet: ptime(29, '定期碰一次'), what: ptime(29, '折腾出了什么') };
const { map, fog, crew, curves, trails, fire } = setup(S);
const shared = map.cells.filter(e => Math.abs(e.z - .55) < .12 && e.x > -.9 && e.x < .9).sort((a, b) => a.x - b.x);
const finds = curves.map((_, i) => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(.05), new THREE.MeshStandardMaterial({ color: [0xf0c040, 0x60a0f0, 0x60d080, 0xf07050][i], emissive: [0xf0c040, 0x60a0f0, 0x60d080, 0xf07050][i], emissiveIntensity: .6, roughness: .3 })); m.castShadow = true; S.scene.add(m); return m; });

export function update(t) {
  const out = smooth(ramp(t, T.apart - .2, T.apart + 1.8)); const back = smooth(ramp(t, T.meet - .2, T.meet + 1.2));
  S.cam(0, 6.2 + 1.2 * out, 6.3 + 1.0 * out, 0, 0, -.2);
  const build = ramp(t, A + .2, T.apart - .3);
  map.apply(e => { const i = shared.indexOf(e); if (i >= 0 && i / shared.length < build) return { b: 'road' };
    for (let j = 0; j < trails.length; j++) { const k = trails[j].indexOf(e); if (k >= 0 && k / trails[j].length < out * .8) return { b: 'road', col: [.98, .6, .22] }; } return null; });
  crew.forEach((p, i) => {
    let pos;
    if (t < T.apart - .2) { const s = shared[Math.min(shared.length - 1, Math.floor(build * shared.length))] || shared[0]; pos = new THREE.Vector3(s.x - .3 + i * .2 - .3, 0, s.z + (i % 2 ? .18 : -.18)); }
    else pos = curves[i].getPoint(clamp(out * .8 * (1 - back) + .08 * back));
    p.position.set(pos.x, map.ground(pos.x, pos.z) + (out > 0 && out < 1 || (back > 0 && back < 1) ? Math.abs(Math.sin(t * 8 + i)) * .04 : 0), pos.z);
    const ahead = curves[i].getPoint(clamp(out * .8 + .02)); p.rotation.y = Math.atan2(ahead.x - pos.x, ahead.z - pos.z) - Math.PI / 2;
    const f = finds[i]; const fk = smooth(ramp(t, T.what - .3, T.what + .3)); f.visible = fk > .01;
    const fp = pos.clone().lerp(new THREE.Vector3(Math.cos(i * 1.57) * .14, 0, Math.sin(i * 1.57) * .14), fk); f.position.set(fp.x, map.ground(fp.x, fp.z) + .08 + .04 * Math.sin(t * 3 + i), fp.z); f.rotation.y = t;
  });
  fire.set(smooth(ramp(t, T.meet - .4, T.meet + .3)), t);
  fog.set(t, { r: 1.5 + 1.4 * out });
  S.done(t);
}

export function overlay(ctx, t) {
  caption(ctx, '一起干', 540, 420, 66, smooth(ramp(t, T.together - .2, T.together + .2)) * (1 - ramp(t, T.apart - .4, T.apart - .1)), { col: INK });
  caption(ctx, '各干各的', 540, 420, 66, smooth(ramp(t, T.apart, T.apart + .3)) * (1 - ramp(t, T.meet - .3, T.meet)), { col: ACC });
  caption(ctx, '定期碰一次', 540, 420, 66, smooth(ramp(t, T.meet, T.meet + .3)), { col: '#8a6a3a' });
  tail(ctx, t, A, B, '我们');
}
