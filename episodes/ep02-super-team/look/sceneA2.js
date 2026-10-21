// 风格 A 明快版:白天的桌面沙盘,白云当迷雾。镜头取"五个人十条线,十个人四十五条"。
import * as THREE from 'three';
import { renderer } from './core.js';
import { stage } from './kit.js';
import { ramp, smooth, rng, rgba, SERIF, W, H, CINNABAR } from './overlay.js';
const INK = '#2a2420', ACC = '#c2481e';

export const A = 58.2, B = 65.5;
const S = stage({ bloom: .25, threshold: .97, dustN: 0, haloOp: 0 });
S.grade.uniforms.uVig.value = .22; S.grade.uniforms.uExposure.value = .9; S.grade.uniforms.uCA.value = .15;
const { scene, camera, env } = S;
S.halo.visible = false;
scene.background = new THREE.Color(0xdcd5c4);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ---------- terrain: a terraced hex map on a dark table ----------
const HR = .17, HX = Math.sqrt(3) * HR, HZ = 1.5 * HR;
const fbm = (x, z) => Math.sin(x * .9 + 1.3) * Math.cos(z * .7) * .45 + Math.sin(x * .37 - z * .41 + 2) * .7 + Math.cos(z * .23 + x * .19) * .5 + Math.sin(x * 2.1 + z * 1.7) * .12;
const BIOME = { water: [.30, .62, .66, .035], sand: [.93, .80, .55, .07], grass: [.55, .74, .38, .10], forest: [.42, .64, .32, .12], hill: [.80, .68, .46, .19], rock: [.70, .69, .66, .26], peak: [.95, .95, .94, .34] };
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
const wMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(HR * 1.0, HR * 1.0, .004, 6), new THREE.MeshStandardMaterial({ color: 0x5fc4c8, roughness: .12, metalness: .1, envMap: env, envMapIntensity: .8, transparent: true, opacity: .8 }), water.length);
{ const m = new THREE.Matrix4(), q = new THREE.Quaternion(); water.forEach((e, k) => { m.compose(new THREE.Vector3(e.x, e.h + .006, e.z), q, new THREE.Vector3(1, 1, 1)); wMesh.setMatrixAt(k, m); }); }
wMesh.receiveShadow = true; scene.add(wMesh);
// little trees on forest hexes
const forest = cells.filter(e => e.b === 'forest'); const TN = forest.length * 3;
const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(.035, .11, 6).translate(0, .055, 0), new THREE.MeshStandardMaterial({ color: 0x3f8a3a, roughness: .7 }), TN);
{ const m = new THREE.Matrix4(); let k = 0; forest.forEach(e => { for (let t = 0; t < 3; t++) { const a = R() * 6.28, r = R() * HR * .55, s = .7 + R() * .6;
  m.makeScale(s, s * (.9 + R() * .5), s); m.setPosition(e.x + Math.cos(a) * r, e.h, e.z + Math.sin(a) * r); trees.setMatrixAt(k++, m); } }); }
trees.castShadow = true; scene.add(trees);
// the table
const table = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0xd8cfbb, roughness: .9 }));
table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);

// a low warm lamp, raking across the relief
const lamp = new THREE.DirectionalLight(0xfff4e0, 1.5); lamp.position.set(-4, 7, 3); lamp.target.position.set(0, 0, -.3);
lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); Object.assign(lamp.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: .5, far: 20 }); lamp.shadow.bias = -.001; lamp.shadow.normalBias = .02; lamp.shadow.radius = 3; scene.add(lamp, lamp.target);
scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x6a5a40, .55));

