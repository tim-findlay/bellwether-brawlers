// Versus splash between stage select and the fight: the two fighters slide in
// from their sides over a navy/brick split, the VS emblem punches in, and the
// stage + rules sit on the ink strip below. Confirm skips; it lasts ~2.5 s.

import { byId } from '../data/characters.js';
import { stageById } from '../data/stages.js';
import { vsBadge, fighter, floorShadow, plaque, text, chip, stageThumb, F, INK, PAPER, NAVY, BRICK, BRASS } from '../render/ui.js';

const DUR = 150;

export function makeSplash(G) {
  let params, t, a, b, stage;
  const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);

  return {
    enter(p) {
      params = p; t = 0;
      a = byId(p.p1); b = byId(p.p2); stage = stageById(p.stageId);
      G.audio.play('roundGo');
    },
    update() {
      t++;
      if (t === 22) G.audio.play('hitHeavy');
      if (t >= DUR || (t > 25 && (G.input.confirmPressed() || G.input.keyPressed('Space')))) G.go('fight', params);
    },
    draw() {
      const c = G.renderer.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      // split field
      c.fillStyle = NAVY; c.fillRect(0, 0, 960, 540);
      c.fillStyle = BRICK;
      c.beginPath(); c.moveTo(560, 0); c.lineTo(960, 0); c.lineTo(960, 540); c.lineTo(400, 540); c.closePath(); c.fill();
      c.fillStyle = 'rgba(242,233,216,0.07)';
      for (let i = -540; i < 960; i += 28) {                       // diagonal ruling
        c.beginPath(); c.moveTo(i, 540); c.lineTo(i + 12, 540); c.lineTo(i + 552, 0); c.lineTo(i + 540, 0); c.fill();
      }
      c.fillStyle = INK;
      c.beginPath(); c.moveTo(548, 0); c.lineTo(572, 0); c.lineTo(412, 540); c.lineTo(388, 540); c.closePath(); c.fill();

      // fighters slide in
      const k = ease(t / 26);
      const x1 = -200 + 450 * k, x2 = 1160 - 450 * k, fy = 404;
      floorShadow(c, x1, fy, 150); floorShadow(c, x2, fy, 150);
      fighter(c, G, a, x1, fy, 4.4, { t, facing: 1 });
      fighter(c, G, b, x2, fy, 4.4, { t: t + 17, facing: -1 });

      // name plaques
      const pk = ease((t - 10) / 20);
      plaque(c, -330 + 360 * pk, 418, 330, 62, { fill: PAPER });
      text(c, a.name, -310 + 360 * pk, 454, { font: F.head(34), align: 'left' });
      text(c, a.title, -310 + 360 * pk, 472, { font: F.mono(10), align: 'left', color: NAVY });
      plaque(c, 1290 - 360 * pk - 330, 418, 330, 62, { fill: PAPER });
      text(c, b.name, 1270 - 360 * pk, 454, { font: F.head(34), align: 'right' });
      text(c, b.title, 1270 - 360 * pk, 472, { font: F.mono(10), align: 'right', color: BRICK });
      chip(c, 'P1', 40, 40, INK);
      chip(c, params.mode === '2p' ? 'P2' : 'CPU', 920, 40, INK, { align: 'right' });

      if (t > 18) vsBadge(c, G, 480, 230, 210, t - 18);

      // stage strip
      c.fillStyle = INK; c.fillRect(0, 492, 960, 48);
      c.fillStyle = BRASS; c.fillRect(0, 490, 960, 3);
      stageThumb(c, G, stage, 24, 498, 64, 36, t);
      c.strokeStyle = PAPER; c.lineWidth = 2; c.strokeRect(24, 498, 64, 36);
      text(c, stage.name, 104, 522, { font: F.head(22), align: 'left', color: PAPER });
      text(c, '3 STOCKS · RING-OUTS ONLY · PRESS ENTER TO SKIP', 936, 521, { font: F.mono(11), align: 'right', color: '#d9ceb4' });
    },
  };
}
