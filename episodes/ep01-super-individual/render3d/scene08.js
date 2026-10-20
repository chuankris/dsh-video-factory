// Beat 8: 一个人带着一百把刀,撞上三堵墙 — 看不过来 / 倒了就停 / 砸了全扛
import * as THREE from 'three';
import { makeKnife, pointsMaterial } from './core.js';
import { stage, sample, figure, Morph } from './kit.js';
import { drawChrome, drawSubtitle, seal, ramp, clamp, smooth, ease, ptime, rng, rgba, GOLD, GOLD_HI, PAPER, SERIF, W } from './overlay.js';

export const A = 87.2, B = 105.72;
const S = stage({ bloom: .8, threshold: .6, haloOp: .5 });
const { scene, camera, env } = S;
const CZ = 10.5, VH = 2 * CZ * Math.tan(THREE.MathUtils.degToRad(15)), VW = VH * 1080 / 1920, CY = .3;
const wy = sy => CY + (.5 - sy / 1920) * VH;

const T = {
  three: ptime(21, '三堵墙'),
  w1: ptime(22, '第一堵'), many: ptime(22, '刀太多'), w1e: 95.4,
  w2: ptime(23, '第二堵'), sick: ptime(23, '你一病'), stop: ptime(23, '都停'),
  w3: ptime(24, '第三堵'), hit: ptime(24, '砸了') + .15, none: ptime(24, '没人'),
};

// ---------- the person ----------
const PN = 14000;
const P0 = sample(x => figure(x, 540, 1270, 250), PN, { w: VW, h: VH, cy: CY, res: 1080, seed: 31 });
const person = new Morph([P0], { size: .0062, scatter: 0, seed: 32, alpha: .4 });
scene.add(person.points); S.mats.push(person.mat);
const FOOT = wy(1395), HEAD = wy(1076), PC = wy(1180);

// ---------- a hundred knives (a ring of them) ----------
const proto = makeKnife(env); proto.scale.setScalar(.2);
const KN = 30; const knives = []; const kMats = [];
for (let i = 0; i < KN; i++) { const k = proto.clone(); k.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; kMats.push(o.material); } }); scene.add(k); knives.push(k); }
const omega = t => .55 * (1 - smooth(ramp(t, T.sick, T.stop)));
const phi = t => { let s = 0; for (let x = A; x < t; x += .01) s += omega(x) * .01; return s; };

// ---------- the line of work (flows, then stops) ----------
const LN = 3000; const lp = new Float32Array(LN * 3); { const R = rng(41); for (let i = 0; i < LN; i++) lp.set([R(), wy(1470) + (R() - .5) * .03, (R() - .5) * .05], i * 3); }
const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
const lineMat = pointsMaterial({ uOff: { value: 0 }, uShow: { value: 0 }, uLive: { value: 1 } }, { decl: 'uniform float uOff,uShow,uLive;', main: `
  float u=fract(position.x+uOff); P=vec3((u-.5)*${(VW * 1.05).toFixed(3)}, position.y, position.z);
  float id=float(gl_VertexID); vec3 h=hash3(id*.31); float pulse=pow(fract(u*6.-uOff*6.),6.);
  COL=mix(vec3(.35,.32,.3), vec3(1.,.72,.34)*(.5+1.5*pulse), uLive)*uShow; A=.5; S=.005*(.6+.8*h.x);` });
const line = new THREE.Points(lg, lineMat); line.frustumCulled = false; scene.add(line); S.mats.push(lineMat);
const lineOff = t => { let s = 0; for (let x = A; x < t; x += .01) s += .12 * (1 - smooth(ramp(x, T.sick, T.stop))) * .01; return s; };

