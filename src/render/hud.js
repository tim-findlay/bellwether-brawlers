// v3 fight HUD (screen space, 960x540): the two fighter cards (render/hudcard.js:
// bust, name, stock heads, composure bar with damage ghost, super meter,
// special cooldown pies), status word-callouts with
// duration bars above each fighter (projected through the camera), and
// off-screen edge arrows. No timer, no round pips — v3 has neither.

import { INK, PAPER, BRICK, NAVY, BRASS, GREEN } from './palette.js';
import { drawSprite, hasAnim } from './sprites.js';
import { drawCard } from './hudcard.js';

const VIEW_W = 960, VIEW_H = 540;
const SIDE_COLOR = [NAVY, BRICK];

// extra: { t } (frame counter for the meter shimmer), everything optional.
export function drawHUD(c, world, camera, extra = {}) {
  const fighters = world?.fighters ?? [];
  const t = extra.t ?? world?.frame ?? 0;
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  fighters.forEach((f, i) => f && drawCard(c, f, i, t, extra.sprites, world?.frame ?? t));   // render/hudcard.js
  if (camera?.worldToScreen) {
    fighters.forEach((f) => f && drawStatusTags(c, f, camera));
    fighters.forEach((f, i) => f && drawEdgeArrow(c, f, i, camera));
  }
  fighters.forEach((f, i) => f && drawCutIn(c, f, i, extra.sprites));
  c.restore();
}

// Super cut-in: a slanted band in the player's colour slides in from their
// side for the first 36 frames of a super, the fighter posed big in the key
// frame of their special (or heavy) strip, the super's name in ink on paper.
const CUT_T = 36;
function drawCutIn(c, f, side, sprites) {
  const a = f.attack;
  if (a?.slot !== 'super' || a.frame > CUT_T) return;
  const k = a.frame < 6 ? a.frame / 6 : a.frame > CUT_T - 6 ? (CUT_T - a.frame) / 6 : 1;
  const dir = side ? -1 : 1, off = (1 - k) * VIEW_W * 0.7 * -dir, y0 = 196, H = 104;
  c.save();
  c.translate(off, 0);
  const band = (inset, col) => {
    c.fillStyle = col; c.beginPath();
    c.moveTo(0, y0 + inset + 18); c.lineTo(VIEW_W, y0 + inset - 18); c.lineTo(VIEW_W, y0 + H - inset - 18); c.lineTo(0, y0 + H - inset + 18); c.closePath(); c.fill();
  };
  band(-6, INK); band(0, SIDE_COLOR[side]); band(14, PAPER);
  const sheet = sprites?.get?.(f.cfg?.id), pose = hasAnim(sheet, 'special') ? 'special' : hasAnim(sheet, 'heavy') ? 'heavy' : 'idle';
  const px = side ? VIEW_W - 170 : 170;
  if (hasAnim(sheet, pose)) {
    c.save(); c.beginPath(); c.rect(0, y0 - 40, VIEW_W, H + 80); c.clip();
    drawSprite(c, sheet, pose, sheet.anims[pose].key ?? 0, px, y0 + H + 34, dir, 3.1);
    c.restore();
  }
  c.fillStyle = INK; c.font = "700 40px 'Pixelify Sans'"; c.textAlign = side ? 'right' : 'left';
  const tx = side ? VIEW_W - 290 : 290, ty = y0 + H / 2 + 12;
  c.fillText(String(a.move.name || 'SUPER').toUpperCase(), tx + 3, ty + 3);
  c.fillStyle = SIDE_COLOR[side]; c.fillText(String(a.move.name || 'SUPER').toUpperCase(), tx, ty);
  c.font = "700 12px 'Silkscreen'"; c.fillStyle = INK;
  c.fillText(`${f.cfg?.name ?? ''} · SUPER`, tx, ty - 38);
  c.restore();
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
  holiday: ['ON HOLLIBOBS', BRASS],
  slick: ['FOAMED', NAVY],
  soggy: ['SOGGY', NAVY],
  berlin: ['HOME TURF', NAVY],
  noMeter: ['NO METER', BRASS],
  borrowed: ['ON LOAN', NAVY],
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
