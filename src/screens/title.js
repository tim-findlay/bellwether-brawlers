// Title screen: office backdrop, paper masthead, press start.

import { drawStage, stageById } from '../data/stages.js';

export function makeTitle(G) {
  let t = 0;
  return {
    enter() { t = 0; },
    update() {
      t++;
      if (G.input.confirmPressed() || G.input.keyPressed('Space')) {
        G.audio.play('menuConfirm');
        G.go('menu');
      }
    },
    draw() {
      const w = G.renderer.wctx;
      drawStage(w, stageById('office'), t, Math.sin(t * 0.004) * 30);
      w.fillStyle = 'rgba(43,38,32,0.28)';
      w.fillRect(0, 0, 480, 270);
      const c = G.renderer.ctx;
      c.imageSmoothingEnabled = false;
      c.drawImage(G.renderer.buf, 0, 0, 960, 540);

      // masthead
      c.save();
      c.translate(480, 200);
      c.rotate(-0.02);
      c.fillStyle = '#2b2620'; c.fillRect(-348, -86, 704, 158);
      c.fillStyle = '#f2e9d8'; c.fillRect(-354, -94, 704, 158);
      c.strokeStyle = '#2b2620'; c.lineWidth = 4; c.strokeRect(-344, -84, 684, 138);
      c.fillStyle = '#c4452e';
      c.font = "700 64px 'Pixelify Sans'";
      c.textAlign = 'center';
      c.fillText('BELLWETHER', 0, -22);
      c.fillStyle = '#27425f';
      c.fillText('BATTLERS', 0, 36);
      c.restore();

      c.fillStyle = '#f2e9d8';
      c.font = "700 16px 'Silkscreen'";
      c.textAlign = 'center';
      c.fillText('EIGHT COLLEAGUES. ONE WINNER.', 480, 320);
      if ((t / 30 | 0) % 2 === 0) {
        c.font = "700 18px 'Silkscreen'";
        c.fillText('PRESS ENTER', 480, 396);
      }
      c.font = "600 15px 'Barlow Condensed'";
      c.fillStyle = 'rgba(242,233,216,0.75)';
      c.fillText('a parody fighting game · every face, move and grudge is editable', 480, 510);
    },
  };
}
