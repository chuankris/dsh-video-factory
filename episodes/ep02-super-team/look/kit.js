// Shared building blocks for the new beats: stage setup, canvas→particle sampling, morphing point clouds.
import * as THREE from 'three';
import { makeComposer, pointsMaterial, pxScale, makeEnv, radialTex } from './core.js';
import { ramp, rng, smooth, SERIF } from './overlay.js';

export const GOLDV = [1, .7, .3], BONEV = [.92, .84, .7], ASHV = [.32, .3, .28], EMBERV = [.9, .25, .12];

// scene, camera, post, env, lights, drifting dust and a warm back halo — same look as scene34/67
export function stage({ bloom = .85, radius = .55, threshold = .55, dustN = 8000, haloOp = .7 } = {}) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050506);
  const camera = new THREE.PerspectiveCamera(30, 1080 / 1920, .05, 100); scene.add(camera);
  const { composer, grade, bloomPass } = makeComposer(scene, camera, { bloom, radius, threshold });
  const env = makeEnv();
  const keyL = new THREE.DirectionalLight(0xffe2b0, 3.0); keyL.position.set(-3, 5, 6); scene.add(keyL);
  const fillL = new THREE.DirectionalLight(0x8aa0c8, .5); fillL.position.set(4, -2, 3); scene.add(fillL);
  const R = rng(3), p = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) p.set([(R() - .5) * 18, -6 + R() * 14, -12 + R() * 19], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const dm = pointsMaterial({}, { main: `float id=float(gl_VertexID); vec3 h=hash3(id*.071);
    P=position+vec3(sin(uTime*.13+h.x*6.)*.4, uTime*(.05+.08*h.y), cos(uTime*.11+h.z*6.)*.4); P.y=mod(P.y+6.,14.)-6.;
    COL=mix(vec3(1.,.8,.5),vec3(.8,.75,.7),h.z)*.45*(.4+.6*h.x); A=.9; S=.012*(.5+h.y);` });
  const dust = new THREE.Points(g, dm); dust.frustumCulled = false; scene.add(dust);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex([[0, 'rgba(255,190,110,.22)'], [.4, 'rgba(120,80,40,.06)'], [1, 'rgba(0,0,0,0)']]), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: haloOp }));
  halo.position.set(0, .5, -4.5); halo.scale.set(13, 13, 1); scene.add(halo);
  const mats = [dm];
  // per-frame tail: DOF uniforms, grade, fades, render
  function finish(t, A, B, { focus = null, aperture = .45, bloomK = null } = {}) {
    const px = pxScale(camera); const f = focus ?? camera.position.length();
    mats.forEach(m => { m.uniforms.uPx.value = px; m.uniforms.uFocus.value = f; m.uniforms.uAperture.value = aperture; m.uniforms.uTime.value = t; });
    grade.uniforms.uTime.value = t;
    grade.uniforms.uFade.value = Math.max(1 - ramp(t, A, A + .5), ramp(t, B - .45, B));
    if (bloomK !== null) bloomPass.strength = bloomK;
    composer.render();
  }
  return { scene, camera, composer, grade, bloomPass, env, halo, dust, mats, finish };
}

// Rasterize a 2D drawing and scatter n points over its ink (alpha-weighted).
// World frame: canvas spans w×h units centred at (cx,cy); z is jittered by ±zj/2.
// color(x, y, a) → [r,g,b] in world coords (optional).
export function sample(draw, n, { w = 3, h = 5.33, cx = 0, cy = 0, z = 0, zj = .04, res = 720, seed = 1, color = null } = {}) {
  const cw = res, ch = Math.round(res * h / w);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d');
  draw(x, cw, ch, cw / w);
  const d = x.getImageData(0, 0, cw, ch).data; const idx = [], wts = [];
  for (let i = 0, j = 0; i < d.length; i += 4, j++) if (d[i + 3] > 12) { idx.push(j); wts.push(d[i + 3] / 255); }
  const R = rng(seed); const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  if (!idx.length) return { pos, col };
  for (let k = 0; k < n; k++) {
    let j, tries = 0; do { const r = Math.floor(R() * idx.length); j = r; if (R() < wts[r] || ++tries > 8) break; } while (true);
    const pi = idx[j]; const px = pi % cw, py = Math.floor(pi / cw);
    const X = cx + ((px + R()) / cw - .5) * w, Y = cy + (.5 - (py + R()) / ch) * h, Z = z + (R() - .5) * zj;
    pos.set([X, Y, Z], k * 3);
    col.set(color ? color(X, Y, wts[j]) : GOLDV, k * 3);
  }
  return { pos, col };
}
// concatenate several samples into one target of exactly n points
export function merge(parts) {
  const n = parts.reduce((s, p) => s + p.pos.length / 3, 0); const pos = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  parts.forEach(p => { pos.set(p.pos, o); col.set(p.col, o); o += p.pos.length; }); return { pos, col };
}

