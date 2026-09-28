// The move list: every move in a fighter's (expanded) kit, read straight from
// the character data so it can never go stale. Left: the normals with input,
// damage and frame data. Right: the specials, super and passive, each with its
// plain-English `desc`. Used by the practice arena (M), the fight pause menu
// and the select screen. Render only.

import { plaque, text, chip, wrap, F, INK, PAPER, BRICK, NAVY, BRASS, GREEN, CARD, MUTED } from '../render/ui.js';

// [input label, move, group colour]
export function kitRows(cfg) {
  const L = cfg.lights || {}, S = cfg.sigs || {}, A = cfg.aerials || {};
  const rows = [
    ['LIGHT', L.n || cfg.light, NAVY], ['→ LIGHT', L.s, NAVY], ['↓ LIGHT', L.d, NAVY],
    ['HEAVY', S.n || cfg.heavy, BRICK], ['→ HEAVY', S.s, BRICK], ['↓ HEAVY', S.d, BRICK],
    ['AIR LIGHT', A.n, GREEN], ['AIR → LIGHT', A.s, GREEN], ['AIR ↑ LIGHT', A.u, GREEN], ['AIR ↓ LIGHT', A.d, GREEN],
    ['AIR HEAVY', cfg.recovery, BRASS], ['AIR ↓ HEAVY', cfg.groundPound, BRASS],
    ['SPECIAL 1', cfg.s1, INK], ['SPECIAL 2', cfg.s2, INK], ['SUPER', cfg.super, BRICK],
  ];
  return rows.filter(([, m]) => m);
}

export const frames = (m) => {
  if (!m) return '';
  const land = m.landLag ? ` · land ${m.landLag}` : '';
  return `${m.startup ?? 0}f start · ${m.active ?? 0} active · ${m.recover ?? 0} rec${land}`;
};

const short = (m) => `${m.startup ?? 0} · ${m.active ?? 0} · ${m.recover ?? 0}${m.landLag ? ` · ${m.landLag}` : ''}`;
const KEYS = { 'SPECIAL 1': 'H / RB', 'SPECIAL 2': 'J / LB', SUPER: 'SPACE / △' };

export function drawMoveList(c, cfg, { cur = null, hint = 'M to close' } = {}) {
  const x = 24, y = 58, W = 912, H = 440;
  plaque(c, x, y, W, H, { fill: PAPER, shadow: 8 });
  c.fillStyle = INK; c.fillRect(x + 3, y + 3, W - 6, 36);
  text(c, `${cfg.name} · ${cfg.title}`, x + 16, y + 28, { font: F.head(22), color: PAPER, align: 'left' });
  text(c, hint, x + W - 16, y + 27, { font: F.mono(10), color: '#d9ceb4', align: 'right' });

  // left: the normals (the shared grammar — every fighter has these)
  const rows = kitRows(cfg).filter(([k]) => !KEYS[k]), lx = x + 12, lw = 470;
  text(c, 'NORMALS', lx + 4, y + 60, { font: F.mono(11), color: MUTED, align: 'left' });
  text(c, 'DMG', lx + 292, y + 60, { font: F.mono(9), color: MUTED });
  text(c, 'START · ACT · REC · LAND', lx + lw - 6, y + 60, { font: F.mono(9), color: MUTED, align: 'right' });
  rows.forEach(([input, m, col], i) => {
    const ry = y + 70 + i * 29, on = cur && cur === m;
    c.fillStyle = on ? '#f3dfa6' : i % 2 === 0 ? CARD : PAPER; c.fillRect(lx, ry, lw, 27);
    c.fillStyle = col; c.fillRect(lx + 4, ry + 5, 5, 17);
    text(c, input, lx + 16, ry + 18, { font: F.mono(10), color: INK, align: 'left' });
    text(c, m.name || '—', lx + 120, ry + 19, { font: F.head(15), color: INK, align: 'left' });
    const dmg = m.totalDmg ?? m.dmg;
    if (dmg) text(c, `${dmg}`, lx + 292, ry + 19, { font: F.head(15), color: col });
    text(c, short(m), lx + lw - 6, ry + 18, { font: F.body(13), color: MUTED, align: 'right' });
  });

  // right: specials, super, passive — what they actually do
  const rx = x + 496, rw = W - 508;
  text(c, 'SPECIALS & SUPER', rx, y + 60, { font: F.mono(11), color: MUTED, align: 'left' });
  let ry = y + 70;
  for (const [label, m, col] of [['SPECIAL 1', cfg.s1, NAVY], ['SPECIAL 2', cfg.s2, NAVY], ['SUPER', cfg.super, BRICK]]) {
    if (!m) continue;
    const on = cur && cur === m;
    c.fillStyle = on ? '#f3dfa6' : CARD; c.fillRect(rx, ry, rw, 86);
    chip(c, `${label} · ${KEYS[label]}`, rx + 8, ry + 8, col);
    text(c, label === 'SUPER' ? m.name.toUpperCase() : m.name, rx + 10, ry + 44, { font: F.head(19), color: INK, align: 'left' });
    const dmg = m.totalDmg ?? m.dmg;
    if (dmg) text(c, `${dmg} DMG`, rx + rw - 10, ry + 44, { font: F.mono(11), color: col, align: 'right' });
    wrap(c, m.desc || '', rw - 20, F.body(14)).slice(0, 2).forEach((ln, i) => text(c, ln, rx + 10, ry + 62 + i * 16, { font: F.body(14), color: INK, align: 'left' }));
    ry += 92;
  }
  if (cfg.passive) {
    c.fillStyle = '#efe3c2'; c.fillRect(rx, ry, rw, 70);
    chip(c, 'PASSIVE', rx + 8, ry + 8, BRASS);
    text(c, cfg.passive.name, rx + 84, ry + 21, { font: F.head(16), color: INK, align: 'left' });
    wrap(c, cfg.passive.desc, rw - 20, F.body(14)).slice(0, 2).forEach((ln, i) => text(c, ln, rx + 10, ry + 44 + i * 16, { font: F.body(14), color: INK, align: 'left' }));
  }
}
