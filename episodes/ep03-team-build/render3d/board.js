// 第二集共用:白天的桌面沙盘(明快版)。地形、棋子、小旗、白云迷雾、连线,以及浅色背景用的顶栏/字幕/云转场。
import * as THREE from 'three';
import { renderer, makeKnife } from './core.js';
import { stage } from './kit.js';
import { ramp, smooth, clamp, rng, rgba, SERIF, W, H, CINNABAR } from './overlay.js';

export const INK = '#2a2420', ACC = '#c2481e';
export const COLORS = { gold: 0xd4a84a, red: 0xe0533f, blue: 0x3f7fd0, green: 0x3fae6a, yellow: 0xf0b030, purple: 0x9a5fc0, orange: 0xe07a30, cyan: 0x30b0c0, pink: 0xe05a8a, lime: 0x8ab030, slate: 0x6a7a90, grey: 0xa3a8b0 };
export const TEAM = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink', 'lime', 'slate'];

// ---------- stage ----------
export function board() {
  const S = stage({ bloom: .25, threshold: .97, dustN: 0, haloOp: 0 });
  S.halo.visible = false;
  S.grade.uniforms.uVig.value = .22; S.grade.uniforms.uCA.value = .15; S.grade.uniforms.uExposure.value = .9;
  S.scene.background = new THREE.Color(0xdcd5c4);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.5); sun.position.set(-4, 7, 3); sun.target.position.set(0, 0, -.3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: .5, far: 24 });
  sun.shadow.bias = -.001; sun.shadow.normalBias = .02; sun.shadow.radius = 3; S.scene.add(sun, sun.target);
  S.scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x6a5a40, .55));
  const table = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0xd8cfbb, roughness: .9 }));
  table.rotation.x = -Math.PI / 2; table.position.y = -.002; table.receiveShadow = true; S.scene.add(table);
  S.cam = (px, py, pz, lx = 0, ly = 0, lz = -.35, fov = 36) => { S.camera.position.set(px, py, pz); S.camera.lookAt(lx, ly, lz); S.camera.fov = fov; S.camera.updateProjectionMatrix(); S.camera.updateMatrixWorld(); };
  S.sun = sun;
  // no fade-to-black between segments: the cloud wipe in the overlay handles transitions
  S.done = (t, opts = {}) => S.finish(t, -1e9, 1e9, { aperture: .12, ...opts });
  return S;
}

