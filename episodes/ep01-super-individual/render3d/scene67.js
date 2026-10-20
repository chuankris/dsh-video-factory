// Beat 6–7: 一百把刀 / 缝在哪 / 沙漏(假设) — 3D
import * as THREE from 'three';
import { makeComposer, pointsMaterial, pxScale, makeEnv, makeKnife, radialTex, track } from './core.js';
import { buildOx } from './ox.js';
import { drawChrome, drawSubtitle, vtext, seal, ramp, clamp, smooth, ease, ptime, rng, rgba, GOLD, GOLD_HI, PAPER, SERIF, W, H } from './overlay.js';

export const A = 64.0, B = 87.2;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050506);
const camera = new THREE.PerspectiveCamera(30, 1080 / 1920, .05, 100); scene.add(camera);
const { composer, grade, bloomPass } = makeComposer(scene, camera, { bloom: .8, radius: .55, threshold: .66 });
const env = makeEnv();
const keyL = new THREE.DirectionalLight(0xffe2b0, 3.0); keyL.position.set(-3, 5, 6); scene.add(keyL);
const fillL = new THREE.DirectionalLight(0x8aa0c8, .5); fillL.position.set(4, -2, 3); scene.add(fillL);

const T = {
  hundred: ptime(15, '一百把刀'), write: ptime(16, '写'), qi: ptime(17, '器'), seam: ptime(18, '可刀多了'), look: ptime(18, '有人看'),
  hyp: ptime(19, '假设'), hand: ptime(19, '动手'), think: ptime(19, '想清楚'), x100: ptime(20, '一百倍'), total: ptime(20, '总共'),
};
export const TL = T;

// ---------- knives ----------
const proto = makeKnife(env);
const knifeMats = []; proto.traverse(o => { if (o.material) { o.material.transparent = true; knifeMats.push(o.material); } });
const R = rng(31);
const slots = [];
for (let i = 0; i < 36; i++) slots.push({ r: 1.12, th: i / 36 * Math.PI * 2 + .05, tilt: (R() - .5) * .5 });
for (let i = 0; i < 64; i++) slots.push({ r: 1.95, th: (i + .5) / 64 * Math.PI * 2, tilt: (R() - .5) * .5 });
// order the reveal by angle so the replication sweeps like a fan
const order = slots.map((s, i) => i).sort((a, b) => ((slots[a].th + 1.6) % 6.283) - ((slots[b].th + 1.6) % 6.283));
const knives = slots.map(() => { const k = proto.clone(); scene.add(k); return k; });
const KS = .42; // ring scale

// ---------- ox web (for 缝在哪 / 有人看) ----------
const OX = buildOx({ surf: 45000, vol: 0, mem: 8000, line: 34000 });
const oxGeo = new THREE.BufferGeometry();
oxGeo.setAttribute('position', new THREE.BufferAttribute(OX.pos, 3));
oxGeo.setAttribute('aNrm', new THREE.BufferAttribute(OX.nrm, 3));
oxGeo.setAttribute('aInfo', new THREE.BufferAttribute(OX.info, 4));
const oxMat = pointsMaterial({ uShow: { value: 0 }, uGaze: { value: new THREE.Vector3(9, 9, 9) }, uGazeR: { value: .5 }, uCamPos: { value: new THREE.Vector3() }, uLit: { value: 0 } }, {
  decl: `attribute vec3 aNrm; attribute vec4 aInfo; uniform float uShow,uGazeR,uLit; uniform vec3 uGaze,uCamPos;`,
  main: `
    float kind=aInfo.w, seam=aInfo.y, edge=aInfo.z; float surf=kind<.5?1.:0.;
    float glow = kind>2.5 ? 1. : (kind>1.5 ? .4 : clamp(edge,0.,1.));
    P=position;
    vec3 n=normalize(aNrm); vec3 V=normalize(uCamPos-(modelMatrix*vec4(P,1.)).xyz);
    float rim=pow(1.-abs(dot(n,V)),2.5);
    float d=length(P-uGaze); float g=exp(-d*d/(uGazeR*uGazeR));
    float lit=max(g, uLit);
    vec3 gold=vec3(1.,.7,.3);
    COL = vec3(.75,.7,.62)*surf*rim*.35 + gold*glow*(.05+2.2*lit);
    A = uShow*(surf>.5 ? .5 : 1.);
    S = .0075;` });
