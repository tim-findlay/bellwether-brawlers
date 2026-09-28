// The fighter card (render only; hud.js draws two of them). Paper and ink,
// read from across the room:
//   bust tile in the player's colour · first name + title · three stock tokens
//   (the fighter's own head; a lost one pops, greys out and takes an ink ✕)
//   · a chunky slanted composure bar with its number, tick marks and a
//   damage ghost that drains a beat after the hit (the card shakes, low
//   composure pulses) · a four-segment super meter that turns brass with a
//   sweeping gleam and SUPER READY when full · two clock-pie special cooldowns.
// Animation state is per fighter and steps on world.frame, so hitstop and
// pause freeze it.

import { INK, PAPER, BRICK, NAVY, BRASS, GREEN, shade } from './palette.js';
import { drawSprite, hasAnim } from './sprites.js';

const VIEW_W = 960;
const SIDE = [NAVY, BRICK];
const EMPTY = '#d8cfba', GHOST = '#e8a88f', MUTED = '#6e6450';
const S = new WeakMap();

function state(f, frame) {
  let s = S.get(f);
  const g = f.gauge ?? 100;
  if (!s) { s = { frame, ghost: g, last: g, hold: 0, shake: 0, stocks: f.stocks ?? 3, lostT: 0, pop: 0 }; S.set(f, s); }
  const ticks = Math.max(0, Math.min(6, frame - s.frame)); s.frame = frame;
  for (let i = 0; i < ticks; i++) {
    if (g < s.last - 0.01) { s.hold = 34; s.shake = Math.min(10, 3 + (s.last - g) * 0.6); }
    if (g > s.ghost) s.ghost = g;                                        // healed / respawned: no ghost
    if (s.hold > 0) s.hold--; else if (s.ghost > g) s.ghost = Math.max(g, s.ghost - 0.9);
    s.shake *= 0.8; if (s.shake < 0.3) s.shake = 0;
    if ((f.stocks ?? 3) < s.stocks) { s.lostT = 40; s.stocks = f.stocks ?? 3; }
    if (s.lostT > 0) s.lostT--;
    s.last = g;
  }
  return s;
}

// a slanted bar path (parallelogram leaning right); `skew` px over its height
function slant(c, x, y, w, h, skew) {
  c.beginPath(); c.moveTo(x + skew, y); c.lineTo(x + w + skew, y); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath();
}

