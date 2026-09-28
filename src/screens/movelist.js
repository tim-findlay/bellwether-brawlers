// The practice arena's move list: every move in a fighter's (expanded) kit with
// its input, damage and frame data, read straight from the character data —
// so it is never out of date. Render only.

import { plaque, text, chip, F, INK, PAPER, BRICK, NAVY, BRASS, GREEN, CARD, MUTED } from '../render/ui.js';

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

export function drawMoveList(c, cfg, { x = 150, y = 70, cur = null } = {}) {
  const rows = kitRows(cfg), W = 660, H = 46 + rows.length * 25;
  plaque(c, x, y, W, H, { fill: PAPER, shadow: 8 });
  c.fillStyle = INK; c.fillRect(x + 3, y + 3, W - 6, 34);
  text(c, `${cfg.name} · MOVE LIST`, x + 16, y + 27, { font: F.head(22), color: PAPER, align: 'left' });
  text(c, 'M to close', x + W - 16, y + 26, { font: F.mono(10), color: '#d9ceb4', align: 'right' });
  rows.forEach(([input, m, col], i) => {
    const ry = y + 44 + i * 25, on = cur && cur === m;
    if (on) { c.fillStyle = '#f3dfa6'; c.fillRect(x + 6, ry - 2, W - 12, 24); }
    else if (i % 2 === 0) { c.fillStyle = CARD; c.fillRect(x + 6, ry - 2, W - 12, 24); }
    c.fillStyle = col; c.fillRect(x + 10, ry + 2, 6, 16);
    text(c, input, x + 24, ry + 16, { font: F.mono(11), color: INK, align: 'left' });
    text(c, m.name || '—', x + 150, ry + 16, { font: F.head(16), color: INK, align: 'left' });
    const dmg = m.totalDmg ?? m.dmg;
    if (dmg) chip(c, `${dmg} DMG`, x + 400, ry + 3, col, { align: 'right' });
    text(c, frames(m), x + W - 14, ry + 16, { font: F.body(14), color: MUTED, align: 'right' });
  });
}
