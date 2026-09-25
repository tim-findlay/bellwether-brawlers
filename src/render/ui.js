// Shared front-end UI kit (960x540 screen space). Every menu screen draws with
// these so the game reads as one product: paper plaques with an ink drop
// shadow, keycap hints, a slide-out menu list, stage thumbnails built from the
// real Higgsfield art, fighters drawn from their sprite sheets (drawn body as
// the drop-in fallback), hold-to-repeat navigation and a paper-strip wipe.
// Not neon: flat paper, ink and the four house colours; no glows.

import { INK, PAPER, BRICK, NAVY, BRASS, GREEN, shade } from './palette.js';
import { drawSprite, frameFor, hasAnim } from './sprites.js';
import { drawFallbackBody } from './body.js';
import { drawStage, geometryOf } from '../data/stages.js';

export { INK, PAPER, BRICK, NAVY, BRASS, GREEN };
export const CARD = '#faf5e9';
export const MUTED = '#6e6450';
export const RULE = '#d6cab0';
export const MANILA = '#e8d9b0';
export const SIDE = [NAVY, BRICK];

export const F = {
  logo: (px) => `700 ${px}px 'Pixelify Sans'`,
  head: (px) => `700 ${px}px 'Pixelify Sans'`,
  mono: (px) => `700 ${px}px 'Silkscreen'`,
  body: (px, w = 600) => `${w} ${px}px 'Barlow Condensed'`,
};

// ---- text + boxes -------------------------------------------------------------

export function text(c, str, x, y, { font = F.body(18), color = INK, align = 'center', shadow = null, base = 'alphabetic' } = {}) {
  c.font = font; c.textAlign = align; c.textBaseline = base;
  if (shadow) { c.fillStyle = shadow; c.fillText(str, x + 2, y + 2); }
  c.fillStyle = color; c.fillText(str, x, y);
  c.textBaseline = 'alphabetic';
}

// Wrap `str` into lines no wider than `w`; returns the lines.
export function wrap(c, str, w, font) {
  c.font = font;
  const words = String(str).split(' '), lines = [];
  let line = '';
  for (const wd of words) {
    const test = line ? line + ' ' + wd : wd;
    if (c.measureText(test).width > w && line) { lines.push(line); line = wd; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// A paper plaque: ink drop shadow, fill, ink border.
export function plaque(c, x, y, w, h, { fill = CARD, border = INK, lw = 3, shadow = 5, shadowColor = INK } = {}) {
  x = Math.round(x); y = Math.round(y);
  if (shadow) { c.fillStyle = shadowColor; c.fillRect(x + shadow, y + shadow, w, h); }
  c.fillStyle = fill; c.fillRect(x, y, w, h);
  if (lw) { c.strokeStyle = border; c.lineWidth = lw; c.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw); }
}

// A small coloured label chip ("P1", "CPU", "NEW").
export function chip(c, str, x, y, color = NAVY, { align = 'left', font = F.mono(11) } = {}) {
  c.font = font;
  const w = Math.ceil(c.measureText(str).width) + 12, h = 18;
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  c.fillStyle = color; c.fillRect(Math.round(x0), y, w, h);
  text(c, str, Math.round(x0 + w / 2), y + 13, { font, color: PAPER });
  return w;
}

// A rubber stamp: rotated double-ruled box with a word in it ("READY", "WINNER").
export function stamp(c, str, x, y, { color = BRICK, size = 34, rot = -0.12, alpha = 1 } = {}) {
  c.save();
  c.translate(x, y); c.rotate(rot); c.globalAlpha = alpha;
  c.font = F.head(size);
  const w = c.measureText(str).width + 28, h = size + 18;
  c.strokeStyle = color; c.lineWidth = 4; c.strokeRect(-w / 2, -h / 2, w, h);
  c.lineWidth = 2; c.strokeRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12);
  text(c, str, 0, size * 0.36, { font: F.head(size), color });
  c.restore();
}

// Horizontal stat bar with a label on the left.
export function statBar(c, x, y, w, label, frac, color = NAVY) {
  text(c, label, x, y + 10, { font: F.mono(10), color: MUTED, align: 'left' });
  const bx = x + 86, bw = w - 86;
  c.fillStyle = RULE; c.fillRect(bx, y, bw, 12);
  const segs = 10, fill = Math.round(Math.max(0, Math.min(1, frac)) * segs);
  for (let i = 0; i < segs; i++) {
    c.fillStyle = i < fill ? color : '#e6dcc4';
    c.fillRect(bx + 1 + i * (bw / segs), y + 1, bw / segs - 2, 10);
  }
  c.strokeStyle = INK; c.lineWidth = 1; c.strokeRect(bx + 0.5, y + 0.5, bw - 1, 11);
}

// ---- keycaps + hint bar -----------------------------------------------------

const glyphFont = (label) => (/^[\x20-\x7e]*$/.test(label) ? F.mono(10) : F.body(16, 700));
export function keycap(c, label, x, y, { font = glyphFont(label) } = {}) {
  c.font = font;
  const w = Math.max(20, Math.ceil(c.measureText(label).width) + 12), h = 20;
  c.fillStyle = INK; c.fillRect(x, y + 3, w, h);
  c.fillStyle = CARD; c.fillRect(x, y, w, h - 1);
  c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, w - 2, h - 3);
  text(c, label, x + w / 2, y + 14, { font, color: INK });
  return w;
}

