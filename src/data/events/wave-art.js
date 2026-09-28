// THE WAVE, drawn (render only; wave.js owns the rules). The sea is procedural
// and pixel-stepped, in the crest art's own palette so the two join: a moving
// two-harmonic surface with foam caps, banded depth, drifting highlights. It
// swells up behind the crest to meet the Higgsfield wave (assets/ui/ev-wave.png,
// drawn at a fixed ×CREST_SCALE so its pixels match the game's), which throws
// spray off its lip. Boards tilt on the swell and leave a wake; anyone under
// the surface trails bubbles. Everything is a pure function of t — no state.

import { INK, art } from './_shared.js';

export const CREST_SCALE = 2;                  // art px → world px (the sprites are ×1.5, the backdrops ×4)
const TEAL = '#45ae8e', TEAL2 = '#33a08a', BLUE = '#03597f', DEEP = '#062c55', FOAM = '#faf3c8', MIST = '#a7cbac';
const COL = 6;                                 // world px per surface column (the pixel step)
const SINK = 26;                               // the crest art's base sits this far under the surface
const LEFT_TOP = 89, FRONT = 0.15;             // art rows of water at the crest's back edge; lip inset (× width) from the front

const snap = (v, s = 3) => Math.round(v / s) * s;

// surface height at x (the swell toward the crest included)
function surfaceY(x, lvl, t, swell) {
  let y = lvl + Math.sin(x * 0.021 + t * 0.09) * 4 + Math.sin(x * 0.053 - t * 0.14) * 2.5;
  if (swell) {                                                     // behind the crest the sea climbs to meet the art
    const d = (swell.back - x) * swell.dir;                        // distance behind the crest's back edge (under the art: < 0, hidden)
    if (d >= 0 && d < swell.len) { const k = 1 - d / swell.len; y -= swell.h * k * k * (3 - 2 * k); }
  }
  return snap(y);
}

// the crest's box this frame (null when there's no art / it's off)
export function crestBox(ctx, x, lvl) {
  const img = art(ctx, 'ev-wave');
  if (!img) return null;
  const W = img.width * CREST_SCALE, H = img.height * CREST_SCALE, dir = ctx.data.dir;
  const rise = Math.min(1, Math.max(0, (ctx.t - 50) / 14));        // it rears up as it arrives
  const bottom = lvl + SINK + Math.round((1 - rise) * H * 0.5) + Math.round(Math.sin(ctx.t * 0.12) * 3);
  return { img, W, H, dir, bottom, left: dir > 0 ? x - W : x, right: dir > 0 ? x : x + W, back: dir > 0 ? x - W : x + W };
}

// The sea between x0 and x1 (world), filled from its surface down to y1.
// front: the translucent pass drawn over the fighters.
export function drawSea(c, { x0, x1, y1, lvl, t, box, front }) {
  if (x1 <= x0) return;
  // climb to the art's water line at its back edge (tucked 12 px under the art so the seam hides)
  const swell = box ? { back: box.back + box.dir * 12, dir: box.dir, h: Math.max(0, lvl - (box.bottom - LEFT_TOP * CREST_SCALE)) + 6, len: 260 } : null;
  const xs = [], ys = [];
  for (let x = Math.floor(x0 / COL) * COL; x <= x1 + COL; x += COL) { xs.push(x); ys.push(surfaceY(x, lvl, t, swell)); }
  c.save();
  c.globalAlpha = front ? 0.36 : 0.9;
  for (let i = 0; i < xs.length; i++) {                                // banded by depth under the local surface (pixel bands, no glow)
    const x = xs[i], y = ys[i];
    c.fillStyle = TEAL; c.fillRect(x, y, COL, 10);
    c.fillStyle = TEAL2; c.fillRect(x, y + 10, COL, 30);
    c.fillStyle = BLUE; c.fillRect(x, y + 40, COL, 120);
    c.fillStyle = DEEP; c.fillRect(x, y + 160, COL, Math.max(0, y1 - y - 160));
  }
  c.restore();
  if (front) {                                                          // the surface line + foam caps, crisp over everything
    c.fillStyle = MIST;
    for (let i = 0; i < xs.length; i++) c.fillRect(xs[i], ys[i], COL, 3);
    c.fillStyle = FOAM;
    for (let i = 0; i < xs.length; i++) {
      const cap = Math.sin(xs[i] * 0.021 + t * 0.09);
      if (cap > 0.55) c.fillRect(xs[i], ys[i] - 3, COL, cap > 0.85 ? 6 : 3);
    }
    return;
  }
  c.fillStyle = TEAL; c.globalAlpha = 0.5;                            // drifting highlight streaks in the body
  for (let k = 0; k < 7; k++) {
    const w = 30 + (k * 23) % 50, y = snap(lvl + 22 + (k * 37) % 120);
    const x = x0 + ((k * 211 + t * (0.6 + (k % 3) * 0.3)) % Math.max(1, x1 - x0 + w)) - w;
    if (x + w > x0 && x < x1) c.fillRect(snap(Math.max(x0, x), COL), y, w, 3);
  }
  c.globalAlpha = 1;
}

