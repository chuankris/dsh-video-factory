// Beat 9: 判断 = 审美;一秒一百张图、一百个版本,没有标准答案;康德:只能练,没法教
import * as THREE from 'three';
import { makeKnife, pointsMaterial } from './core.js';
import { stage, sample, glyph, Morph, toScreen } from './kit.js';
import { drawChrome, drawSubtitle, vtext, seal, ramp, clamp, smooth, ease, ptime, rng, rgba, GOLD, GOLD_HI, PAPER, SERIF, W } from './overlay.js';

export const A = 105.72, B = 123.0;
const S = stage({ bloom: .85, threshold: .55 });
const { scene, camera, env } = S;
const CZ = 10.5, VH = 2 * CZ * Math.tan(THREE.MathUtils.degToRad(15)), VW = VH * 1080 / 1920, CY = .3;
const wy = sy => CY + (.5 - sy / 1920) * VH, wx = sx => (sx / 1080 - .5) * VW;

const T = {
  judge: ptime(25, '这种判断'), name: ptime(25, '审美'), hundred: ptime(26, '一百张图'), ver: ptime(26, '一百个版本'),
  which: ptime(27, '哪个对'), taste: ptime(27, '有味道'), none: ptime(27, '没有标准答案'),
  kant: ptime(28, '康德'), lian: ptime(28, '只能练'), jiao: ptime(28, '没法教'),
};

// ---------- the seam opens, and 审美 forms inside it ----------
const GN = 30000, scr = { w: VW, h: VH, cy: CY, res: 1080 };
const G0 = sample(x => { x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(536, 300, 8, 1100); }, GN, { ...scr, seed: 81, zj: .02 });
const G1 = sample(x => { glyph(x, '审', 540, 640, 300, { weight: 800 }); glyph(x, '美', 540, 980, 300, { weight: 800 }); }, GN, { ...scr, seed: 82, zj: .06 });
const G2 = sample(x => { const R = rng(83); x.fillStyle = '#fff'; for (let i = 0; i < 3000; i++) x.fillRect(R() * 1080, 200 + R() * 1300, 2, 2); }, GN, { ...scr, seed: 84, zj: 3, color: () => [.5, .4, .3] });
const word = new Morph([G0, G1, G2], { size: .0064, scatter: .8, seed: 85, alpha: .35 });
scene.add(word.points); S.mats.push(word.mat);
const wordKeys = [[T.name - .5, T.name + .9, 0, 1], [T.hundred - .2, T.hundred + .9, 1, 2]];

// ---------- a hundred versions ----------
function cardTex(seed) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 320; const x = c.getContext('2d'); const R = rng(seed);
  const hue = [[40, 30], [25, 40], [200, 15], [10, 35], [55, 25], [180, 10], [30, 15], [0, 0]][seed % 8];
  const g = x.createLinearGradient(0, 0, 0, 320); g.addColorStop(0, `hsl(${hue[0]},${hue[1]}%,${18 + R() * 20}%)`); g.addColorStop(1, `hsl(${hue[0] + 20},${hue[1]}%,${6 + R() * 8}%)`);
  x.fillStyle = g; x.fillRect(0, 0, 256, 320);
  const k = Math.floor(R() * 3);
  x.globalAlpha = .8;
  if (k === 0) { x.fillStyle = `hsl(${hue[0]},${hue[1] + 10}%,45%)`; x.beginPath(); x.arc(60 + R() * 140, 70 + R() * 80, 20 + R() * 40, 0, 6.283); x.fill();
    x.fillStyle = `hsl(${hue[0]},${hue[1]}%,10%)`; x.beginPath(); x.moveTo(0, 320); for (let i = 0; i <= 8; i++) x.lineTo(i * 32, 190 + R() * 70); x.lineTo(256, 320); x.fill(); }
  else if (k === 1) { for (let i = 0; i < 6; i++) { x.fillStyle = `hsla(${hue[0] + i * 8},${hue[1] + 15}%,${30 + R() * 30}%,.6)`; x.fillRect(R() * 200, R() * 260, 30 + R() * 90, 20 + R() * 90); } }
  else { x.strokeStyle = `hsl(${hue[0]},${hue[1] + 20}%,60%)`; x.lineWidth = 3; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(0, 60 + i * 50 + R() * 20); x.bezierCurveTo(80, R() * 320, 170, R() * 320, 256, 60 + i * 50); x.stroke(); } }
  x.globalAlpha = 1; x.strokeStyle = '#c9a14a'; x.lineWidth = 6; x.strokeRect(3, 3, 250, 314);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const texs = Array.from({ length: 12 }, (_, i) => cardTex(i + 1));
