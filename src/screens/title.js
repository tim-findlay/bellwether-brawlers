// Title screen: the Office far layer drifting behind its arena piece, all
// eight fighters lined up on it (each throws the odd jab), the logo, and a
// blinking PRESS START plaque. Any confirm goes to the main menu.

import { CHARACTERS } from '../data/characters.js';
import { stageById } from '../data/stages.js';
import { backdrop, logo, fighter, floorShadow, plaque, text, keycap, F, INK, PAPER, BRICK } from '../render/ui.js';

const SLAB_W = 860, SLAB_Y = 432;

export function makeTitle(G) {
  let t = 0;
  const office = stageById('office');
  return {
    enter() { t = 0; },
    update() {
      t++;
      if (t > 10 && (G.input.confirmPressed() || G.input.keyPressed('Space'))) {
        G.audio.play('menuConfirm');
        G.go('menu');
      }
    },
    draw() {
      const c = G.renderer.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      backdrop(c, G, office, t, { wash: 0.12, drift: 60 });

      // the arena piece, with the whole office standing on it
      const slab = G.stageArt?.get?.('office-slab');
      const sx = (960 - SLAB_W) / 2;
      if (slab) { c.imageSmoothingEnabled = false; c.drawImage(slab, sx, SLAB_Y - 6, SLAB_W, slab.height * (SLAB_W / slab.width)); }
      else plaque(c, sx, SLAB_Y, SLAB_W, 60, { fill: office.groundFill || '#8a7f6a' });
      const n = CHARACTERS.length, step = (SLAB_W - 120) / (n - 1);
      CHARACTERS.forEach((cfg, i) => {
        const x = sx + 60 + i * step;
        const phase = (t + i * 53) % 300;
        const attacking = phase < 26;
        floorShadow(c, x, SLAB_Y, 44);
        fighter(c, G, cfg, x, SLAB_Y, 1.35, { anim: attacking ? 'attack' : 'idle', t: attacking ? phase : t + i * 13, facing: i < n / 2 ? 1 : -1 });
      });

      logo(c, 480, 140, 0.9, t, G);
      text(c, 'EIGHT COLLEAGUES.  ONE WINNER.', 480, 284, { font: F.mono(16), color: PAPER, shadow: INK });

      if ((t / 28 | 0) % 2 === 0 || t < 20) {
        plaque(c, 480 - 140, 298, 280, 40, { fill: BRICK, shadow: 5 });
        text(c, 'PRESS START', 480, 327, { font: F.head(26), color: PAPER });
      }

      // footer strip
      c.fillStyle = INK; c.fillRect(0, 512, 960, 28);
      const kx = 24;
      let x = kx + keycap(c, 'ENTER', kx, 516) + 6;
      text(c, 'or', x, 531, { font: F.body(15), color: '#d9ceb4', align: 'left' });
      x += 18;
      x += keycap(c, 'F', x, 516) + 6;
      text(c, 'start   ·   pads: START / X', x, 531, { font: F.body(15), color: '#d9ceb4', align: 'left' });
      text(c, 'a parody fighting game · every face, move and grudge is editable', 936, 531, { font: F.body(15), color: '#b8ad93', align: 'right' });
    },
  };
}
