// World objects for the v3 renderer: projectiles, zones, strikes, hazards.
// Everything draws in world px under the camera transform. Projectile icons
// keep the v2 shapes at x2; zone/strike `y` is the SURFACE TOP they sit on
// (there is no global ground line in v3). Reads only contract fields.

import { INK, PAPER, BRICK } from './palette.js';

const r = (g, x, y, w, h) => g.fillRect(Math.round(x), Math.round(y), w, h);

export function drawProjectiles(g, world, t) {
  for (const p of world.projectiles ?? []) {
    g.save();
    g.translate(Math.round(p.x ?? 0), Math.round(p.y ?? 0));
    g.fillStyle = p.color || INK;
    const w = p.w ?? 16, h = p.h ?? 12;
    switch (p.shape) {
      case 'football':
        r(g, -10, -6, 20, 12); g.fillStyle = PAPER; r(g, -4, -2, 8, 2);
        break;
      case 'email':
        r(g, -12, -8, 24, 18);
        g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(-12, -8, 24, 18);
        g.beginPath(); g.moveTo(-12, -8); g.lineTo(0, 2); g.lineTo(12, -8); g.stroke();
        if ((t & 8) === 0) { g.fillStyle = BRICK; r(g, 6, -14, 8, 8); }   // dithered "1 new"
        break;
      case 'candle':                                            // Richy: body = p.h tall
        r(g, -8, -h / 2, 16, h); r(g, -2, -h / 2 - 8, 4, 8); r(g, -2, h / 2, 4, 8);
        break;
      case 'card':
        r(g, -8, -6, 16, 12); g.fillStyle = PAPER; r(g, -4, -2, 4, 4);
        break;
      case 'glass':
        r(g, -6, -8, 12, 10); g.fillStyle = '#ddd5c2'; r(g, -2, 2, 4, 6);
        break;
      case 'bomb':
        r(g, -8, -8, 18, 18); g.fillStyle = BRICK; r(g, 4, -12, 4, 4);
        break;
      case 'memo':                                              // Ben's "My Office. Now." — a folded memo
        r(g, -13, -9, 26, 18); g.fillStyle = INK; r(g, -9, -4, 18, 2); r(g, -9, 1, 12, 2);
        g.fillStyle = BRICK; r(g, 7, -9, 6, 6);
        break;
      case 'binder':                                            // Seelye's Drawdown — a loan binder
        r(g, -9, -10, 18, 20); g.fillStyle = PAPER; r(g, -5, -8, 12, 16); g.fillStyle = INK; r(g, -9, -6, 3, 3); r(g, -9, 3, 3, 3);
        break;
      case 'diaper':                                            // Seelye's Fresh One
        r(g, -9, -6, 18, 12); g.fillStyle = PAPER; r(g, -7, -4, 14, 8); g.fillStyle = '#b3c7d6'; r(g, -3, -2, 6, 4);
        break;
      default:
        r(g, -w / 2, -h / 2, w, h);
    }
    g.restore();
  }
}

