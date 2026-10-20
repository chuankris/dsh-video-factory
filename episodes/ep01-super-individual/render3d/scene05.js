// Beat 5: 道与器 —《易经》形而上/形而下;亚里士多德 技艺 / 实践智慧
import * as THREE from 'three';
import { makeKnife, pointsMaterial, starTex } from './core.js';
import { stage, sample, Morph, toScreen } from './kit.js';
import { drawChrome, drawSubtitle, vtext, seal, ramp, clamp, smooth, ptime, rng, rgba, GOLD, GOLD_HI, PAPER, SERIF, W } from './overlay.js';

export const A = 42.36, B = 64.0;
const S = stage({ bloom: .85, threshold: .55 });
const { scene, camera, env } = S;
const CZ = 10.5, VH = 2 * CZ * Math.tan(THREE.MathUtils.degToRad(15)), VW = VH * 1080 / 1920, CY = .3;
const wp = (sx, sy, z = 0) => new THREE.Vector3((sx / 1080 - .5) * VW, CY + (.5 - sy / 1920) * VH, z);

const T = {
  q0: ptime(11, '形而上'), dao: ptime(11, '道'), xia: ptime(11, '形而下'), qi: ptime(11, '器'),
  tool: ptime(12, '工具'), dir: ptime(12, '方向'), west: ptime(13, '远在西方'), two: ptime(13, '两种'),
  ji: ptime(14, '技艺'), zhi: ptime(14, '实践智慧'),
};

// ---------- 器: the knife, tip pointing up into the seam ----------
const knife = makeKnife(env); scene.add(knife);
const KA = 1.15, KS = .7; const KO = wp(455, 1250, .2);
knife.scale.setScalar(KS);
const knifeMats = []; knife.traverse(o => { if (o.material) { o.material.transparent = true; knifeMats.push(o.material); } });
const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true }));
scene.add(glint);

// ---------- 道: a seam of light that leads the blade ----------
const path = new THREE.CatmullRomCurve3([wp(610, 930), wp(585, 780), wp(650, 620), wp(590, 470), wp(640, 330)], false, 'centripetal');
const PN = 9000, pp = new Float32Array(PN * 3), pu = new Float32Array(PN);
{ const R = rng(8); for (let i = 0; i < PN; i++) { const u = i / PN; const p = path.getPoint(u); const j = .016;
  pp.set([p.x + (R() - .5) * j, p.y + (R() - .5) * j, p.z + (R() - .5) * j], i * 3); pu[i] = u; } }
const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('aU', new THREE.BufferAttribute(pu, 1));
const pathMat = pointsMaterial({ uShow: { value: 0 }, uReach: { value: 0 }, uHead: { value: -1 } }, {
  decl: `attribute float aU; uniform float uShow,uReach,uHead;`,
  main: `P=position; float on=smoothstep(uReach,uReach-.04,aU); float head=exp(-pow((aU-uHead)/.03,2.));
    COL=vec3(1.,.74,.36)*(.25+.9*on)*uShow+vec3(1.,.95,.85)*head*2.5*uShow; A=.4; S=.0055;` });
const pathPts = new THREE.Points(pg, pathMat); pathPts.frustumCulled = false; scene.add(pathPts); S.mats.push(pathMat);

// ---------- 西方: an Ionic column in light ----------
const column = (x) => { x.save(); x.translate(820, 880); x.strokeStyle = '#fff'; x.lineWidth = 3;
  x.strokeRect(-110, -300, 220, 22); // abacus
  x.beginPath(); x.moveTo(-100, -278); x.quadraticCurveTo(0, -250, 100, -278); x.stroke();
  for (const s of [-1, 1]) { x.beginPath(); x.arc(s * 92, -258, 26, 0, 6.283); x.stroke(); x.beginPath(); x.arc(s * 92, -258, 11, 0, 6.283); x.stroke(); }
  x.strokeRect(-78, -236, 156, 12);
  for (let i = 0; i <= 6; i++) { const xx = -70 + i * 140 / 6; x.beginPath(); x.moveTo(xx, -224); x.lineTo(xx * .9, 240); x.stroke(); }
  x.strokeRect(-90, 240, 180, 16); x.strokeRect(-110, 256, 220, 26); x.restore(); };