export function drawCard(c, f, side, t, sprites, frame) {
  const st = state(f, frame), flip = side === 1;
  const X = (x, w = 0) => (flip ? VIEW_W - x - w : x);                 // mirror a box for P2
  const jx = st.shake ? (Math.random() - 0.5) * st.shake : 0, jy = st.shake ? (Math.random() - 0.5) * st.shake * 0.6 : 0;
  const ox = 18, oy = 12, col = SIDE[side];
  c.save(); c.translate(jx, jy);

  // --- the plate: ink shadow, paper face, a colour rule along the bottom
  const px = X(ox + 60, 318);
  c.fillStyle = INK; slant(c, px + 5, oy + 9, 318, 74, flip ? -10 : 10); c.fill();
  c.fillStyle = PAPER; slant(c, px, oy + 4, 318, 74, flip ? -10 : 10); c.fill();
  c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
  c.fillStyle = col; slant(c, px + 2, oy + 72, 314, 5, flip ? -1 : 1); c.fill();

  // --- bust tile
  drawBust(c, f, X(ox, 80), oy, side, sprites);

  // --- name row + stock tokens
  const nameX = flip ? VIEW_W - ox - 96 : ox + 96;
  c.textAlign = flip ? 'right' : 'left';
  c.fillStyle = INK; c.font = "700 21px 'Pixelify Sans'";
  const name = f.cfg?.name ?? `P${side + 1}`;
  c.fillText(name, nameX, oy + 27);
  const nw = c.measureText(name).width;
  c.font = "700 9px 'Silkscreen'"; c.fillStyle = MUTED;
  if (f.cfg?.title) c.fillText(f.cfg.title, nameX + (flip ? -nw - 8 : nw + 8), oy + 26);
  for (let i = 0; i < 3; i++) {
    const tx = flip ? VIEW_W - (ox + 350) + i * 26 : ox + 350 - 22 - i * 26;
    stockToken(c, f, tx, oy + 9, i < (f.stocks ?? 3), i === (f.stocks ?? 3) && st.lostT > 0 ? st.lostT : 0, sprites, side);
  }

  // --- composure bar
  const maxG = f.maxGauge ?? f.cfg?.stats?.gauge ?? 100, g = Math.max(0, f.gauge ?? maxG);
  const pct = Math.max(0, Math.min(1, g / (maxG || 1))), ghost = Math.max(pct, Math.min(1, st.ghost / (maxG || 1)));
  const bw = 270, bh = 24, bx = X(ox + 92, bw), by = oy + 34, sk = flip ? -9 : 9;
  const fill = pct > 0.5 ? GREEN : pct > 0.25 ? BRASS : ((t >> 3) & 1 ? BRICK : shade(BRICK, 18));
  c.save(); slant(c, bx, by, bw, bh, sk); c.clip();
  c.fillStyle = EMPTY; c.fillRect(bx - 12, by, bw + 24, bh);
  const span = (k) => { const w = Math.round((bw + 10) * k); return flip ? [bx + bw + 10 - w, w] : [bx - 10, w]; };   // anchored at the portrait end
  let [gx, gw] = span(ghost); c.fillStyle = GHOST; c.fillRect(gx, by, gw, bh);
  let [fx, fw] = span(pct); c.fillStyle = fill; c.fillRect(fx, by, fw, bh);
  c.fillStyle = shade(fill, 28); c.fillRect(fx, by, fw, 5);                          // top bevel
  c.fillStyle = shade(fill, -22); c.fillRect(fx, by + bh - 5, fw, 5);                // bottom shade
  c.fillStyle = 'rgba(43,38,32,0.22)';
  for (let k = 1; k < 10; k++) c.fillRect(Math.round(bx + (bw * k) / 10 + (flip ? 4 : 4)), by + 3, 2, bh - 6);   // ticks
  c.restore();
  c.strokeStyle = INK; c.lineWidth = 3; slant(c, bx, by, bw, bh, sk); c.stroke();
  // the number, on an ink badge at the bar's inner end (readable at any fill)
  const num = String(Math.ceil(g)), badgeW = 44, bdx = flip ? bx - 14 : bx + bw - badgeW + 16;
  c.fillStyle = INK; slant(c, bdx, by - 3, badgeW, bh + 6, flip ? -8 : 8); c.fill();
  c.fillStyle = pct <= 0.25 ? fill : PAPER; c.font = "700 20px 'Pixelify Sans'"; c.textAlign = 'center';
  c.fillText(num, bdx + badgeW / 2 + (flip ? -4 : 4), by + bh - 4);

  // --- super meter (four segments) + SUPER READY
  const meter = Math.max(0, Math.min(100, f.meter ?? 0)), full = meter >= 100;
  const mw = 176, mh = 12, mx = X(ox + 92, mw), my = oy + 63, msk = flip ? -6 : 6;
  c.save(); slant(c, mx, my, mw, mh, msk); c.clip();
  c.fillStyle = EMPTY; c.fillRect(mx - 8, my, mw + 16, mh);
  const mf = Math.round((mw + 6) * meter / 100);
  c.fillStyle = full ? BRASS : NAVY; c.fillRect(flip ? mx + mw + 6 - mf : mx - 6, my, mf, mh);
  c.fillStyle = shade(full ? BRASS : NAVY, 30); c.fillRect(flip ? mx + mw + 6 - mf : mx - 6, my, mf, 3);
  if (full) { const gx2 = mx - 20 + ((t * 5) % (mw + 60)); c.fillStyle = 'rgba(255,248,220,0.7)'; c.fillRect(flip ? mx + mw - (gx2 - mx) : gx2, my, 10, mh); }   // the gleam
  c.fillStyle = INK; for (let k = 1; k < 4; k++) c.fillRect(Math.round(mx + (mw * k) / 4 + 2), my, 2, mh);
  c.restore();
  c.strokeStyle = INK; c.lineWidth = 2; slant(c, mx, my, mw, mh, msk); c.stroke();
  c.font = "700 9px 'Silkscreen'"; c.textAlign = flip ? 'right' : 'left';
  if (full) {
    const pop = (t >> 4) & 1;
    c.fillStyle = INK; c.fillText('SUPER READY', (flip ? mx + mw - 8 : mx + 10) + 1, my + mh - 2 + 1);
    c.fillStyle = pop ? PAPER : '#fff4c9'; c.fillText('SUPER READY', flip ? mx + mw - 8 : mx + 10, my + mh - 2);
  }

  // --- special cooldown pies
  const silenced = !!f.statuses?.has?.('silence');
  ['s1', 's2'].forEach((slot, i) => {
    const cx = flip ? VIEW_W - (ox + 290 + i * 26) : ox + 290 + i * 26, cy = oy + 69;
    const cd = f.cd?.[slot] ?? 0, total = f.cfg?.[slot]?.cooldown || 1, ready = cd <= 0 && !silenced;
    c.fillStyle = INK; c.beginPath(); c.arc(cx, cy, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = EMPTY; c.beginPath(); c.arc(cx, cy, 8, 0, Math.PI * 2); c.fill();
    const k = ready ? 1 : silenced ? 0 : 1 - Math.min(1, cd / total);
    if (k > 0) { c.fillStyle = ready ? GREEN : '#8a7f6a'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, 8, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); c.closePath(); c.fill(); }
    c.fillStyle = silenced ? BRICK : ready ? PAPER : INK; c.font = "700 9px 'Silkscreen'"; c.textAlign = 'center';
    c.fillText(silenced ? '✕' : String(i + 1), cx, cy + 3);
  });
  c.restore();
}