// ---------- three walls ----------
function wallTex(num, words) {
  const c = document.createElement('canvas'); c.width = 600; c.height = 720; const x = c.getContext('2d');
  x.fillStyle = '#121010'; x.fillRect(0, 0, 600, 720);
  const R = rng(num.charCodeAt(0)); for (let i = 0; i < 9000; i++) { x.globalAlpha = .05 + R() * .08; x.fillStyle = R() < .5 ? '#000' : '#3a342c'; x.fillRect(R() * 600, R() * 720, 1 + R() * 4, 1 + R() * 3); }
  x.globalAlpha = .35; x.strokeStyle = '#000'; x.lineWidth = 2; for (let y = 120; y < 720; y += 120) { x.beginPath(); x.moveTo(0, y + (R() - .5) * 6); x.lineTo(600, y + (R() - .5) * 6); x.stroke(); }
  const e = document.createElement('canvas'); e.width = 600; e.height = 720; const ex = e.getContext('2d');
  ex.fillStyle = '#000'; ex.fillRect(0, 0, 600, 720); ex.textAlign = 'center'; ex.textBaseline = 'middle';
  ex.fillStyle = '#fff'; ex.font = `800 120px ${SERIF}`; ex.fillText(num, 300, 120);
  ex.font = `700 84px ${SERIF}`; Array.from(words).forEach((ch, i) => ex.fillText(ch, 300, 250 + i * 96));
  x.globalAlpha = 1; x.drawImage(e, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = '#3a2a14'; x.fillRect(0, 0, 600, 720);
  const map = new THREE.CanvasTexture(c), em = new THREE.CanvasTexture(e); map.colorSpace = THREE.SRGBColorSpace; return { map, em };
}
const WW = 2.1, WH = 2.52, WD = .3;
const walls = [['一', '看不过来'], ['二', '倒了就停'], ['三', '砸了全扛']].map(([n, w]) => {
  const { map, em } = wallTex(n, w);
  const face = new THREE.MeshStandardMaterial({ map, emissive: 0xd9a050, emissiveMap: em, emissiveIntensity: 0, roughness: .85, metalness: .05, envMap: env, envMapIntensity: .25, transparent: true });
  const side = new THREE.MeshStandardMaterial({ color: 0x14110e, roughness: .9, envMap: env, envMapIntensity: .2, transparent: true });
  const m = new THREE.Mesh(new THREE.BoxGeometry(WW, WH, WD), [side, side, side, side, face, side]); scene.add(m); return { m, face, side };
});
const wTime = [[T.w1, T.w2], [T.w2, T.w3], [T.w3, 1e9]];
const ROW = i => [(i - 1) * 1.02, wy(470), -2.2, .42];
const FRONT = [0, wy(610), -1.4, .82];

// ---------- wall 1: things waiting to be checked pile up on the face ----------
const DN = 4000; const dp = new Float32Array(DN * 3), dt = new Float32Array(DN);
{ const R = rng(51); for (let i = 0; i < DN; i++) { dp.set([(R() - .5) * WW * .9, (R() - .5) * WH * .9, WD / 2 + .02], i * 3); dt[i] = T.many - .6 + Math.pow(R(), .55) * (T.w1e - T.many + .4); } }
const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dg.setAttribute('aT', new THREE.BufferAttribute(dt, 1));
const dotMat = pointsMaterial({ uT: { value: 0 }, uShow: { value: 1 }, uGaze: { value: new THREE.Vector2() } }, { decl: 'attribute float aT; uniform float uT,uShow; uniform vec2 uGaze;', main: `
  P=position; float on=smoothstep(aT,aT+.25,uT); float g=exp(-dot(P.xy-uGaze,P.xy-uGaze)/.05);
  COL=mix(vec3(1.,.8,.45),vec3(1.,1.,.95),g)*(.6+2.*g)*on*uShow; A=.9; S=.011;` });
const dots = new THREE.Points(dg, dotMat); dots.frustumCulled = false; walls[0].m.add(dots); S.mats.push(dotMat);

// ---------- wall 3: the stone that lands on one person ----------
const rockGeo = new THREE.IcosahedronGeometry(.62, 2); { const p = rockGeo.attributes.position; const R = rng(61); for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const n = 1 + .22 * Math.sin(v.x * 7 + 1) * Math.cos(v.y * 6) + .08 * R(); p.setXYZ(i, v.x * n, v.y * n * .8, v.z * n); } rockGeo.computeVertexNormals(); }
const rock = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: .8, metalness: .1, envMap: env, envMapIntensity: .7, flatShading: true }));
scene.add(rock);
const REST = FOOT + (HEAD - FOOT) * .8 + .42, DROP = 4.2, G = 14, tFall = T.hit - Math.sqrt(2 * DROP / G);
const BN = 2500; const bp = new Float32Array(BN * 3); { const R = rng(71); for (let i = 0; i < BN; i++) { const a = R() * 6.283, e = (R() - .2) * 1.2; bp.set([Math.cos(a) * Math.cos(e), Math.abs(Math.sin(e)) * .6 + .1, Math.sin(a) * Math.cos(e) * .5], i * 3); } }
const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
const burstMat = pointsMaterial({ uS: { value: -1 }, uO: { value: new THREE.Vector3(0, HEAD, 0) } }, { decl: 'uniform float uS; uniform vec3 uO;', main: `
  float id=float(gl_VertexID); vec3 h=hash3(id*.17); float s=max(uS,0.);
  P=uO+position*(1.-exp(-s*3.))*(.9+h.x*1.4)+vec3(0.,-.6*s*s,0.);
  COL=vec3(.9,.75,.55)*exp(-s*1.3)*step(0.,uS); A=.7; S=.007*(.6+h.y);` });