// ---------- ten pieces, each with its own flag ----------
const pawnGeo = new THREE.LatheGeometry([[0, 0], [.12, 0], [.12, .028], [.085, .055], [.055, .19], [.045, .245], [.075, .265], [.045, .285], [.07, .34], [.056, .4], [0, .415]].map(p => new THREE.Vector2(p[0], p[1])), 32);
const brass = new THREE.MeshStandardMaterial({ color: 0xc9a46a, metalness: .6, roughness: .35, envMap: env, envMapIntensity: 1 });
const FLAGS = [0xe0533f, 0x3f7fd0, 0x3fae6a, 0xf0b030, 0x9a5fc0, 0xe07a30, 0x30b0c0, 0xe05a8a, 0x8ab030, 0x6a7a90];
const groundAt = (x, z) => { let best = 1e9, h = 0; for (const e of cells) { const d = (e.x - x) ** 2 + (e.z - z) ** 2; if (d < best) { best = d; h = e.h; } } return h; };
const N = 10, RAD = 1.5; const pos = [];
for (let i = 0; i < N; i++) {
  const a = i / N * Math.PI * 2 + .3; const x = Math.cos(a) * RAD, z = Math.sin(a) * RAD * 1.05 - .1; const p = new THREE.Vector3(x, groundAt(x, z), z); pos.push(p);
  const g = new THREE.Group(); g.position.copy(p); scene.add(g);
  const pawn = new THREE.Mesh(pawnGeo, new THREE.MeshStandardMaterial({ color: FLAGS[i], roughness: .35, metalness: 0, envMap: env, envMapIntensity: .6 })); pawn.castShadow = true; g.add(pawn);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .4, 6), brass); pole.position.set(.03, .58, 0); pole.castShadow = true; g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(.15, .095, 6, 1), new THREE.MeshStandardMaterial({ color: FLAGS[i], roughness: .7, side: THREE.DoubleSide }));
  { const fp = flag.geometry.attributes.position; for (let v = 0; v < fp.count; v++) fp.setZ(v, Math.sin(fp.getX(v) * 18 + i) * .012); }
  flag.position.set(.105, .72, 0); flag.rotation.y = -a + .4; flag.castShadow = true; g.add(flag);
}
// ---------- 45 lines between them, drawn in as the narration counts ----------
const lineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(.72, .22, .08), transparent: true, opacity: 0, depthWrite: false });
const lines = [];
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
  const a = pos[i].clone(), b = pos[j].clone(); a.y += .44; b.y += .44; const mid = a.clone().lerp(b, .5); mid.y += .1 + .05 * ((i + j) % 3);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 24, .0075, 5), lineMat.clone()); scene.add(tube); lines.push({ tube, i, j });
}
// ---------- fog of war ----------
const fogMat = (y, k) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uR: { value: 2.7 } },
  vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `varying vec2 vP; uniform float uT,uR;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
    void main(){ float d=length(vP*vec2(1.,.92)); float f=fbm(vP*${(.8 + k * .5).toFixed(2)}+vec2(uT*${(.05 + k * .03).toFixed(3)},-uT*.03)+${(k * 7.).toFixed(1)});
      float edge=smoothstep(uR-.5,uR+1.1,d+(f-.5)*1.4);
      vec3 col=mix(vec3(.86,.88,.9),vec3(1.,1.,1.),f);
      gl_FragColor=vec4(col,edge*${(.55 + k * .3).toFixed(2)}*(.6+.4*f)); }` });
const fogs = [0, 1].map(k => { const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), fogMat(0, k)); m.rotation.x = -Math.PI / 2; m.position.y = .35 + k * .35; scene.add(m); return m; });

export function update(t) {
  camera.position.set(.2 + Math.sin(t * .1) * .25, 6.3, 6.6); camera.lookAt(0, 0, -.35); camera.fov = 36; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  fogs.forEach(f => f.material.uniforms.uT.value = t);
  // 十条线 for the first five, then all 45
  const t5 = 61.2, t10 = 63.0;
  lines.forEach(({ tube, i, j }, k) => { const five = i < 5 && j < 5; const s = five ? t5 + (k % 10) * .05 : t10 + (k % 35) * .025;
    tube.material.opacity = .8 * smooth(ramp(t, s, s + .4)); tube.visible = tube.material.opacity > .001; });
  S.finish(t, A, B, { aperture: .15 });
}