// A standing figure: head + shoulders/torso, outline-heavy so it reads as a rim-lit silhouette.
export function figure(x, cx, cy, s, { fill = .28, line = 1, lw = .035 } = {}) {
  x.save(); x.translate(cx, cy);
  const path = () => { x.beginPath(); x.arc(0, -.62 * s, .155 * s, 0, 6.283); x.moveTo(-.31 * s, -.3 * s);
    x.quadraticCurveTo(-.33 * s, -.42 * s, -.12 * s, -.43 * s); x.lineTo(.12 * s, -.43 * s); x.quadraticCurveTo(.33 * s, -.42 * s, .31 * s, -.3 * s);
    x.lineTo(.24 * s, .5 * s); x.lineTo(-.24 * s, .5 * s); x.closePath(); };
  path(); x.fillStyle = `rgba(255,255,255,${fill})`; x.fill();
  path(); x.strokeStyle = `rgba(255,255,255,${line})`; x.lineWidth = lw * s; x.stroke();
  x.restore();
}
export function glyph(x, str, cx, cy, size, { weight = 800, a = 1, stroke = 0 } = {}) {
  x.save(); x.font = `${weight} ${size}px ${SERIF}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = `rgba(255,255,255,${a})`; x.fillText(str, cx, cy);
  if (stroke) { x.strokeStyle = 'rgba(255,255,255,1)'; x.lineWidth = stroke; x.strokeText(str, cx, cy); }
  x.restore();
}

// Morphing particle cloud. targets: [{pos,col}] all with the same n.
// keys: [[t0, t1, from, to], ...] sorted; between keys the cloud rests on the last `to`.
export class Morph {
  constructor(targets, { size = .0062, scatter = .5, seed = 11, alpha = .32, depthTest = false } = {}) {
    this.T = targets; const n = targets[0].pos.length / 3; this.n = n;
    const R = rng(seed); const rnd = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) rnd[i] = R();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(targets[0].pos.slice(), 3));
    g.setAttribute('aTo', new THREE.BufferAttribute(targets[0].pos.slice(), 3));
    g.setAttribute('aC0', new THREE.BufferAttribute(targets[0].col.slice(), 3));
    g.setAttribute('aC1', new THREE.BufferAttribute(targets[0].col.slice(), 3));
    g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 3));
    this.mat = pointsMaterial({ uK: { value: 0 }, uShow: { value: 1 }, uBright: { value: 1 }, uScatter: { value: scatter }, uOff: { value: new THREE.Vector3() } }, {
      decl: `attribute vec3 aTo, aC0, aC1, aRnd; uniform float uK, uShow, uBright, uScatter; uniform vec3 uOff;`,
      main: `vec3 h=aRnd; float k=clamp((uK-h.x*.4)/.6,0.,1.); k=k*k*(3.-2.*k);
        vec3 p=mix(position,aTo,k);
        p+=(h-.5)*uScatter*sin(3.14159*k)*vec3(1.,1.,.6);
        p+=vec3(sin(uTime*.7+h.y*40.),cos(uTime*.6+h.z*40.),sin(uTime*.5+h.x*40.))*.006;
        P=p+uOff;
        float tw=.75+.5*sin(uTime*(1.5+h.z*3.)+h.y*60.);
        COL=mix(aC0,aC1,k)*(.55+.9*h.z)*tw*uBright; A=uShow*${alpha.toFixed(3)}; S=${size.toFixed(4)}*(.6+.8*h.y);` });
    this.mat.depthTest = depthTest;
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.g = g; this.pair = [0, 0];
  }
  setPair(a, b) {
    if (this.pair[0] === a && this.pair[1] === b) return; this.pair = [a, b];
    const g = this.g; g.attributes.position.array.set(this.T[a].pos); g.attributes.aTo.array.set(this.T[b].pos);
    g.attributes.aC0.array.set(this.T[a].col); g.attributes.aC1.array.set(this.T[b].col);
    ['position', 'aTo', 'aC0', 'aC1'].forEach(k => g.attributes[k].needsUpdate = true);
  }
  update(t, keys) {
    let cur = null; for (const k of keys) if (t >= k[0]) cur = k;
    if (!cur) { this.setPair(keys[0][2], keys[0][2]); this.mat.uniforms.uK.value = 0; return; }
    this.setPair(cur[2], cur[3]); this.mat.uniforms.uK.value = ramp(t, cur[0], cur[1]);
  }
}

// screen projection helper
const _v = new THREE.Vector3();
export function toScreen(camera, v) { _v.copy(v).project(camera); return [(_v.x * .5 + .5) * 1080, (1 - (_v.y * .5 + .5)) * 1920]; }
export { smooth };