// ---------- terrain ----------
const HR = .17, HX = Math.sqrt(3) * HR, HZ = 1.5 * HR;
const BIOME = { water: [.30, .62, .66, .035], sand: [.93, .80, .55, .07], grass: [.55, .74, .38, .10], forest: [.42, .64, .32, .12], hill: [.80, .68, .46, .17], rock: [.62, .56, .48, .21], peak: [.80, .78, .74, .26], road: [.96, .72, .3, .105], field: [.88, .76, .36, .10] };
export { BIOME };
// opts: seed, rx/rz (ellipse half-size), clear (radius of the flat clearing), cx/cz (clearing centre), shift (noise offset)
export function terrain(S, { seed = 7, rx = 2.6, rz = 3.4, clear = 2.0, cx = 0, cz = -.1, shift = 0, trees = true } = {}) {
  const R = rng(seed); const cells = [];
  const fbm = (x, z) => { x += shift; z -= shift * .7; return Math.sin(x * .9 + 1.3) * Math.cos(z * .7) * .45 + Math.sin(x * .37 - z * .41 + 2) * .7 + Math.cos(z * .23 + x * .19) * .5 + Math.sin(x * 2.1 + z * 1.7) * .12; };
  const NJ = Math.ceil(rz * 1.3 / HZ), NI = Math.ceil(rx * 1.3 / HX);
  for (let j = -NJ; j <= NJ; j++) for (let i = -NI; i <= NI; i++) {
    const x = i * HX + (j & 1) * HX / 2, z = j * HZ; if (Math.hypot(x / rx, z / rz) > 1.25) continue;
    let h = fbm(x, z); const d = Math.hypot(x - cx, (z - cz) * .95);
    if (d < clear) h = h * .25 + .1 * (1 - d / clear);
    const b = h < -.55 ? 'water' : h < -.38 ? 'sand' : h < .05 ? 'grass' : h < .35 ? (R() < .55 && d > clear + .1 ? 'forest' : 'grass') : h < .8 ? 'hill' : h < 1.2 ? 'rock' : 'peak';
    cells.push({ x, z, b, n: h, d, r: R(), h: BIOME[b][3] + (b === 'peak' || b === 'rock' ? Math.min(.06, (h - .8) * .12) : 0) + (d < clear ? 0 : R() * .004) });
  }
  const geo = new THREE.CylinderGeometry(HR * .955, HR * .975, 1, 6); geo.translate(0, .5, 0);
  const tiles = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: .88, metalness: .02, envMap: S.env, envMapIntensity: .3 }), cells.length);
  tiles.castShadow = tiles.receiveShadow = true; S.scene.add(tiles);
  const water = new THREE.InstancedMesh(new THREE.CylinderGeometry(HR, HR, .004, 6), new THREE.MeshStandardMaterial({ color: 0x5fc4c8, roughness: .12, metalness: .1, envMap: S.env, envMapIntensity: .8, transparent: true, opacity: .8 }), cells.length);
  water.receiveShadow = true; S.scene.add(water);
  const treeN = cells.length * 3;
  const treeMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(.035, .11, 6).translate(0, .055, 0), new THREE.MeshStandardMaterial({ color: 0x3f8a3a, roughness: .7 }), treeN);
  treeMesh.castShadow = true; S.scene.add(treeMesh);
  const treeOff = cells.map(() => [0, 1, 2].map(() => { const a = R() * 6.28, r = R() * HR * .55, s = .7 + R() * .6; return [Math.cos(a) * r, Math.sin(a) * r, s, s * (.9 + R() * .5)]; }));
  const T = { cells, tiles, water, trees: treeMesh, HR, HX, HZ };
  const m = new THREE.Matrix4(), c = new THREE.Color(), q = new THREE.Quaternion(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  // per-cell override hook: f(cell) → { b, h, y, col:[r,g,b], s } (any subset)
  T.apply = (f = null) => {
    cells.forEach((e, k) => {
      const o = f ? f(e) || {} : {}; const b = o.b || e.b; const h = o.h ?? (o.b ? BIOME[b][3] : e.h); const y = o.y || 0; const s = o.s ?? 1;
      m.compose(new THREE.Vector3(e.x, y, e.z), q, new THREE.Vector3(s, Math.max(h, .001), s)); tiles.setMatrixAt(k, m);
      const base = o.col || BIOME[b]; const v = .85 + .3 * e.r; c.setRGB(base[0] * v, base[1] * v, base[2] * v); tiles.setColorAt(k, c);
      if (b === 'water') { m.compose(new THREE.Vector3(e.x, y + h + .006, e.z), q, new THREE.Vector3(s, 1, s)); water.setMatrixAt(k, m); } else water.setMatrixAt(k, zero);
      for (let t = 0; t < 3; t++) { const [ox, oz, sx, sy] = treeOff[k][t];
        if (trees && b === 'forest' && s > .5) { m.makeScale(sx, sy, sx); m.setPosition(e.x + ox, y + h, e.z + oz); treeMesh.setMatrixAt(k * 3 + t, m); } else treeMesh.setMatrixAt(k * 3 + t, zero); }
      e.cur = { b, h, y };
    });
    tiles.instanceMatrix.needsUpdate = true; tiles.instanceColor.needsUpdate = true; water.instanceMatrix.needsUpdate = true; treeMesh.instanceMatrix.needsUpdate = true;
  };
  T.ground = (x, z) => { let best = 1e9, g = 0; for (const e of cells) { const d = (e.x - x) ** 2 + (e.z - z) ** 2; if (d < best) { best = d; g = (e.cur ? e.cur.h + e.cur.y : e.h); } } return g; };
  T.nearest = (x, z) => { let best = 1e9, out = null; for (const e of cells) { const d = (e.x - x) ** 2 + (e.z - z) ** 2; if (d < best) { best = d; out = e; } } return out; };
  T.apply();
  return T;
}

