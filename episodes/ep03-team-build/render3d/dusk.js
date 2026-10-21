// 第三集共用:黄昏入夜的沙盘。发光的路、提灯的人、顺着路流动的光点(AI)、浅色字的版式。
import * as THREE from 'three';
import { board, toScreen } from './board.js';
import { ramp, smooth, clamp, rng, rgba, SERIF, W, H, CINNABAR, GOLD_HI, PAPER } from './overlay.js';

// mood: 0 = pitch dark (episode 1), 1 = dusk sandbox
export function duskBoard() {
  const S = board();
  S.bloomPass.strength = .7; S.bloomPass.threshold = .9; S.grade.uniforms.uExposure.value = 1.0; S.grade.uniforms.uVig.value = .7;
  const hemi = S.scene.children.find(o => o.isHemisphereLight);
  // kit.stage() adds a bright key and fill light for the dark-gold look; at night they must go
  S.scene.children.filter(o => o.isDirectionalLight && o !== S.sun).forEach(l => { l.intensity = 0; });
  const bgDark = new THREE.Color(0x050506), bgDusk = new THREE.Color(0x1c2440);
  S.mood = k => {
    S.scene.background = bgDark.clone().lerp(bgDusk, k);
    S.sun.color.set(0xffb070); S.sun.intensity = .9 * k; S.sun.position.set(-6, 3.2, 2);
    hemi.color.set(0x4a5a9a); hemi.groundColor.set(0x1a1410); hemi.intensity = .5 * k;
  };
  // night: almost no environment reflection, so the sun, lanterns and roads do the lighting
  S.nightify = () => S.scene.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    ms.forEach(m => { if (m.isMeshStandardMaterial && !m.userData.night) { m.userData.night = 1; m.envMapIntensity = m.metalness > .5 ? .35 : .04; } }); });
  S.mood(1);
  return S;
}

// glowing plates on top of road tiles (bloom picks them up)
export function glowRoads(S, map) {
  const plate = new THREE.CylinderGeometry(map.HR * .97, map.HR * .97, .012, 6);
  const mesh = new THREE.InstancedMesh(plate, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), map.cells.length);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(map.cells.length * 3), 3);
  S.scene.add(mesh);
  const m = new THREE.Matrix4(), c = new THREE.Color(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  // f(cell, index) → brightness 0..1 (0 hides the plate)
  mesh.set = f => { map.cells.forEach((e, k) => { const b = f(e, k);
    if (b <= .001) { mesh.setMatrixAt(k, zero); return; }
    const y = (e.cur ? e.cur.h + e.cur.y : e.h) + .008; m.makeScale(1.05, 1, 1.05); m.setPosition(e.x, y, e.z); mesh.setMatrixAt(k, m);
    c.setRGB(1.35 * b, .62 * b, .14 * b); mesh.setColorAt(k, c); });
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; };
  return mesh;
}

// a lantern held by a piece
export function lantern(S, piece, { light = true } = {}) {
  const orb = new THREE.Mesh(new THREE.SphereGeometry(.045, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.5, .7), toneMapped: false }));
  S.scene.add(orb); const pl = light ? new THREE.PointLight(0xffb060, 0, 1.8, 2) : null; if (pl) S.scene.add(pl);
  return { set(k) { const p = piece.position; orb.position.set(p.x + .11, p.y + .5 * piece.scale.y, p.z + .03); orb.visible = k > .01; orb.scale.setScalar(Math.max(k, .01));
    if (pl) { pl.position.copy(orb.position); pl.intensity = 1.6 * k; } } };
}

// streams of tiny lights flowing along curves (the hands that AI multiplies)
export function streams(S, curves, n = 2400) {
  const pos = new Float32Array(n * 3), seed = new Float32Array(n * 2); const R = rng(17);
  for (let i = 0; i < n; i++) seed.set([R(), R()], i * 2);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size: .035, color: new THREE.Color(2.0, 1.4, .6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; S.scene.add(pts);
  const LUT = curves.map(cv => cv.getSpacedPoints(240));
  return { set(t, k, reach = 1) { mat.opacity = k; pts.visible = k > .01;
    for (let i = 0; i < n; i++) { const ci = i % LUT.length, L = LUT[ci]; const u = ((seed[i * 2] + t * (.05 + .05 * seed[i * 2 + 1])) % 1) * reach;
      const f = u * (L.length - 1), a = Math.floor(f), b = Math.min(L.length - 1, a + 1), w = f - a;
      pos[i * 3] = L[a].x + (L[b].x - L[a].x) * w + (seed[i * 2 + 1] - .5) * .06; pos[i * 3 + 1] = .2 + .03 * Math.sin(i + t * 3); pos[i * 3 + 2] = L[a].z + (L[b].z - L[a].z) * w + (seed[i * 2] - .5) * .06; }
    g.attributes.position.needsUpdate = true; } };
}

// light-on-dark chrome for the night scenes
export function chromeNight(ctx, label, a = 1) {
  ctx.save(); ctx.globalAlpha = a; ctx.textBaseline = 'middle'; ctx.fillStyle = rgba('#c9a14a', .9); ctx.font = `600 30px ${SERIF}`; ctx.textAlign = 'left'; ctx.fillText('超级个体 与 超级团队 · 下', 60, 96);
  ctx.fillStyle = rgba(PAPER, .5); ctx.font = `400 26px ${SERIF}`; ctx.textAlign = 'right'; ctx.fillText('怎么一起找路', W - 60, 96);
  ctx.strokeStyle = rgba('#c9a14a', .3); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(60, 136); ctx.lineTo(W - 60, 136); ctx.stroke();
  if (label) { ctx.textAlign = 'left'; ctx.fillStyle = rgba(PAPER, .5); ctx.font = `400 28px ${SERIF}`; ctx.fillText(label, 60, 184); }
  ctx.globalAlpha = 1; ctx.fillStyle = CINNABAR; const tw = 118, th = 40, tx = W - 60 - tw, ty = H - 40 - th; ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 6); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `700 24px ${SERIF}`; ctx.textAlign = 'center'; ctx.fillText('AI 生成', tx + tw / 2, ty + th / 2 + 1); ctx.restore();
}
// one of the few big lines allowed on screen
export function bigLine(ctx, s, y, a, { size = 84, col = GOLD_HI } = {}) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.font = `800 ${size}px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = rgba(col, .8); ctx.shadowBlur = size * .4; ctx.fillStyle = col; ctx.fillText(s, W / 2, y); ctx.restore();
}
export { toScreen, ramp, smooth, clamp, rng };
