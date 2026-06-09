// Winner screen: big headshot, victory line, running office scoreboard,
// rematch / back to select.

import { byId, CHARACTERS } from '../data/characters.js';
import { paperBG } from './menu.js';

export function makeResults(G) {
  let params, t;

  return {
    enter(p) { params = p; t = 0; },
    update() {
      t++;
      if (t < 30) return;
      if (G.input.confirmPressed()) {
        G.audio.play('roundGo');
        G.go('fight', params);                       // rematch, same matchup & stage
      }
      if (G.input.backPressed()) {
        G.audio.play('menuBack');
        G.go('select', { mode: params.mode });
      }
    },
    draw() {
      const c = G.renderer.ctx;
      paperBG(c);
      const winner = byId(params.winnerId);

      c.fillStyle = '#27425f';
      c.font = "700 26px 'Pixelify Sans'";
      c.textAlign = 'center';
      c.fillText('AND THE BELLWETHER GOES TO…', 480, 86);

      // rosette + portrait
      const head = G.heads.get(winner.id);
      c.fillStyle = '#c4452e';
      c.fillRect(480 - 86, 116, 172, 172);
      c.fillStyle = '#faf5e9';
      c.fillRect(480 - 80, 122, 160, 160);
      if (head?.card) {
        c.imageSmoothingEnabled = false;
        c.drawImage(head.card, 480 - 72, 130, 144, 144);
      } else {
        c.fillStyle = winner.body.skin; c.fillRect(480 - 50, 152, 100, 102);
        c.fillStyle = winner.body.hair.color; c.fillRect(480 - 58, 136, 116, 34);
        c.fillStyle = '#1a1a1a'; c.fillRect(456, 196, 9, 9); c.fillRect(496, 196, 9, 9);
      }
      if (t % 30 === 0) G.fx.confetti(240 * (0.5 + Math.random()), 40, 8);

      c.fillStyle = '#2b2620';
      c.font = "700 48px 'Pixelify Sans'";
      c.fillText(winner.name, 480, 340);
      c.fillStyle = '#6e6450';
      c.font = "600 22px 'Barlow Condensed'";
      c.fillText(`“${winner.win}”`, 480, 372);

      // office scoreboard (localStorage tally)
      const board = CHARACTERS
        .map(ch => [ch.name, G.scores[ch.id] || 0])
        .filter(([, w]) => w > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
      if (board.length) {
        c.font = "700 13px 'Silkscreen'";
        c.fillStyle = '#27425f';
        c.fillText('OFFICE STANDINGS: ' + board.map(([n, w]) => `${n} ★${w}`).join('   '), 480, 420);
      }

      if ((t / 30 | 0) % 2 === 0) {
        c.fillStyle = '#2b2620';
        c.font = "700 18px 'Silkscreen'";
        c.fillText('ENTER · REMATCH      ESC · NEW FIGHTERS', 480, 470);
      }
      G.fx.drawUI(c);
    },
  };
}