export function drawZones(g, world, t) {
  for (const z of world.zones ?? []) {
    const x0 = (z.x ?? 0) - (z.w ?? 80) / 2, w = z.w ?? 80, top = z.y ?? 0;
    const fade = z.max ? Math.min(1, (z.life ?? z.max) / Math.min(z.max, 30)) : 1;
    g.save();
    g.globalAlpha = fade;
    if (z.type === 'coffee') {
      g.fillStyle = 'rgba(90,58,38,0.85)'; r(g, x0, top - 2, w, 8);
      g.fillStyle = 'rgba(122,80,52,0.85)'; r(g, x0 + 8, top - 6, w - 16, 6);
      g.fillStyle = 'rgba(242,233,216,0.5)'; r(g, x0 + 14, top - 5, 10, 2);
    } else if (z.type === 'ember' && z.look === 'paper') {   // Seelye's paperwork: scattered sheets
      g.fillStyle = 'rgba(39,66,95,0.28)'; r(g, x0, top - 4, w, 6);
      for (let i = 0; i < Math.max(3, w / 20 | 0); i++) {
        const lift = ((t >> 3) + i) % 3 === 0 ? 2 : 0;
        g.fillStyle = PAPER; r(g, x0 + 6 + i * 20, top - 8 - lift, 12, 6);
        g.fillStyle = INK; r(g, x0 + 8 + i * 20, top - 6 - lift, 8, 1);
      }
    } else if (z.type === 'ember') {
      g.fillStyle = 'rgba(180,90,40,0.5)'; r(g, x0, top - 6, w, 12);
      g.fillStyle = 'rgba(120,50,20,0.6)'; r(g, x0 + 4, top - 2, w - 8, 6);
      for (let i = 0; i < Math.max(2, w / 24 | 0); i++) {
        if (((t >> 2) + i) % 2) { g.fillStyle = '#d8762e'; r(g, x0 + 12 + i * 24, top - 10 - (t / 4 + i * 3) % 12, 4, 4); }
      }
    } else if (z.type === 'smoke') {
      const hMax = z.h ?? 100, cols = 6;
      g.fillStyle = 'rgba(120,114,104,0.45)';
      for (let i = 0; i < cols; i++) {
        const sh = hMax - i * (hMax / 12);
        r(g, x0 + i * (w / cols), top - sh - ((t / 6 + i * 5) % 16), w / cols - 4, sh);
      }
    } else {
      g.fillStyle = 'rgba(43,38,32,0.3)'; r(g, x0, top - (z.h ?? 8), w, z.h ?? 8);
    }
    g.restore();
  }
}

export function drawStrikes(g, world, t) {
  for (const s of world.strikes ?? []) {
    const x = s.x ?? 0, top = s.y ?? 0, w = s.w ?? 40, h = s.h ?? 120;
    if ((s.delay ?? 0) > 0) {                                   // telegraph marker on the surface
      const pulse = (t % 16) < 8;
      g.fillStyle = pulse ? BRICK : '#8a3522';
      r(g, x - 16, top - 6, 32, 6); r(g, x - 4, top - 16, 8, 8);
      if (s.marker) { g.fillStyle = 'rgba(196,69,46,0.18)'; r(g, x - w / 2, top - h, w, h); }
    } else {
      g.fillStyle = s.color || '#3f5a40';
      r(g, x - w / 2, top - h, w, h);
      g.fillStyle = PAPER; r(g, x - w / 2 + 4, top - h + 4, 6, h - 8);
      g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(x - w / 2 + 1.5, top - h + 1.5, w - 3, h - 3);
    }
  }
}

export function drawHazards(g, world, t) {
  for (const h of world.hazards ?? []) {
    g.save();
    g.translate(Math.round(h.x ?? 0), Math.round(h.y ?? 0));
    if (h.type === 'bike') {                                    // riderless spin bike, y = centre
      const spin = (t * 0.3) % (Math.PI * 2);
      g.fillStyle = INK;
      g.beginPath(); g.arc(-10, 10, 9, 0, Math.PI * 2); g.arc(12, 10, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = PAPER;
      g.beginPath(); g.arc(-10, 10, 3, 0, Math.PI * 2); g.arc(12, 10, 3, 0, Math.PI * 2); g.fill();
      g.strokeStyle = BRICK; g.lineWidth = 4;
      g.beginPath(); g.moveTo(-10, 10); g.lineTo(0, -6); g.lineTo(12, 10); g.moveTo(0, -6); g.lineTo(-4, -12); g.stroke();
      g.fillStyle = INK; r(g, -8, -16, 12, 4);
      g.strokeStyle = INK; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, 2); g.lineTo(Math.cos(spin) * 7, 2 + Math.sin(spin) * 7); g.stroke();
    } else if (h.type === 'ball') {                             // the wrecking ball, y = centre
      g.strokeStyle = '#4a443c'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(0, -1200); g.lineTo(0, -20); g.stroke();
      g.fillStyle = '#4a443c'; g.beginPath(); g.arc(0, 0, 28, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#5d564c'; g.beginPath(); g.arc(-8, -8, 10, 0, Math.PI * 2); g.fill();
      g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 28, 0, Math.PI * 2); g.stroke();
    } else {
      g.fillStyle = INK; r(g, -(h.w ?? 24) / 2, -(h.h ?? 24) / 2, h.w ?? 24, h.h ?? 24);
    }
    g.restore();
  }
}
