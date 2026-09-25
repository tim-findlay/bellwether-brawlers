// v3 fight HUD (screen space, 960x540): composure bars in the paper-plate
// style, three desk-chair stock pips, meter + SUPER READY, s1/s2 cooldown
// pips (✕ when silenced), "NAME · TITLE" plates, status word-callouts with
// duration bars above each fighter (projected through the camera), and
// off-screen edge arrows. No timer, no round pips — v3 has neither.

import { INK, PAPER, BRICK, NAVY, BRASS, GREEN } from './palette.js';
import { drawSprite, hasAnim } from './sprites.js';

const VIEW_W = 960, VIEW_H = 540;
const PLATE_W = 360;
const PORTRAIT = 66;               // bust tile at the outer end of each plate
const SIDE_COLOR = [NAVY, BRICK];

// extra: { t } (frame counter for the meter shimmer), everything optional.
export function drawHUD(c, world, camera, extra = {}) {
  const fighters = world?.fighters ?? [];
  const t = extra.t ?? world?.frame ?? 0;
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  fighters.forEach((f, i) => {
    if (!f) return;
    const x = i === 0 ? 30 : VIEW_W - 30 - PLATE_W, W = PLATE_W - PORTRAIT - 6;
    drawPortrait(c, f, i === 0 ? x - 4 : x + PLATE_W - PORTRAIT + 4, i, extra.sprites);
    drawPlate(c, f, i === 0 ? x + PORTRAIT + 6 : x, i === 1, t, W);
  });
  if (camera?.worldToScreen) {
    fighters.forEach((f) => f && drawStatusTags(c, f, camera));
    fighters.forEach((f, i) => f && drawEdgeArrow(c, f, i, camera));
  }
  c.restore();
}

function drawPlate(c, f, x, flip, t, W = PLATE_W) {
  c.fillStyle = INK; c.fillRect(x - 4, 18, W + 8, 74);
  c.fillStyle = PAPER; c.fillRect(x - 1, 21, W + 2, 68);

  // composure gauge: green -> amber -> brick as it drains
  const maxG = f.maxGauge ?? f.cfg?.stats?.hp ?? 100;
  const pct = Math.max(0, Math.min(1, (f.gauge ?? maxG) / (maxG || 1)));
  c.fillStyle = '#d8cfba'; c.fillRect(x, 24, W, 20);
  const fw = Math.round(W * pct);
  c.fillStyle = pct > 0.5 ? GREEN : pct > 0.25 ? BRASS : BRICK;
  c.fillRect(flip ? x + W - fw : x, 24, fw, 20);
  c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(x, 24, W, 20);

  // meter row: [meter][s1 s2 pips][3 chairs] (mirrored on the right plate)
  const mw = Math.round(W * 0.52);
  const mx = flip ? x + W - mw : x;
  const meter = Math.max(0, Math.min(100, f.meter ?? 0));
  c.fillStyle = '#d8cfba'; c.fillRect(mx, 50, mw, 9);
  const mf = Math.round(mw * (meter / 100));
  c.fillStyle = meter >= 100 ? (t % 30 < 15 ? BRASS : '#e3c45a') : NAVY;
  c.fillRect(flip ? mx + mw - mf : mx, 50, mf, 9);
  c.strokeRect(mx, 50, mw, 9);

  const silenced = !!f.statuses?.has?.('silence');
  ['s1', 's2'].forEach((slot, i) => {
    const px = flip ? x + W - mw - 32 - i * 26 : x + mw + 12 + i * 26;
    const cd = f.cd?.[slot] ?? 0, total = f.cfg?.[slot]?.cooldown || 1;
    const ready = cd <= 0 && !silenced;
    c.fillStyle = ready ? GREEN : '#cfc4a8';
    c.fillRect(px, 50, 20, 9);
    if (!ready && !silenced) { c.fillStyle = '#8a7f6a'; c.fillRect(px, 50, Math.round(20 * (1 - Math.min(1, cd / total))), 9); }
    c.strokeStyle = INK; c.lineWidth = 1; c.strokeRect(px + 0.5, 50.5, 20, 9);
    if (silenced) {
      c.fillStyle = BRICK; c.font = "700 10px 'Silkscreen'"; c.textAlign = 'center';
      c.fillText('✕', px + 10, 59);
    }
  });

  // stocks: three desk chairs, spent ones fade to paper
  const stocks = f.stocks ?? 3;
  for (let s = 0; s < 3; s++) {
    const cx = flip ? x + 12 + s * 24 : x + W - 12 - 16 - s * 24;
    chairPip(c, cx, 48, s < stocks);
  }

  // name plate — first names only
  c.fillStyle = INK;
  c.font = "700 16px 'Pixelify Sans'";
  c.textAlign = flip ? 'right' : 'left';
  const name = f.cfg?.name ?? `P${f.side != null ? f.side + 1 : '?'}`;
  c.fillText(f.cfg?.title && meter < 100 ? `${name} · ${f.cfg.title}` : name, flip ? x + W - 4 : x + 4, 82);
  if (meter >= 100) {
    c.fillStyle = BRASS;
    c.font = "700 11px 'Silkscreen'";
    c.textAlign = flip ? 'left' : 'right';
    c.fillText('SUPER READY', flip ? x + 4 : x + W - 4, 82);
  }
}

