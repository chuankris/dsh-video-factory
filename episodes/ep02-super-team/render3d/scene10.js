// 段 10 · 代价:每个人又变回了超级个体,带着自己的一百把刀;不一样的判断,只在开会时碰一碰,就散了
import * as THREE from 'three';
import { board, knifeRing, caption, tail, ramp, smooth, clamp, ACC, INK, COLORS } from './board.js';
import { setup, CREW } from './team.js';
import { ptime } from './overlay.js';

export const A = 125.44, B = 138.64;
const S = board();
const T = { cost: ptime(33, '代价'), solo: ptime(34, '超级个体'), knives: ptime(34, '一百把刀'), value: ptime(35, '不一样的判断'), touch: ptime(35, '碰一碰'), gone: ptime(35, '就散了') };
const { map, fog, crew, curves, trails, fire } = setup(S);
const rings = crew.map(() => knifeRing(S, 22, .09));
// each person's judgement, as a glowing tile of their colour
const sparks = CREW.map(c => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .02, 6), new THREE.MeshStandardMaterial({ color: COLORS[c], emissive: COLORS[c], emissiveIntensity: .7, roughness: .4, transparent: true })); m.castShadow = true; S.scene.add(m); return m; });

export function update(t) {
  const meet = smooth(ramp(t, T.value - 1.0, T.value + .4));
  S.cam(0, 7.6 - 1.6 * meet, 7.4 - 1.5 * meet, 0, 0, -.2 + .1 * meet);
  map.apply(e => { for (let j = 0; j < trails.length; j++) { const k = trails[j].indexOf(e); if (k >= 0 && k / trails[j].length < .95) return { b: 'road', col: [.98, .6, .22] }; } return null; });
  crew.forEach((p, i) => { const far = curves[i].getPoint(.92), near = curves[i].getPoint(.16); const pos = far.clone().lerp(near, meet);
    p.position.set(pos.x, map.ground(pos.x, pos.z) + (meet > 0 && meet < 1 ? Math.abs(Math.sin(t * 8 + i)) * .04 : 0), pos.z);
    const r = rings[i]; r.position.copy(p.position); r.rotation.y = t * .7 * (i % 2 ? -1 : 1);
    r.fade(smooth(ramp(t, T.knives - .3 + i * .1, T.knives + .2 + i * .1)) * (1 - meet)); });
  // the judgements rise, meet over the fire, flash, and drift apart
  const up = smooth(ramp(t, T.value, T.touch)), flash = Math.exp(-Math.pow((t - T.touch - .15) / .18, 2)), apart = smooth(ramp(t, T.gone - .2, T.gone + 1.2));
  sparks.forEach((m, i) => { const p = crew[i].position; const top = new THREE.Vector3(Math.cos(i * 1.57) * .06, .75, Math.sin(i * 1.57) * .06);
    const out = new THREE.Vector3(p.x * 2.2, 1.1, p.z * 2.2); const pos = new THREE.Vector3(p.x, p.y + .55, p.z).lerp(top, up).lerp(out, apart);
    m.position.copy(pos); m.rotation.set(.3, t, 0); m.visible = up > .01; m.material.opacity = 1 - apart; m.material.emissiveIntensity = .7 + 2.5 * flash; m.scale.setScalar(1 + .6 * flash); });
  fire.set(.3 + .7 * meet, t);
  fog.set(t, { r: 3.3 - 1.0 * meet });
  S.done(t);
}

export function overlay(ctx, t) {
  caption(ctx, '代价', 540, 420, 80, smooth(ramp(t, T.cost - .1, T.cost + .3)) * (1 - ramp(t, T.solo - .4, T.solo)), { col: ACC });
  caption(ctx, '四个超级个体', 540, 420, 66, smooth(ramp(t, T.solo, T.solo + .3)) * (1 - ramp(t, T.value - 1.0, T.value - .6)), { col: INK });
  caption(ctx, '碰一碰,就散了', 540, 420, 66, smooth(ramp(t, T.gone, T.gone + .3)), { col: ACC });
  tail(ctx, t, A, B, '代价');
}
