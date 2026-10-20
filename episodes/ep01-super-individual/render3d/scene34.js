// Beat 3–4: 庖丁解牛 / 技进乎道 — 3D
import * as THREE from 'three';
import { renderer, makeComposer, pointsMaterial, pxScale, makeEnv, makeKnife, radialTex, starTex, track } from './core.js';
import { buildOx } from './ox.js';
import { drawChrome, drawSubtitle, vtext, seal, ramp, clamp, smooth, ptime, GOLD, GOLD_HI, PAPER, rng } from './overlay.js';

export const A = 17.6, B = 42.35;

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050506);
const camera = new THREE.PerspectiveCamera(30, 1080 / 1920, .05, 100); scene.add(camera);
const { composer, grade, bloomPass } = makeComposer(scene, camera, { bloom: .9, radius: .6, threshold: .5 });
const env = makeEnv();

// ---------- ox ----------
const OX = buildOx({ surf: 110000, vol: 22000, mem: 26000, line: 42000 });
const NCH = 64;
const chunkU = Array.from({ length: NCH }, () => new THREE.Vector4(0, 0, 0, 1));
const oxGeo = new THREE.BufferGeometry();
oxGeo.setAttribute('position', new THREE.BufferAttribute(OX.pos, 3));
oxGeo.setAttribute('aNrm', new THREE.BufferAttribute(OX.nrm, 3));
oxGeo.setAttribute('aInfo', new THREE.BufferAttribute(OX.info, 4));
const oxMat = pointsMaterial({ uForm: { value: 0 }, uSee: { value: 0 }, uChunk: { value: chunkU }, uCamPos: { value: new THREE.Vector3() }, uBright: { value: 1 } }, {
  decl: `attribute vec3 aNrm; attribute vec4 aInfo; uniform float uForm,uSee,uBright; uniform vec4 uChunk[${NCH}]; uniform vec3 uCamPos;`,
  main: `
    float id=float(gl_VertexID); vec3 h=hash3(id*.0137+.31);
    int ci=int(aInfo.x+.5); vec4 ch=uChunk[ci];
    float kind=aInfo.w, seam=aInfo.y, edge=aInfo.z;
    float glow = kind>2.5 ? 1. : (kind>1.5 ? .5 : clamp(max(edge, seam*.3),0.,1.));
    vec3 p=position+ch.xyz;
    float dl=h.x*.45; float f=clamp((uForm-dl)/.55,0.,1.); f=1.-pow(1.-f,3.);
    vec3 sc=vec3((h.x-.5)*14., (h.y-.5)*11.+.5, (h.z-.5)*10.-1.5);
    float sw=(1.-f)*5.*(h.y-.5); sc.xz=mat2(cos(sw),-sin(sw),sin(sw),cos(sw))*sc.xz;
    p=mix(sc,p,f);
    float sd=clamp((uSee-h.z*.55)/.45,0.,1.); float keep=max(glow*glow, (kind<.5?1.:0.)*smoothstep(.55,.9,pow(1.-abs(dot(normalize(aNrm),normalize(uCamPos-position))),1.))); float ash=sd*(1.-keep);
    p+=vec3(sin(id*.37+uTime*.7)*.35, .4+h.x*2.2, cos(id*.21+uTime*.5)*.35)*ash*ash;
    vec3 n=normalize(aNrm); vec3 V=normalize(uCamPos-p);
    float lam=max(dot(n,normalize(vec3(-.35,.85,.45))),0.);
    float rim=pow(1.-abs(dot(n,V)),3.);
    vec3 bone=vec3(.92,.84,.70); vec3 gold=vec3(1.,.70,.30);
    float surf=kind<.5?1.:0.;
    vec3 cBody=bone*(surf*(.10+.55*lam+1.3*rim)+(1.-surf)*.05);
    vec3 cGold=gold*(kind>2.5?2.2:(kind>1.5?.35:(1.6*edge+.35*seam)));
    vec3 c0=cBody+gold*glow*.18;
    vec3 c1=cGold+gold*surf*rim*.55*(1.-ash*.6)+vec3(1.,.55,.2)*ash*.2;
    COL=mix(c0,c1,smoothstep(0.,1.,uSee))*uBright;
    A=.30*(1.-ash*.9)*mix(.45,1.,f)*ch.w;
    S=.0058*(kind>2.5?1.3:1.); P=p;
  ` });
oxMat.depthTest = true;
const oxPts = new THREE.Points(oxGeo, oxMat); oxPts.frustumCulled = false; scene.add(oxPts);

