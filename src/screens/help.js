// How to Play: CONTROLS / RULES / TV SETUP, drawn with the UI kit. Shared by the
// main menu and the in-fight pause menu (which stops before TV SETUP); the
// caller owns the tab index. TV SETUP is a live input check for two players.

import { plaque, text, keycap, chip, wrap, F, INK, PAPER, BRICK, NAVY, BRASS, GREEN, CARD, MUTED, RULE } from '../render/ui.js';
import { P1MAP, P2MAP } from '../engine/input.js';

export const HELP_TABS = ['CONTROLS', 'RULES', 'TV SETUP'];

const CONTROLS = [
  // [action, detail, P1 keys, P2 keys, pad]
  ['MOVE', 'double-tap: dash · swing on the run: lunge', ['A', 'D'], ['←', '→'], 'STICK'],
  ['JUMP', 'twice more in the air', ['W'], ['↑'], 'A / ✕'],
  ['FAST-FALL / DROP', 'hold / tap on a platform', ['S'], ['↓'], 'DOWN'],
  ['LIGHT', '+ direction · on hit: cancel into more', ['F'], ['K'], 'X / □'],
  ['HEAVY', 'signatures · in the air: recovery', ['G'], ['L'], 'B / ○'],
  ['SPECIAL 1 / 2', 'cooldown pips under your bar', ['H', 'J'], [';', "'"], 'RB / LB'],
  ['DODGE', 'i-frames · after a hit lands: chase', ['V'], ['/'], 'TRIGGERS'],
  ['SUPER', 'needs a full gold meter', ['SPACE'], ['ENTER'], 'Y / △'],
];

const RULES = [
  ['3 STOCKS', 'The only KO is a ring-out: knock them past the edge of the screen. Last one on stage wins.', NAVY],
  ['COMPOSURE', 'Your bar never kills. The emptier it is, the farther every hit sends you.', GREEN],
  ['NO BLOCK', 'Dodge has i-frames; the air dodge is once per airtime. Ledges catch you — climb, jump or drop.', BRICK],
  ['SPECIALS & SUPERS', 'Specials run on cooldowns. Supers need a full gold meter and are worth waiting for.', BRASS],
  ['OFFICE EVENTS', 'Telegraphed, fair and switchable in Settings. Every status announces itself in words.', INK],
];

export function drawHelp(c, tab = 0, { y0 = 92, G = null } = {}) {
  // tabs (TV SETUP only where the caller has the input to show it live)
  HELP_TABS.slice(0, G ? 3 : 2).forEach((name, i) => {
    const sel = i === tab, x = 60 + i * 190;
    plaque(c, x, y0, 176, 36, { fill: sel ? INK : CARD, shadow: sel ? 0 : 3, lw: 3 });
    text(c, name, x + 88, y0 + 25, { font: F.head(20), color: sel ? PAPER : INK });
  });
  text(c, '← → switch tab', 900, y0 + 25, { font: F.body(15), color: MUTED, align: 'right' });
  plaque(c, 40, y0 + 34, 880, 366, { fill: CARD, shadow: 6 });
  if (tab === 0) drawControls(c, y0 + 34); else if (tab === 1 || !G) drawRules(c, y0 + 34); else drawTV(c, y0 + 34, G);
}

function drawControls(c, top) {
  const colX = { act: 70, detail: 262, p1: 580, p2: 700, pad: 810 };
  chip(c, 'P1 KEYS', colX.p1 + 40, top + 16, NAVY, { align: 'center' });
  chip(c, 'P2 KEYS', colX.p2 + 40, top + 16, BRICK, { align: 'center' });
  chip(c, 'GAMEPAD', colX.pad + 40, top + 16, INK, { align: 'center' });
  CONTROLS.forEach(([act, detail, k1, k2, pad], i) => {
    const y = top + 50 + i * 38;
    if (i % 2 === 0) { c.fillStyle = '#f1e9d6'; c.fillRect(46, y - 8, 868, 38); }
    text(c, act, colX.act, y + 12, { font: F.head(18), align: 'left' });
    text(c, detail, colX.detail, y + 12, { font: F.body(16), color: MUTED, align: 'left' });
    let x = colX.p1; for (const k of k1) x += keycap(c, k, x, y - 2) + 4;
    x = colX.p2; for (const k of k2) x += keycap(c, k, x, y - 2) + 4;
    text(c, pad, colX.pad + 40, y + 12, { font: F.body(16, 700), color: INK });
  });
  c.fillStyle = RULE; c.fillRect(60, top + 352, 840, 2);
}