const C0 = sample(x => { x.fillStyle = '#fff'; x.fillRect(700, 560, 240, 740); }, 12000, { w: VW, h: VH, cy: CY, res: 1080, seed: 21, color: () => [.4, .36, .3] });
const C1 = sample(column, 12000, { w: VW, h: VH, cy: CY, res: 1080, seed: 22, color: () => [.95, .88, .75] });
const col = new Morph([C0, C1], { size: .006, scatter: .8, seed: 23, alpha: .7 });
scene.add(col.points); S.mats.push(col.mat);

export const proj = {};
export function update(t) {
  camera.position.set(Math.sin(t * .31) * .04, CY + Math.sin(t * .23 + 1) * .03, CZ - .5 * smooth(ramp(t, A, B)));
  camera.lookAt(0, CY, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  // knife: gentle sway; turns toward the seam on 方向
  const turn = smooth(ramp(t, T.dir - .2, T.dir + 1.2)) * .06;
  const kIn = smooth(ramp(t, A, A + 1.2));
  knife.position.copy(KO).add(new THREE.Vector3(0, -.25 * (1 - kIn), 0));
  knife.rotation.set(.08 + Math.sin(t * .4) * .05, .12 * Math.sin(t * .27), KA + turn);
  const west = smooth(ramp(t, T.west - .2, T.west + .9)) * (1 - smooth(ramp(t, T.ji - .4, T.ji + .6)));
  knifeMats.forEach(m => m.opacity = kIn * (1 - .55 * west));
  knife.updateMatrixWorld();
  // glint travels the edge on 工具, again at the end
  const gk = ramp(t, T.tool - .1, T.tool + .9), gk2 = ramp(t, B - 1.6, B - .5);
  const gi = Math.max(Math.sin(Math.PI * gk), Math.sin(Math.PI * gk2));
  glint.visible = gi > .01; glint.material.opacity = gi;
  { const u = gk > 0 && gk < 1 ? gk : gk2; glint.position.copy(new THREE.Vector3(.2 + 1.3 * u, -.17 + .1 * u * u, .02).applyMatrix4(knife.matrixWorld)); glint.scale.setScalar(.45 + .25 * gi); }
  // seam
  pathMat.uniforms.uShow.value = (.35 + .65 * smooth(ramp(t, T.dao - .2, T.dao + .6))) * smooth(ramp(t, A + .3, A + 1.6)) * (1 - .55 * west);
  pathMat.uniforms.uReach.value = .25 + .8 * smooth(ramp(t, T.dao - .2, T.dao + 1.2)) + .0 * t;
  const hk = ramp(t, T.dir - .1, T.dir + 1.3); pathMat.uniforms.uHead.value = hk > 0 && hk < 1 ? hk : -1;
  // column
  col.update(t, [[T.west - .1, T.west + 1.3, 0, 1]]);
  col.mat.uniforms.uShow.value = smooth(ramp(t, T.west - .3, T.west + .4)) * (1 - smooth(ramp(t, T.ji - .3, T.ji + .6)));
  // anchors for labels
  proj.handle = toScreen(camera, new THREE.Vector3(-.3, 0, 0).applyMatrix4(knife.matrixWorld));
  proj.blade = toScreen(camera, new THREE.Vector3(.7, 0, 0).applyMatrix4(knife.matrixWorld));
  proj.top = toScreen(camera, path.getPoint(.85));
  S.finish(t, A, B, { aperture: .35, bloomK: .85 + .4 * gi });
}

function label(ctx, txt, sub, x, y, ax, ay, col, a, align) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a;
  ctx.strokeStyle = rgba(col, .7); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(x + (align === 'left' ? -14 : 14), y); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ax, ay, 5, 0, 6.283); ctx.fill();
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 10;
  ctx.font = `700 52px ${SERIF}`; ctx.fillText(txt, x, y);
  ctx.globalAlpha = a * .75; ctx.fillStyle = PAPER; ctx.font = `400 32px ${SERIF}`; ctx.fillText(sub, x, y + 56);
  ctx.restore();
}