export function drawCrest(c, box, t) {
  const { img, W, H, dir, bottom, left } = box;
  c.save(); c.imageSmoothingEnabled = false;
  if (dir > 0) c.drawImage(img, left, bottom - H, W, H);
  else { c.translate(left + W, bottom - H); c.scale(-1, 1); c.drawImage(img, 0, 0, W, H); }
  c.restore();
  // spray off the lip: foam flecks thrown ahead and up, falling back
  const front = dir > 0 ? box.right : box.left, lipX = front - dir * W * FRONT, lipY = bottom - H + 40;
  c.fillStyle = FOAM;
  for (let i = 0; i < 22; i++) {
    const life = 26, age = (t * 1.3 + i * 7.3) % life, k = age / life;
    const vx = dir * (1.6 + ((i * 37) % 10) / 4), vy = -(1.5 + ((i * 53) % 10) / 4);
    const x = lipX + vx * age + ((i * 17) % 30) * dir, y = lipY + vy * age + 0.22 * age * age + ((i * 29) % 60);
    const s = i % 3 === 0 ? 6 : 4;
    c.globalAlpha = 1 - k * k;
    c.fillRect(snap(x, 2), snap(y, 2), s, s);
  }
  // whitewater down the front face: a ragged, falling curtain where the wall of water leads
  for (let y = bottom - SINK - 12, i = 0; y < bottom + 700; y += 6, i++) {
    const depth = (y - bottom) / 700, j = ((i * 7 + ((t * 0.9) | 0)) % 5) * 3, w = 10 + ((i * 3 + (t >> 2)) % 3) * 4;
    c.globalAlpha = Math.max(0.15, 0.9 - Math.max(0, depth) * 0.9);
    c.fillStyle = (i + (t >> 3)) % 4 === 0 ? MIST : FOAM;
    c.fillRect(dir > 0 ? front - w - j + 4 : front + j - 4, y, w, 6);
  }
  c.globalAlpha = 1; c.fillStyle = FOAM;
  // churn where the wave's foot meets the water ahead of it
  for (let i = 0; i < 10; i++) {
    const age = (t * 1.1 + i * 5.1) % 18, x = front + dir * (age * 2 + ((i * 13) % 24) - 30);
    c.globalAlpha = 0.8 * (1 - age / 18);
    c.fillRect(snap(x, 2), snap(bottom - SINK - 6 - age * 1.2 - ((i * 7) % 14), 2), 5, 5);
  }
  c.globalAlpha = 1;
}

// the boards: tilt with the swell, a foam wake at the tail while the water's up
export function drawBoards(c, { stage, t, lvl, wet, img, still }) {
  stage.platforms.forEach((p, k) => {
    const x = p.x - 12, w = p.w + 24, cx = x + w / 2;
    const bob = still ? 0 : Math.round(Math.sin(t * 0.11 + k * 1.3) * 3), tilt = still ? 0 : Math.sin(t * 0.07 + k * 2.1) * 0.035;
    const y = p.y + bob;
    c.save(); c.translate(cx, y); c.rotate(tilt);
    if (img) { c.imageSmoothingEnabled = false; c.drawImage(img, -w / 2, -5, w, Math.round(img.height * w / img.width)); }
    else {
      c.fillStyle = INK; c.fillRect(-w / 2, -3, w, 14); c.fillStyle = '#e8c98a'; c.fillRect(-w / 2 + 3, -1, w - 6, 10);
      c.fillStyle = '#c4452e'; c.fillRect(-w / 2 + 6, 3, w - 12, 2);
    }
    c.restore();
    if (wet && Math.abs(p.y - lvl) < 40) {                               // riding the surface: a wake off both ends
      c.fillStyle = FOAM;
      for (let i = 0; i < 4; i++) {
        const a = (t * 0.8 + i * 4) % 16;
        c.globalAlpha = 0.9 * (1 - a / 16);
        c.fillRect(snap(x - 6 - a * 1.5, 2), snap(y + 8 - (i % 2) * 4, 2), 6, 3);
        c.fillRect(snap(x + w + a * 1.5, 2), snap(y + 8 - ((i + 1) % 2) * 4, 2), 6, 3);
      }
      c.globalAlpha = 1;
    }
  });
}

// bubbles rising off anyone under the surface
export function drawBubbles(c, world, lvl, t) {
  c.strokeStyle = FOAM; c.lineWidth = 2;
  for (const f of world.fighters) {
    if (f.state === 'ko' || f.chair) continue;
    const head = f.y - (f.body?.h ?? 96);
    if (head < lvl + 6) continue;
    for (let i = 0; i < 4; i++) {
      const life = 40, age = (t + i * 10 + (f.side ?? 0) * 5) % life, rise = age * 1.6;
      const y = head + 10 - rise;
      if (y < lvl + 4) continue;
      c.globalAlpha = 0.85;
      c.strokeRect(snap(f.x + Math.sin((t + i * 9) * 0.2) * 8 + (i - 1.5) * 6, 2), snap(y, 2), i % 2 ? 4 : 6, i % 2 ? 4 : 6);
    }
  }
  c.globalAlpha = 1;
}
