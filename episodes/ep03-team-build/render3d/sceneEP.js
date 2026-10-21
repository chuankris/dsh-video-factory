// 第三集 · 一镜到底(可爱画风)。整集一个世界、一条镜头:
// 一桌超级个体 → 错了 → 能力人人都有 → 一起判断 → 分头找路 → 写下来 → 别人走通才算 →
// AI 也能走写下来的路 → 人在迷雾边上 → 这个系列 → 道与器(拔高,路网是一个"道"字) → 云朵牛
import * as THREE from 'three';
import { terrain } from './board.js';
import { cuteStage, cutify, bean, puffClouds, cuteText, cuteChrome, ROUND, PASTEL } from './cute.js';
import { ramp, smooth, clamp, rng, ptime, W, H } from './overlay.js';
import { track } from './core.js';

export const A = 0, B = 131.36;
const S = cuteStage();
const T = {
  table: ptime(1, '凑一桌'), wrong: ptime(2, '错了'), before: ptime(3, '凑能力'), d: ptime(4, '会设计'), c: ptime(4, '写代码'), e: ptime(4, '剪片子'),
  now: ptime(5, 'AI 给了'), judge: ptime(6, '一起判断'), see: ptime(7, '我看得见'), split: ptime(8, '分头找路'), diff: ptime(9, '越不一样'), fail: ptime(9, '走不通'),
  wrote: ptime(10, '写下来'), tool: ptime(11, '工具'), many: ptime(12, '一群人的'), talk: ptime(13, '对对思路'), run: ptime(14, '能跑的东西'), self: ptime(15, '作者自己'), other: ptime(15, '别人走通'),
  truth: ptime(16, '不太舒服'), ai: ptime(17, 'AI 也能走'), copy: ptime(19, '被复制'), you: ptime(20, '才是你'), edge: ptime(21, '迷雾的边上'), most: ptime(23, '多数人'), week: ptime(24, '这一周'),
  series: ptime(25, '这个系列'), ep2: ptime(26, '第二集'), taste: ptime(27, '有人判断'), dao: ptime(28, '形而上'), qi: ptime(29, '变得无限多'), solo: ptime(30, '一百件器'), share: ptime(31, '共享一个道'), good: ptime(32, '什么叫好'), pu: ptime(33, '刀谱'), ox: ptime(34, '下一头牛'),
};

// ---------- the island; the roads everyone builds are the strokes of 道 ----------
const GR = 4.6;
const map = terrain(S, { seed: 93, clear: GR + .6, cz: 0, rx: 6.2, rz: 6.2 }); cutify(map);
const gc = document.createElement('canvas'); gc.width = gc.height = 512; const gx = gc.getContext('2d');
gx.fillStyle = '#fff'; gx.font = `900 480px 'Noto Serif CJK SC','Songti SC',serif`; gx.textAlign = 'center'; gx.textBaseline = 'middle'; gx.fillText('道', 256, 270);
const gd = gx.getImageData(0, 0, 512, 512).data;
const START = new THREE.Vector3(-2.2, 0, 2.6); const R = rng(9);
const road = map.cells.filter(e => { const u = Math.round((e.x / (2 * GR) + .5) * 511), v = Math.round((e.z / (2 * GR) + .5) * 511); return u >= 0 && v >= 0 && u < 512 && v < 512 && gd[(v * 512 + u) * 4 + 3] > 110; });
road.forEach(e => { e.o = Math.hypot(e.x - START.x, e.z - START.z) + R() * .5; }); road.sort((a, b) => a.o - b.o); road.forEach((e, i) => { e.k = i / road.length; });
const roadSet = new Map(road.map(e => [e, e.k]));
// how much of 道 is built at time t
const built = t => Math.max(.0, .12 * smooth(ramp(t, T.wrote - .2, T.many)) + .1 * smooth(ramp(t, T.other - .5, T.truth)) + .3 * smooth(ramp(t, T.ai, T.you)) + .1 * smooth(ramp(t, T.most, T.week + 2)) + .38 * smooth(ramp(t, T.qi, T.share + .4)));
const cellAt = k => road[Math.max(0, Math.min(road.length - 1, Math.floor(k * road.length)))];
const ground = (x, z) => map.ground(x, z);