// ---------- the main seam the knife follows ----------
const pathCurve = new THREE.CatmullRomCurve3([
  [1.75, 1.35, .45], [1.3, .66, .1], [.75, .5, .04], [.05, .42, 0], [-.6, .44, -.04], [-1.2, .4, -.02], [-1.75, .25, 0], [-2.4, .05, 0]
].map(a => new THREE.Vector3(...a)), false, 'centripetal');
const MAIN_N = 9000; { }
const mainPos = new Float32Array(MAIN_N * 3), mainU = new Float32Array(MAIN_N);
{ const R = rng(7); for (let i = 0; i < MAIN_N; i++) { const u = i / MAIN_N; const p = pathCurve.getPoint(u);
  const j = .012 * (R() - .5); mainPos.set([p.x + j, p.y + 2 * j * (R() - .5), p.z + j * (R() - .5) * 2], i * 3); mainU[i] = u; } }
const mainGeo = new THREE.BufferGeometry(); mainGeo.setAttribute('position', new THREE.BufferAttribute(mainPos, 3)); mainGeo.setAttribute('aU', new THREE.BufferAttribute(mainU, 1));
const mainMat = pointsMaterial({ uShow: { value: 0 }, uCut: { value: 0 } }, {
  decl: `attribute float aU; uniform float uShow,uCut;`,
  main: `P=position; float lit=smoothstep(uCut,uCut-.05,aU); float head=exp(-pow((aU-uCut)/.012,2.));
    float inside=smoothstep(.06,.12,aU)*smoothstep(.97,.9,aU);
    COL=vec3(1.,.74,.36)*(.35*uShow*inside+.9*lit*inside)+vec3(1.,.95,.85)*head*3.*step(.001,uCut);
    A=.35; S=.005;` });
mainMat.depthTest = true;
const mainPts = new THREE.Points(mainGeo, mainMat); mainPts.frustumCulled = false; scene.add(mainPts);

// chunk -> knife release mapping
const chunkRel = OX.seeds.map(s => { let best = 1e9, bu = 0; const sv = new THREE.Vector3(...s);
  for (let i = 0; i <= 200; i++) { const u = i / 200; const d = pathCurve.getPoint(u).distanceTo(sv); if (d < best) { best = d; bu = u; } }
  const dir = sv.clone().sub(pathCurve.getPoint(bu)).normalize(); return { u: bu, d: best, dir }; });

// ---------- atmosphere ----------
function dustCloud(n, seed, box, size, bright) {
  const R = rng(seed); const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) p.set([box[0] + R() * (box[1] - box[0]), box[2] + R() * (box[3] - box[2]), box[4] + R() * (box[5] - box[4])], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = pointsMaterial({ uB: { value: bright } }, { decl: 'uniform float uB;', main: `
    float id=float(gl_VertexID); vec3 h=hash3(id*.071);
    P=position+vec3(sin(uTime*.13+h.x*6.)*.4, uTime*(.05+.08*h.y), cos(uTime*.11+h.z*6.)*.4);
    P.y=mod(P.y+6.,14.)-6.;
    COL=mix(vec3(1.,.8,.5),vec3(.8,.75,.7),h.z)*uB*(.4+.6*h.x); A=.9; S=${size.toFixed(4)}*(.5+h.y);` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; return pts;
}
const dust = dustCloud(9000, 3, [-9, 9, -6, 8, -12, 7], .012, .5); scene.add(dust);
// ground mist ring
const groundN = 26000; const gp = new Float32Array(groundN * 3); { const R = rng(9); for (let i = 0; i < groundN; i++) { const r = Math.pow(R(), .6) * 5.5, a = R() * 6.283; gp.set([Math.cos(a) * r, -1.68 + (R() - .5) * .03, Math.sin(a) * r * .9], i * 3); } }
const gGeo = new THREE.BufferGeometry(); gGeo.setAttribute('position', new THREE.BufferAttribute(gp, 3));
const gMat = pointsMaterial({ uG: { value: 1 } }, { decl: 'uniform float uG;', main: `P=position; float r=length(P.xz); float id=float(gl_VertexID); vec3 h=hash3(id*.013);
  COL=vec3(.95,.82,.62)*(.5*exp(-r*r/5.)+.04)*uG*(.5+h.x); A=.6; S=.005;` });
gMat.depthTest = true; const ground = new THREE.Points(gGeo, gMat); ground.frustumCulled = false; scene.add(ground);
// backlight halo
const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex([[0, 'rgba(255,190,110,.22)'], [.4, 'rgba(120,80,40,.06)'], [1, 'rgba(0,0,0,0)']]), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
halo.position.set(-.2, .6, -4.5); halo.scale.set(13, 13, 1); scene.add(halo);

// ---------- knives ----------
const knifeFG = makeKnife(env); camera.add(knifeFG);
const knifeW = makeKnife(env); knifeW.scale.setScalar(.72); scene.add(knifeW);
const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true }));
camera.add(glint);
const keyL = new THREE.DirectionalLight(0xffe2b0, 3.2); keyL.position.set(-3, 5, 4); scene.add(keyL);
const fillL = new THREE.DirectionalLight(0x8aa0c8, .5); fillL.position.set(4, -1, 2); scene.add(fillL);

