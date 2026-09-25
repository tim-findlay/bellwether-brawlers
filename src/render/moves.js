// Move presentation (render only). Which sprite anim + frame a move plays, the
// swing smear that shows where the hitbox is, wind-up tells, afterimages and
// launch trails. Everything is read from move data (kind, slot, aim, lift /
// dive / low / bothSides / travel, and an optional per-move `anim` or `fx`
// override); nothing here writes gameplay state. Pixel squares, ink + paper,
// the fighter's own trim colour — no glow (CLAUDE.md "not neon").

import { INK, PAPER, BRICK, BRASS } from './palette.js';

// kinds that read as a "cast" (the special strip) vs a committed body swing (the heavy strip)
const SPECIAL_KINDS = new Set(['projectile', 'lob', 'groundProjectile', 'fan', 'columns', 'zone', 'buff', 'borrow',
  'parry', 'catch', 'bell', 'shockwave', 'zoneSuper', 'hazardSuper', 'grab', 'teleport']);
const HEAVY_KINDS = new Set(['lunge', 'dashCombo', 'flurry', 'shout']);
const PX = 6;                                    // smear pixel size, world px (reads at the fight camera's zoom)

// Which strip a move wants: per-move `anim` wins, then kind/slot. The caller
// falls back to 'attack' when the sheet lacks the strip.
export function animFor(f) {
  const a = f.attack, m = a?.move;
  if (!m) return 'attack';
  if (m.anim) return m.anim;
  if (m.lift) return 'jump';
  if (a.aerial) return 'attack';
  if (SPECIAL_KINDS.has(m.kind)) return 'special';
  if (HEAVY_KINDS.has(m.kind) || a.slot === 'heavy' || a.slot === 'super') return 'heavy';
  return 'attack';
}

// Phase-synced frame: wind-up frames over the startup, the strip's key frame
// (full extension / release) over the active frames, follow-through over the
// recovery — so the picture peaks exactly when the hitbox is live.
export function attackFrame(f, anim) {
  const a = f.attack, m = a?.move || {};
  const n = Math.max(1, anim?.frames ?? 1), k = Math.min(n - 1, anim?.key ?? Math.floor(n / 2));
  const su = m.startup || 0, ac = Math.max(1, m.active || 0), re = Math.max(1, m.recover || 0), fr = a?.frame ?? 0;
  if (fr < su) return Math.min(k - 1, Math.floor((fr / Math.max(1, su)) * k));
  if (fr <= su + ac) return k;
  return Math.min(n - 1, k + 1 + Math.floor(((fr - su - ac) / re) * (n - k - 1)));
}

// Extra rotation for aerial aims (drawSprite rotates before the facing flip,
// so "look up" is counter-clockwise when facing right).
export function aerialRot(f) {
  const a = f.attack, m = a?.move, face = f.body?.facing ?? 1;
  if (!a?.aerial || !m) return 0;
  const su = m.startup || 0, ac = Math.max(1, m.active || 0), p = clamp01((a.frame - su) / ac);
  if (m.lift) return -0.25 * face;
  if (m.dive) return 0.35 * face;
  if (a.aim === 'u') return -0.5 * face;
  if (a.aim === 'd') return 0.55 * face;
  if (a.aim === 'n') return a.frame >= su ? face * Math.PI * 2 * p : 0;   // nair: one full spin through the active frames
  return 0.12 * face;
}

// ---- the swing smear -------------------------------------------------------------

function shapeOf(f) {
  const a = f.attack, m = a.move;
  if (m.lift) return 'rise';
  if (m.dive) return 'dive';
  if (m.kind === 'shout') return 'cone';
  if (m.low) return 'low';
  if (a.aerial && a.aim === 'u') return 'up';
  if (a.aerial && a.aim === 'd') return 'down';
  if (m.bothSides || (a.aerial && a.aim === 'n')) return 'ring';
  return 'forward';
}

