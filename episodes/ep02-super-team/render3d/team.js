// 段 8–10 共用:我们团队四个人、中间的篝火、各自走出去的四条小路
import * as THREE from 'three';
import { terrain, pawn, clouds } from './board.js';

export const CREW = ['gold', 'blue', 'green', 'red'];
// each person walks out along their own crooked path
export const PATHS = [[-.2, -1.0, -.45, -1.9, -.2, -2.6], [1.0, -.2, 1.8, -.6, 2.3, -.3], [.1, 1.0, .5, 1.8, .2, 2.5], [-1.0, .3, -1.7, .1, -2.3, .55]];
export const CAMP = new THREE.Vector3(0, 0, 0);
export function setup(S, seed = 81) {
  const map = terrain(S, { seed, clear: 1.1, cz: 0, rx: 3.0, rz: 3.8 });
  const fog = clouds(S, { r: 1.5 });
  const crew = CREW.map(c => pawn(S, c));
  const curves = PATHS.map(p => new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(p[0], 0, p[1]), new THREE.Vector3(p[2], 0, p[3]), new THREE.Vector3(p[4], 0, p[5])]));
  const trails = curves.map(cv => { const cells = []; for (let u = 0; u <= 1; u += .02) { const p = cv.getPoint(u); const e = map.nearest(p.x, p.z); if (!cells.includes(e) && Math.hypot(e.x, e.z) > .25) cells.push(e); } return cells; });
  // campfire
  const fire = new THREE.Group(); S.scene.add(fire);
  const logs = new THREE.MeshStandardMaterial({ color: 0x6a4024, roughness: .9 });
  for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .22, 8), logs); l.rotation.set(Math.PI / 2, 0, i * 1.05); l.position.y = .02; l.castShadow = true; fire.add(l); }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(.06, .16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, .7, .2), transparent: true })); flame.position.y = .1; fire.add(flame);
  const glow = new THREE.PointLight(0xffa040, 0, 1.6, 2); glow.position.y = .2; fire.add(glow);
  fire.position.set(0, map.ground(0, 0), 0);
  fire.set = (k, t) => { flame.visible = k > .02; flame.scale.set(1, .8 + .25 * Math.sin(t * 13) * k + .2, 1).multiplyScalar(Math.max(k, .02)); flame.material.opacity = k; glow.intensity = 1.2 * k; };
  return { map, fog, crew, curves, trails, fire };
}