// ---------- timeline ----------
const T = {
  form0: 20.6, form1: 25.0,
  kIn: ptime(6, '一把刀'), glint: ptime(6, '刀刃'), kOut: ptime(7, '他说'),
  see0: ptime(7, '眼里'), see1: ptime(7, '缝') + .6,
  dao: ptime(8, '他对'), cut0: ptime(9, '他厉害') - .2, cut1: ptime(9, '往哪走') + .9,
};
export const TL = T;

const camKeys = [
  [A, [4.4, 2.6, 20.5, .4, -.1, 0, 34]],
  [20.8, [3.8, 1.6, 18.6, .4, -.25, 0, 32]],
  [25.2, [4.2, .6, 16.8, .4, -.35, 0, 30]],
  [28.8, [3.6, .5, 16.0, .4, -.35, 0, 30]],
  [33.8, [2.8, 1.2, 13.8, .35, -.2, 0, 30]],
  [38.5, [-.6, 1.6, 13.4, .45, -.1, 0, 30]],
];
const tmpV = new THREE.Vector3();

export function update(t) {
  // camera base path
  let c = track(camKeys, t);
  camera.fov = c[6];
  let pos = new THREE.Vector3(c[0], c[1], c[2]), tgt = new THREE.Vector3(c[3], c[4], c[5]);
  // knife tracking shot at the end
  const cutP = ramp(t, T.cut0, T.cut1); const cutE = smooth(cutP);
  const kpos = pathCurve.getPoint(clamp(.02 + cutE * .96, 0, 1));
  if (t > T.cut0 - 1.2) {
    const blend = smooth(ramp(t, T.cut0 - 1.2, T.cut0 + .3));
    const look = kpos.clone().lerp(new THREE.Vector3(.3, -.2, 0), .45);
    const tc = look.clone().add(new THREE.Vector3(1.6, 1.1, 8.6));
    pos.lerp(tc, blend); tgt.lerp(look, blend);
  }
  // subtle handheld drift
  pos.x += Math.sin(t * .37) * .03; pos.y += Math.sin(t * .29 + 1) * .025;
  camera.position.copy(pos); camera.lookAt(tgt); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  const dist = pos.distanceTo(new THREE.Vector3(.2, 0, 0));

  // formation / seeing
  const form = ramp(t, T.form0, T.form1);
  const see = smooth(ramp(t, T.see0, T.see1));
  oxMat.uniforms.uForm.value = form; oxMat.uniforms.uSee.value = see;
  oxMat.uniforms.uCamPos.value.copy(pos);
  gMat.uniforms.uG.value = (.25 + .75 * form) * (1 - .8 * see);
  mainMat.uniforms.uShow.value = see * (1 - .3 * ramp(t, T.cut0, T.cut1));
  mainMat.uniforms.uCut.value = t > T.cut0 ? .02 + cutE * .96 : 0;
  // chunk release behind the knife (如土委地)
  OX.seeds.forEach((s, i) => { const r = chunkRel[i]; const fall = Math.exp(-r.d * r.d / .5);
    const k = smooth(clamp((cutE * 1.0 - r.u + .02) / .18, 0, 1)) * fall;
    chunkU[i].set(r.dir.x * .1 * k, r.dir.y * .06 * k - .22 * k * k, r.dir.z * .1 * k, 1 - .35 * k); });

  // focus: knife foreground rack focus
  const kfg = smooth(ramp(t, T.kIn - .2, T.kIn + 1.4)) * (1 - smooth(ramp(t, T.kOut - .2, T.kOut + 1.3)));
  const focusK = smooth(ramp(t, T.kIn + .3, T.kIn + 1.5)) * (1 - smooth(ramp(t, T.kOut - .3, T.kOut + .6)));
  let focus = THREE.MathUtils.lerp(dist, 4.0, focusK);
  if (t > T.cut0 - 1.2) focus = THREE.MathUtils.lerp(focus, pos.distanceTo(kpos), smooth(ramp(t, T.cut0 - 1.2, T.cut0)));
  const aperture = THREE.MathUtils.lerp(.55, 1.4, focusK) * (t < T.form0 ? 2.2 : 1);
  [oxMat, mainMat, gMat, dust.material].forEach(m => { m.uniforms.uPx.value = pxScale(camera); m.uniforms.uFocus.value = focus; m.uniforms.uAperture.value = aperture; m.uniforms.uTime.value = t; });

  // foreground knife (camera space): slides in from lower right, edge catches light
  knifeFG.visible = kfg > 0.001;
  knifeFG.position.set(THREE.MathUtils.lerp(1.7, -.42, kfg) + (t - T.kIn) * .025, -.42 + (1 - kfg) * -.3, -4.0);
  knifeFG.rotation.set(-.12 + Math.sin(t * .4) * .03, .55 - (t - T.kIn) * .09, .32);
  // glint travels along the edge
  const gk = ramp(t, T.glint - .1, T.glint + .9);
  const gi = Math.sin(Math.PI * gk) * kfg;
  glint.visible = gi > .01; glint.material.opacity = gi;
  { const local = new THREE.Vector3(THREE.MathUtils.lerp(.2, 1.5, gk), -.17 + .1 * gk * gk, .01); knifeFG.updateMatrix(); local.applyMatrix4(knifeFG.matrix); glint.position.copy(local); glint.scale.setScalar(.55 + .25 * gi); }

  // world knife riding the seam
  const kw = ramp(t, T.cut0 - .6, T.cut0) * (1 - ramp(t, T.cut1 + .2, B));
  knifeW.visible = kw > .01;
  const kp0 = pathCurve.getPoint(clamp(.02 + cutE * .96, 0, 1)), tan = pathCurve.getTangent(clamp(.02 + cutE * .96, 0, .999));
  knifeW.position.copy(kp0);
  const m = new THREE.Matrix4(); const up = new THREE.Vector3(0, 1, 0); const zx = new THREE.Vector3().crossVectors(tan, up).normalize(); const yy = new THREE.Vector3().crossVectors(zx, tan);
  m.makeBasis(tan, yy, zx); knifeW.quaternion.setFromRotationMatrix(m); knifeW.rotateZ(-.25);
  knifeW.position.add(tan.clone().multiplyScalar(-.55)); // tip leads, blade trails

  // post
  grade.uniforms.uTime.value = t;
  grade.uniforms.uFade.value = Math.max(1 - ramp(t, A, A + .5), ramp(t, B - .45, B));
  bloomPass.strength = .85 + .5 * see;
  halo.material.opacity = .6 + .3 * see;
  composer.render();
}