// Bust tile: the fighter's idle sprite cropped to head + shoulders, framed in
// their side colour; hurt flash tints it, a lost last stock greys it.
function drawPortrait(c, f, x, side, sprites) {
  const S = PORTRAIT, y = 18;
  c.fillStyle = INK; c.fillRect(x, y, S, 74);
  c.fillStyle = side ? BRICK : NAVY; c.fillRect(x + 3, y + 3, S - 6, 68);
  c.fillStyle = '#efe7d3'; c.fillRect(x + 6, y + 6, S - 12, 62);
  c.save();
  c.beginPath(); c.rect(x + 6, y + 6, S - 12, 62); c.clip();
  const sheet = sprites?.get?.(f.cfg?.id);
  const flash = (f.hurtFlash ?? 0) > 0 && (f.hurtFlash % 2 === 0);
  if (hasAnim(sheet, 'idle')) {
    drawSprite(c, sheet, 'idle', 0, x + S / 2, y + 6 + 64 * 2.1, side ? -1 : 1, 2.1, flash ? { tint: PAPER, tintAlpha: 0.8 } : {});
  } else {
    const b = f.cfg?.body ?? {};
    c.fillStyle = b.suit || INK; c.fillRect(x + 14, y + 48, S - 28, 30);
    c.fillStyle = b.skin || '#e8c39a'; c.fillRect(x + 20, y + 14, S - 40, 34);
    c.fillStyle = b.hair?.color || INK; c.fillRect(x + 18, y + 10, S - 36, 10);
  }
  if ((f.stocks ?? 3) <= 0) { c.fillStyle = 'rgba(43,38,32,0.55)'; c.fillRect(x, y, S, 74); }
  c.restore();
  c.fillStyle = side ? BRICK : NAVY; c.fillRect(x + 3, y + 57, S - 6, 14);
  c.fillStyle = PAPER; c.font = "700 10px 'Silkscreen'"; c.textAlign = 'center';
  c.fillText(side ? 'P2' : 'P1', x + S / 2, y + 68);
}

// A 16x14 office chair: back, seat, stem, base.
function chairPip(c, x, y, on) {
  c.fillStyle = on ? INK : '#d8cfba';
  c.fillRect(x, y, 4, 9);                 // back
  c.fillRect(x, y + 7, 14, 3);            // seat
  c.fillRect(x + 6, y + 10, 2, 3);        // stem
  c.fillRect(x + 2, y + 13, 10, 2);       // base
  if (!on) { c.strokeStyle = INK; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 7.5, 14, 3); }
}

// Word callouts + duration bars above the fighter's head — statuses are never
// icon-only (design review: words on screen for casual players).
export const STATUS_LABEL = {
  reversed: ['REVERSED!', BRICK],
  silence: ['SPECIALS LOCKED', BRICK],
  slow: ['SLOWED', NAVY],
  haste: ['FAST', GREEN],
  burn: ['BURNING', BRICK],
  lien: ['LIEN', BRASS],
  dmgUp: ['+DMG', BRASS],
  nextHit: ['NEXT HIT +', BRASS],
  regen: ['LAST ORDERS', GREEN],
  berlin: ['HOME TURF', NAVY],
  noMeter: ['PLATINUM', BRASS],
};

function drawStatusTags(c, f, camera) {
  const statuses = f.statuses;
  if (!statuses?.forEach) return;
  const fx = f.x ?? f.body?.x ?? 0, fy = f.y ?? f.body?.y ?? 0, h = f.body?.h ?? 96;
  const top = camera.worldToScreen(fx, fy - h - 30);
  let row = 0;
  statuses.forEach((s, name) => {
    const def = STATUS_LABEL[name];
    if (!def) return;
    const x = Math.round(top.x), y = Math.round(top.y) - row * 18;
    c.font = "700 10px 'Silkscreen'";
    c.textAlign = 'center';
    c.fillStyle = INK; c.fillText(def[0], x + 1, y + 1);
    c.fillStyle = def[1]; c.fillText(def[0], x, y);
    const frac = s?.max ? Math.max(0, Math.min(1, (s.dur ?? 0) / s.max)) : 1;
    c.fillStyle = INK; c.fillRect(x - 16, y + 3, 32, 3);
    c.fillStyle = def[1]; c.fillRect(x - 15, y + 4, Math.round(30 * frac), 1);
    row++;
  });
}

// Off-screen fighters get an edge arrow until they recover or KO.
function drawEdgeArrow(c, f, i, camera) {
  if (f.state === 'ko' || f.anim?.name === 'ko') return;
  const fx = f.x ?? f.body?.x ?? 0, fy = f.y ?? f.body?.y ?? 0, h = f.body?.h ?? 96;
  const s = camera.worldToScreen(fx, fy - h / 2);
  if (s.x >= 0 && s.x <= VIEW_W && s.y >= 0 && s.y <= VIEW_H) return;
  const ax = Math.min(VIEW_W - 34, Math.max(34, s.x)), ay = Math.min(VIEW_H - 34, Math.max(110, s.y));
  const ang = Math.atan2(s.y - ay, s.x - ax);
  c.save();
  c.translate(ax, ay);
  c.fillStyle = PAPER; c.strokeStyle = INK; c.lineWidth = 3;
  c.beginPath(); c.arc(0, 0, 16, 0, Math.PI * 2); c.fill(); c.stroke();
  c.fillStyle = SIDE_COLOR[i] ?? INK;
  c.beginPath(); c.arc(0, 0, 11, 0, Math.PI * 2); c.fill();
  c.fillStyle = PAPER; c.font = "700 10px 'Silkscreen'"; c.textAlign = 'center';
  c.fillText(`P${i + 1}`, 0, 4);
  c.rotate(ang);
  c.fillStyle = INK;
  c.beginPath(); c.moveTo(20, -8); c.lineTo(30, 0); c.lineTo(20, 8); c.closePath(); c.fill();
  c.restore();
}
