import { createRequire } from 'module'; import http from 'http'; import fs from 'fs'; import path from 'path'; import { spawn } from 'child_process';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const here = path.dirname(new URL(import.meta.url).pathname);
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(here, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
const [mode, seg, ...rest] = process.argv.slice(2);
const browser = await chromium.launch({ headless: true, args: process.platform === 'darwin' ? ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', e => { console.error('PAGEERROR', e.message); process.exit(2); });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('CONSOLE', m.text().slice(0, 300)); });
await page.goto(`http://127.0.0.1:${port}/index.html?seg=${seg}`);
await page.waitForFunction('window.ready === true', null, { timeout: 600000 });
await page.evaluate(() => document.fonts.ready);
console.error('build ms', await page.evaluate(() => window.buildMs));
const SEG = await page.evaluate(() => window.SEG);
const grab = async t => Buffer.from(await page.evaluate(t => { window.draw(t); return document.getElementById('out').toDataURL('image/jpeg', .94).split(',')[1]; }, t), 'base64');
if (mode === 'still') {
  for (const t of rest) { const s = Date.now(); fs.writeFileSync(path.join(here, `st_${seg}_${t}.jpg`), await grab(parseFloat(t))); console.error('t', t, Date.now() - s, 'ms'); }
} else {
  const [out, from, to] = rest; const FPS = 25;
  const a = from ? parseFloat(from) : SEG.a, b = to ? parseFloat(to) : SEG.b;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '25', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-r', '25', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((b - a) * FPS); const st = Date.now();
  for (let i = 0; i < n; i++) { const buf = await grab(a + i / FPS); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 25 === 0) console.error(`frame ${i}/${n} ${((i + 1) / ((Date.now() - st) / 1000)).toFixed(2)} fps`); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await browser.close(); srv.close();
