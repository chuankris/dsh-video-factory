// 风格 A 试画面:沙盘 + 战争迷雾。镜头取"五个人十条线,十个人四十五条"。
import * as THREE from 'three';
import { renderer } from './core.js';
import { stage } from './kit.js';
import { drawChrome, drawSubtitle, ramp, smooth, rng, rgba, GOLD, GOLD_HI, PAPER, SERIF, W } from './overlay.js';

export const A = 58.2, B = 65.5;
const S = stage({ bloom: .7, threshold: .66, dustN: 2500, haloOp: 0 });
const { scene, camera, env } = S;
S.halo.visible = false;
scene.background = new THREE.Color(0x060708);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ---------- terrain: a terraced hex map on a dark table ----------
const HR = .17, HX = Math.sqrt(3) * HR, HZ = 1.5 * HR;
const fbm = (x, z) => Math.sin(x * .9 + 1.3) * Math.cos(z * .7) * .45 + Math.sin(x * .37 - z * .41 + 2) * .7 + Math.cos(z * .23 + x * .19) * .5 + Math.sin(x * 2.1 + z * 1.7) * .12;
const BIOME = { water: [.07, .10, .12, .035], sand: [.36, .30, .20, .07], grass: [.24, .26, .16, .10], forest: [.17, .21, .13, .12], hill: [.40, .33, .21, .19], rock: [.30, .28, .25, .26], peak: [.40, .38, .35, .34] };
const R = rng(7); const cells = [];
for (let j = -18; j <= 18; j++) for (let i = -13; i <= 13; i++) {
  const x = i * HX + (j & 1) * HX / 2, z = j * HZ; if (Math.hypot(x / 2.6, z / 3.4) > 1.25) continue;
  let h = fbm(x, z); const d = Math.hypot(x, z * .95 + .1);
  if (d < 2.0) h = h * .25 + .1 * (1 - d / 2); // the clearing where the team stands
  const b = h < -.55 ? 'water' : h < -.38 ? 'sand' : h < .05 ? 'grass' : h < .35 ? (R() < .55 && d > 2.1 ? 'forest' : 'grass') : h < .7 ? 'hill' : h < 1.0 ? 'rock' : 'peak';
  cells.push({ x, z, b, h: BIOME[b][3] + (b === 'peak' || b === 'rock' ? Math.min(.12, (h - .7) * .2) : 0) + (d < 2.0 ? 0 : R() * .004) });
}
const hexGeo = new THREE.CylinderGeometry(HR * .955, HR * .975, 1, 6); hexGeo.translate(0, .5, 0);
const tiles = new THREE.InstancedMesh(hexGeo, new THREE.MeshStandardMaterial({ roughness: .88, metalness: .02, envMap: env, envMapIntensity: .3 }), cells.length);
tiles.castShadow = tiles.receiveShadow = true;
{ const m = new THREE.Matrix4(), c = new THREE.Color(), q = new THREE.Quaternion();
  cells.forEach((e, k) => { m.compose(new THREE.Vector3(e.x, 0, e.z), q, new THREE.Vector3(1, e.h, 1)); tiles.setMatrixAt(k, m);
    const [r, g, b] = BIOME[e.b]; const v = .85 + .3 * R(); c.setRGB(r * v, g * v, b * v); tiles.setColorAt(k, c); }); }
scene.add(tiles);
// water gets its own glossy skin
const water = cells.filter(e => e.b === 'water');
const wMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(HR * 1.0, HR * 1.0, .004, 6), new THREE.MeshStandardMaterial({ color: 0x1a2a30, roughness: .15, metalness: .3, envMap: env, envMapIntensity: 1.2, transparent: true, opacity: .85 }), water.length);
{ const m = new THREE.Matrix4(), q = new THREE.Quaternion(); water.forEach((e, k) => { m.compose(new THREE.Vector3(e.x, e.h + .006, e.z), q, new THREE.Vector3(1, 1, 1)); wMesh.setMatrixAt(k, m); }); }
wMesh.receiveShadow = true; scene.add(wMesh);
// little trees on forest hexes
const forest = cells.filter(e => e.b === 'forest'); const TN = forest.length * 3;
const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(.035, .11, 6).translate(0, .055, 0), new THREE.MeshStandardMaterial({ color: 0x223018, roughness: .8 }), TN);
{ const m = new THREE.Matrix4(); let k = 0; forest.forEach(e => { for (let t = 0; t < 3; t++) { const a = R() * 6.28, r = R() * HR * .55, s = .7 + R() * .6;
  m.makeScale(s, s * (.9 + R() * .5), s); m.setPosition(e.x + Math.cos(a) * r, e.h, e.z + Math.sin(a) * r); trees.setMatrixAt(k++, m); } }); }
trees.castShadow = true; scene.add(trees);
// the table
const table = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x0d0a08, roughness: .7, envMap: env, envMapIntensity: .2 }));
table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);

// a low warm lamp, raking across the relief
const lamp = new THREE.SpotLight(0xffd6a0, 22, 30, .55, .75, 1.3); lamp.position.set(-4.2, 6.5, 1.8); lamp.target.position.set(.3, 0, -.3);
lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -.0015; lamp.shadow.normalBias = .03; scene.add(lamp, lamp.target);
scene.add(new THREE.HemisphereLight(0x5a6a80, 0x120e0a, .55));