// Bust tile: the idle sprite cropped to head and shoulders, framed in the side colour.
function drawBust(c, f, x, y, side, sprites) {
  const W = 80, H = 80;
  c.fillStyle = INK; c.fillRect(x + 5, y + 5, W, H);
  c.fillStyle = INK; c.fillRect(x, y, W, H);
  c.fillStyle = SIDE[side]; c.fillRect(x + 3, y + 3, W - 6, H - 6);
  c.fillStyle = '#efe7d3'; c.fillRect(x + 7, y + 7, W - 14, H - 14);
  c.save(); c.beginPath(); c.rect(x + 7, y + 7, W - 14, H - 14); c.clip();
  const sheet = sprites?.get?.(f.cfg?.id), flash = (f.hurtFlash ?? 0) > 0 && f.hurtFlash % 2 === 0;
  if (hasAnim(sheet, 'idle')) drawSprite(c, sheet, 'idle', 0, x + W / 2, y + 7 + 64 * 2.2, side ? -1 : 1, 2.2, flash ? { tint: PAPER, tintAlpha: 0.8 } : {});
  else {
    const b = f.cfg?.body ?? {};
    c.fillStyle = b.suit || INK; c.fillRect(x + 16, y + 52, W - 32, 30);
    c.fillStyle = b.skin || '#e8c39a'; c.fillRect(x + 22, y + 16, W - 44, 36);
    c.fillStyle = b.hair?.color || INK; c.fillRect(x + 20, y + 12, W - 40, 10);
  }
  if ((f.stocks ?? 3) <= 0) { c.fillStyle = 'rgba(43,38,32,0.6)'; c.fillRect(x, y, W, H); }
  c.restore();
  c.fillStyle = SIDE[side]; c.fillRect(side ? x + W - 30 : x + 3, y + H - 17, 27, 14);
  c.fillStyle = PAPER; c.font = "700 10px 'Silkscreen'"; c.textAlign = 'center';
  c.fillText(side ? 'P2' : 'P1', side ? x + W - 16 : x + 16, y + H - 6);
}

// A stock: the fighter's head in a little frame; spent ones grey with an ink ✕.
// `lost` counts down just after this one was lost: it pops and settles.
function stockToken(c, f, x, y, on, lost, sprites, side) {
  const pop = lost ? 1 + 0.5 * Math.sin((lost / 40) * Math.PI) : 1, s = 22 * pop, ox = x + 11 - s / 2, oy = y + 11 - s / 2;
  c.fillStyle = INK; c.fillRect(ox, oy, s, s);
  c.fillStyle = on ? SIDE[side] : EMPTY; c.fillRect(ox + 2, oy + 2, s - 4, s - 4);
  c.save(); c.beginPath(); c.rect(ox + 2, oy + 2, s - 4, s - 4); c.clip();
  const sheet = sprites?.get?.(f.cfg?.id), sc = 0.95 * pop;
  if (hasAnim(sheet, 'idle')) drawSprite(c, sheet, 'idle', 0, ox + s / 2, oy + 64 * sc - 1, side ? -1 : 1, sc, on ? {} : { tint: '#b9ae96', tintAlpha: 0.85 });
  else { c.fillStyle = on ? (f.cfg?.body?.skin || PAPER) : '#b9ae96'; c.fillRect(ox + 6, oy + 5, s - 12, s - 9); }
  c.restore();
  if (!on) {
    c.strokeStyle = INK; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(ox + 5, oy + 5); c.lineTo(ox + s - 5, oy + s - 5); c.moveTo(ox + s - 5, oy + 5); c.lineTo(ox + 5, oy + s - 5); c.stroke();
    c.lineCap = 'butt';
  }
}