// ---------- pieces ----------
const pawnGeo = new THREE.LatheGeometry([[0, 0], [.12, 0], [.12, .028], [.085, .055], [.055, .19], [.045, .245], [.075, .265], [.045, .285], [.07, .34], [.056, .4], [0, .415]].map(p => new THREE.Vector2(p[0], p[1])), 32);
export function pawn(S, color, { flag = true, scale = 1 } = {}) {
  const g = new THREE.Group(); g.scale.setScalar(scale); S.scene.add(g);
  const hex = COLORS[color] ?? color; const gold = color === 'gold';
  const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: gold ? .3 : .35, metalness: gold ? .75 : 0, envMap: S.env, envMapIntensity: gold ? 1.2 : .6, transparent: true });
  const body = new THREE.Mesh(pawnGeo, mat); body.castShadow = true; g.add(body);
  const mats = [mat];
  if (flag) {
    const pm = new THREE.MeshStandardMaterial({ color: 0xc9a46a, metalness: .5, roughness: .4, transparent: true });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .4, 6), pm); pole.position.set(.03, .58, 0); pole.castShadow = true; g.add(pole);
    const fm = new THREE.MeshStandardMaterial({ color: hex, roughness: .7, side: THREE.DoubleSide, transparent: true });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(.15, .095, 6, 1), fm); { const fp = f.geometry.attributes.position; for (let v = 0; v < fp.count; v++) fp.setZ(v, Math.sin(fp.getX(v) * 18) * .012); }
    f.position.set(.105, .72, 0); f.castShadow = true; g.add(f); g.userData.flag = f; mats.push(pm, fm);
  }
  g.userData.mats = mats; g.userData.body = body; g.userData.color = hex;
  g.fade = a => { mats.forEach(m => m.opacity = a); g.visible = a > .002; };
  g.tint = (hexc, k) => { const c0 = new THREE.Color(hex), c1 = new THREE.Color(hexc); mat.color.copy(c0.lerp(c1, k)); if (g.userData.flag) g.userData.flag.material.color.copy(mat.color); };
  return g;
}
// a little hop when a piece lands: returns y offset
export const hop = (t, t0, h = .25, d = .35) => { const k = (t - t0) / d; return k > 0 && k < 1 ? h * 4 * k * (1 - k) : 0; };

// ---------- lines ----------
export function link(S, a, b, { color = [.72, .22, .08], r = .0075, lift = .44, arc = .1 } = {}) {
  const A = a.clone(), B = b.clone(); A.y += lift; B.y += lift; const M = A.clone().lerp(B, .5); M.y += arc;
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), transparent: true, opacity: 0, depthWrite: false });
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A, M, B), 24, r, 5), mat); S.scene.add(m);
  m.show = k => { mat.opacity = .8 * k; m.visible = k > .002; };
  return m;
}

