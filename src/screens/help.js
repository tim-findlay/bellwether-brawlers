// How to Play: two tabs (CONTROLS / RULES) drawn with the UI kit. Shared by the
// main menu and the in-fight pause menu; the caller owns the tab index.

import { plaque, text, keycap, chip, F, INK, PAPER, BRICK, NAVY, BRASS, GREEN, CARD, MUTED, RULE } from '../render/ui.js';

export const HELP_TABS = ['CONTROLS', 'RULES'];

const CONTROLS = [
  // [action, detail, P1 keys, P2 keys, pad]
  ['MOVE', 'double-tap to dash', ['A', 'D'], ['←', '→'], 'STICK'],
  ['JUMP', 'twice more in the air', ['W'], ['↑'], 'A / ✕'],
  ['FAST-FALL / DROP', 'hold / tap on a platform', ['S'], ['↓'], 'DOWN'],
  ['LIGHT', '+ direction: jab · side · down · aerials', ['F'], ['K'], 'X / □'],
  ['HEAVY', 'signatures · in the air: recovery', ['G'], ['L'], 'B / ○'],
  ['SPECIAL 1 / 2', 'cooldown pips under your bar', ['H', 'J'], [';', "'"], 'RB / LB'],
  ['DODGE', 'spot · step · air (i-frames)', ['V'], ['/'], 'TRIGGERS'],
  ['SUPER', 'needs a full gold meter', ['SPACE'], ['ENTER'], 'Y / △'],
];

const RULES = [
  ['3 STOCKS', 'The only KO is a ring-out: knock them past the edge of the screen. Last one on stage wins.', NAVY],
  ['COMPOSURE', 'Your bar never kills. The emptier it is, the farther every hit sends you.', GREEN],
  ['NO BLOCK', 'Dodge has i-frames; the air dodge is once per airtime. Ledges catch you — climb, jump or drop.', BRICK],
  ['SPECIALS & SUPERS', 'Specials run on cooldowns. Supers need a full gold meter and are worth waiting for.', BRASS],
  ['OFFICE EVENTS', 'Telegraphed, fair and switchable in Settings. Every status announces itself in words.', INK],
];

export function drawHelp(c, tab = 0, { y0 = 92 } = {}) {
  // tabs
  HELP_TABS.forEach((name, i) => {
    const sel = i === tab, x = 60 + i * 190;
    plaque(c, x, y0, 176, 36, { fill: sel ? INK : CARD, shadow: sel ? 0 : 3, lw: 3 });
    text(c, name, x + 88, y0 + 25, { font: F.head(20), color: sel ? PAPER : INK });
  });
  text(c, '← → switch tab', 900, y0 + 25, { font: F.body(15), color: MUTED, align: 'right' });
  plaque(c, 40, y0 + 34, 880, 366, { fill: CARD, shadow: 6 });
  if (tab === 0) drawControls(c, y0 + 34); else drawRules(c, y0 + 34);
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