// A centred footer row of [keys] action pairs: [['ENTER', 'Select'], ['ESC', 'Back']].
export function hints(c, items, y = 510, { color = INK } = {}) {
  const gap = 22, parts = [];
  let total = 0;
  for (const [keys, label] of items) {
    const ks = Array.isArray(keys) ? keys : [keys];
    const kw = ks.reduce((a, k) => { c.font = glyphFont(k); return a + Math.max(20, Math.ceil(c.measureText(k).width) + 12) + 4; }, 0);
    c.font = F.body(16);
    const lw = c.measureText(label).width;
    parts.push({ ks, label, w: kw + 4 + lw });
    total += kw + 4 + lw + gap;
  }
  let x = 480 - (total - gap) / 2;
  for (const p of parts) {
    for (const k of p.ks) x += keycap(c, k, Math.round(x), y - 15) + 4;
    text(c, p.label, x + 4, y, { font: F.body(16), color, align: 'left' });
    x += 4 + c.measureText(p.label).width + gap;
  }
}

// ---- menu list ----------------------------------------------------------------

// Vertical list of plaque buttons; the selected one slides out and fills brick.
// items: [{ label, sub? , disabled? }]. anim: per-item slide state kept by caller.
export function menuList(c, items, idx, x, y, { w = 330, h = 50, gap = 12, anim = null, color = BRICK } = {}) {
  items.forEach((it, i) => {
    const sel = i === idx;
    const k = anim ? (anim[i] = (anim[i] ?? 0) + ((sel ? 1 : 0) - (anim[i] ?? 0)) * 0.3) : (sel ? 1 : 0);
    const bx = x + k * 18, by = y + i * (h + gap);
    plaque(c, bx, by, w, h, { fill: sel ? color : CARD, shadow: 4 + Math.round(k * 2), lw: 3 });
    const fg = sel ? PAPER : it.disabled ? MUTED : INK;
    text(c, it.label, bx + 22, by + h / 2 + 9, { font: F.head(24), color: fg, align: 'left' });
    if (sel) {                                   // arrow marker
      c.fillStyle = INK;
      c.beginPath(); c.moveTo(bx - 20, by + h / 2 - 9); c.lineTo(bx - 8, by + h / 2); c.lineTo(bx - 20, by + h / 2 + 9); c.fill();
    }
    if (it.tag) chip(c, it.tag, bx + w - 12, by + 16, sel ? INK : NAVY, { align: 'right' });
  });
}

// ---- backgrounds ---------------------------------------------------------------

// The stage's real far-layer art full-screen, drifting slowly, under a paper
// wash; the procedural v2 layers when the PNG is missing.
export function backdrop(c, G, stage, t, { wash = 0.35, drift = 40, scale = 2.2, washColor = PAPER } = {}) {
  const img = G.stageArt?.get?.(stage.id);
  const W = 480 * scale, H = 270 * scale;
  const ox = Math.round(-(W - 960) / 2 + Math.sin(t * 0.004) * drift), oy = Math.round(-(H - 540) * 0.35);
  c.imageSmoothingEnabled = false;
  if (img) c.drawImage(img, ox, oy, W, H);
  else {
    const w = G.renderer.wctx;
    drawStage(w, stage, t, Math.sin(t * 0.004) * 30);
    c.drawImage(G.renderer.buf, 0, 0, 960, 540);
  }
  if (wash) { c.globalAlpha = wash; c.fillStyle = washColor; c.fillRect(0, 0, 960, 540); c.globalAlpha = 1; }
}