const CN = 100, cards = [], R = rng(91);
const cardGeo = new THREE.PlaneGeometry(.34, .42);
for (let i = 0; i < CN; i++) {
  // golden-angle spiral, pushed into a shallow bowl around the centre
  const r = Math.sqrt((i + .5) / CN) * 1.75, a = i * 2.39996;
  const p = new THREE.Vector3(Math.cos(a) * r * .72, CY + .2 + Math.sin(a) * r * 1.05, -1.6 + .7 * (1 - r / 1.75) + (R() - .5) * .3);
  const m = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ map: texs[i % texs.length], transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  scene.add(m); cards.push({ m, p, d: r / 1.75, spin: (R() - .5) * 1.2, tilt: (R() - .5) * .5 });
}
const HERO = cards.reduce((b, c, i) => (Math.abs(c.p.x - .35) + Math.abs(c.p.y - CY - .35) < Math.abs(cards[b].p.x - .35) + Math.abs(cards[b].p.y - CY - .35) ? i : b), 0);

// ---------- practice: a knife on a whetstone ----------
const stone = new THREE.Mesh(new THREE.BoxGeometry(1.7, .16, .5), new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: .95, metalness: 0, envMap: env, envMapIntensity: .35, transparent: true }));
stone.position.set(0, wy(1290), 0); stone.rotation.set(.45, -.12, 0); scene.add(stone);
const knife = makeKnife(env); knife.scale.setScalar(.85); scene.add(knife);
const kMats = []; knife.traverse(o => { if (o.material) { o.material.transparent = true; kMats.push(o.material); } });
const SN = 1500; const sp = new Float32Array(SN * 3); { const r = rng(95); for (let i = 0; i < SN; i++) sp.set([r(), r(), r()], i * 3); }
const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
const sparkMat = pointsMaterial({ uO: { value: new THREE.Vector3() }, uShow: { value: 0 }, uDir: { value: 1 } }, { decl: 'uniform vec3 uO; uniform float uShow,uDir;', main: `
  float life=fract(position.x+uTime*1.7); vec3 h=position;
  P=uO+vec3(-uDir*(.15+.9*h.y)*life, .5*life-1.6*life*life*h.z+.05, (h.z-.5)*.4*life);
  COL=vec3(1.,.75,.4)*(1.-life)*uShow*1.6; A=.9; S=.006;` });
const sparks = new THREE.Points(sg, sparkMat); sparks.frustumCulled = false; scene.add(sparks); S.mats.push(sparkMat);