function chrome(ctx, label) {
  ctx.save(); ctx.textBaseline = 'middle'; ctx.fillStyle = rgba('#5a4630', .95); ctx.font = `600 30px ${SERIF}`; ctx.textAlign = 'left'; ctx.fillText('超级个体 与 超级团队 · 中', 60, 96);
  ctx.fillStyle = rgba('#2a2420', .55); ctx.font = `400 26px ${SERIF}`; ctx.textAlign = 'right'; ctx.fillText('一群人的麻烦', W - 60, 96);
  ctx.strokeStyle = rgba('#5a4630', .3); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(60, 136); ctx.lineTo(W - 60, 136); ctx.stroke();
  ctx.textAlign = 'left'; ctx.fillStyle = rgba('#2a2420', .55); ctx.font = `400 28px ${SERIF}`; ctx.fillText(label, 60, 184);
  ctx.fillStyle = CINNABAR; const tw = 118, th = 40, tx = W - 60 - tw, ty = H - 40 - th; ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 6); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `700 24px ${SERIF}`; ctx.textAlign = 'center'; ctx.fillText('AI 生成', tx + tw / 2, ty + th / 2 + 1); ctx.restore();
}
function subtitle(ctx, t, hl = []) {
  const c = window.CUES.find(c => t >= c.s - .02 && t <= c.e + .22); if (!c) return;
  ctx.save(); ctx.font = `700 56px ${SERIF}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const g = ctx.createLinearGradient(0, 1540, 0, H); g.addColorStop(0, 'rgba(250,247,240,0)'); g.addColorStop(.4, 'rgba(250,247,240,.82)'); g.addColorStop(1, 'rgba(250,247,240,.92)'); ctx.fillStyle = g; ctx.fillRect(0, 1540, W, H - 1540);
  const flag = new Array(c.text.length).fill(false); hl.forEach(h => { const k = c.text.indexOf(h); if (k >= 0) for (let j = k; j < k + h.length; j++) flag[j] = true; });
  const lines = [[]]; let w = 0; Array.from(c.text).forEach((ch, j) => { const cw = ctx.measureText(ch).width; if (w + cw > 920 && !'，。,.:'.includes(ch)) { lines.push([]); w = 0; } lines[lines.length - 1].push([ch, cw, flag[j]]); w += cw; });
  lines.forEach((ln, li) => { let x = (W - ln.reduce((s, o) => s + o[1], 0)) / 2; const y = 1725 - (lines.length - 1) * 39 + li * 78;
    ln.forEach(([ch, cw, f]) => { ctx.fillStyle = f ? ACC : INK; ctx.fillText(ch, x, y); x += cw; }); });
  ctx.restore();
}
export function overlay(ctx, t) {
  const n = t < 63.0 ? 10 : 45, p = t < 63.0 ? 5 : 10; const a = ramp(t, 61.0, 61.4);
  if (a > 0) { ctx.save(); ctx.globalAlpha = a; ctx.textBaseline = 'middle'; ctx.shadowBlur = 18;
    ctx.shadowColor = 'rgba(255,255,255,.9)'; ctx.textAlign = 'left'; ctx.fillStyle = ACC; ctx.font = `800 120px ${SERIF}`; ctx.fillText(String(n), 70, 300); const w = ctx.measureText(String(n)).width;
    ctx.font = `600 44px ${SERIF}`; ctx.fillStyle = INK; ctx.fillText('条线', 86 + w, 318);
    ctx.font = `500 36px ${SERIF}`; ctx.fillStyle = rgba(INK, .7); ctx.fillText(`${p} 个人`, 76, 390); ctx.restore(); }
  subtitle(ctx, t, ['十条线', '四十五条']);
  chrome(ctx, '沟通 · n(n−1)/2');
}