// ---------- clouds around the rim, and a cloud ox on the horizon ----------
const clouds = puffClouds(S, 5.9, 90, 3);
const oxCloud = new THREE.Group(); S.scene.add(oxCloud);
{ const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9, transparent: true, opacity: 0 }); oxCloud.userData.m = m;
  const blob = (x, y, z, r) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), m); s.position.set(x, y, z); oxCloud.add(s); };
  for (let i = 0; i < 7; i++) blob(-1.6 + i * .55, 1.6 + Math.sin(i) * .1, 0, .75); // body
  blob(2.4, 2.1, 0, .6); blob(2.95, 1.85, 0, .42); // head, muzzle
  blob(2.2, 2.75, .2, .14); blob(2.05, 2.95, .25, .1); blob(2.6, 2.75, .2, .14); blob(2.75, 2.95, .25, .1); // horns
  for (const x of [-1.3, -.6, 1.0, 1.7]) { blob(x, .7, 0, .28); blob(x, .25, 0, .26); } // legs
  oxCloud.position.set(-.5, 1.0, -13.5); oxCloud.scale.setScalar(1.25); }

// ---------- props ----------
const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .06, 36), new THREE.MeshStandardMaterial({ color: 0xffd9b8, roughness: .6 }));
const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, .22, 16), new THREE.MeshStandardMaterial({ color: 0xe8b890, roughness: .6 }));
const TP = new THREE.Vector3(-3.2, 0, 3.7); tableTop.castShadow = tableLeg.castShadow = true; S.scene.add(tableTop, tableLeg);
function toolMesh(kind) { // 0 pencil, 1 code block, 2 film
  if (kind === 0) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .12, 6), new THREE.MeshStandardMaterial({ color: 0xffd36a })); const tip = new THREE.Mesh(new THREE.ConeGeometry(.018, .035, 6), new THREE.MeshStandardMaterial({ color: 0x5a4a3a })); tip.position.y = -.077; tip.rotation.x = Math.PI; g.add(b, tip); g.rotation.z = .6; return g; }
  if (kind === 1) return new THREE.Mesh(new THREE.BoxGeometry(.07, .07, .07), new THREE.MeshStandardMaterial({ color: 0xb39cf0 }));
  return new THREE.Mesh(new THREE.TorusGeometry(.035, .015, 8, 20), new THREE.MeshStandardMaterial({ color: 0xff8fb0 }));
}
function toolRing(kinds, n) { const g = new THREE.Group(); S.scene.add(g); for (let i = 0; i < n; i++) { const m = toolMesh(kinds[i % kinds.length]); const a = i / n * Math.PI * 2; m.position.set(Math.cos(a) * .2, .28 + .04 * Math.sin(i * 2), Math.sin(a) * .2); g.add(m); } return g; }
// sign post that marks a road someone has written down
const sign = new THREE.Group(); S.scene.add(sign);
{ const post = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .3, 8), new THREE.MeshStandardMaterial({ color: 0xc89a6a })); post.position.y = .15; sign.add(post);
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#fff6e8'; x.beginPath(); x.roundRect(4, 4, 248, 120, 24); x.fill(); x.strokeStyle = '#e8a87c'; x.lineWidth = 8; x.stroke();
  x.fillStyle = '#6a5a9a'; x.font = `700 56px ${ROUND}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('这边走 →', 128, 66);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const board = new THREE.Mesh(new THREE.PlaneGeometry(.26, .13), new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })); board.position.y = .3; sign.add(board); }
// billboard showing episodes 1 and 2
const loader = new THREE.TextureLoader();
const [t1, t2] = await Promise.all(['frame_ep01.jpg', 'frame_ep02.jpg'].map(f => new Promise(r => loader.load(f, tx => { tx.colorSpace = THREE.SRGBColorSpace; r(tx); }))));
const bill = new THREE.Group(); S.scene.add(bill); const BP = new THREE.Vector3(2.9, 0, -1.9);
{ const frame = new THREE.Mesh(new THREE.BoxGeometry(1.0, .9, .04), new THREE.MeshStandardMaterial({ color: 0xfff6e8, roughness: .6 })); frame.position.y = .75; frame.castShadow = true; bill.add(frame);
  [t1, t2].forEach((tx, i) => { tx.repeat.set(1, .5625); tx.offset.set(0, .22); const p = new THREE.Mesh(new THREE.PlaneGeometry(.42, .75), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false })); p.position.set(-.23 + i * .46, .75, .025); bill.add(p); });
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .35, 8), new THREE.MeshStandardMaterial({ color: 0xe8b890 })); leg.position.set(s * .35, .17, 0); bill.add(leg); } }

// ---------- cast ----------
const crew = ['pink', 'lav', 'peach', 'sky', 'mint'].map(c => bean(S, c, { lamp: true }));
const hero = bean(S, 'butter', { scale: 1.15, lamp: true });
const rings = crew.map(() => toolRing([0, 1, 2], 9));
const solo = [0, 1, 2].map(k => toolRing([k], 1)); // "one skill each" in the old days
const heroRing = toolRing([0, 1, 2], 36);
const minis = Array.from({ length: 70 }, (_, i) => ({ b: bean(S, 'white', { scale: .5 }), u: R(), ph: R() * 6, sp: .5 + R() * .5 }));
const walkers = ['pink', 'lav', 'peach', 'sky', 'mint', 'butter'].map(c => ({ b: bean(S, c, { scale: .8 }), u: R() }));
// rim spots where the seekers stand facing the clouds
const RIM = [[4.6, 2.6], [-4.8, 2.4], [-3.6, -4.1], [3.9, -3.9], [.4, 5.4]];
const DIRS = [[-.6, 1.8], [1.6, .3], [.2, -1.6], [-1.8, -.6]]; // scatter directions from the table
const WATER = new THREE.Vector3(-4.6, 0, 4.9);
const M = new THREE.Vector3(-1.6, 0, 2.0); // where they meet to talk

// ---------- camera: one continuous move ----------
const C = (t, p, l, f = 36) => [t, [...p, ...l, f]];
const camKeys = [
  C(0, [0, 10, 13], [0, 0, .3], 36), C(4.4, [-2.3, 2.3, 6.7], [-3.2, .25, 3.7], 34), C(9.4, [-2.5, 2.0, 6.3], [-3.2, .25, 3.7], 34), C(10.7, [-2.6, 1.8, 6.0], [-3.2, .25, 3.7], 33),
  C(17.0, [-4.0, 2.0, 6.4], [-3.2, .25, 3.7], 34), C(20.4, [-3.6, 1.6, 6.1], [-3.2, .3, 3.7], 33), C(25.9, [-3.0, 1.7, 6.4], [-3.2, .3, 3.6], 34),
  C(30.2, [-2.0, 4.4, 8.4], [-2.8, 0, 3.4], 38), C(35.2, [-1.6, 3.8, 7.4], [-2.4, 0, 2.8], 38), C(42.7, [-1.2, 3.0, 6.0], [-2.0, 0, 2.2], 38),
  C(47.4, [-.6, 2.2, 4.8], [-1.6, .2, 2.0], 36), C(54.4, [-.4, 2.0, 4.5], [-1.6, .2, 2.0], 36), C(59.3, [-.2, 3.4, 5.6], [-1.2, 0, 1.6], 38),
  C(68.9, [.6, 3.6, 5.2], [-.4, 0, 1.0], 38), C(71.2, [3.2, 1.2, 1.6], [5.2, .5, 3.2], 36), C(74.4, [3.3, 1.1, 1.8], [5.2, .5, 3.2], 36),
  C(80.0, [0, 8.5, 11.5], [0, 0, .2], 38), C(92.6, [.4, 8.0, 10.8], [0, 0, .1], 38),
  C(95.6, [2.4, 1.5, .9], [2.9, .7, -1.9], 34), C(105.7, [2.0, 1.6, 1.2], [2.8, .7, -1.9], 34),
  C(111.5, [.6, 6.5, 6.5], [0, 0, .5], 36), C(118.3, [0, 15, 4.0], [0, 0, 0], 34), C(122.3, [0, 19.5, 3.0], [0, 0, -.1], 34), C(126.4, [0, 19.5, 3.2], [0, 0, -.1], 34),
  C(129.4, [0, 6.5, 9.5], [0, 2.2, -10], 40), C(131.4, [0, 6.3, 9.3], [0, 2.3, -10], 40),
];

export const proj = {};
const v3 = new THREE.Vector3();
const scr = p => { v3.copy(p).project(S.camera); return [(v3.x * .5 + .5) * W, (1 - (v3.y * .5 + .5)) * H, v3.z]; };
const place = (b, x, z, bob = 0, t = 0) => { b.position.set(x, ground(x, z) + bob, z); b.face(S.camera); };

export function update(t) {
  const c = track(camKeys, t); S.cam(c[0], c[1], c[2], c[3], c[4], c[5], c[6]);
  const k = built(t);
  map.apply(e => { const r = roadSet.get(e); if (r === undefined || r > k) return null; const age = (k - r) * 40; return { b: 'road', h: .2, y: age < 1 ? .05 * Math.sin(Math.PI * age) : 0 }; });
  tableTop.position.set(TP.x, ground(TP.x, TP.z) + .22, TP.z); tableLeg.position.set(TP.x, ground(TP.x, TP.z) + .11, TP.z);
  const tableShow = 1 - smooth(ramp(t, T.split - .4, T.split + .4)); tableTop.visible = tableLeg.visible = tableShow > .01; tableTop.scale.setScalar(Math.max(tableShow, .01)); tableLeg.scale.setScalar(Math.max(tableShow, .01));

  // --- crew: around the table → scatter → rim seekers ---
  const scatter = smooth(ramp(t, T.split - .2, T.diff + .8));
  const meet = smooth(ramp(t, T.talk - 1.6, T.talk - .2)) * (1 - smooth(ramp(t, T.copy - 1, T.you - .3)));
  const toRim = smooth(ramp(t, T.copy - 1, T.you - .3));
  crew.forEach((b, i) => {
    const a = i / crew.length * Math.PI * 2 + .4; let x = TP.x + Math.cos(a) * .72, z = TP.z + Math.sin(a) * .62;
    if (i < 4) { const d = DIRS[i]; x += d[0] * scatter; z += d[1] * scatter; }
    // the one that hits water: bonk and come back
    if (i === 0) { const f = smooth(ramp(t, T.fail - .6, T.fail)) * (1 - smooth(ramp(t, T.fail + .5, T.fail + 1.6))); x = THREE.MathUtils.lerp(x, WATER.x + .3, f); z = THREE.MathUtils.lerp(z, WATER.z - .3, f); }
    // the one whose road works leads the way along it
    if (i === 1) { const lead = smooth(ramp(t, T.wrote - .4, T.many)); const e = cellAt(Math.min(k, .2)); x = THREE.MathUtils.lerp(x, e.x, lead); z = THREE.MathUtils.lerp(z, e.z, lead); }
    const ma = i / crew.length * Math.PI * 2; x = THREE.MathUtils.lerp(x, M.x + Math.cos(ma) * .45, meet); z = THREE.MathUtils.lerp(z, M.z + Math.sin(ma) * .4, meet);
    const rim = RIM[i]; x = THREE.MathUtils.lerp(x, rim[0], toRim); z = THREE.MathUtils.lerp(z, rim[1], toRim);
    const moving = (scatter > 0 && scatter < 1) || (toRim > 0 && toRim < 1) || (meet > 0 && meet < 1);
    place(b, x, z, Math.abs(Math.sin(t * 9 + i)) * (moving ? .05 : .012));
    if (toRim > .9) { const p = new THREE.Vector3(); b.rotation.y = Math.atan2(rim[0] * 2 - x, rim[1] * 2 - z); } // face the clouds
    const r = rings[i]; r.position.set(b.position.x, b.position.y, b.position.z); r.rotation.y = t * 1.2;
    const rk = smooth(ramp(t, T.table - .8, T.table)) * (1 - smooth(ramp(t, T.wrong, T.wrong + .5))) + smooth(ramp(t, T.now, T.now + .8)) * (1 - smooth(ramp(t, T.judge - .2, T.judge + .6)));
    r.visible = rk > .01; r.scale.setScalar(Math.max(rk, .01));
    proj['c' + i] = scr(new THREE.Vector3(b.position.x, b.position.y + .5, b.position.z));
  });
  // old days: one skill each (three crew members hold one tool)
  solo.forEach((r, j) => { const b = crew[j + 1]; r.position.copy(b.position); r.rotation.y = t; const sk = smooth(ramp(t, [T.d, T.c, T.e][j] - .2, [T.d, T.c, T.e][j] + .2)) * (1 - smooth(ramp(t, T.now - .2, T.now + .3))); r.visible = sk > .01; r.scale.setScalar(Math.max(sk, .01) * 1.6); });

  // --- hero: at the table, then the "judge" with the seal, then the 一百件器 moment ---
  let hx = TP.x + .1, hz = TP.z + .78;
  const toBill = smooth(ramp(t, T.series - 1.5, T.series + .5)); hx = THREE.MathUtils.lerp(hx, BP.x - .55, toBill); hz = THREE.MathUtils.lerp(hz, BP.z + .55, toBill);
  place(hero, hx, hz, Math.abs(Math.sin(t * 2.5)) * .015);
  heroRing.position.copy(hero.position); heroRing.rotation.y = t * .9; const hk = smooth(ramp(t, T.solo - .4, T.solo + .3)) * (1 - smooth(ramp(t, T.share - .3, T.share + .4)));
  heroRing.visible = hk > .01; heroRing.scale.setScalar(Math.max(hk, .01) * 1.5);
  proj.hero = scr(new THREE.Vector3(hero.position.x, hero.position.y + .55, hero.position.z));
  // judging: two crew back to back with lanterns (cue 7) — crew 2 and 3 turn outward
  if (t > T.judge - .3 && t < T.split) { [2, 3].forEach((i, n) => { crew[i].rotation.y = n ? 2.4 : -.7; }); }

  // --- the sign: "this way" where the first road was written down ---
  const sk = smooth(ramp(t, T.tool - .2, T.tool + .3)); const s0 = cellAt(.03); sign.position.set(s0.x - .15, ground(s0.x, s0.z), s0.z + .12); sign.scale.setScalar(Math.max(sk, .01)); sign.visible = sk > .01; sign.lookAt(S.camera.position.x, sign.position.y, S.camera.position.z);

  // --- walkers: other people following written roads (一群人的; 别人走通了) ---
  walkers.forEach((w, i) => { const show = smooth(ramp(t, T.many - .4 + i * .2, T.many + i * .2)); const along = Math.max(0, Math.min(k * .95, (w.u * .7 + (t - T.many) * .006 * (1 + i * .2)) % Math.max(k, .01)));
    const e = cellAt(i === 0 ? .02 + .06 * ((t * .05) % 1) * Math.min(1, k / .1) : along); w.b.visible = show > .01; w.b.scale.setScalar(.8 * show); place(w.b, e.x + (i % 2 ? .06 : -.06), e.z, Math.abs(Math.sin(t * 8 + i)) * .03);
    if (i === 0) proj.walker = scr(new THREE.Vector3(w.b.position.x, w.b.position.y + .45, w.b.position.z)); });

  // --- AI: little white beans flood every road that has been written down ---
  const aiOn = smooth(ramp(t, T.ai - .3, T.ai + 1.2)); const more = smooth(ramp(t, T.qi - .5, T.qi + 1));
  minis.forEach((m, i) => { const cap = i < 40 ? 1 : more; const show = aiOn * cap; m.b.visible = show > .02; if (!m.b.visible) return;
    const along = ((m.u + t * .01 * m.sp) % 1) * k; const e = cellAt(along); m.b.scale.setScalar(.5 * show); place(m.b, e.x + Math.sin(m.ph) * .05, e.z + Math.cos(m.ph) * .05, Math.abs(Math.sin(t * 11 + m.ph)) * .03); });

  // --- billboard of this series ---
  bill.position.set(BP.x, ground(BP.x, BP.z), BP.z); bill.rotation.y = -.35; const bk = smooth(ramp(t, T.series - .6, T.series)); bill.scale.setScalar(Math.max(bk, .01)); bill.visible = bk > .01;

  // --- clouds part as the story moves to the rim; then thin out for the aerial ---
  clouds.rotation.y = t * .01; clouds.mat.opacity = 1 - .55 * smooth(ramp(t, T.share - 3, T.share + 1)) + .55 * smooth(ramp(t, T.pu, T.ox));
  oxCloud.userData.m.opacity = smooth(ramp(t, T.pu + 1, T.ox + .3)); oxCloud.position.x = -.5 + (t - T.pu) * .05;
  S.done(t);
}

// ---------- overlay ----------
const HL = {
  '错了。': ['错了'], '团队只剩下一个理由:一起判断。': ['一起判断'], '所以超级团队,不是一起干活,是分头找路。': ['分头找路'],
  '写下来的那一刻,一个人的判断,才变成了一群人的。': ['一群人的'], '作者自己觉得好走的路,不算。别人走通了,才算。': ['别人走通了'],
  '写下来的路,AI 也能走。': ['AI 也能走'], '被写下来的,迟早都会被复制。': ['被复制'], '还没被写下来的,才是你。': ['才是你'],
  '所以人的位置,永远在迷雾的边上。': ['迷雾的边上'], '超级团队,是一群人,共享一个道。': ['共享一个道'], '可缝,永远在下一头牛身上。': ['下一头牛'],
};
function subtitle(ctx, t) {
  let c = null; for (const x of window.CUES) if (t >= x.s - .02 && t <= x.e + .22) c = x; if (!c) return;
  const a = ramp(t, c.s - .02, c.s + .14) * (1 - ramp(t, c.e + .05, c.e + .22)); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.font = `700 54px ${ROUND}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
  const chars = Array.from(c.text); const flag = new Array(chars.length).fill(false); (HL[c.text] || []).forEach(h => { const i = c.text.indexOf(h); if (i >= 0) for (let j = i; j < i + Array.from(h).length; j++) flag[j] = true; });
  const lines = [[]]; let w = 0; chars.forEach((ch, j) => { const cw = ctx.measureText(ch).width; if (w + cw > 900 && !'，。,.:'.includes(ch)) { lines.push([]); w = 0; } lines[lines.length - 1].push([ch, cw, flag[j]]); w += cw; });
  lines.forEach((ln, li) => { let x = (W - ln.reduce((s, o) => s + o[1], 0)) / 2; const y = 1720 - (lines.length - 1) * 38 + li * 76;
    ln.forEach(([ch, cw, f]) => { ctx.lineWidth = 12; ctx.strokeStyle = '#fff'; ctx.strokeText(ch, x, y); ctx.fillStyle = f ? '#ff6f96' : '#5a4a8a'; ctx.fillText(ch, x, y); x += cw; }); });
  ctx.restore();
}
function bubble(ctx, p, s, a) { if (!p || a <= 0 || p[2] > 1) return; ctx.save(); ctx.globalAlpha = a; const x = p[0], y = p[1] - 40; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#d9cdf2'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(x - 52, y - 38, 104, 64, 30); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 8, y + 26); ctx.lineTo(x, y + 42); ctx.lineTo(x + 10, y + 26); ctx.fill();
  ctx.fillStyle = '#8a7ab0'; ctx.font = `700 36px ${ROUND}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y - 6); ctx.restore(); }
function stamp(ctx, p, a, sz) { if (!p || a <= 0) return; ctx.save(); ctx.globalAlpha = a * .95; ctx.translate(p[0] + 70, p[1] - 30); ctx.rotate(-.12); ctx.scale(sz, sz); ctx.fillStyle = '#ff6f96'; ctx.beginPath(); ctx.roundRect(-46, -46, 92, 92, 18); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `700 60px ${ROUND}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('判', 0, 4); ctx.restore(); }
export function overlay(ctx, t) {
  // the few big lines
  cuteText(ctx, '错了', 540, 430, 150, '#ff6f96', smooth(ramp(t, T.wrong - .05, T.wrong + .15)) * (1 - ramp(t, T.before - .3, T.before)));
  cuteText(ctx, '还没被写下来的,才是你', 540, 430, 70, '#5a4a8a', smooth(ramp(t, T.you - .1, T.you + .4)) * (1 - ramp(t, T.edge + .6, T.edge + 1.2)));
  cuteText(ctx, '共享一个道', 540, 1480, 86, '#ff6f96', smooth(ramp(t, T.share - .1, T.share + .5)) * (1 - ramp(t, T.ox - 1.5, T.ox - .8)));
  // meeting talk bubbles, then a working thing and a ✓
  const ta = smooth(ramp(t, T.talk - .2, T.talk + .2)) * (1 - ramp(t, T.run - .2, T.run + .1));
  [0, 2, 3].forEach((i, n) => bubble(ctx, proj['c' + i], n === 1 ? '……' : '嗯…', ta));
  const ok = smooth(ramp(t, T.other, T.other + .3)) * (1 - ramp(t, T.truth - .3, T.truth));
  cuteText(ctx, '✓ 别人走通了', 540, 470, 72, '#58c08a', ok);
  // the judge's seal over the billboard
  const st = t - T.taste; stamp(ctx, proj.hero, clamp(st / .15) * (1 - ramp(t, T.dao - .3, T.dao)), 1 + 1.2 * (1 - smooth(clamp(st / .25))));
  cuteChrome(ctx);
  subtitle(ctx, t);
}