// Ruled paper background with the page border (menus without a stage behind).
export function paper(c, { border = true } = {}) {
  c.fillStyle = PAPER; c.fillRect(0, 0, 960, 540);
  c.fillStyle = 'rgba(43,38,32,0.05)';
  for (let y = 0; y < 540; y += 6) c.fillRect(0, y, 960, 1);
  if (border) { c.strokeStyle = INK; c.lineWidth = 6; c.strokeRect(14, 14, 932, 512); }
}

// A title strip across the top: ink band with the page name in paper.
export function header(c, title, { sub = '', color = INK } = {}) {
  c.fillStyle = color; c.fillRect(0, 22, 960, 50);
  c.fillStyle = BRASS; c.fillRect(0, 72, 960, 4);
  text(c, title, 40, 58, { font: F.head(30), color: PAPER, align: 'left' });
  if (sub) text(c, sub, 920, 55, { font: F.mono(11), color: '#d9ceb4', align: 'right' });
}

// ---- stage thumbnails ------------------------------------------------------------

// Sky, far layer and arena piece composited into a box: the stage as it plays.
export function stageThumb(c, G, stage, x, y, w, h, t = 0) {
  c.save();
  c.beginPath(); c.rect(x, y, w, h); c.clip();
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, stage.sky?.[0] ?? PAPER); g.addColorStop(1, stage.sky?.[1] ?? PAPER);
  c.fillStyle = g; c.fillRect(x, y, w, h);
  c.imageSmoothingEnabled = false;
  const img = G.stageArt?.get?.(stage.id), slab = G.stageArt?.get?.(`${stage.id}-slab`);
  if (img) c.drawImage(img, x, y, w, h);
  else {
    drawStage(G.renderer.wctx, stage, t, 0);
    c.drawImage(G.renderer.buf, x, y, w, h);
  }
  c.globalAlpha = 0.18; c.fillStyle = stage.sky?.[1] ?? PAPER; c.fillRect(x, y, w, h); c.globalAlpha = 1;
  const sw = w * 0.7, sx = x + (w - sw) / 2, sy = y + h * 0.6;
  if (slab) c.drawImage(slab, sx, sy, sw, slab.height * (sw / slab.width));
  else {
    c.fillStyle = stage.groundFill || '#6e655c'; c.fillRect(sx, sy, sw, h * 0.12);
    c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(sx, sy, sw, h * 0.12);
  }
  c.restore();
}

// Layout diagram: slab(s) and soft platforms scaled into a box.
export function stageMap(c, stageId, x, y, w, h) {
  const geo = geometryOf(stageId);
  if (!geo) return;
  // fit the walkable surfaces (not the far-off blast zones), padded
  const surf = [...geo.slabs, ...geo.platforms.map(p => ({ ...p, h: 6 }))];
  const x0 = Math.min(...surf.map(q => q.x)), x1 = Math.max(...surf.map(q => q.x + q.w));
  const y0 = Math.min(...surf.map(q => q.y)), y1 = Math.max(...surf.map(q => q.y + (q.h || 6)));
  const b = { x: x0 - (x1 - x0) * 0.12, y: y0 - (y1 - y0) * 0.35 - 40, w: (x1 - x0) * 1.24, h: (y1 - y0) * 1.7 + 80 };
  const s = Math.min(w / b.w, h / b.h);
  const ox = x + (w - b.w * s) / 2 - b.x * s, oy = y + (h - b.h * s) / 2 - b.y * s;
  for (const sl of geo.slabs) { c.fillStyle = INK; c.fillRect(ox + sl.x * s, oy + sl.y * s, sl.w * s, Math.max(4, sl.h * s)); }
  for (const p of geo.platforms) { c.fillStyle = NAVY; c.fillRect(ox + p.x * s, oy + p.y * s, p.w * s, 3); }
  for (const sp of geo.spawns || []) { c.fillStyle = BRICK; c.fillRect(ox + sp.x * s - 2, oy + sp.y * s - 7, 4, 7); }
}

