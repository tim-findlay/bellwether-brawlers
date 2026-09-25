// Main menu + its pages (settings, records, how to play). The live stage art
// cycles behind a paper wash; the right-hand card features one fighter at a
// time. Keyboard- and pad-driven, hold-to-repeat navigation.

import { CHARACTERS } from '../data/characters.js';
import { SELECTABLE_STAGES } from '../data/stages.js';
import {
  backdrop, paper, header, plaque, text, chip, hints, menuList, fighter, floorShadow, logo, stamp, makeNav, wrap,
  F, INK, PAPER, BRICK, NAVY, BRASS, GREEN, CARD, MUTED, RULE, MANILA,
} from '../render/ui.js';
import { drawHelp, HELP_TABS } from './help.js';

const ITEMS = [
  { label: 'VERSUS CPU', sub: 'You against the office. Pick a fighter, pick a floor, win the bell.', go: ['select', { mode: 'cpu' }] },
  { label: 'LOCAL VERSUS', sub: 'Two players, one keyboard or two pads. Settle it like colleagues.', go: ['select', { mode: '2p' }] },
  { label: 'HOW TO PLAY', sub: 'Controls, stocks, composure and the office rules.', page: 'help' },
  { label: 'RECORDS', sub: 'Who has taken the bell home, and how often.', page: 'records' },
  { label: 'SETTINGS', sub: 'Events, CPU difficulty, sound and screen shake.', page: 'settings' },
];

const SETTINGS = [
  { key: 'events', label: 'OFFICE EVENTS', desc: 'Telegraphed stage hazards and surprises mid-match.', opts: [[true, 'ON'], [false, 'OFF']] },
  { key: 'difficulty', label: 'CPU DIFFICULTY', desc: 'How hard the office fights back in Versus CPU.', opts: [['easy', 'EASY'], ['normal', 'NORMAL'], ['hard', 'HARD']] },
  { key: 'sfx', label: 'SOUND', desc: 'Menu blips, hits, bells and klaxons.', opts: [[true, 'ON'], [false, 'OFF']] },
  { key: 'shake', label: 'SCREEN SHAKE', desc: 'Camera shake on big hits and ring-outs (cosmetic).', opts: [[true, 'ON'], [false, 'OFF']] },
  { key: 'reset', label: 'RESET RECORDS', desc: 'Clear every win on the records board.', action: true },
  { key: 'done', label: 'DONE', desc: 'Back to the main menu.', action: true },
];

