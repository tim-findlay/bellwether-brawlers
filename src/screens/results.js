// Win screen: the winner stands on the stage's own arena piece with the
// Higgsfield trophy, the loser slumps behind in shadow; a panel carries the
// WINNER stamp, the victory line in a speech bubble, stocks left, the record
// and the staff-ID photo (the one place headshots still appear). Then
// REMATCH (back through the VS splash), CHANGE FIGHTERS or MAIN MENU.

import { byId } from '../data/characters.js';
import { stageById } from '../data/stages.js';
import {
  backdrop, plaque, text, chip, stamp, hints, fighter, floorShadow, trophy, wrap, makeNav,
  F, INK, PAPER, BRICK, NAVY, BRASS, GREEN, CARD, MUTED, RULE, MANILA,
} from '../render/ui.js';

const OPTIONS = ['REMATCH', 'CHANGE FIGHTERS', 'MAIN MENU'];
const CONFETTI = [BRICK, BRASS, NAVY, GREEN, PAPER];

export function makeResults(G) {
  let params, t, idx, winner, loser, stage, bits;
  const nav = makeNav(G);

  function burst(x, y, n) {
    for (let i = 0; i < n; i++) bits.push({ x, y, vx: (G.rng() - 0.5) * 7, vy: -2 - G.rng() * 5, r: G.rng() * 6, c: CONFETTI[i % 5], life: 90 + (G.rng() * 60 | 0) });
  }

  return {
    enter(p) {
      params = p; t = 0; idx = 0; bits = [];
      winner = byId(p.winnerId); loser = byId(p.loserId); stage = stageById(p.stageId) || stageById('office');
      burst(250, 200, 40);
    },
    update() {
      t++;
      for (const b of bits) { b.x += b.vx; b.y += b.vy; b.vy += 0.12; b.vx *= 0.99; b.r += 0.2; b.life--; }
      bits = bits.filter(b => b.life > 0);
      if (t % 45 === 0) burst(80 + G.rng() * 400, -10, 10);
      if (t < 30) return;
      const { dx } = nav();
      if (dx) { idx = (idx + dx + OPTIONS.length) % OPTIONS.length; G.audio.play('menuMove'); }
      if (G.input.confirmPressed() || G.input.keyPressed('Space')) {
        G.audio.play('menuConfirm');
        const { mode, p1, p2, stageId } = params;
        if (idx === 0) G.go('splash', { mode, p1, p2, stageId });
        else if (idx === 1) G.go('select', { mode, keep: [p1, p2] });
        else G.go('menu');
      }
      if (G.input.backPressed()) { G.audio.play('menuBack'); G.go('select', { mode: params.mode, keep: [params.p1, params.p2] }); }
    },

    draw() {
      const c = G.renderer.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      backdrop(c, G, stage, t, { wash: 0.28 });

      // the podium: the stage's arena piece, winner front, loser behind in shadow
      const slab = G.stageArt?.get?.(`${stage.id}-slab`), sw = 470, sx = 40, sy = 402;
      if (slab) { c.imageSmoothingEnabled = false; c.drawImage(slab, sx, sy - 6, sw, slab.height * (sw / slab.width)); }
      else plaque(c, sx, sy, sw, 60, { fill: stage.groundFill || '#8a7f6a' });
      fighter(c, G, loser, 400, sy, 2.4, { t: 0, facing: -1, tint: '#6e6450', alpha: 0.85 });
      floorShadow(c, 250, sy, 120);
      const cheer = t < 30 || (t % 240) < 26;
      fighter(c, G, winner, 250, sy, 4.2, { anim: cheer ? 'attack' : 'idle', t: cheer ? t % 240 : t, facing: 1 });
      trophy(c, G, 108, 318, 92);

      for (const b of bits) {                                        // confetti
        c.fillStyle = b.c;
        const w = 3 + Math.abs(Math.sin(b.r)) * 5;
        c.fillRect(Math.round(b.x - w / 2), Math.round(b.y), Math.round(w), 7);
      }

      // the panel
      const px = 530, py = 40, pw = 400, ph = 380;
      plaque(c, px, py, pw, ph, { fill: CARD, shadow: 7 });
      c.fillStyle = MANILA; c.fillRect(px + 3, py + 3, pw - 6, 60);
      text(c, 'AND THE BELLWETHER GOES TO…', px + 20, py + 38, { font: F.mono(12), align: 'left', color: NAVY });
      stamp(c, 'WINNER!', px + pw - 90, py + 100, { color: BRICK, size: 30, rot: 0.12, alpha: Math.min(1, t / 10) });
      text(c, winner.name, px + 24, py + 120, { font: F.head(52), align: 'left' });
      text(c, winner.title, px + 26, py + 144, { font: F.mono(11), align: 'left', color: BRICK });

      // speech bubble with the victory line
      const by = py + 164;
      plaque(c, px + 20, by, pw - 40, 86, { fill: PAPER, shadow: 0, lw: 3 });
      c.fillStyle = INK;
      c.beginPath(); c.moveTo(px + 20, by + 30); c.lineTo(px - 6, by + 44); c.lineTo(px + 20, by + 54); c.fill();
      c.fillStyle = PAPER;
      c.beginPath(); c.moveTo(px + 24, by + 34); c.lineTo(px + 4, by + 44); c.lineTo(px + 24, by + 50); c.fill();
      wrap(c, `“${winner.win}”`, pw - 76, F.body(19, 500)).slice(0, 3).forEach((ln, i) =>
        text(c, ln, px + 38, by + 30 + i * 22, { font: F.body(19, 500), align: 'left' }));

      // stats
      const sy2 = py + 272;
      text(c, 'STOCKS LEFT', px + 24, sy2, { font: F.mono(10), align: 'left', color: MUTED });
      for (let s = 0; s < 3; s++) chair(c, px + 24 + s * 28, sy2 + 10, s < (params.stocks ?? 0));
      text(c, 'RECORD', px + 170, sy2, { font: F.mono(10), align: 'left', color: MUTED });
      const wins = G.scores[winner.id] || 0;
      text(c, `${wins} WIN${wins === 1 ? '' : 'S'}`, px + 170, sy2 + 28, { font: F.head(22), align: 'left' });
      text(c, 'BEAT', px + 24, sy2 + 58, { font: F.mono(10), align: 'left', color: MUTED });
      text(c, loser.name, px + 68, sy2 + 60, { font: F.head(20), align: 'left' });
      text(c, `at ${stage.name}`, px + 24, sy2 + 80, { font: F.body(16), align: 'left', color: MUTED });

      // staff ID photo (headshot) when one exists
      const head = G.heads?.get?.(winner.id);
      if (head?.card) {
        const ix = px + pw - 104, iy = sy2 - 16;
        plaque(c, ix, iy, 84, 100, { fill: PAPER, shadow: 3, lw: 2 });
        c.imageSmoothingEnabled = false; c.drawImage(head.card, ix + 8, iy + 6, 68, 68);
        text(c, 'STAFF ID', ix + 42, iy + 90, { font: F.mono(9), color: NAVY });
      }

      // options row
      OPTIONS.forEach((o, i) => {
        const sel = i === idx, w = 220, x = 480 - (OPTIONS.length * w + 2 * 16) / 2 + i * (w + 16), y = 446;
        plaque(c, x, y - (sel ? 4 : 0), w, 44, { fill: sel ? BRICK : CARD, shadow: sel ? 6 : 4 });
        text(c, o, x + w / 2, y + 30 - (sel ? 4 : 0), { font: F.head(21), color: sel ? PAPER : INK });
      });
      c.fillStyle = INK; c.fillRect(0, 504, 960, 36);
      hints(c, [[['A', 'D'], 'Choose'], [['ENTER', 'F'], 'Select'], ['ESC', 'Fighters']], 527, { color: PAPER });
    },
  };
}

// A desk-chair stock icon (filled = kept).
function chair(c, x, y, on) {
  const col = on ? INK : RULE;
  c.fillStyle = col;
  c.fillRect(x, y, 6, 14); c.fillRect(x, y + 11, 20, 5); c.fillRect(x + 9, y + 16, 3, 4); c.fillRect(x + 3, y + 20, 15, 3);
}
