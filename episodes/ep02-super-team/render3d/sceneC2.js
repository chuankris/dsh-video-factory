// 封面候选 A:三十个 AI,箭头指向同一个方向
export { A, B, update } from './scene02.js';
import { cover } from './cover.js';
export function overlay(ctx) { cover(ctx, '30 个 AI 开会', '还是一个脑子'); }
