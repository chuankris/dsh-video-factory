// 可爱画风试做 2:高空俯视,大家修出来的小路连成一个"道"字
import * as THREE from 'three';
import { terrain } from './board.js';
import { cuteStage, cutify, bean, puffClouds, cuteText, cuteChrome, ROUND } from './cute.js';
import { rng } from './overlay.js';

export const A = 0, B = 10;
const S = cuteStage();
const GR = 4.6;
const map = terrain(S, { seed: 93, clear: GR + .6, cz: 0, rx: 6.2, rz: 6.2 }); cutify(map);
const clouds = puffClouds(S, 7.2, 60, 8);
const gc = document.createElement('canvas'); gc.width = gc.height = 512; const gx = gc.getContext('2d');
gx.fillStyle = '#fff'; gx.font = `900 480px 'Noto Serif CJK SC','Songti SC',serif`; gx.textAlign = 'center'; gx.textBaseline = 'middle'; gx.fillText('道', 256, 270);
const gd = gx.getImageData(0, 0, 512, 512).data;
const road = map.cells.filter(e => { const u = Math.round((e.x / (2 * GR) + .5) * 511), v = Math.round((e.z / (2 * GR) + .5) * 511); return u >= 0 && v >= 0 && u < 512 && v < 512 && gd[(v * 512 + u) * 4 + 3] > 110; });
const R = rng(6); const crew = ['pink', 'lav', 'peach', 'sky', 'butter', 'mint'].map(c => ({ b: bean(S, c, { scale: 2.2, lamp: true }), e: road[Math.floor(R() * road.length)] }));

export function update(t) {
  S.cam(0, 19, 3.2, 0, 0, -.1, 34);
  map.apply(e => road.includes(e) ? { b: 'road' } : null);
  crew.forEach(o => { o.b.position.set(o.e.x, map.ground(o.e.x, o.e.z), o.e.z); o.b.face(S.camera); });
  S.done(t);
}

export function overlay(ctx, t) {
  cuteText(ctx, '共享一个道', 540, 1560, 76, '#ff7f9f');
  cuteChrome(ctx);
}