// ---- fighters ---------------------------------------------------------------------

// Draw a fighter standing at (x, y) (feet). anim 'idle' | 'run' | 'jump' | 'attack';
// t in logic frames. Uses the sheet when loaded, else the drawn body.
export function fighter(c, G, cfg, x, y, scale, { anim = 'idle', t = 0, facing = 1, tint = null, alpha = null } = {}) {
  const sheet = G.sprites?.get?.(cfg.id);
  const name = hasAnim(sheet, anim) ? anim : 'idle';
  if (hasAnim(sheet, name)) {
    drawSprite(c, sheet, name, frameFor(sheet.anims[name], t), x, y, facing, scale, { tint, tintAlpha: 0.9, alpha });
    return;
  }
  c.save();
  if (alpha != null) c.globalAlpha = alpha;
  drawFallbackBody(c, { cfg, x, y, anim: { name: anim === 'attack' ? 'idle' : anim, t }, body: { x, y, h: 64 * scale, facing, grounded: false } }, null);
  c.restore();
}

// A floor shadow under a fighter.
export function floorShadow(c, x, y, w) {
  c.fillStyle = 'rgba(43,38,32,0.22)';
  c.fillRect(Math.round(x - w / 2), Math.round(y - 3), Math.round(w), 6);
}

// ---- logo ---------------------------------------------------------------------------

// Draw a keyed UI image centred at (x, y), `w` wide (nearest-neighbour).
function uiImage(c, img, x, y, w) {
  const h = img.height * (w / img.width);
  c.imageSmoothingEnabled = false;
  c.drawImage(img, Math.round(x - w / 2), Math.round(y - h / 2), Math.round(w), Math.round(h));
}

// The title logo: the Higgsfield art (assets/ui/logo.png) when loaded, else
// BELLWETHER / BATTLERS set in two lines with a stepped ink extrude and a bell.
export function logo(c, x, y, s = 1, t = 0, G = null) {
  const img = G?.uiArt?.get?.('logo');
  if (img) { uiImage(c, img, x, y + Math.round(Math.sin(t * 0.05) * 2), 480 * s); return; }   // centred at (x, y)
  c.save();
  c.translate(x, y + 44 * s); c.scale(s, s); c.rotate(-0.025);
  const bob = Math.round(Math.sin(t * 0.05) * 2);
  bell(c, 0, -118 + bob, 1);
  const line = (str, yy, col) => {
    c.font = F.logo(78); c.textAlign = 'center';
    for (let d = 6; d > 0; d -= 1) { c.fillStyle = d > 3 ? INK : shade(INK, 30); c.fillText(str, d, yy + d); }
    c.fillStyle = col; c.fillText(str, 0, yy);
  };
  line('BELLWETHER', -30, BRICK);
  line('BATTLERS', 46, NAVY);
  c.restore();
}

// VS emblem (assets/ui/vs.png) or a brick badge with the letters.
export function vsBadge(c, G, x, y, size = 150, t = 0) {
  const img = G?.uiArt?.get?.('vs');
  const k = 1 + Math.max(0, 0.25 - t * 0.02);            // punch-in on arrival
  if (img) { uiImage(c, img, x, y, size * k); return; }
  c.save(); c.translate(x, y); c.scale(k, k); c.rotate(-0.08);
  const r = size * 0.42;
  c.fillStyle = INK; c.beginPath();
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = i % 2 ? r * 0.82 : r; c.lineTo(Math.cos(a) * rr + 6, Math.sin(a) * rr + 6); }
  c.fill();
  c.fillStyle = BRICK; c.beginPath();
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = i % 2 ? r * 0.82 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  c.fill(); c.strokeStyle = INK; c.lineWidth = 4; c.stroke();
  text(c, 'VS', 0, size * 0.14, { font: F.logo(Math.round(size * 0.4)), color: PAPER, shadow: INK });
  c.restore();
}

