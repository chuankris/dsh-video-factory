// 《超级个体 与 超级团队》合集封面:上半第一集(墨黑暗金,一个人),下半第二集(明快沙盘,一群人)。
// 用法: node make_cover.mjs [高度]   → 默认 1080×1080(抖音合集封面);传 1440 出 3:4 版
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const here = path.dirname(new URL(import.meta.url).pathname);
const require = createRequire(path.join(here, '../ep01-super-individual/render3d/package.json'));
const { chromium } = require('playwright');
const H0 = parseInt(process.argv[2] || '1080');
const img = f => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(here, f)).toString('base64');

const html = `<!doctype html><meta charset="utf-8"><body style="margin:0"><canvas id="c" width="1080" height="${H0}"></canvas><script>
const SERIF = "'Noto Serif CJK SC','Songti SC','STSong',serif";
const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; });
(async () => {
  const [a, b] = await Promise.all([load('${img('frame_ep01.jpg')}'), load('${img('frame_ep02.jpg')}')]);
  const c = document.getElementById('c'), x = c.getContext('2d'); const W = 1080, H = ${H0}, MID = Math.round(H * .53), K = H / 1440;
  // top: one person — the ox seen as seams (episode 1)
  x.drawImage(a, 0, 860 - MID / 2, 1080, MID, 0, 0, 1080, MID);
  // bottom: a group — ten people, forty-five lines (episode 2)
  x.drawImage(b, 0, 600, 1080, H - MID, 0, MID, 1080, H - MID);
  // soft seam between the two worlds
  let g = x.createLinearGradient(0, MID - 120, 0, MID + 60); g.addColorStop(0, 'rgba(5,5,6,0)'); g.addColorStop(.62, 'rgba(5,5,6,.85)'); g.addColorStop(1, 'rgba(240,236,226,0)');
  x.fillStyle = g; x.fillRect(0, MID - 120, W, 180);
  // top title band
  g = x.createLinearGradient(0, 0, 0, 360 * K); g.addColorStop(0, 'rgba(5,5,6,.9)'); g.addColorStop(1, 'rgba(5,5,6,0)'); x.fillStyle = g; x.fillRect(0, 0, W, 360 * K);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '800 ' + Math.round(150 * Math.max(K, .85)) + 'px ' + SERIF; x.shadowColor = 'rgba(240,213,138,.6)'; x.shadowBlur = 30; x.fillStyle = '#f0d58a'; x.fillText('超级个体', W / 2, 190 * K);
  x.shadowBlur = 0; x.font = '500 36px ' + SERIF; x.fillStyle = 'rgba(239,232,216,.75)'; x.fillText('一个人的上限', W / 2, 300 * K + 10);
  // the 与 seal on the seam
  x.save(); x.translate(W / 2, MID - 20); x.rotate(-.05); x.fillStyle = '#b3382c'; x.beginPath(); x.roundRect(-62, -62, 124, 124, 12); x.fill();
  x.strokeStyle = 'rgba(246,239,224,.85)'; x.lineWidth = 4; x.beginPath(); x.roundRect(-52, -52, 104, 104, 8); x.stroke();
  x.fillStyle = '#f6efe0'; x.font = '800 78px ' + SERIF; x.fillText('与', 0, 4); x.restore();
  // bottom title band
  g = x.createLinearGradient(0, H - 380 * K, 0, H); g.addColorStop(0, 'rgba(246,242,233,0)'); g.addColorStop(.45, 'rgba(246,242,233,.9)'); g.addColorStop(1, 'rgba(246,242,233,.96)'); x.fillStyle = g; x.fillRect(0, H - 380 * K, W, 380 * K);
  x.font = '800 ' + Math.round(150 * Math.max(K, .85)) + 'px ' + SERIF; x.fillStyle = '#2a2420'; x.fillText('超级团队', W / 2, H - 190 * K - 10);
  x.font = '500 36px ' + SERIF; x.fillStyle = 'rgba(42,36,32,.7)'; x.fillText('一群人的麻烦 · 怎么一起找路', W / 2, H - 80 * K);
  // AIGC mark
  x.fillStyle = '#b3382c'; x.beginPath(); x.roundRect(W - 60 - 130, 40, 130, 46, 8); x.fill(); x.fillStyle = '#fff'; x.font = '700 26px ' + SERIF; x.fillText('AI 生成', W - 60 - 65, 63);
  window.done = c.toDataURL('image/jpeg', .94);
})();
</script>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: H0 } });
await p.setContent(html); await p.waitForFunction('window.done');
fs.writeFileSync(path.join(here, H0 === 1080 ? 'series_cover.jpg' : `series_cover_${H0}.jpg`), Buffer.from((await p.evaluate(() => window.done)).split(',')[1], 'base64'));
await b.close(); console.log('完成: series_cover.jpg');