export function makeMenu(G) {
  let idx = 0, page = 'main', sIdx = 0, tab = 0, t = 0, confirmReset = false;
  const anim = [];
  const nav = makeNav(G);

  function applySetting(row, dir) {
    const cur = row.opts.findIndex(([v]) => v === G.settings[row.key]);
    const next = row.opts[(Math.max(0, cur) + dir + row.opts.length) % row.opts.length][0];
    G.settings[row.key] = next;
    if (row.key === 'sfx') G.audio.setEnabled(next);
    if (row.key === 'shake') G.fx.shakeScale = next ? 1 : 0;
    G.saveSettings();
    G.audio.play('menuMove');
  }

  return {
    enter(p) { page = p?.page || 'main'; t = 0; confirmReset = false; },
    update() {
      t++;
      const { dx, dy } = nav();
      const ok = G.input.confirmPressed() || G.input.keyPressed('Space');
      const back = G.input.backPressed();
      if (page === 'main') {
        if (dy) { idx = (idx + dy + ITEMS.length) % ITEMS.length; G.audio.play('menuMove'); }
        if (ok) {
          const it = ITEMS[idx];
          G.audio.play('menuConfirm');
          if (it.go) G.go(...it.go);
          else { page = it.page; sIdx = 0; tab = 0; confirmReset = false; }
        }
        if (back) { G.audio.play('menuBack'); G.go('title'); }
      } else if (page === 'settings') {
        if (dy) { sIdx = (sIdx + dy + SETTINGS.length) % SETTINGS.length; confirmReset = false; G.audio.play('menuMove'); }
        const row = SETTINGS[sIdx];
        if (dx && !row.action) applySetting(row, dx);
        if (ok) {
          if (row.key === 'done') { G.audio.play('menuBack'); page = 'main'; }
          else if (row.key === 'reset') {
            if (!confirmReset) { confirmReset = true; G.audio.play('klaxon'); }
            else { for (const k of Object.keys(G.scores)) delete G.scores[k]; G.saveScores(); confirmReset = false; G.audio.play('menuConfirm'); }
          } else applySetting(row, 1);
        }
        if (back) { G.audio.play('menuBack'); page = 'main'; }
      } else if (page === 'help') {
        if (dx) { tab = (tab + dx + HELP_TABS.length) % HELP_TABS.length; G.audio.play('menuMove'); }
        if (back || ok) { G.audio.play('menuBack'); page = 'main'; }
      } else if (page === 'records') {
        if (back || ok) { G.audio.play('menuBack'); page = 'main'; }
      }
    },

    draw() {
      const c = G.renderer.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      const stage = SELECTABLE_STAGES[((t / 600) | 0) % SELECTABLE_STAGES.length];
      backdrop(c, G, stage, t, { wash: page === 'main' ? 0.42 : 0.8 });
      if (page === 'main') this.drawMain(c);
      else if (page === 'settings') this.drawSettings(c);
      else if (page === 'records') this.drawRecords(c);
      else {
        header(c, 'HOW TO PLAY', { sub: 'BELLWETHER BATTLERS' });
        drawHelp(c, tab);
        hints(c, [[['←', '→'], 'Tab'], ['ESC', 'Back']], 520);
      }
    },

    drawMain(c) {
      logo(c, 220, 96, 0.52, t, G);
      menuList(c, ITEMS, idx, 64, 196, { w: 340, h: 46, gap: 10, anim });

      // featured fighter card
      const n = CHARACTERS.length, slot = 300;
      const fi = ((t / slot) | 0) % n, ft = t % slot, cfg = CHARACTERS[fi];
      plaque(c, 470, 110, 440, 350, { fill: MANILA, shadow: 7 });
      c.fillStyle = '#d9c796'; c.fillRect(473, 113, 434, 36);
      chip(c, 'FEATURED FIGHTER', 488, 122, INK);
      text(c, `${fi + 1} / ${n}`, 892, 136, { font: F.mono(11), color: MUTED, align: 'right' });
      c.fillStyle = '#efe3c2'; c.fillRect(490, 160, 180, 250);
      c.fillStyle = RULE; c.fillRect(490, 400, 180, 10);
      floorShadow(c, 580, 402, 90);
      fighter(c, G, cfg, 580, 402, 3.4, { anim: ft < 26 ? 'attack' : 'idle', t: ft < 26 ? ft : t });
      text(c, cfg.name, 690, 196, { font: F.head(40), align: 'left', color: INK });
      text(c, cfg.title, 690, 222, { font: F.mono(12), align: 'left', color: BRICK });
      text(c, cfg.archetype, 690, 246, { font: F.body(18), align: 'left', color: MUTED });
      wrap(c, `“${cfg.tagline}”`, 200, F.body(18, 500)).slice(0, 3).forEach((ln, i) =>
        text(c, ln, 690, 282 + i * 22, { font: F.body(18, 500), align: 'left', color: INK }));
      text(c, 'SUPER', 690, 370, { font: F.mono(10), align: 'left', color: MUTED });
      text(c, cfg.super.name.toUpperCase(), 690, 392, { font: F.head(20), align: 'left', color: NAVY });
      const wins = G.scores[cfg.id] || 0;
      if (wins) stamp(c, `★ ${wins}`, 850, 420, { color: BRASS, size: 20, rot: 0.1 });

      // selected item blurb
      plaque(c, 64, 478, 832, 30, { fill: INK, shadow: 0, lw: 0 });
      text(c, ITEMS[idx].sub, 480, 499, { font: F.body(17), color: PAPER });
      hints(c, [[['W', 'S'], 'Move'], [['ENTER', 'F'], 'Select'], ['ESC', 'Title']], 530);
    },

    drawSettings(c) {
      header(c, 'SETTINGS', { sub: 'saved automatically' });
      SETTINGS.forEach((row, i) => {
        const sel = i === sIdx, y = 100 + i * 64;
        plaque(c, 60, y, 840, 54, { fill: sel ? INK : CARD, shadow: sel ? 0 : 4 });
        text(c, row.label, 84, y + 25, { font: F.head(22), align: 'left', color: sel ? PAPER : INK });
        text(c, row.desc, 84, y + 45, { font: F.body(15), align: 'left', color: sel ? '#d9ceb4' : MUTED });
        if (row.opts) {
          let x = 880;
          [...row.opts].reverse().forEach(([v, label]) => {
            c.font = F.mono(12);
            const w = Math.ceil(c.measureText(label).width) + 22;
            x -= w + 6;
            const on = G.settings[row.key] === v;
            c.fillStyle = on ? (sel ? BRASS : NAVY) : (sel ? '#4a4239' : '#e6dcc4');
            c.fillRect(x, y + 14, w, 26);
            text(c, label, x + w / 2, y + 32, { font: F.mono(12), color: on ? PAPER : (sel ? '#b8ad93' : MUTED) });
          });
        } else if (row.key === 'reset') {
          const msg = confirmReset ? 'PRESS AGAIN TO CONFIRM' : 'PRESS ENTER';
          chip(c, msg, 880, y + 18, confirmReset ? BRICK : (sel ? BRASS : MUTED), { align: 'right' });
        }
      });
      hints(c, [[['W', 'S'], 'Move'], [['A', 'D'], 'Change'], ['ENTER', 'Toggle'], ['ESC', 'Back']], 520);
    },

    drawRecords(c) {
      header(c, 'OFFICE RECORDS', { sub: 'wins per fighter · this browser' });
      const total = CHARACTERS.reduce((a, ch) => a + (G.scores[ch.id] || 0), 0);
      const top = Math.max(1, ...CHARACTERS.map(ch => G.scores[ch.id] || 0));
      const leader = total ? CHARACTERS.reduce((a, ch) => ((G.scores[ch.id] || 0) > (G.scores[a.id] || 0) ? ch : a)) : null;
      CHARACTERS.forEach((ch, i) => {
        const col = i % 4, row = (i / 4) | 0, x = 60 + col * 214, y = 98 + row * 190;
        const wins = G.scores[ch.id] || 0;
        plaque(c, x, y, 196, 176, { fill: CARD, shadow: 5 });
        c.fillStyle = '#efe7d3'; c.fillRect(x + 8, y + 8, 180, 98);
        fighter(c, G, ch, x + 52, y + 104, 1.45, { t: t + i * 11 });
        text(c, String(wins), x + 150, y + 70, { font: F.head(44), color: wins ? INK : RULE });
        text(c, wins === 1 ? 'WIN' : 'WINS', x + 150, y + 92, { font: F.mono(10), color: MUTED });
        text(c, ch.name, x + 12, y + 132, { font: F.head(20), align: 'left' });
        c.fillStyle = RULE; c.fillRect(x + 12, y + 146, 172, 12);
        c.fillStyle = leader === ch ? BRASS : NAVY; c.fillRect(x + 12, y + 146, Math.round(172 * wins / top), 12);
        if (leader === ch) chip(c, 'TOP DOG', x + 184, y + 118, BRASS, { align: 'right' });
      });
      text(c, total ? `${total} match${total === 1 ? '' : 'es'} settled on this machine` : 'No matches yet — go and settle something.', 480, 492, { font: F.body(18), color: INK });
      hints(c, [['ESC', 'Back']], 522);
    },
  };
}

// Kept for older callers: plain ruled paper page.
export function paperBG(c) { paper(c); }
export { drawHelp } from './help.js';