// Trophy (assets/ui/trophy.png) or a drawn brass cup.
export function trophy(c, G, x, y, size = 140) {
  const img = G?.uiArt?.get?.('trophy');
  if (img) { uiImage(c, img, x, y, size); return; }
  const s = size / 140, P = (px, py, w, h, col) => { c.fillStyle = col; c.fillRect(x + px * s, y + py * s, w * s, h * s); };
  P(-40, 40, 80, 24, INK); P(-36, 43, 72, 18, '#6b4a2e'); P(-18, 48, 36, 8, CARD);
  P(-8, 14, 16, 28, INK); P(-5, 16, 10, 26, BRASS);
  P(-38, -44, 76, 62, INK); P(-34, -40, 68, 54, BRASS); P(-26, -36, 10, 40, '#e8cf73');
  P(-54, -34, 20, 8, INK); P(-54, -34, 8, 30, INK); P(34, -34, 20, 8, INK); P(46, -34, 8, 30, INK);
  P(-12, 2, 24, 6, BRICK);
  bell(c, x, y - 52 * s, s * 0.8);
}

// A little pixel hand-bell (the bellwether's).
export function bell(c, x, y, s = 1) {
  const P = (px, py, w, h, col) => { c.fillStyle = col; c.fillRect(x + px * s, y + py * s, w * s, h * s); };
  P(-4, -26, 8, 12, INK); P(-2, -24, 4, 8, '#8a6a3a');                 // handle
  P(-14, -14, 28, 4, INK); P(-18, -10, 36, 22, INK); P(-24, 12, 48, 6, INK);
  P(-12, -10, 24, 18, BRASS); P(-16, 8, 32, 4, BRASS); P(-8, -8, 5, 12, '#e8cf73');
  P(-3, 18, 6, 6, INK);                                                     // clapper
}

// ---- navigation --------------------------------------------------------------------

const DIRS = {
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
};
export const P1_DIRS = { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'] };
export const P2_DIRS = { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'] };

// Hold-to-repeat navigator: call nav() once per update; returns { dx, dy }.
export function makeNav(G, dirs = DIRS, { first = 18, every = 6 } = {}) {
  const held = { left: 0, right: 0, up: 0, down: 0 };
  return function nav() {
    const out = { dx: 0, dy: 0 };
    for (const d of Object.keys(held)) {
      const codes = dirs[d];
      const pressed = codes.some(k => G.input.keyPressed(k));
      const down = codes.some(k => G.input.keyHeld(k));
      held[d] = down ? held[d] + 1 : 0;
      const fire = pressed || (held[d] > first && (held[d] - first) % every === 0);
      if (!fire) continue;
      if (d === 'left') out.dx = -1; if (d === 'right') out.dx = 1;
      if (d === 'up') out.dy = -1; if (d === 'down') out.dy = 1;
    }
    return out;
  };
}

export const confirmP1 = (G) => G.input.keyPressed('KeyF') || G.input.keyPressed('Space');
export const confirmP2 = (G) => G.input.keyPressed('KeyK') || G.input.keyPressed('Enter');

// ---- transition --------------------------------------------------------------------

// Paper-strip wipe: on every screen change eight ink-edged strips cover the
// frame and peel away upward, staggered. Purely visual; input is not delayed.
export class Wipe {
  constructor() { this.t = 99; this.dur = 22; }
  start() { this.t = 0; }
  update() { if (this.t < this.dur) this.t++; }
  draw(c) {
    if (this.t >= this.dur) return;
    const n = 8, sw = 960 / n;
    for (let i = 0; i < n; i++) {
      const k = Math.max(0, Math.min(1, (this.t - i * 1.2) / (this.dur - n * 1.2)));
      const e = k * k * (3 - 2 * k);
      const h = Math.round(540 * (1 - e));
      if (h <= 0) continue;
      c.fillStyle = i % 2 ? PAPER : MANILA; c.fillRect(Math.round(i * sw), 0, Math.ceil(sw), h);
      c.fillStyle = INK; c.fillRect(Math.round(i * sw), h - 5, Math.ceil(sw), 5);
    }
  }
}

// Normalise a stat across the roster into 0..1 (for the select-screen bars).
export function statFrac(chars, key, v, invert = false) {
  const vals = chars.map(ch => ch.stats[key]);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const f = hi === lo ? 0.5 : (v - lo) / (hi - lo);
  return 0.2 + 0.8 * (invert ? 1 - f : f);
}