const MELEE = new Set([undefined, 'melee', 'lunge', 'flurry', 'shout', 'dashCombo', 'aerial']);

export function drawMoveFX(c, f, t) {
  const a = f.attack, m = a?.move, b = f.body;
  if (!m || !b) return;
  const su = m.startup || 0, ac = Math.max(1, m.active || 0), fr = a.frame;
  const face = b.facing ?? 1, h = b.h || 96;
  const big = a.slot === 'heavy' || a.slot === 'super' || (m.dmg || 0) >= 10;
  const trim = f.cfg?.body?.trim || BRASS;

  // wind-up tell: heavies, supers and anything slow enough to read
  if (fr < su && (big || su >= 14)) windup(c, b.x, b.y - h, face, fr / Math.max(1, su), a.slot === 'super', !!m.unparryable, t);
  if (!MELEE.has(m.kind)) return;
  if (fr < su || fr > su + ac + 5) return;
  const p = clamp01((fr - su) / ac), fade = fr > su + ac ? 1 - (fr - su - ac) / 6 : 1;
  const reach = m.range || 60, thick = big ? 4 : 3;
  const cx = b.x, cy = b.y - h * 0.55;
  c.save();
  c.globalAlpha = fade;
  switch (shapeOf(f)) {
    case 'forward': arc(c, cx + face * 8, cy, reach * 0.8, face, -75, 45, p, thick, trim); break;
    case 'low': arc(c, cx + face * 6, b.y - 16, reach * 0.9, face, -30, 20, p, thick, trim, 0.45); break;
    case 'up': arc(c, cx, cy - 10, reach * 0.7, face, 10, -190, p, thick, trim); break;
    case 'down': arc(c, cx, b.y - 20, reach * 0.65, face, 20, 160, p, thick, trim); break;
    case 'ring': arc(c, cx, cy, reach * 0.75, face, -90, 270, p, thick, trim); break;
    case 'rise': streak(c, cx, b.y, h, trim, t, -1); arc(c, cx + face * 6, cy - 16, reach * 0.6, face, 30, -120, p, thick, trim); break;
    case 'dive': streak(c, cx, b.y - h, h, trim, t, 1); break;
    case 'cone': cone(c, cx + face * 20, cy, reach, face, p, trim); break;
  }
  c.restore();
}

// A crescent of pixel squares swept from a0 to a1 (degrees, 0 = facing, +
// down) as `p` goes 0 -> 1: paper core, trim edge, ink rim. `squash` flattens
// the arc vertically (low sweeps).
function arc(c, x, y, r, face, a0, a1, p, thick, trim, squash = 1) {
  const sweep = (a1 - a0) * Math.max(0.15, p), steps = Math.max(6, Math.ceil(Math.abs(sweep) / 6));
  const tail = Math.max(0, steps - 14);                     // only the leading ~80° stays drawn
  for (let i = tail; i <= steps; i++) {
    const ang = (a0 + sweep * (i / steps)) * Math.PI / 180;
    const k = (i - tail) / Math.max(1, steps - tail);       // 0 at the tail -> 1 at the leading edge
    const w = Math.max(1, Math.round(thick * (0.4 + k)));
    const dx = Math.cos(ang) * face, dy = Math.sin(ang) * squash;
    for (let j = -1; j <= w; j++) {
      const rr = r - j * PX;
      const px = Math.round((x + dx * rr) / PX) * PX, py = Math.round((y + dy * rr) / PX) * PX;
      c.fillStyle = j === -1 || j === w ? INK : j === 0 ? trim : PAPER;
      c.fillRect(px - PX / 2, py - PX / 2, PX, PX);
    }
  }
}

