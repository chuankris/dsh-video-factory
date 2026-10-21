// 封面用的标题版式:系列名 + 两行金句 + AI 生成。画在 1080×1920 上,之后裁成 3:4(y 240–1680)。
import { INK, ACC } from './board.js';
import { SERIF, W, CINNABAR } from './overlay.js';
export function cover(ctx, l1, l2) {
  const g = ctx.createLinearGradient(0, 240, 0, 760); g.addColorStop(0, 'rgba(246,242,233,.96)'); g.addColorStop(.7, 'rgba(246,242,233,.75)'); g.addColorStop(1, 'rgba(246,242,233,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 240, W, 520);
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#5a4630'; ctx.font = `600 38px ${SERIF}`; ctx.fillText('超级个体 与 超级团队 · 中', W / 2, 320);
  ctx.font = `800 104px ${SERIF}`; ctx.fillStyle = INK; ctx.fillText(l1, W / 2, 450);
  ctx.fillStyle = ACC; ctx.fillText(l2, W / 2, 580);
  ctx.fillStyle = CINNABAR; ctx.beginPath(); ctx.roundRect(W - 60 - 130, 1680 - 40 - 46, 130, 46, 8); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `700 26px ${SERIF}`; ctx.fillText('AI 生成', W - 60 - 65, 1680 - 40 - 22);
  ctx.restore();
}