function drawRules(c, top) {
  RULES.forEach(([title, body, col], i) => {
    const y = top + 20 + i * 68;
    c.fillStyle = col; c.fillRect(64, y, 46, 50);
    text(c, String(i + 1), 87, y + 36, { font: F.head(30), color: PAPER });
    text(c, title, 130, y + 20, { font: F.head(20), align: 'left', color: INK });
    text(c, body, 130, y + 43, { font: F.body(18), align: 'left', color: MUTED });
  });
}

// TV SETUP: hold anything and watch it light up under the right player. Both
// keyboards plugged into one computer type into the same page, so P1 plays on
// the WASD side of one and P2 on the arrow side of the other; pads seat in the
// order they're connected (first pad = P1).
const CHECK = [['←', 'left'], ['→', 'right'], ['↑', 'up'], ['↓', 'down'], ['LIGHT', 'light'], ['HEAVY', 'heavy'], ['SP 1', 's1'], ['SP 2', 's2'], ['DODGE', 'dodge'], ['SUPER', 'super']];

function drawTV(c, top, G) {
  const pads = (typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()] : []).filter(p => p && p.connected);
  [[P1MAP, 'P1', NAVY, 'WASD side: W A S D · F G H J · V · SPACE'], [P2MAP, 'P2', BRICK, 'arrow side: ← ↑ ↓ → · K L ; \' · / · ENTER']].forEach(([map, who, col, keys], s) => {
    const x = 64 + s * 428, y = top + 16;
    c.fillStyle = col; c.fillRect(x, y, 404, 30);
    text(c, who, x + 14, y + 22, { font: F.head(20), color: PAPER, align: 'left' });
    const pad = pads[s];
    text(c, pad ? `PAD: ${pad.id.replace(/\s*\(.*$/, '').slice(0, 30).toUpperCase()}` : 'KEYBOARD', x + 392, y + 20, { font: F.mono(10), color: PAPER, align: 'right' });
    CHECK.forEach(([label, act], i) => {
      const bx = x + (i % 5) * 81, by = y + 40 + Math.floor(i / 5) * 44, on = G.input.keyHeld(map[act]);
      c.fillStyle = INK; c.fillRect(bx, by, 76, 38);
      c.fillStyle = on ? col : '#efe7d3'; c.fillRect(bx + 2, by + 2, 72, 34);
      text(c, label, bx + 38, by + 25, { font: F.head(label.length > 2 ? 15 : 20), color: on ? PAPER : MUTED });
    });
    text(c, keys, x + 202, y + 150, { font: F.body(15), color: MUTED });
  });
  const tips = [
    ['TWO KEYBOARDS', 'Plug both into the conference-room PC. P1 uses the WASD side of one, P2 the arrow side of the other — no ghosting when two people mash one board.', NAVY],
    ['TWO PADS (best)', `Xbox / PlayStation pads: first connected = P1, second = P2. Press any button to wake one. ${pads.length ? pads.length + ' connected now.' : 'None connected yet.'}`, BRICK],
    ['THE TV', 'Settings → Full Screen (or F11) fills the screen. Esc / Back pauses a fight; either pad\'s Start pauses too.', GREEN],
  ];
  tips.forEach(([title, body, col], i) => {
    const y = top + 180 + i * 60;
    c.fillStyle = col; c.fillRect(64, y, 8, 50);
    text(c, title, 84, y + 15, { font: F.head(17), align: 'left', color: INK });
    wrap(c, body, 810, F.body(15)).slice(0, 2).forEach((ln, k) => text(c, ln, 84, y + 33 + k * 17, { font: F.body(15), align: 'left', color: MUTED }));
  });
}
