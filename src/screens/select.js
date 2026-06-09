// Character select (P1 → P2/CPU) then stage select. Cards show the real
// headshot where one exists, the drawn head otherwise, plus the counterplay tip.

import { CHARACTERS } from '../data/characters.js';
import { SELECTABLE_STAGES } from '../data/stages.js';
import { paperBG } from './menu.js';

const COLS = 4;

export function makeSelect(G) {
  let mode = 'cpu';
  let step = 0;                       // 0: P1 pick, 1: P2 pick, 2: stage
  let cursor = [0, 1];
  let pick = [0, 1];
  let stageIdx = 0;
  let t = 0;

  function mapFor(stepIdx) {
    // in 2P, player two drives their own cursor; vs CPU, P1 drives both picks
    return (mode === '2p' && stepIdx === 1)
      ? { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' }
      : { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS' };
  }

  function moveCursor(stepIdx) {
    const m = mapFor(stepIdx);
    const n = CHARACTERS.length;
    let c0 = cursor[stepIdx];
    if (G.input.keyPressed(m.left) || (mode !== '2p' && G.input.keyPressed('ArrowLeft'))) c0 = (c0 % COLS === 0) ? c0 : c0 - 1;
    if (G.input.keyPressed(m.right) || (mode !== '2p' && G.input.keyPressed('ArrowRight'))) c0 = (c0 % COLS === COLS - 1 || c0 + 1 >= n) ? c0 : c0 + 1;
    if (G.input.keyPressed(m.up) || (mode !== '2p' && G.input.keyPressed('ArrowUp'))) c0 = c0 - COLS >= 0 ? c0 - COLS : c0;
    if (G.input.keyPressed(m.down) || (mode !== '2p' && G.input.keyPressed('ArrowDown'))) c0 = c0 + COLS < n ? c0 + COLS : c0;
    if (c0 !== cursor[stepIdx]) { cursor[stepIdx] = c0; G.audio.play('menuMove'); }
  }

  return {
    enter(params) {
      mode = params?.mode || 'cpu';
      step = 0;
      cursor = [0, 1];
      t = 0;
    },
    update() {
      t++;
      if (step < 2) {
        moveCursor(step);
        if (G.input.confirmPressed()) {
          G.audio.play('menuConfirm');
          pick[step] = cursor[step];
          if (step === 0) { step = 1; cursor[1] = pick[0] === 1 ? 0 : 1; }
          else step = 2;
        }
        if (G.input.backPressed()) {
          G.audio.play('menuBack');
          if (step === 1) step = 0; else G.go('menu');
        }
      } else {
        const l = G.input.keyPressed('KeyA') || G.input.keyPressed('ArrowLeft');
        const r = G.input.keyPressed('KeyD') || G.input.keyPressed('ArrowRight');
        if (l) { stageIdx = (stageIdx + SELECTABLE_STAGES.length - 1) % SELECTABLE_STAGES.length; G.audio.play('menuMove'); }
        if (r) { stageIdx = (stageIdx + 1) % SELECTABLE_STAGES.length; G.audio.play('menuMove'); }
        if (G.input.confirmPressed()) {
          G.audio.play('roundGo');
          G.go('fight', {
            mode,
            p1: CHARACTERS[pick[0]].id,
            p2: CHARACTERS[pick[1]].id,
            stageId: SELECTABLE_STAGES[stageIdx].id,
          });
        }
        if (G.input.backPressed()) { G.audio.play('menuBack'); step = 1; }
      }
    },
    draw() {
      const c = G.renderer.ctx;
      paperBG(c);
      if (step < 2) this.drawRoster(c);
      else this.drawStagePick(c);
    },

    drawRoster(c) {
      c.fillStyle = '#2b2620';
      c.font = "700 30px 'Pixelify Sans'";
      c.textAlign = 'center';
      const who = step === 0 ? 'PLAYER 1 — CHOOSE YOUR FIGHTER'
        : mode === '2p' ? 'PLAYER 2 — CHOOSE YOUR FIGHTER' : 'CHOOSE YOUR OPPONENT';
      c.fillText(who, 480, 64);

      const cw = 196, ch = 158, gx = 24, gy = 18;
      const startX = (960 - (COLS * cw + (COLS - 1) * gx)) / 2;
      CHARACTERS.forEach((ch0, i) => {
        const col = i % COLS, row = (i / COLS) | 0;
        const x = startX + col * (cw + gx), y = 88 + row * (ch + gy);
        const selP1 = step === 0 && cursor[0] === i;
        const selP2 = step === 1 && cursor[1] === i;
        const lockedP1 = step === 1 && pick[0] === i;

        c.fillStyle = '#2b2620'; c.fillRect(x + 4, y + 4, cw, ch);
        c.fillStyle = '#faf5e9'; c.fillRect(x, y, cw, ch);
        c.strokeStyle = selP1 ? '#27425f' : selP2 ? '#c4452e' : lockedP1 ? '#c9a227' : '#2b2620';
        c.lineWidth = (selP1 || selP2) ? 5 : 2;
        c.strokeRect(x, y, cw, ch);

        // portrait
        const head = G.heads.get(ch0.id);
        const px = x + cw / 2 - 44, py = y + 12;
        if (head?.card) {
          c.imageSmoothingEnabled = false;
          c.drawImage(head.card, px, py, 88, 88);
        } else {
          this.cartoonCard(c, ch0, px, py);
        }
        c.fillStyle = '#2b2620';
        c.font = "700 22px 'Pixelify Sans'";
        c.fillText(ch0.name, x + cw / 2, y + 124);
        c.fillStyle = '#6e6450';
        c.font = "600 14px 'Barlow Condensed'";
        c.fillText(ch0.archetype, x + cw / 2, y + 142);
        if (lockedP1) {
          c.fillStyle = '#c9a227';
          c.font = "700 12px 'Silkscreen'";
          c.fillText('P1', x + 20, y + 22);
        }
        const wins = G.scores[ch0.id] || 0;
        if (wins > 0) {
          c.fillStyle = '#6e6450';
          c.font = "600 12px 'Barlow Condensed'";
          c.textAlign = 'right';
          c.fillText(`★ ${wins}`, x + cw - 8, y + 18);
          c.textAlign = 'center';
        }
      });

      const hov = CHARACTERS[cursor[step]];
      c.fillStyle = '#2b2620';
      c.font = "700 18px 'Pixelify Sans'";
      c.fillText(`${hov.title} — “${hov.tagline}”`, 480, 478);
      c.fillStyle = '#c4452e';
      c.font = "600 16px 'Barlow Condensed'";
      c.fillText(`HOW TO BEAT: ${hov.tip}`, 480, 500);
      c.fillStyle = '#6e6450';
      c.fillText('move with your keys · F / K / ENTER confirm · ESC back', 480, 520);
    },

    cartoonCard(c, cfg, x, y) {
      c.fillStyle = '#e4dcc8';
      c.fillRect(x, y, 88, 88);
      c.strokeStyle = '#2b2620'; c.lineWidth = 2; c.strokeRect(x, y, 88, 88);
      c.fillStyle = cfg.body.skin;
      c.fillRect(x + 24, y + 26, 40, 44);
      c.fillStyle = cfg.body.hair.color;
      if (cfg.body.hair.style === 'bob') { c.fillRect(x + 18, y + 18, 52, 18); c.fillRect(x + 18, y + 30, 9, 34); c.fillRect(x + 61, y + 30, 9, 34); }
      else if (cfg.body.hair.style === 'cap') { c.fillRect(x + 20, y + 14, 48, 16); c.fillRect(x + 14, y + 26, 34, 6); }
      else c.fillRect(x + 20, y + 16, 48, 16);
      c.fillStyle = '#1a1a1a';
      c.fillRect(x + 34, y + 44, 5, 5);
      c.fillRect(x + 52, y + 44, 5, 5);
      c.fillStyle = '#6e6450';
      c.font = "600 11px 'Barlow Condensed'";
      c.textAlign = 'center';
      c.fillText('photo TBC', x + 44, y + 82);
    },

    drawStagePick(c) {
      c.fillStyle = '#2b2620';
      c.font = "700 30px 'Pixelify Sans'";
      c.textAlign = 'center';
      c.fillText('CHOOSE YOUR ARENA', 480, 70);
      const w = G.renderer.wctx;
      SELECTABLE_STAGES.forEach((st, i) => {
        const x = 80 + i * 280, y = 130, cw = 240, chh = 240;
        const sel = i === stageIdx;
        c.fillStyle = '#2b2620'; c.fillRect(x + 5, y + 5, cw, chh);
        c.fillStyle = '#faf5e9'; c.fillRect(x, y, cw, chh);
        // mini stage preview rendered to the world buffer then blitted
        w.save();
        w.clearRect(0, 0, 480, 270);
        this.preview(w, st);
        w.restore();
        c.imageSmoothingEnabled = false;
        c.drawImage(G.renderer.buf, 0, 0, 480, 270, x + 10, y + 12, cw - 20, 134);
        c.strokeStyle = sel ? '#c4452e' : '#2b2620';
        c.lineWidth = sel ? 5 : 2;
        c.strokeRect(x, y, cw, chh);
        c.fillStyle = '#2b2620';
        c.font = "700 19px 'Pixelify Sans'";
        c.fillText(st.name, x + cw / 2, y + 180);
        c.fillStyle = '#6e6450';
        c.font = "600 15px 'Barlow Condensed'";
        c.fillText(st.blurb, x + cw / 2, y + 204);
      });
      c.fillStyle = '#6e6450';
      c.font = "600 17px 'Barlow Condensed'";
      c.fillText('A/D or ←/→ choose · F / K / ENTER fight · ESC back', 480, 478);
      c.fillStyle = '#c4452e';
      c.font = "700 14px 'Silkscreen'";
      c.fillText('rumour: Mike sometimes drags the fight to BERLIN', 480, 508);
    },

    preview(w, st) {
      const grad = w.createLinearGradient(0, 0, 0, 270);
      grad.addColorStop(0, st.sky[0]); grad.addColorStop(1, st.sky[1]);
      w.fillStyle = grad; w.fillRect(0, 0, 480, 270);
      for (const layer of st.layers) layer.draw(w, t, 0);
      w.fillStyle = st.groundFill; w.fillRect(0, 232, 480, 38);
    },
  };
}
