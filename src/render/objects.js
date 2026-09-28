// World objects for the v3 renderer: projectiles, zones, strikes, hazards.
// Everything draws in world px under the camera transform. Projectile icons
// keep the v2 shapes at x2; zone/strike `y` is the SURFACE TOP they sit on
// (there is no global ground line in v3). Reads only contract fields.

import { INK, PAPER, BRICK } from './palette.js';

const r = (g, x, y, w, h) => g.fillRect(Math.round(x), Math.round(y), w, h);
const SPIN = new Set(['memo', 'binder', 'card', 'football', 'glass', 'bomb', 'polo', 'toothbrush']);   // tumbling throwables

export function drawProjectiles(g, world, t) {
  for (const p of world.projectiles ?? []) {
    // motion trail: fading squares back along the path (lobs curve with vy)
    const vx = p.vx ?? 0, vy = p.vy ?? 0;
    for (let i = 1; i <= 4; i++) {
      const s = 8 - i * 1.5;
      g.globalAlpha = 0.5 - i * 0.1;
      g.fillStyle = i % 2 ? PAPER : (p.color || INK);
      r(g, (p.x ?? 0) - vx * i * 2.2 - s / 2, (p.y ?? 0) - (vy - (p.grav ?? 0) * i) * i * 2.2 - s / 2, s, s);
    }
    g.globalAlpha = 1;
    g.save();
    g.translate(Math.round(p.x ?? 0), Math.round(p.y ?? 0));
    if (SPIN.has(p.shape)) g.rotate(((p.t ?? t) * 0.22) * (Math.sign(vx) || 1));
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
      case 'polo': {                                            // Ben's Skip Shot — a water polo ball: yellow with navy seams
        disc(g, 12, INK); disc(g, 10, p.color);                // round, in 2 px rows so it stays pixel art
        g.fillStyle = '#27425f';
        r(g, -10, -1, 20, 2);                                     // the equator seam
        for (let y = -9; y <= 9; y += 2) {                        // two curved meridian seams (it spins, so they roll)
          const k = Math.round(Math.sqrt(Math.max(0, 81 - y * y)) * 0.45);
          r(g, -k - 1, y, 2, 2); r(g, k - 1, y, 2, 2);
        }
        g.fillStyle = PAPER; r(g, -6, -8, 4, 2); r(g, -8, -6, 2, 2);   // the shine
        break;
      }
      case 'rolex': case 'sub': {                               // Richy's watches: bracelet up and down, face in the middle
        const metal = p.color, dial = p.dial || INK, half = h / 2;
        g.fillStyle = INK; r(g, -7, -half, 14, h);
        g.fillStyle = metal; for (let yy = -half + 2; yy < half - 2; yy += 5) r(g, -5, yy, 10, 3);   // links
        g.fillStyle = INK; r(g, -10, -10, 20, 20);
        g.fillStyle = metal; r(g, -9, -9, 18, 18);                                          // bezel
        g.fillStyle = dial; r(g, -6, -6, 12, 12);
        g.fillStyle = PAPER; r(g, -1, -5, 2, 5); r(g, 0, -1, 4, 2);                         // hands
        g.fillStyle = metal; r(g, 9, -2, 3, 4);                                             // crown
        break;
      }
      case 'toothbrush':                                        // Adrian's Toothbrush Toss
        g.fillStyle = INK; r(g, -13, -3, 26, 6);
        g.fillStyle = p.color; r(g, -12, -2, 18, 4);
        g.fillStyle = PAPER; r(g, 6, -6, 7, 4); g.fillStyle = '#9fd3c7'; r(g, 6, -6, 7, 2);   // bristles + a blob of paste
        break;
      case 'memo':                                              // a folded memo (Ben's old My Office. Now.; kept for content)
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
    } else if (z.type === 'nappy') {                           // a folded white nappy, tabs out, with a green wisp over it (drawn x1.8: it's a trap, it must read)
      const cx = z.x ?? 0;
      g.translate(cx, top); g.scale(1.8, 1.8); g.translate(-cx, -top);
      g.fillStyle = INK; r(g, cx - 14, top - 12, 28, 12);
      g.fillStyle = '#f4efe2'; r(g, cx - 12, top - 10, 24, 9);
      g.fillStyle = '#9ec6d8'; r(g, cx - 16, top - 10, 4, 4); r(g, cx + 12, top - 10, 4, 4);   // the tabs
      g.fillStyle = '#d9cfae'; r(g, cx - 6, top - 6, 12, 3);
      g.fillStyle = 'rgba(143,166,82,0.75)';
      for (let i = 0; i < 3; i++) { const k = ((t >> 2) + i * 5) % 15; r(g, cx - 8 + i * 7 + (((t >> 3) + i) % 2) * 2, top - 16 - k * 2, 4, 4); }
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
    if (s.move?.look === 'points') { drawPoints(g, s, x, top, w, h, t); continue; }
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
    if (h.type === 'meme') { drawViewfinder(g, h, t); continue; }
    if (h.type === 'crowd') { drawCrowd(g, h, t); continue; }
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

// a filled pixel disc of radius R, drawn in 2 px rows
function disc(g, R, color) {
  g.fillStyle = color;
  for (let y = -R; y < R; y += 2) {
    const yc = y + 1, hw = Math.round(Math.sqrt(Math.max(0, R * R - yc * yc)));
    g.fillRect(-hw, y, hw * 2, 2);
  }
}

// Nick's Membership Rewards: a gold coin marker, then a shower of gold cards and points
function drawPoints(g, s, x, top, w, h, t) {
  const GOLD = '#c9a227', PALE = '#efd98a';
  if ((s.delay ?? 0) > 0) {
    const pulse = (t % 12) < 6;
    g.fillStyle = 'rgba(201,162,39,0.16)'; r(g, x - w / 2, top - h, w, h);
    g.fillStyle = INK; r(g, x - 12, top - 14, 24, 12);
    g.fillStyle = pulse ? GOLD : PALE; r(g, x - 10, top - 12, 20, 8);
    g.fillStyle = INK; r(g, x - 2, top - 11, 4, 6);
    return;
  }
  g.fillStyle = 'rgba(239,217,138,0.45)'; r(g, x - w / 2, top - h, w, h);
  g.fillStyle = 'rgba(201,162,39,0.8)'; r(g, x - w / 2, top - h, 3, h); r(g, x + w / 2 - 3, top - h, 3, h);
  for (let i = 0; i < 16; i++) {                                   // falling metal cards and gold coins, down the column
    const y = top - h + ((t * 11 + i * 29) % h), dx = ((i * 17) % (w - 16)) - (w - 16) / 2;
    if (i % 3 === 0) { g.fillStyle = INK; r(g, x + dx - 13, y - 8, 26, 17); g.fillStyle = '#b9c2c9'; r(g, x + dx - 11, y - 6, 22, 13); g.fillStyle = GOLD; r(g, x + dx - 8, y - 3, 6, 5); g.fillStyle = '#8a949b'; r(g, x + dx - 8, y + 4, 16, 2); }
    else { g.fillStyle = INK; r(g, x + dx - 8, y - 8, 16, 16); g.fillStyle = i % 2 ? GOLD : PALE; r(g, x + dx - 6, y - 6, 12, 12); g.fillStyle = '#fff6cf'; r(g, x + dx - 4, y - 4, 3, 3); }
  }
  g.fillStyle = PALE; r(g, x - w / 2 - 10, top - 8, w + 20, 8);   // the splash where it lands
  g.fillStyle = GOLD; r(g, x - w / 2 - 4, top - 12, 6, 4); r(g, x + w / 2 - 2, top - 14, 6, 4);
}

// Richy's Gone Viral: a camera-phone viewfinder on the target — ink while it follows,
// brick and pulsing once it locks (that's the tell: dodge now or get out of frame)
function drawViewfinder(g, h, t) {
  const W = h.fw, H = h.fh, x0 = Math.round(h.x - W / 2), y0 = Math.round(h.y - H / 2), L = 22, T = 4;
  const col = h.locked ? ((t >> 2) & 1 ? BRICK : '#8a3522') : INK;
  g.fillStyle = h.locked ? 'rgba(196,69,46,0.10)' : 'rgba(43,38,32,0.06)'; r(g, x0, y0, W, H);
  g.fillStyle = col;
  for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [x0 + W, y0, -1, 1], [x0, y0 + H, 1, -1], [x0 + W, y0 + H, -1, -1]]) {
    r(g, sx > 0 ? cx : cx - L, sy > 0 ? cy : cy - T, L, T);
    r(g, sx > 0 ? cx : cx - T, sy > 0 ? cy : cy - L, T, L);
  }
  if (h.locked) { r(g, h.x - 10, h.y - 1, 20, 3); r(g, h.x - 1, h.y - 10, 3, 20); }   // crosshair
  if ((t >> 4) & 1 || h.locked) { g.fillStyle = BRICK; r(g, x0 + 8, y0 + 8, 6, 6); }
  g.fillStyle = col; g.font = "700 10px 'Silkscreen', monospace"; g.textAlign = 'left';
  g.fillText(h.locked ? 'LOCKED' : 'REC', x0 + 18, y0 + 15);
}

