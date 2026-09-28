// GINGER SHOT — someone left a ginger shot out. It drops onto one of three spots
// (the centre high ground, or a mirrored spot either side of centre on the
// floor) and sits there for eight seconds; first to touch it downs it and gets
// composure back (+20, never past full; a full gauge takes +5 meter instead).
// The one event that heals — BALANCE.md numbers doctrine, "events" — so it is
// small, single, contested, and announced.

import { INK, GREEN, BRASS, midX, centrePerch, art } from './_shared.js';

export const GINGER_HEAL = 20;
const FALL = 3.4, LIFE = 480;

export const GINGER = {
  id: 'ginger',
  name: 'GINGER SHOT',
  banner: 'GINGER SHOT!',
  sub: 'first to drink it gets composure back',
  sound: 'pop',
  telegraph: 60,
  weight: 3,
  maxFrames: LIFE + 80,
  start({ world, slab, stage, data }) {
    const mid = midX(slab), perch = centrePerch(stage, slab);
    const spots = [{ x: perch === slab ? mid : perch.x + perch.w / 2, s: perch }, { x: mid - slab.w * 0.24, s: slab }, { x: mid + slab.w * 0.24, s: slab }];
    const p = spots[Math.floor(world.rng() * spots.length) % spots.length];
    data.x = p.x; data.s = p.s; data.y = p.s.y - 320; data.landed = false; data.taken = -1;
  },
  update({ world, data, fx, audio, t }) {
    if (!data.landed) { data.y = Math.min(data.s.y, data.y + FALL); data.landed = data.y >= data.s.y; return false; }
    for (let i = 0; i < world.fighters.length; i++) {
      const f = world.fighters[i];
      if (f.chair || f.state === 'ko' || f.hasStatus('holiday')) continue;
      if (Math.abs(f.x - data.x) > 30 || f.y < data.s.y - 70 || f.y > data.s.y + 6) continue;
      data.taken = i;
      const room = f.maxGauge - f.gauge;
      if (room > 0) { f.gauge = Math.min(f.maxGauge, f.gauge + GINGER_HEAL); fx.text(f.x, f.y - 130, `GINGER SHOT! +${Math.min(room, GINGER_HEAL) | 0}`, GREEN); }
      else { f.gainMeter(5); fx.text(f.x, f.y - 130, 'GINGER SHOT! +5 METER', BRASS); }
      audio.play('gulp');
      return true;
    }
    if (t > LIFE) { fx.text(data.x, data.s.y - 90, 'SOMEONE BINNED IT', INK); return true; }
    return false;
  },
  drawWorld(ctx, c) {
    const { data, t } = ctx;
    if (data.taken >= 0 || data.y === undefined) return;
    const img = art(ctx, 'ev-ginger'), x = Math.round(data.x), bob = data.landed ? Math.round(Math.sin(t * 0.12) * 2) : 0;
    if (!data.landed) { c.fillStyle = 'rgba(43,38,32,0.25)'; c.fillRect(x - 14, data.s.y - 3, 28, 3); }   // where it lands
    const y = Math.round(data.y) - bob, blink = data.landed && t > LIFE - 90 && ((t >> 3) & 1);
    if (blink) return;
    if (data.landed) { c.globalAlpha = 0.25 + 0.2 * ((t >> 4) & 1); c.fillStyle = GREEN; c.fillRect(x - 22, data.s.y - 4, 44, 4); c.globalAlpha = 1; }
    if (img) { c.imageSmoothingEnabled = false; c.drawImage(img, x - 20, y - 61, 40, 61); return; }
    c.fillStyle = INK; c.fillRect(x - 10, y - 44, 20, 44); c.fillStyle = '#e8a93a'; c.fillRect(x - 8, y - 36, 16, 34);
    c.fillStyle = '#6b4a2a'; c.fillRect(x - 6, y - 44, 12, 8);
  },
};
