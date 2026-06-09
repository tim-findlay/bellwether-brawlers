// Main menu + settings + help. Paper-and-ink, keyboard-driven.

import { P1MAP, P2MAP } from '../engine/input.js';

const ITEMS = ['1 PLAYER — VS CPU', '2 PLAYER — LOCAL', 'SETTINGS', 'HOW TO PLAY'];

export function makeMenu(G) {
  let idx = 0;
  let page = 'main';            // main | settings | help
  let sIdx = 0;

  function nav() {
    const up = G.input.keyPressed('KeyW') || G.input.keyPressed('ArrowUp');
    const down = G.input.keyPressed('KeyS') || G.input.keyPressed('ArrowDown');
    return up ? -1 : down ? 1 : 0;
  }
  function side() {
    const l = G.input.keyPressed('KeyA') || G.input.keyPressed('ArrowLeft');
    const r = G.input.keyPressed('KeyD') || G.input.keyPressed('ArrowRight');
    return l ? -1 : r ? 1 : 0;
  }

  return {
    enter() { page = 'main'; idx = 0; sIdx = 0; },
    update() {
      if (page === 'main') {
        const d = nav();
        if (d) { idx = (idx + d + ITEMS.length) % ITEMS.length; G.audio.play('menuMove'); }
        if (G.input.confirmPressed()) {
          G.audio.play('menuConfirm');
          if (idx === 0) G.go('select', { mode: 'cpu' });
          else if (idx === 1) G.go('select', { mode: '2p' });
          else if (idx === 2) { page = 'settings'; sIdx = 0; }
          else page = 'help';
        }
        if (G.input.backPressed()) { G.audio.play('menuBack'); G.go('title'); }
      } else if (page === 'settings') {
        const d = nav();
        if (d) { sIdx = (sIdx + d + 3) % 3; G.audio.play('menuMove'); }
        const s = side();
        if (s) {
          G.audio.play('menuMove');
          if (sIdx === 0) G.settings.events = !G.settings.events;
          if (sIdx === 1) {
            const order = ['easy', 'normal', 'hard'];
            const i = (order.indexOf(G.settings.difficulty) + s + 3) % 3;
            G.settings.difficulty = order[i];
          }
          if (sIdx === 2) { G.settings.sfx = !G.settings.sfx; G.audio.setEnabled(G.settings.sfx); }
          G.saveSettings();
        }
        if (G.input.backPressed() || G.input.confirmPressed()) { G.audio.play('menuBack'); page = 'main'; }
      } else if (page === 'help') {
        if (G.input.backPressed() || G.input.confirmPressed()) { G.audio.play('menuBack'); page = 'main'; }
      }
    },
    draw() {
      const c = G.renderer.ctx;
      paperBG(c);
      if (page === 'main') {
        c.fillStyle = '#2b2620';
        c.font = "700 44px 'Pixelify Sans'";
        c.textAlign = 'center';
        c.fillText('MAIN MENU', 480, 110);
        ITEMS.forEach((it, i) => {
          const sel = i === idx;
          const y = 200 + i * 72;
          if (sel) { c.fillStyle = '#c4452e'; c.fillRect(284, y - 34, 392, 50); }
          c.fillStyle = sel ? '#f2e9d8' : '#2b2620';
          c.font = "700 26px 'Pixelify Sans'";
          c.fillText(it, 480, y);
        });
        hint(c, 'W/S or ↑/↓ move · F / K / ENTER confirm · ESC back');
      } else if (page === 'settings') {
        c.fillStyle = '#2b2620';
        c.font = "700 44px 'Pixelify Sans'";
        c.textAlign = 'center';
        c.fillText('SETTINGS', 480, 110);
        const rows = [
          ['OFFICE EVENTS', G.settings.events ? 'ON' : 'OFF'],
          ['CPU DIFFICULTY', G.settings.difficulty.toUpperCase()],
          ['SOUND', G.settings.sfx ? 'ON' : 'OFF'],
        ];
        rows.forEach(([k, v], i) => {
          const sel = i === sIdx;
          const y = 210 + i * 80;
          if (sel) { c.fillStyle = '#27425f'; c.fillRect(180, y - 34, 600, 50); }
          c.fillStyle = sel ? '#f2e9d8' : '#2b2620';
          c.font = "700 24px 'Pixelify Sans'";
          c.textAlign = 'left';  c.fillText(k, 210, y);
          c.textAlign = 'right'; c.fillText('◂ ' + v + ' ▸', 750, y);
        });
        hint(c, 'A/D or ←/→ change · ESC back');
      } else {
        drawHelp(c);
        hint(c, 'ESC back');
      }
    },
  };
}

export function paperBG(c) {
  c.fillStyle = '#f2e9d8';
  c.fillRect(0, 0, 960, 540);
  c.fillStyle = 'rgba(43,38,32,0.05)';
  for (let y = 0; y < 540; y += 6) c.fillRect(0, y, 960, 1);
  c.strokeStyle = '#2b2620';
  c.lineWidth = 6;
  c.strokeRect(14, 14, 932, 512);
}

function hint(c, text) {
  c.fillStyle = '#6e6450';
  c.font = "600 17px 'Barlow Condensed'";
  c.textAlign = 'center';
  c.fillText(text, 480, 506);
}

// Shared controls/help overlay — used by the menu page and the in-fight pause.
export function drawHelp(c) {
  c.fillStyle = '#2b2620';
  c.font = "700 34px 'Pixelify Sans'";
  c.textAlign = 'center';
  c.fillText('HOW TO PLAY', 480, 78);

  const rows = [
    ['', 'P1', 'P2'],
    ['MOVE', 'A / D', '← / →'],
    ['JUMP', 'W', '↑'],
    ['BLOCK (hold)', 'S', '↓'],
    ['LIGHT', 'F', 'K'],
    ['HEAVY', 'G', 'L'],
    ['SPECIAL 1', 'H', ';'],
    ['SPECIAL 2', 'J', "'"],
    ['SUPER (full meter)', 'SPACE', 'ENTER'],
  ];
  c.font = "700 17px 'Silkscreen'";
  rows.forEach((r, i) => {
    const y = 122 + i * 30;
    c.fillStyle = i === 0 ? '#c4452e' : '#2b2620';
    c.textAlign = 'right'; c.fillText(r[0], 430, y);
    c.textAlign = 'center';
    c.fillText(r[1], 540, y);
    c.fillText(r[2], 700, y);
  });

  c.font = "600 17px 'Barlow Condensed'";
  c.fillStyle = '#2b2620';
  c.textAlign = 'center';
  const tips = [
    'First to 2 rounds. Timeout goes to the higher % of health.',
    'Block holds off most damage, but attacks from BEHIND connect — watch for teleports.',
    'Specials run on cooldowns (pips under your bar). Supers need a full gold meter.',
    'OFFICE EVENTS interrupt rounds — they are telegraphed, fair, and switchable in Settings.',
    'Statuses announce themselves in words. REVERSED flips movement only — block still works.',
  ];
  tips.forEach((tip, i) => c.fillText(tip, 480, 408 + i * 24));
}