const burst = new THREE.Points(bg, burstMat); burst.frustumCulled = false; scene.add(burst); S.mats.push(burstMat);

export const proj = {};
const v3 = new THREE.Vector3();
export function update(t) {
  const pull = smooth(ramp(t, T.none - .2, T.none + 1.6));
  camera.position.set(Math.sin(t * .31) * .04, CY + Math.sin(t * .23 + 1) * .03 + .3 * pull, CZ + 3.2 * pull - .4 * smooth(ramp(t, A, T.three)));
  camera.lookAt(0, CY + .1 * pull, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();

  // walls: rise into a far row on 三堵墙, step forward one by one, back to the row at the end
  walls.forEach((w, i) => {
    const rise = ease(ramp(t, T.three - .2 + i * .22, T.three + .9 + i * .22));
    const [t0, t1] = wTime[i]; const fwd = smooth(ramp(t, t0 - .3, t0 + .9)); const gone = smooth(ramp(t, t1 - .3, t1 + .7));
    const back = smooth(ramp(t, T.none + .1, T.none + 1.5));
    const r = ROW(i); let p = r.map((v, j) => v + (FRONT[j] - v) * fwd);
    p[0] -= 3.2 * gone * (1 - back); p = p.map((v, j) => v + (r[j] - v) * back * (fwd > 0 ? 1 : 0));
    w.m.position.set(p[0], p[1] - (1 - rise) * 3.5, p[2]); w.m.scale.setScalar(p[3]);
    w.m.rotation.y = .12 * Math.sin(t * .2 + i) * (1 - back);
    const op = rise * (1 - gone * (1 - back)); w.face.opacity = op; w.side.opacity = op;
    w.face.emissiveIntensity = (.25 + 1.1 * fwd * (1 - gone)) * (1 - .4 * back) + .5 * back;
  });
  // person
  const sick = smooth(ramp(t, T.sick - .1, T.sick + .6)) * (1 - smooth(ramp(t, T.w3 - .3, T.w3 + .6)));
  person.mat.uniforms.uBright.value = 1.2 - .95 * sick;
  // knives orbit the person, then stop and drop
  const ph = phi(t); const kShow = smooth(ramp(t, A, A + .8)) * (1 - .7 * smooth(ramp(t, T.w3 - .3, T.w3 + .8)));
  knives.forEach((k, j) => {
    const a = j / KN * 6.283 + ph; const rx = .74, ry = .74;
    let x = Math.cos(a) * rx, y = PC + Math.sin(a) * ry, rz = a;
    const s = t - (T.stop + j * .025);
    if (s > 0) { const fall = Math.min(.5 * 9 * s * s, y - (FOOT + .02 + (j % 3) * .015)); y -= fall; rz = THREE.MathUtils.lerp(a, (j % 2 ? 0 : Math.PI) + (j % 5) * .1, clamp(fall / Math.max(.01, (Math.sin(a) * ry + PC) - FOOT))); }
    k.position.set(x, y, -.25 + .1 * Math.sin(a)); k.rotation.set(0, 0, rz);
  });
  kMats.forEach(m => m.opacity = kShow);
  lineMat.uniforms.uOff.value = lineOff(t); lineMat.uniforms.uShow.value = smooth(ramp(t, T.w2 - .2, T.w2 + .6)) * (1 - smooth(ramp(t, T.w3, T.w3 + .8)));
  lineMat.uniforms.uLive.value = 1 - smooth(ramp(t, T.sick, T.stop + .3));
  // wall-1 dots and the gaze that can't keep up
  dotMat.uniforms.uT.value = t; dotMat.uniforms.uShow.value = 1 - smooth(ramp(t, T.w2 - .3, T.w2 + .3));
  const gs = t - T.many; dotMat.uniforms.uGaze.value.set(Math.sin(gs * (2.2 + gs * .6)) * .7, Math.cos(gs * (1.7 + gs * .5)) * .9);
  // rock
  const fs = t - tFall; let ry = REST + DROP; if (fs > 0) ry = Math.max(REST, REST + DROP - .5 * G * fs * fs);
  rock.visible = fs > 0; rock.position.set(.05, ry, 0); rock.rotation.set(.3 + fs * .4 * (ry > REST ? 1 : 0), .8, .2);
  const imp = t - T.hit; const squash = imp > 0 ? .8 + .2 * Math.exp(-imp * 6) * Math.cos(imp * 30) * 0 + 0 : 1;
  person.points.scale.y = squash; person.points.position.y = FOOT * (1 - squash);
  burstMat.uniforms.uS.value = imp; burstMat.uniforms.uO.value.set(0, HEAD + .05, 0);
  // counter anchor
  proj.wall = (() => { v3.set(0, -WH * .52, WD / 2).applyMatrix4(walls[0].m.matrixWorld); v3.project(camera); return [(v3.x * .5 + .5) * 1080, (1 - (v3.y * .5 + .5)) * 1920]; })();
  S.halo.material.opacity = .45 + .2 * Math.sin(t * .3);
  S.finish(t, A, B, { aperture: .3, bloomK: .8 + .5 * Math.exp(-Math.max(imp, 0) * 3) * (imp > 0 ? 1 : 0) });
}

export function overlay(ctx, t) {
  // pending-check counter under wall 1
  const ca = ramp(t, T.many, T.many + .4) * (1 - ramp(t, T.w2 - .4, T.w2));
  if (ca > 0) { const n = Math.floor(DN * clamp(Math.pow((t - T.many + .6) / (T.w1e - T.many + .4), 1 / .55)));
    ctx.save(); ctx.globalAlpha = ca; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 44px ${SERIF}`; ctx.fillStyle = PAPER; ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 10;
    ctx.fillText(`待验 ${n}`, W / 2, 250); ctx.restore(); }
  // 停
  const sa = ramp(t, T.stop, T.stop + .3) * (1 - ramp(t, T.w3 - .4, T.w3));
  seal(ctx, '停', 860, 1430, 90, sa, .1);
  // 全扛
  const qa = ramp(t, T.hit + .2, T.hit + .6) * (1 - ramp(t, B - .8, B - .3));
  if (qa > 0) { ctx.save(); ctx.globalAlpha = qa; ctx.textAlign = 'center'; ctx.font = `700 40px ${SERIF}`; ctx.fillStyle = PAPER; ctx.fillText('一个人', W / 2, 1490); ctx.restore(); }
  drawChrome(ctx, '三堵墙', .9);
  drawSubtitle(ctx, t);
}