export function overlay(ctx, t) {
  const yi = ramp(t, T.q0 - .4, T.q0 + .3) * (1 - ramp(t, T.west - .4, T.west + .3));
  if (yi > 0) {
    vtext(ctx, '形而上者谓之道', 930, 270, 60, PAPER, yi * .92, ramp(t, T.q0, T.dao + .2), 1.16, 600, 6);
    vtext(ctx, '道', 930, 270 + 6 * 60 * 1.16, 60, GOLD_HI, yi * ramp(t, T.dao - .1, T.dao + .4), 1, 1.16, 800, 30);
    vtext(ctx, '形而下者谓之器', 150, 700, 60, PAPER, yi * .92, ramp(t, T.xia, T.qi + .2), 1.16, 600, 6);
    vtext(ctx, '器', 150, 700 + 6 * 60 * 1.16, 60, '#d9a066', yi * ramp(t, T.qi - .1, T.qi + .4), 1, 1.16, 800, 24);
    seal(ctx, '易经', 930, 840, 70, yi * ramp(t, T.q0 + .2, T.q0 + .6));
  }
  // 工具 / 方向 tags
  const ta = ramp(t, T.tool - .1, T.tool + .4) * (1 - ramp(t, T.west - .4, T.west + .2));
  if (proj.blade) label(ctx, '工具', '拿来用', proj.blade[0] + 230, proj.blade[1] + 40, proj.blade[0], proj.blade[1], '#d9a066', ta, 'left');
  const da = ramp(t, T.dir - .1, T.dir + .4) * (1 - ramp(t, T.west - .4, T.west + .2));
  if (proj.top) label(ctx, '方向', '往哪走', proj.top[0] - 200, proj.top[1] + 40, proj.top[0], proj.top[1], GOLD_HI, da, 'right');
  // Aristotle
  const wa = ramp(t, T.west, T.west + .6) * (1 - ramp(t, T.ji - .4, T.ji + .3));
  if (wa > 0) { ctx.save(); ctx.globalAlpha = wa; ctx.textAlign = 'center'; ctx.fillStyle = PAPER; ctx.font = `600 44px ${SERIF}`; ctx.fillText('亚里士多德', 820, 1250);
    ctx.globalAlpha = wa * .55; ctx.font = `italic 400 30px ${SERIF}`; ctx.fillText('Aristotle', 820, 1300); ctx.restore(); }
  const twa = ramp(t, T.two - .1, T.two + .4) * (1 - ramp(t, T.ji - .4, T.ji + .3));
  if (twa > 0) { ctx.save(); ctx.globalAlpha = twa; ctx.textAlign = 'center'; ctx.fillStyle = GOLD_HI; ctx.font = `800 120px ${SERIF}`; ctx.shadowColor = rgba(GOLD_HI, .8); ctx.shadowBlur = 30; ctx.fillText('二', 820, 470); ctx.restore(); }
  // 技艺 / 实践智慧
  if (proj.handle) label(ctx, '技艺', '知道怎么做', 120, 1420, proj.handle[0], proj.handle[1], '#d9a066', ramp(t, T.ji - .1, T.ji + .4), 'left');
  if (proj.top) label(ctx, '实践智慧', '知道该做什么', 960, 330, proj.top[0], proj.top[1], GOLD_HI, ramp(t, T.zhi - .1, T.zhi + .4), 'right');
  drawChrome(ctx, t < T.west - .2 ? '道与器 · 《易经》' : '亚里士多德 · 两种本事', .9);
  drawSubtitle(ctx, t);
}