oxMat.depthTest = true;
const ox = new THREE.Points(oxGeo, oxMat); ox.frustumCulled = false;
const oxG = new THREE.Group(); oxG.add(ox); oxG.scale.setScalar(.36); oxG.position.set(-.13, .08, 0); oxG.rotation.y = -.25; scene.add(oxG);

// ---------- hourglass ----------
const HG = new THREE.Group(); scene.add(HG); HG.position.set(0, .05, 0);
const HH = 1.12, RR = .74, NECK = .04, FILL = .62; // chamber height, radius, neck, sand fill of top cone
const cone = y => NECK + (RR - NECK) * Math.abs(y) / HH;
// glass as luminous points on the surface
{
  const n = 30000, p = new Float32Array(n * 3), nr = new Float32Array(n * 3); const r = rng(5);
  for (let i = 0; i < n; i++) { const y = (r() * 2 - 1) * HH; const a = r() * Math.PI * 2; const rad = cone(y);
    p.set([Math.cos(a) * rad, y, Math.sin(a) * rad], i * 3);
    const s = Math.sign(y) || 1; const slope = (RR - NECK) / HH; const nn = new THREE.Vector3(Math.cos(a), -s * slope, Math.sin(a)).normalize(); nr.set([nn.x, nn.y, nn.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aNrm', new THREE.BufferAttribute(nr, 3));
  const m = pointsMaterial({ uShow: { value: 0 }, uCamPos: { value: new THREE.Vector3() } }, { decl: 'attribute vec3 aNrm; uniform float uShow; uniform vec3 uCamPos;', main: `
    P=position; vec3 V=normalize(uCamPos-(modelMatrix*vec4(P,1.)).xyz); float rim=pow(1.-abs(dot(normalize(aNrm),V)),3.);
    COL=vec3(.85,.88,.95)*(.03+.55*rim); A=uShow*.6; S=.0036;` });
  m.depthTest = true; const gl = new THREE.Points(g, m); gl.frustumCulled = false; HG.add(gl); HG.userData.glassMat = m;
}
// brass caps and posts
const brass = new THREE.MeshStandardMaterial({ color: 0xb08a48, metalness: 1, roughness: .32, envMap: env, envMapIntensity: 1.6, transparent: true });
const wood = new THREE.MeshStandardMaterial({ color: 0x24170e, metalness: .1, roughness: .5, envMap: env, envMapIntensity: .6, transparent: true });
for (const s of [-1, 1]) {
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(RR + .12, RR + .12, .1, 64), wood); cap.position.y = s * (HH + .06); HG.add(cap);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RR + .12, .018, 12, 96), brass); ring.rotation.x = Math.PI / 2; ring.position.y = s * (HH + .06 - .05 * s); HG.add(ring);
}
for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + .5; const post = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, 2 * HH + .1, 16), brass); post.position.set(Math.cos(a) * (RR + .06), 0, Math.sin(a) * (RR + .06)); HG.add(post); }
const hgMeshMats = [brass, wood];
// sand
const SN = 80000;
const sRank = new Float32Array(SN), sRnd = new Float32Array(SN * 3), sPos = new Float32Array(SN * 3);
{ const r = rng(77); for (let i = 0; i < SN; i++) { sRank[i] = (i + r()) / SN; sRnd.set([r(), r(), r()], i * 3); } }
const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
sGeo.setAttribute('aRank', new THREE.BufferAttribute(sRank, 1)); sGeo.setAttribute('aRnd', new THREE.BufferAttribute(sRnd, 3));
// drain schedule D(t) as piecewise-linear knots — inverted in the shader to know when each grain left
const g0 = T.x100 - .15;
const KN = [[A, 0], [78.6, 0], [g0, .028], [g0 + .25, .07], [g0 + .85, .45], [g0 + 1.15, .5], [B + 2, .528]];
const sMat = pointsMaterial({ uKt: { value: KN.map(k => k[0]) }, uKd: { value: KN.map(k => k[1]) }, uT: { value: 0 }, uShow: { value: 0 }, uLabel: { value: 0 } }, {
  decl: `attribute float aRank; attribute vec3 aRnd; uniform float uKt[7]; uniform float uKd[7]; uniform float uT,uShow,uLabel;
    float Dof(float t){ for(int i=0;i<6;i++){ if(t<=uKt[i+1]) return mix(uKd[i],uKd[i+1],clamp((t-uKt[i])/(uKt[i+1]-uKt[i]),0.,1.)); } return uKd[6]; }
    float Tof(float d){ for(int i=0;i<6;i++){ if(d<=uKd[i+1] && uKd[i+1]>uKd[i]) return mix(uKt[i],uKt[i+1],(d-uKd[i])/(uKd[i+1]-uKd[i])); } return 1e5; }`,
  main: `
    float HH=${HH.toFixed(3)}, RR=${RR.toFixed(3)}, NECK=${NECK.toFixed(3)}, F=${FILL.toFixed(3)};
    float D=Dof(uT); float r=aRank; float ang=aRnd.x*6.2832; float rad=sqrt(aRnd.y);
    vec3 p;
    if(r>=D){ // still in the top chamber; the pile sinks as grains below it leave
      float y=HH*.9*sqrt(max((r-D)*F/.62,1e-6))*.86;
      float cr=(NECK+(RR-NECK)*y/HH)*.94;
      y-=.06*(1.-rad*rad)*smoothstep(0.,.02,D)*0.; // flat top
      p=vec3(cos(ang)*cr*rad, y, sin(ang)*cr*rad);
    } else {
      float te=Tof(r); float s=uT-te;
      float z=HH*(1.-pow(1.-r*F*.98,1./3.)); float yl=-HH+z;
      float fall=.5*7.5*s*s;
      if(-fall>yl){ // in the falling stream
        float j=.012+.01*aRnd.z; p=vec3(cos(ang)*j*rad, -fall, sin(ang)*j*rad);
      } else { // landed: bottom pile with a soft mound
        float cr=(NECK+(RR-NECK)*(HH-z)/HH)*.94;
        float mound=.10*(1.-rad*rad)*smoothstep(0.,.05,r*F);
        p=vec3(cos(ang)*cr*rad, yl+mound*(1.-z/HH), sin(ang)*cr*rad);
      }
    }
    P=p;
    bool hand=r<.5;
    vec3 c=hand? vec3(.8,.48,.16) : vec3(.6,.58,.54);
    c*=.55+.6*aRnd.z;
    COL=c*uShow; A=1.; S=.0062;` }, 'if(d>.5) discard; a=1.;');