// Ben's COME ON FULHAM!: a pack of footballers in the white shirt and black shorts, sprinting
function drawCrowd(g, h, t) {
  const dir = h.dir, feet = Math.round(h.y + h.h / 2), SKIN = ['#e8c39a', '#c99a70', '#8d5b3e', '#f0d2b0'], HAIR = ['#23201c', '#5a4030', '#b08d57', '#23201c'];
  for (let i = 0; i < h.n; i++) {
    const k = (h.seed + i * 7) % 4, x = Math.round(h.x - dir * (h.w / 2 - 30 - i * 34) + ((i * 13) % 9) - 4), bob = ((t >> 2) + i) & 1;
    const y = feet - 2 - bob * 3 - (i % 2) * 6, stride = ((t >> 2) + i) % 2;
    g.fillStyle = 'rgba(43,38,32,0.25)'; r(g, x - 14, feet - 3, 28, 4);
    g.fillStyle = INK;                                                    // legs, mid-stride, black socks
    r(g, x - 7 + (stride ? 6 : -4) * dir, y - 30, 6, 30); r(g, x + 1 - (stride ? 6 : -4) * dir, y - 30, 6, 30);
    g.fillStyle = SKIN[k]; r(g, x - 6 + (stride ? 6 : -4) * dir, y - 30, 4, 12); r(g, x + 2 - (stride ? 6 : -4) * dir, y - 30, 4, 12);
    g.fillStyle = '#111'; r(g, x - 10, y - 44, 20, 14);                    // black shorts
    g.fillStyle = INK; r(g, x - 12, y - 76, 24, 34);                       // white shirt, inked
    g.fillStyle = '#f7f4ec'; r(g, x - 10, y - 74, 20, 30);
    g.fillStyle = '#111'; r(g, x - 10, y - 74, 20, 3); r(g, x - 2, y - 66, 4, 4);   // collar trim, crest
    g.fillStyle = '#f7f4ec'; r(g, x + dir * 10, y - 72, 6, 16); r(g, x - dir * 16, y - 70, 6, 14);   // pumping arms
    g.fillStyle = SKIN[k]; r(g, x + dir * 10, y - 58, 6, 5); r(g, x - dir * 16, y - 58, 6, 5);
    g.fillStyle = INK; r(g, x - 9, y - 96, 18, 20);                         // head
    g.fillStyle = SKIN[k]; r(g, x - 7, y - 94, 14, 16);
    g.fillStyle = HAIR[k]; r(g, x - 8, y - 96, 16, 5);
    g.fillStyle = INK; r(g, x + dir * 3, y - 88, 2, 3);                     // eye, looking where he runs
  }
  g.fillStyle = 'rgba(203,191,166,0.7)';                                   // dust kicked up behind the pack
  for (let i = 0; i < 6; i++) { const a = (t + i * 5) % 20; r(g, Math.round(h.x - dir * (h.w / 2 + a * 2)), feet - 6 - ((i * 5) % 12), 6, 6); }
}