// vertical speed streak: dir -1 trails below a riser, +1 trails above a diver
function streak(c, x, y0, h, trim, t, dir) {
  for (let i = 0; i < 5; i++) {
    const ox = (i - 2) * 9, len = 26 + ((i * 7 + t) % 3) * 8;
    c.fillStyle = i % 2 ? trim : PAPER;
    c.fillRect(Math.round(x + ox) - 1, Math.round(dir < 0 ? y0 : y0 - len), 3, len);
  }
}

// shout: three stacked sound-wave arcs pushing out from the mouth
function cone(c, x, y, reach, face, p, trim) {
  for (let i = 0; i < 3; i++) {
    const r = 18 + (reach * 0.9) * ((p + i / 3) % 1);
    arc(c, x, y, r, face, -35, 35, 1, 1, i === 1 ? trim : PAPER);
  }
}

// wind-up: ink tension ticks by the head; supers get a contracting brass ring;
// unparryables flash a brick "!"
function windup(c, x, y, face, k, isSuper, unparryable, t) {
  const blink = (t >> 2) & 1;
  c.fillStyle = INK;
  for (const [ox, oy, w, hh] of [[-26, -6, 3, 10], [-20, -16, 3, 8], [22, -6, 3, 10], [16, -16, 3, 8]]) c.fillRect(Math.round(x + ox * face), Math.round(y + oy), w, hh);
  if (isSuper) {
    const r = 90 - 60 * k;
    c.fillStyle = BRASS;
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2 + t * 0.05;
      c.fillRect(Math.round(x + Math.cos(ang) * r) - 2, Math.round(y + 48 + Math.sin(ang) * r) - 2, 4, 4);
    }
  }
  if (unparryable && blink) {
    c.fillStyle = BRICK; c.fillRect(Math.round(x) - 3, Math.round(y) - 34, 6, 14); c.fillRect(Math.round(x) - 3, Math.round(y) - 16, 6, 5);
  }
}

// ---- afterimages & launch trails ---------------------------------------------------

// Render-side memory: a few past poses per fighter while it moves fast (lunges,
// dash, air dodge, dash-combos) and a puff where a teleport left from.
const trails = new WeakMap();
export function recordTrail(f, pose) {
  let tr = trails.get(f);
  if (!tr) { tr = { ghosts: [], last: null }; trails.set(f, tr); }
  const b = f.body, m = f.attack?.move;
  const fast = (m?.travel && f.attack.frame <= (m.startup || 0) + (m.active || 0)) || b.state === 'dash' || b.state === 'airdodge' || m?.kind === 'dashCombo';
  const jumped = tr.last && Math.hypot(b.x - tr.last.x, b.y - tr.last.y) > 70 && f.state === 'normal';   // teleport
  if (fast || jumped) tr.ghosts.push({ ...(jumped ? tr.last : pose), life: jumped ? 16 : 8, puff: jumped });
  for (const g of tr.ghosts) g.life--;
  tr.ghosts = tr.ghosts.filter(g => g.life > 0).slice(-4);
  tr.last = pose;
  return tr.ghosts;
}

// Launched: paper puffs and ink streaks trailing opposite the velocity; the
// harder the launch, the longer the trail (kill-class launches read at a glance).
export function drawLaunchTrail(c, f, t) {
  const b = f.body, vx = b.vx || 0, vy = b.vy || 0, sp = Math.hypot(vx, vy);
  if (sp < 6) return;
  const ux = -vx / sp, uy = -vy / sp, n = Math.min(7, Math.floor(sp / 3)), cy = b.y - (b.h || 96) * 0.5;
  for (let i = 1; i <= n; i++) {
    const d = i * 12, s = Math.max(4, 14 - i * 2);
    c.globalAlpha = 0.6 * (1 - i / (n + 1));
    c.fillStyle = sp >= 17 && i % 2 ? INK : PAPER;
    c.fillRect(Math.round(b.x + ux * d - s / 2), Math.round(cy + uy * d - s / 2 + ((i + t) % 2) * 2), s, s);
  }
  c.globalAlpha = 1;
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