// ---------- ten pieces, each with its own flag ----------
const pawnGeo = new THREE.LatheGeometry([[0, 0], [.12, 0], [.12, .028], [.085, .055], [.055, .19], [.045, .245], [.075, .265], [.045, .285], [.07, .34], [.056, .4], [0, .415]].map(p => new THREE.Vector2(p[0], p[1])), 32);
const brass = new THREE.MeshStandardMaterial({ color: 0xb8925a, metalness: .95, roughness: .28, envMap: env, envMapIntensity: 1.3 });
const FLAGS = [0xb3382c, 0x2f4f7f, 0x3f7a5a, 0xc08a2a, 0x6a3f6f, 0x8a5a3a, 0x2f6f7a, 0x9a3f4f, 0x5a6a2f, 0x8a8a96];
const groundAt = (x, z) => { let best = 1e9, h = 0; for (const e of cells) { const d = (e.x - x) ** 2 + (e.z - z) ** 2; if (d < best) { best = d; h = e.h; } } return h; };
const N = 10, RAD = 1.5; const pos = [];
for (let i = 0; i < N; i++) {
  const a = i / N * Math.PI * 2 + .3; const x = Math.cos(a) * RAD, z = Math.sin(a) * RAD * 1.05 - .1; const p = new THREE.Vector3(x, groundAt(x, z), z); pos.push(p);
  const g = new THREE.Group(); g.position.copy(p); scene.add(g);
  const pawn = new THREE.Mesh(pawnGeo, brass); pawn.castShadow = true; g.add(pawn);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .4, 6), brass); pole.position.set(.03, .58, 0); pole.castShadow = true; g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(.15, .095, 6, 1), new THREE.MeshStandardMaterial({ color: FLAGS[i], roughness: .7, side: THREE.DoubleSide }));
  { const fp = flag.geometry.attributes.position; for (let v = 0; v < fp.count; v++) fp.setZ(v, Math.sin(fp.getX(v) * 18 + i) * .012); }
  flag.position.set(.105, .72, 0); flag.rotation.y = -a + .4; flag.castShadow = true; g.add(flag);
}
// ---------- 45 lines between them, drawn in as the narration counts ----------
const lineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, .72, .34), transparent: true, opacity: 0, depthWrite: false });
const lines = [];
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
  const a = pos[i].clone(), b = pos[j].clone(); a.y += .44; b.y += .44; const mid = a.clone().lerp(b, .5); mid.y += .1 + .05 * ((i + j) % 3);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 24, .0055, 5), lineMat.clone()); scene.add(tube); lines.push({ tube, i, j });
}
// ---------- fog of war ----------
const fogMat = (y, k) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uR: { value: 1.9 } },
  vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `varying vec2 vP; uniform float uT,uR;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
    void main(){ float d=length(vP*vec2(1.,.92)); float f=fbm(vP*${(.8 + k * .5).toFixed(2)}+vec2(uT*${(.05 + k * .03).toFixed(3)},-uT*.03)+${(k * 7.).toFixed(1)});
      float edge=smoothstep(uR-.5,uR+1.1,d+(f-.5)*1.4);
      vec3 col=mix(vec3(.07,.085,.11),vec3(.2,.22,.27),f);
      gl_FragColor=vec4(col,edge*${(.62 + k * .25).toFixed(2)}*(.7+.3*f)); }` });
const fogs = [0, 1].map(k => { const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), fogMat(0, k)); m.rotation.x = -Math.PI / 2; m.position.y = .35 + k * .35; scene.add(m); return m; });

export function update(t) {
  camera.position.set(.2 + Math.sin(t * .1) * .25, 6.3, 6.6); camera.lookAt(0, 0, -.35); camera.fov = 36; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  fogs.forEach(f => f.material.uniforms.uT.value = t);
  // 十条线 for the first five, then all 45
  const t5 = 61.2, t10 = 63.0;
  lines.forEach(({ tube, i, j }, k) => { const five = i < 5 && j < 5; const s = five ? t5 + (k % 10) * .05 : t10 + (k % 35) * .025;
    tube.material.opacity = .65 * smooth(ramp(t, s, s + .4)); tube.visible = tube.material.opacity > .001; });
  S.finish(t, A, B, { aperture: .15 });
}

export function overlay(ctx, t) {
  const n = t < 63.0 ? 10 : 45, p = t < 63.0 ? 5 : 10; const a = ramp(t, 61.0, 61.4);
  if (a > 0) { ctx.save(); ctx.globalAlpha = a; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 16;
    ctx.textAlign = 'left'; ctx.fillStyle = GOLD_HI; ctx.font = `800 120px ${SERIF}`; ctx.fillText(String(n), 70, 300); const w = ctx.measureText(String(n)).width;
    ctx.font = `600 44px ${SERIF}`; ctx.fillStyle = PAPER; ctx.fillText('条线', 86 + w, 318);
    ctx.font = `500 36px ${SERIF}`; ctx.fillStyle = rgba(PAPER, .7); ctx.fillText(`${p} 个人`, 76, 390); ctx.restore(); }
  drawChrome(ctx, '沟通 · n(n−1)/2', .9);
  drawSubtitle(ctx, t);
}