sMat.depthTest = true; sMat.depthWrite = true; sMat.transparent = false; sMat.blending = THREE.NormalBlending;
const sand = new THREE.Points(sGeo, sMat); sand.frustumCulled = false; HG.add(sand);
const hgHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex([[0, 'rgba(255,190,110,.25)'], [.45, 'rgba(120,80,40,.06)'], [1, 'rgba(0,0,0,0)']]), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
hgHalo.position.set(0, .4, -3); hgHalo.scale.set(9, 9, 1); scene.add(hgHalo);

// dust
const dust = (() => { const n = 7000, r = rng(4), p = new Float32Array(n * 3); for (let i = 0; i < n; i++) p.set([(r() - .5) * 16, (r() - .5) * 16, -10 + r() * 15], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = pointsMaterial({}, { main: `float id=float(gl_VertexID); vec3 h=hash3(id*.071); P=position+vec3(sin(uTime*.13+h.x*6.)*.4, uTime*(.05+.08*h.y), 0.); P.y=mod(P.y+8.,16.)-8.;
    COL=mix(vec3(1.,.8,.5),vec3(.8,.75,.7),h.z)*.45*(.4+.6*h.x); A=.9; S=.012*(.5+h.y);` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return pts; })();

// ---------- spin integration ----------
function omega(t) { return 2.6 * smooth(ramp(t, T.write - .3, T.write + 1.2)) * (1 - smooth(ramp(t, T.qi - .6, T.qi + .5))); }
function phi(t) { let s = 0; const dt = 1 / 100; for (let x = A; x < t; x += dt) s += omega(x) * dt; return s; }

const camKeys = [
  [A, [0, .05, 6.6, 0, 0, 0]],
  [T.hundred - .2, [0, .05, 7.2, 0, 0, 0]],
  [T.hundred + 1.6, [0, 0, 12.5, 0, 0, 0]],
  [T.qi, [.5, .3, 12.0, 0, 0, 0]],
  [T.seam + .2, [.2, .4, 9.5, 0, 0, 0]],
  [T.look + 1.0, [-.3, .5, 8.6, 0, 0, 0]],
  [T.hyp + .9, [.9, .7, 9.0, 0, -.12, 0]],
  [B, [-.5, .45, 8.3, 0, -.12, 0]],
];
export const proj = { gold: null, pale: null, stream: null, top: null };
const v3 = new THREE.Vector3();
function toScreen(v) { v3.copy(v).project(camera); return [(v3.x * .5 + .5) * W, (1 - (v3.y * .5 + .5)) * H]; }

export function update(t) {
  const c = track(camKeys, t);
  camera.position.set(c[0] + Math.sin(t * .33) * .03, c[1] + Math.sin(t * .27 + 1) * .03, c[2]); camera.lookAt(c[3], c[4], c[5]);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();

  // knives
  const rep = ramp(t, T.hundred - .1, T.hundred + 1.5);
  const ph = phi(t);
  const inward = smooth(ramp(t, T.seam - .2, T.seam + 1.0));
  const fadeK = 1 - smooth(ramp(t, T.hyp - .6, T.hyp + .5));
  knifeMats.forEach(m => m.opacity = fadeK);
  knives.forEach((k, idx) => {
    const sl = slots[idx]; const ord = order.indexOf(idx);
    const p = idx === 0 ? 1 : ease(clamp((rep * 1.5 - ord / slots.length * .5) / 1.0));
    const hero = idx === 0 ? 1 - smooth(ramp(t, T.hundred - .1, T.hundred + .9)) : 0;
    const th = sl.th + ph * (sl.r < 1.5 ? 1 : -.6);
    const tremble = inward * (1 - smooth(ramp(t, T.look + .2, T.look + 1.0))) * .05 * Math.sin(t * 23 + idx * 1.7);
    const rr = sl.r + .98 * KS * inward;
    const ringPos = new THREE.Vector3(Math.cos(th) * rr, Math.sin(th) * rr, 0);
    const heroPos = new THREE.Vector3(-.5, 0, 0);
    k.visible = (p > .001 || hero > 0) && fadeK > .01;
    k.position.lerpVectors(idx === 0 ? heroPos : new THREE.Vector3(-.2, 0, 0), ringPos, idx === 0 ? 1 - hero : p);
    const sc = THREE.MathUtils.lerp(KS, .9, hero) * (idx === 0 ? 1 : (.3 + .7 * p));
    k.scale.setScalar(sc);
    k.rotation.set(sl.tilt * p + (idx === 0 ? Math.sin(t * .8) * .25 * hero : 0), (idx === 0 ? (t - A) * .35 * hero : 0), THREE.MathUtils.lerp(0, th + Math.PI * inward + tremble, idx === 0 ? 1 - hero : p));
  });
  // ox web
  const oxShow = smooth(ramp(t, T.seam - .1, T.seam + .9)) * fadeK;
  oxMat.uniforms.uShow.value = oxShow;
  const gk = ramp(t, T.look - .5, T.look + 1.2);
  oxMat.uniforms.uGaze.value.set(THREE.MathUtils.lerp(2.6, -1.6, ease(gk)), .3 + .25 * Math.sin(gk * 5), .1);
  oxMat.uniforms.uGazeR.value = .45 + .3 * gk;
  oxMat.uniforms.uLit.value = smooth(ramp(t, T.look + .8, T.look + 1.6)) * .55;
  oxMat.uniforms.uCamPos.value.copy(camera.position);

  // hourglass
  const hgShow = smooth(ramp(t, T.hyp - .3, T.hyp + 1.1));
  HG.visible = hgShow > .001; HG.userData.glassMat.uniforms.uShow.value = hgShow; HG.userData.glassMat.uniforms.uCamPos.value.copy(camera.position);
  hgMeshMats.forEach(m => m.opacity = hgShow);
  HG.rotation.y = (t - T.hyp) * .06; HG.position.y = .05 - (1 - hgShow) * .4;
  sMat.uniforms.uT.value = t; sMat.uniforms.uShow.value = hgShow;
  hgHalo.material.opacity = hgShow;
  HG.updateMatrixWorld();
  // screen anchors for overlay labels
  const yGold = HH * .9 * Math.sqrt(.25) * .86, yPale = HH * .9 * Math.sqrt(.8) * .86;
  proj.gold = toScreen(new THREE.Vector3(cone(yGold) * .9, yGold, 0).applyMatrix4(HG.matrixWorld));
  proj.pale = toScreen(new THREE.Vector3(cone(yPale) * .8, yPale, 0).applyMatrix4(HG.matrixWorld));
  proj.stream = toScreen(new THREE.Vector3(0, -.45, 0).applyMatrix4(HG.matrixWorld));
  proj.top = toScreen(new THREE.Vector3(-RR, HH + .1, 0).applyMatrix4(HG.matrixWorld));
  proj.center = toScreen(new THREE.Vector3(0, 0, 0));

  const px = pxScale(camera); const focus = camera.position.length();
  [oxMat, sMat, HG.userData.glassMat, dust.material].forEach(m => { m.uniforms.uPx.value = px; m.uniforms.uFocus.value = focus; m.uniforms.uAperture.value = .5; m.uniforms.uTime.value = t; });
  grade.uniforms.uTime.value = t;
  grade.uniforms.uFade.value = Math.max(1 - ramp(t, A, A + .5), ramp(t, B - .45, B));
  bloomPass.strength = .8 + .6 * oxMat.uniforms.uLit.value;
  composer.render();
}

function label(ctx, txt, x, y, ax, ay, col, a, size = 40) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.font = `700 ${size}px ${SERIF}`; x = Math.min(x, W - 50 - ctx.measureText(txt).width);
  ctx.strokeStyle = rgba(col, .7); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(x - 14, y); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ax, ay, 5, 0, 6.283); ctx.fill();
  ctx.font = `700 ${size}px ${SERIF}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 10; ctx.fillText(txt, x, y);
  ctx.restore();
}

function labelL(ctx, txt, x, y, ax, ay, col, a, size = 40) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a;
  ctx.strokeStyle = rgba(col, .7); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(x + 14, y); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ax, ay, 5, 0, 6.283); ctx.fill();
  ctx.font = `700 ${size}px ${SERIF}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 10; ctx.fillText(txt, x, y);
  ctx.restore();
}
export function overlay(ctx, t) {
  // 写 画 剪 码 around the spinning ring
  const words = [['写', '写'], ['画', '画'], ['剪', '剪'], ['码', '编码']];
  const wa = 1 - ramp(t, T.qi - .4, T.qi + .1);
  words.forEach(([ch, key], i) => { const tt = ptime(16, key); const a = ramp(t, tt - .05, tt + .3) * wa; if (a <= 0) return;
    const ang = -Math.PI / 2 + i * Math.PI / 2 + .6; const cx = W / 2 + Math.cos(ang) * 330, cy = 900 + Math.sin(ang) * 520;
    ctx.save(); ctx.globalAlpha = a; ctx.font = `700 76px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = rgba(GOLD_HI, .9); ctx.shadowBlur = 24; ctx.fillStyle = GOLD_HI; ctx.fillText(ch, cx, cy); ctx.restore(); });
  // 器
  const qa = ramp(t, T.qi - .1, T.qi + .35) * (1 - ramp(t, T.seam - .3, T.seam + .2));
  if (qa > 0) { ctx.save(); ctx.globalAlpha = qa; ctx.font = `800 200px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = rgba(GOLD_HI, .9); ctx.shadowBlur = 50; ctx.fillStyle = GOLD_HI; ctx.fillText('器', W / 2, 960); ctx.restore(); }
  // hourglass labels
  if (proj.gold) {
    const hy = ramp(t, T.hyp, T.hyp + .4);
    seal(ctx, '假设', Math.max(proj.top[0] - 20, 110), Math.max(proj.top[1] - 60, 290), 96, hy);
    const ga = ramp(t, T.hand - .1, T.hand + .4) * (1 - ramp(t, T.x100 + .5, T.x100 + 1.1));
    label(ctx, '动手', proj.gold[0] + 150, proj.gold[1] + 20, proj.gold[0], proj.gold[1], GOLD_HI, ga);
    const pa = ramp(t, T.think - .1, T.think + .4);
    label(ctx, '想清楚 · 核对', proj.pale[0] + 80, proj.pale[1] - 60, proj.pale[0], proj.pale[1], PAPER, pa, 38);
    const xa = ramp(t, T.x100 - .1, T.x100 + .2) * (1 - ramp(t, T.total + .2, T.total + .7));
    if (xa > 0) { ctx.save(); ctx.globalAlpha = xa; ctx.font = `800 120px ${SERIF}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.shadowColor = rgba(GOLD_HI, .9); ctx.shadowBlur = 30; ctx.fillStyle = GOLD_HI;
      ctx.fillText('×100', proj.stream[0] - 90, proj.stream[1]); ctx.restore(); }
    const sa = ramp(t, T.total, T.total + .5);
    label(ctx, '还是原来的速度', proj.pale[0] + 80, proj.pale[1] - 10, proj.pale[0], proj.pale[1], GOLD_HI, sa * .95, 32);
  }
  const lbl = t < T.seam ? '一百把刀' : (t < T.hyp ? '缝在哪' : '假设');
  drawChrome(ctx, lbl, .9);
  drawSubtitle(ctx, t);
}