// ---------- fog of war as soft white clouds ----------
export function clouds(S, { r = 2.7, cx = 0, cz = 0 } = {}) {
  const mk = k => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uR: { value: r }, uC: { value: new THREE.Vector2(cx, -cz) }, uA: { value: 1 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec2 vP; uniform float uT,uR,uA; uniform vec2 uC;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
      void main(){ vec2 q=vP-uC; float d=length(q*vec2(1.,.92)); float f=fbm(vP*${(.8 + k * .5).toFixed(2)}+vec2(uT*${(.05 + k * .03).toFixed(3)},-uT*.03)+${(k * 7.).toFixed(1)});
        float edge=smoothstep(uR-.5,uR+1.1,d+(f-.5)*1.4);
        vec3 col=mix(vec3(.16,.19,.27),vec3(.34,.38,.5),f);
        gl_FragColor=vec4(col,uA*edge*${(.55 + k * .3).toFixed(2)}*(.6+.4*f)); }` });
  const layers = [0, 1].map(k => { const m = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), mk(k)); m.rotation.x = -Math.PI / 2; m.position.y = .35 + k * .35; m.renderOrder = 10; S.scene.add(m); return m; });
  return { layers, set(t, { r, cx, cz, a } = {}) { layers.forEach(l => { const u = l.material.uniforms; u.uT.value = t; if (r !== undefined) u.uR.value = r; if (cx !== undefined) u.uC.value.set(cx, -cz); if (a !== undefined) u.uA.value = a; }); } };
}

// a ring of small knives (上集的"一百把刀")
export function knifeRing(S, n = 24, scale = .11) {
  const proto = makeKnife(S.env); proto.scale.setScalar(scale);
  const g = new THREE.Group(); S.scene.add(g); const mats = new Set();
  for (let i = 0; i < n; i++) { const k = proto.clone(); const a = i / n * Math.PI * 2; k.position.set(Math.cos(a) * .32, .25, Math.sin(a) * .32); k.rotation.set(0, -a, Math.PI / 2 - .3); g.add(k); k.traverse(o => { if (o.material) mats.add(o.material); }); }
  mats.forEach(m => { m.transparent = true; });
  g.fade = a => { mats.forEach(m => m.opacity = a); g.visible = a > .002; };
  return g;
}

// ---------- screen helpers ----------
const _v = new THREE.Vector3();
export const toScreen = (camera, v) => { _v.copy(v).project(camera); return [(_v.x * .5 + .5) * W, (1 - (_v.y * .5 + .5)) * H]; };

// ---------- 2D overlay for a light background ----------
const HL = {
  '上集说,一个人扛不住的事,得找人。': ['找人'],
  '可找什么人,大多数人都想错了。': ['都想错了'],
  '有研究让三十个 AI 一起辩论。': ['三十个 AI'],
  '结果,想法的丰富程度,跟一个 AI 差不多。': ['跟一个 AI 差不多'],
  '同一个脑子,复制三十份,还是一个脑子。': ['还是一个脑子'],
  '所以 AI 时代找人,不是为了多几双手。': ['不是为了多几双手'],
  '是为了多一双你没有的眼睛,多一副能替你扛的肩膀。': ['眼睛', '肩膀'],
  '还有,多一个跟你想得不一样的人。': ['想得不一样'],
  '一个人拉,用尽全力。八个人一起拉,合力还不到一个人的四倍。': ['不到一个人的四倍'],
  '人越多,每个人越不使劲。中国人管这叫:三个和尚没水吃。': ['三个和尚没水吃'],
  '五个人,彼此之间有十条线。十个人,就有四十五条。': ['十条线', '四十五条'],
  '写《人月神话》的布鲁克斯说过:项目已经晚了,再加人,只会更晚。': ['只会更晚'],
  '最难的,是判断。': ['判断'],
  '想法不一样,才值钱。想法不一样,也最难合到一起。': ['才值钱', '最难合到一起'],
  '要么互相妥协,做出一个谁都不讨厌、也谁都不喜欢的东西。': ['谁都不讨厌', '谁都不喜欢'],
  '要么谁嗓门大听谁的,剩下的人,又变回了手。': ['又变回了手'],
  '以前团队难,是活干不完。': ['活干不完'],
  '现在团队难,是不知道该怎么干。': ['不知道该怎么干'],
  '工具一周一换,做法一天一个样。': ['一天一个样'],
  '今天大家一起搭好的流程,明天可能就过时了。': ['明天可能就过时了'],
  '后来,变成了各干各的,定期碰一次,看看谁折腾出了什么。': ['各干各的'],
  '后来想明白了,这是团队终于说了实话:': ['说了实话'],
  '路还没找到,硬绑在一起,只会一起走错。': ['一起走错'],
  '每个人又变回了一个超级个体,带着自己的一百把刀。': ['超级个体'],
  '团队最值钱的东西,那些不一样的判断,只在开会时碰一碰,就散了。': ['不一样的判断', '就散了'],
  '所以问题从来不是,要不要团队。': ['要不要团队'],
  '而是路一天一变的时候,一群人,怎么一起找路。': ['一起找路'],
  '下一集,我们讲超级团队,到底怎么搭。': ['超级团队'],
};
export function chrome(ctx, label) {
  ctx.save(); ctx.textBaseline = 'middle'; ctx.fillStyle = rgba('#5a4630', .95); ctx.font = `600 30px ${SERIF}`; ctx.textAlign = 'left'; ctx.fillText('超级个体 与 超级团队 · 下', 60, 96);
  ctx.fillStyle = rgba(INK, .55); ctx.font = `400 26px ${SERIF}`; ctx.textAlign = 'right'; ctx.fillText('怎么一起找路', W - 60, 96);
  ctx.strokeStyle = rgba('#5a4630', .3); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(60, 136); ctx.lineTo(W - 60, 136); ctx.stroke();
  if (label) { ctx.textAlign = 'left'; ctx.fillStyle = rgba(INK, .55); ctx.font = `400 28px ${SERIF}`; ctx.fillText(label, 60, 184); }
  ctx.fillStyle = CINNABAR; const tw = 118, th = 40, tx = W - 60 - tw, ty = H - 40 - th; ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 6); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `700 24px ${SERIF}`; ctx.textAlign = 'center'; ctx.fillText('AI 生成', tx + tw / 2, ty + th / 2 + 1); ctx.restore();
}
export function subtitle(ctx, t) {
  const CU = window.CUES; let c = null; for (const x of CU) if (t >= x.s - .02 && t <= x.e + .22) c = x; if (!c) return;
  const a = ramp(t, c.s - .02, c.s + .14) * (1 - ramp(t, c.e + .05, c.e + .22)); if (a <= 0) return;
  ctx.save(); ctx.font = `700 56px ${SERIF}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const g = ctx.createLinearGradient(0, 1540, 0, H); g.addColorStop(0, 'rgba(250,247,240,0)'); g.addColorStop(.4, `rgba(250,247,240,${.82 * a})`); g.addColorStop(1, `rgba(250,247,240,${.92 * a})`); ctx.fillStyle = g; ctx.fillRect(0, 1540, W, H - 1540);
  const chars = Array.from(c.text); const flag = new Array(chars.length).fill(false);
  (HL[c.text] || []).forEach(h => { const k = c.text.indexOf(h); if (k >= 0) for (let j = k; j < k + Array.from(h).length; j++) flag[j] = true; });
  const lines = [[]]; let w = 0; const noStart = new Set('，。、；：！？,.;:!?》'.split(''));
  chars.forEach((ch, j) => { const cw = ctx.measureText(ch).width; if (w + cw > 920 && !noStart.has(ch)) { lines.push([]); w = 0; } lines[lines.length - 1].push([ch, cw, flag[j]]); w += cw; });
  ctx.globalAlpha = a;
  lines.forEach((ln, li) => { let x = (W - ln.reduce((s, o) => s + o[1], 0)) / 2; const y = 1725 - (lines.length - 1) * 39 + li * 78;
    ln.forEach(([ch, cw, f]) => { ctx.fillStyle = f ? ACC : INK; ctx.fillText(ch, x, y); x += cw; }); });
  ctx.restore();
}
// big caption with a soft white halo
export function caption(ctx, s, x, y, size, a, { col = INK, weight = 800, align = 'center' } = {}) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.font = `${weight} ${size}px ${SERIF}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255,253,248,.95)'; ctx.shadowBlur = size * .35; ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.fillText(s, x, y); ctx.restore();
}
export function seal(ctx, chars, x, y, size, a, rot = -.06) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a * .92; ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = CINNABAR; ctx.beginPath(); ctx.roundRect(-size / 2, -size / 2, size, size, size * .08); ctx.fill();
  ctx.fillStyle = '#f6efe0'; ctx.font = `800 ${size * .36}px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const c = Array.from(chars); if (c.length === 4) { ctx.fillText(c[0], size * .2, -size * .2); ctx.fillText(c[1], size * .2, size * .2); ctx.fillText(c[2], -size * .2, -size * .2); ctx.fillText(c[3], -size * .2, size * .2); }
  else if (c.length === 2) { ctx.fillText(c[0], 0, -size * .2); ctx.fillText(c[1], 0, size * .2); } else { ctx.font = `800 ${size * .6}px ${SERIF}`; ctx.fillText(chars, 0, 0); }
  ctx.restore();
}
// cloud wipe at segment edges (replaces the fade-to-black of episode 1)
const cloudTex = (() => { const c = document.createElement('canvas'); c.width = 540; c.height = 960; const x = c.getContext('2d'); const R = rng(99);
  x.fillStyle = '#f4f1ea'; x.fillRect(0, 0, 540, 960); x.filter = 'blur(14px)';
  for (let i = 0; i < 160; i++) { x.globalAlpha = .25 + R() * .4; x.fillStyle = R() < .5 ? '#ffffff' : '#e3e2e0'; x.beginPath(); x.arc(R() * 540, R() * 960, 30 + R() * 90, 0, 6.283); x.fill(); }
  return c; })();
export function wipe(ctx, t, A, B, d = .5) {
  const k = Math.max(1 - smooth(ramp(t, A, A + d)), smooth(ramp(t, B - d, B))); if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = k; ctx.drawImage(cloudTex, 0, 0, W, H); ctx.restore();
}
// standard frame tail: wipe, subtitle, chrome
export function tail(ctx, t, A, B, label) { wipe(ctx, t, A, B); subtitle(ctx, t); chrome(ctx, label); }
export { ramp, smooth, clamp, rng };
