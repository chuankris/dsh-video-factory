// 可爱画风试做:豆豆小人、圆形踏脚石地块、马卡龙配色、棉花糖云、圆体字。
import * as THREE from 'three';
import { board } from './board.js';
import { rng, rgba, W, H } from './overlay.js';

export const ROUND = "'Yuanti SC','STYuanti-SC-Bold','PingFang SC',sans-serif";
export const PASTEL = { mint: 0xa8e6cf, butter: 0xffe8a3, peach: 0xffc3a0, pink: 0xffaac9, lav: 0xc9b6f2, sky: 0x9fd3f5, white: 0xfdfbf6, grey: 0xd9dde3 };
const BIOMEP = { water: [.62, .85, .95], sand: [.96, .9, .74], grass: [.74, .9, .7], forest: [.6, .84, .6], hill: [1, .82, .7], rock: [.85, .8, .9], peak: [.97, .96, .98], road: [1, .6, .26], field: [1, .9, .6] };

export function cuteStage() {
  const S = board();
  S.scene.children.filter(o => o.isDirectionalLight && o !== S.sun).forEach(l => { l.intensity = 0; });
  const hemi = S.scene.children.find(o => o.isHemisphereLight); hemi.color.set(0xffffff); hemi.groundColor.set(0xd8c8b0); hemi.intensity = 1.6;
  S.sun.intensity = 1.6; S.sun.color.set(0xfff6ea); S.sun.position.set(-3, 8, 4); S.sun.shadow.radius = 6;
  S.scene.background = new THREE.Color(0xc9e8f7);
  S.grade.uniforms.uVig.value = .12; S.grade.uniforms.uCA.value = 0; S.grade.uniforms.uExposure.value = 1.0;
  S.bloomPass.strength = .25; S.bloomPass.threshold = .95;
  S.scene.traverse(o => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial) o.material.color.set(0xf3ead8); });
  return S;
}
// round stepping stones, pastel colours, lollipop trees
export function cutify(map) {
  map.tiles.geometry = new THREE.CylinderGeometry(map.HR * .86, map.HR * .9, 1, 28).translate(0, .5, 0);
  map.tiles.material.roughness = .7; map.tiles.material.envMapIntensity = .15;
  map.trees.geometry = new THREE.SphereGeometry(.055, 16, 12).scale(1, 1.1, 1).translate(0, .09, 0);
  map.trees.material.color.set(0x7ccf8a);
  map.water.material.color.set(0x8fd6f0);
  const base = map.apply;
  map.apply = (f = null) => base(e => { const o = (f && f(e)) || {}; const b = o.b || e.b; return { ...o, col: o.col || BIOMEP[b] || BIOMEP.grass, h: o.h ?? Math.min(e.h, .14) * .8 + .04 }; });
  map.apply();
}
// a round bean with big eyes and rosy cheeks
export function bean(S, color, { scale = 1, lamp = false } = {}) {
  const g = new THREE.Group(); g.scale.setScalar(scale); S.scene.add(g);
  const mat = new THREE.MeshStandardMaterial({ color: PASTEL[color] ?? color, roughness: .55, envMap: S.env, envMapIntensity: .25 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.11, .1, 10, 24), mat); body.position.y = .21; body.scale.set(1, 1, .9); body.castShadow = true; g.add(body);
  const black = new THREE.MeshBasicMaterial({ color: 0x2a2420 }), white = new THREE.MeshBasicMaterial({ color: 0xffffff }), blush = new THREE.MeshBasicMaterial({ color: 0xff8fa8, transparent: true, opacity: .7 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.024, 12, 10), black); eye.position.set(s * .045, .27, .095); eye.scale.z = .5; g.add(eye);
    const hi = new THREE.Mesh(new THREE.SphereGeometry(.008, 8, 6), white); hi.position.set(s * .045 + .008, .279, .106); g.add(hi);
    const ck = new THREE.Mesh(new THREE.CircleGeometry(.018, 16), blush); ck.position.set(s * .075, .235, .1); ck.rotation.y = s * .5; g.add(ck);
    const arm = new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 10), mat); arm.position.set(s * .12, .17, .02); arm.castShadow = true; g.add(arm);
  }
  const sprout = new THREE.Mesh(new THREE.SphereGeometry(.025, 10, 8), new THREE.MeshStandardMaterial({ color: 0x7ccf8a, roughness: .6 })); sprout.position.set(0, .395, 0); sprout.scale.set(1.6, .6, .9); g.add(sprout);
  if (lamp) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .2, 6), new THREE.MeshStandardMaterial({ color: 0xb08a5a })); stick.position.set(.15, .25, .03); stick.rotation.z = -.4; g.add(stick);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(.035, 14, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.25, .6), toneMapped: false })); orb.position.set(.2, .34, .03); g.add(orb);
  }
  g.face = (camera) => { const p = new THREE.Vector3(); camera.getWorldPosition(p); g.rotation.y = Math.atan2(p.x - g.position.x, p.z - g.position.z); };
  return g;
}
// puffy cotton-candy clouds around a clearing of radius r
export function puffClouds(S, r = 2.4, n = 40, seed = 3) {
  const R = rng(seed); const grp = new THREE.Group(); S.scene.add(grp);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9, envMap: S.env, envMapIntensity: .2, transparent: true });
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + R() * .2, rr = r + R() * 1.6; const c = new THREE.Group();
    for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.22 + R() * .2, 18, 14), mat); s.position.set((R() - .5) * .5, R() * .15, (R() - .5) * .35); c.add(s); }
    c.position.set(Math.cos(a) * rr, .35 + R() * .3, Math.sin(a) * rr); grp.add(c); }
  grp.mat = mat; return grp;
}
export function cuteText(ctx, s, x, y, size, col = '#5a4a8a', a = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.font = `700 ${size}px ${ROUND}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = size * .22; ctx.strokeStyle = '#ffffff'; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.restore();
}
export function cuteChrome(ctx) {
  ctx.save(); ctx.font = `700 30px ${ROUND}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = '#fff';
  ctx.strokeText('超级个体 与 超级团队 · 下', 60, 96); ctx.fillStyle = '#6a5a9a'; ctx.fillText('超级个体 与 超级团队 · 下', 60, 96);
  ctx.fillStyle = '#ff7f9f'; ctx.beginPath(); ctx.roundRect(W - 60 - 124, H - 40 - 44, 124, 44, 22); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `700 24px ${ROUND}`; ctx.textAlign = 'center'; ctx.fillText('AI 生成', W - 60 - 62, H - 40 - 22); ctx.restore();
}