export function overlay(ctx, t) {
  // opening title, vertical
  const ta = ramp(t, 18.0, 18.9) * (1 - ramp(t, 22.2, 23.2));
  if (ta > 0) {
    vtext(ctx, '庖丁解牛', 905, 330, 96, GOLD_HI, ta * .95, ramp(t, 18.0, 19.4), 1.12, 700, 18);
    seal(ctx, '庄子', 905, 820, 70, ta * ramp(t, 19.2, 19.6));
  }
  // the dao quote
  const qa = ramp(t, T.dao - .1, T.dao + .7) * (1 - ramp(t, T.cut0 - .3, T.cut0 + .3));
  if (qa > 0) {
    const rv = ramp(t, T.dao, T.dao + 2.4);
    vtext(ctx, '臣之所好者道也', 930, 300, 64, PAPER, qa * .92, rv, 1.16, 600, 6);
    vtext(ctx, '进乎技矣', 830, 300, 64, PAPER, qa * .92, ramp(t, T.dao + 1.4, T.dao + 2.8), 1.16, 600, 6);
    // the character 道 glows
    const dk = ramp(t, ptime(8, '道') - .1, ptime(8, '道') + .5);
    vtext(ctx, '道', 930, 300 + 5 * 64 * 1.16, 64, GOLD_HI, qa * dk, 1, 1.16, 800, 30);
    ctx.save(); ctx.globalAlpha = qa * .5; ctx.fillStyle = GOLD; ctx.font = `400 26px 'Noto Serif CJK SC','Songti SC',serif`; ctx.textAlign = 'center';
    ctx.fillText('《庄子·养生主》', 880, 300 + 7 * 64 * 1.16 + 30); ctx.restore();
  }
  const label = t < 34 ? '庖丁解牛 · 《庄子》' : '技进乎道';
  drawChrome(ctx, label, .9);
  drawSubtitle(ctx, t);
}