export const proj = {};
export function update(t) {
  camera.position.set(Math.sin(t * .31) * .05, CY + Math.sin(t * .23 + 1) * .03, CZ - .6 * smooth(ramp(t, A, T.hundred)) + .6 * smooth(ramp(t, T.hundred, T.hundred + 2)));
  camera.lookAt(0, CY, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  word.update(t, wordKeys);
  word.mat.uniforms.uShow.value = smooth(ramp(t, A, A + 1)) * (1 - smooth(ramp(t, T.hundred + .2, T.hundred + 1.6)));
  word.mat.uniforms.uBright.value = 1 + .6 * Math.exp(-Math.pow((t - T.name - 1) / .5, 2));
  // cards: burst out, drift, the light searches, settles on one, then leaves — then they sink
  const out = t - T.hundred; const sink = smooth(ramp(t, T.kant - .6, T.kant + .8));
  const sweep = ramp(t, T.which - .2, T.taste); const leave = smooth(ramp(t, T.none, T.none + 1.4));
  const hero = cards[HERO].p;
  const spot = new THREE.Vector2(Math.sin(sweep * 7) * 1.2 * (1 - sweep) + hero.x * sweep, CY + .2 + Math.cos(sweep * 5) * 1.4 * (1 - sweep) + (hero.y - CY - .2) * sweep);
  spot.x += leave * -2.5; spot.y += leave * 1.5;
  const judging = smooth(ramp(t, T.which - .3, T.which + .4));
  cards.forEach((c, i) => {
    const k = ease(clamp((out - c.d * .6) / .8));
    c.m.visible = k > .001 && sink < .999;
    c.m.position.set(c.p.x * k, CY + (c.p.y - CY) * k - sink * 3.2 * (.6 + c.d), c.p.z * k + (1 - k) * .5);
    c.m.rotation.set(c.tilt * k, c.spin * (t - T.hundred) * .25 + (1 - k) * 3, c.tilt * .4);
    c.m.scale.setScalar(.3 + .7 * k);
    const d2 = (c.m.position.x - spot.x) ** 2 + (c.m.position.y - spot.y) ** 2;
    const lit = Math.exp(-d2 / .09) * (judging > 0 ? 1 : 0) * (1 - leave * .9);
    const b = (1 - .8 * judging) + 1.3 * lit;
    c.m.material.color.setScalar(b); c.m.material.opacity = k * (1 - sink);
    if (i === HERO) { const f = smooth(ramp(t, T.taste - .3, T.taste + .4)) * (1 - leave); c.m.position.z += .9 * f; c.m.rotation.y *= 1 - f; proj.hero = toScreen(camera, c.m.position); }
  });
  // whetstone
  const ks = smooth(ramp(t, T.kant - .2, T.kant + .9));
  stone.material.opacity = ks; stone.visible = ks > .001; kMats.forEach(m => m.opacity = ks);
  const stroke = t > T.lian ? Math.sin((t - T.lian) * 2 * Math.PI / 1.2) : 0; const dir = t > T.lian ? Math.cos((t - T.lian) * 2 * Math.PI / 1.2) : 0;
  knife.position.set(-.55 + .4 * stroke, wy(1225) + (1 - ks) * .8, .3);
  knife.rotation.set(-.3, .12, -.2);
  sparkMat.uniforms.uShow.value = ks * (t > T.lian ? Math.abs(dir) : 0);
  sparkMat.uniforms.uDir.value = Math.sign(dir) || 1;
  sparkMat.uniforms.uO.value.set(knife.position.x + 1.25, stone.position.y + .1, .3);
  S.finish(t, A, B, { aperture: .3 });
}

export function overlay(ctx, t) {
  // 一百 counter while the wall of versions blooms
  const ca = ramp(t, T.hundred, T.hundred + .3) * (1 - ramp(t, T.which - .3, T.which + .2));
  if (ca > 0) { const n = Math.min(100, Math.floor(100 * ramp(t, T.hundred, T.ver + .3)));
    ctx.save(); ctx.globalAlpha = ca; ctx.textAlign = 'center'; ctx.fillStyle = GOLD_HI; ctx.font = `800 96px ${SERIF}`; ctx.shadowColor = rgba(GOLD_HI, .8); ctx.shadowBlur = 24;
    ctx.fillText(`×${n}`, W / 2, 1460); ctx.restore(); }
  // 有味道? — a question mark, no tick
  const qa = ramp(t, T.taste, T.taste + .3) * (1 - ramp(t, T.none + .4, T.none + .9));
  if (qa > 0 && proj.hero) { ctx.save(); ctx.globalAlpha = qa; ctx.textAlign = 'center'; ctx.fillStyle = GOLD_HI; ctx.font = `800 80px ${SERIF}`; ctx.shadowColor = rgba(GOLD_HI, .9); ctx.shadowBlur = 20; ctx.fillText('?', proj.hero[0] + 110, proj.hero[1] - 90); ctx.restore(); }
  const na = ramp(t, T.none, T.none + .4) * (1 - ramp(t, T.kant - .5, T.kant));
  if (na > 0) { ctx.save(); ctx.globalAlpha = na; ctx.textAlign = 'center'; ctx.fillStyle = PAPER; ctx.font = `600 46px ${SERIF}`; ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 14; ctx.fillText('没有标准答案', W / 2, 1460); ctx.restore(); }
  // Kant
  const ka = ramp(t, T.kant, T.kant + .5);
  vtext(ctx, '判断力', 930, 300, 70, GOLD_HI, ka, ramp(t, T.kant + .3, T.kant + 1.2), 1.16, 700, 18);
  vtext(ctx, '只能练', 820, 330, 54, PAPER, ka, ramp(t, T.lian - .1, T.lian + .7), 1.16, 600, 6);
  vtext(ctx, '没法教', 730, 330, 54, PAPER, ka * .8, ramp(t, T.jiao - .1, T.jiao + .7), 1.16, 600, 6);
  seal(ctx, '康德', 930, 640, 72, ramp(t, T.kant + .2, T.kant + .6));
  drawChrome(ctx, t < T.kant - .2 ? '审美' : '康德 · 判断力', .9);
  drawSubtitle(ctx, t);
}
