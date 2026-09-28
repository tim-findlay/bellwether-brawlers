// FIRE DRILL — the fire warden (hi-vis, megaphone) sets up at the muster point
// on one of the side platforms and foams the floor: extinguisher foam spreads
// over the middle of the main slab from the centre out, and anyone standing on
// it is FOAMED — the floor goes slick (PHYS.SLICK_FRICTION: let go of the stick
// and you keep sliding). Stand at the muster point for a second to be ticked
// off the roll call: first ACCOUNTED FOR +14 meter, second +5. The foam stops
// short of the lips, so it never slides anybody toward a blast zone.

import { PAPER, INK, NAVY, BRASS, GREEN, midX, standingOn, art } from './_shared.js';

const PATCH = 64, PATCH_EVERY = 16, LIP = 110, ROLL = 60, LIFE = 620;
const LINES = ['WALK, DON’T RUN!', 'NO LIFTS!', 'LEAVE YOUR COFFEE!', 'ROLL CALL!'];

export const FIREDRILL = {
  id: 'firedrill',
  name: 'FIRE DRILL',
  banner: 'FIRE DRILL!',
  sub: 'get to the muster point — mind the foam',
  sound: 'alarm',
  stages: ['office', 'pub', 'palace', 'tube'],
  telegraph: 90,
  weight: 2,
  maxFrames: LIFE + 20,
  start({ world, slab, stage, data }) {
    const mid = midX(slab);
    const sides = stage.platforms.filter(p => p.y < slab.y && Math.abs(p.x + p.w / 2 - mid) > 60).sort((a, b) => a.x - b.x);
    const left = world.rng() < 0.5;
    if (sides.length >= 2) { data.s = left ? sides[0] : sides[sides.length - 1]; data.x = data.s.x + data.s.w / 2; }
    else { data.s = slab; data.x = left ? slab.x + LIP + 40 : slab.x + slab.w - LIP - 40; }
    // foam patches, centre out, symmetric, never within LIP of the edges
    data.patches = [{ x: mid - PATCH / 2, on: -1 }];
    for (let k = 1; mid - PATCH / 2 - k * PATCH >= slab.x + LIP; k++)
      data.patches.push({ x: mid - PATCH / 2 - k * PATCH, on: -1 }, { x: mid + PATCH / 2 + (k - 1) * PATCH, on: -1 });
    data.rolls = [0, 0]; data.counted = []; data.line = 0;
  },
  update({ world, slab, data, fx, audio, t }) {
    data.patches.forEach((p, i) => { if (p.on < 0 && t >= 20 + Math.ceil(i / 2) * PATCH_EVERY) { p.on = t; if (i % 2 === 0) audio.play('foam'); } });
    if (t % 150 === 40) { fx.text(data.x, data.s.y - 170, LINES[data.line++ % LINES.length], BRASS); audio.play('mash'); }
    world.fighters.forEach((f, i) => {
      if (f.chair || f.state === 'ko' || f.hasStatus('holiday')) return;
      const foamed = f.grounded && Math.abs(f.y - slab.y) < 4 && data.patches.some(p => p.on >= 0 && f.x >= p.x && f.x <= p.x + PATCH);
      if (foamed) {
        if (!f.hasStatus('slick')) fx.text(f.x, f.y - 120, 'FOAMED!', NAVY);
        f.applyStatus('slick', 8);
        if (Math.abs(f.body.vx) > 2 && t % 5 === 0) fx.dust(f.x, f.y, '#f4f1ea', 2);
      }
      if (data.counted.includes(i)) return;
      const there = standingOn(f, data.s) && Math.abs(f.x - data.x) < 80;
      data.rolls[i] = there ? data.rolls[i] + 1 : Math.max(0, data.rolls[i] - 2);
      if (data.rolls[i] >= ROLL) {
        data.counted.push(i);
        const first = data.counted.length === 1, n = first ? 14 : 5;
        f.gainMeter(n);
        fx.text(f.x, f.y - 140, first ? `ACCOUNTED FOR! +${n}` : `LATE… +${n}`, first ? GREEN : NAVY);
        audio.play(first ? 'heal' : 'pop');
      }
    });
    return data.counted.length === 2 || t >= LIFE;
  },
  end({ world, fx }) {
    fx.banner('ALL CLEAR', { dur: 50, sub: 'back to your desks', color: GREEN });
    for (const f of world.fighters) if (f.hasStatus('slick')) f.clearStatus('slick');
  },
  drawWorld(ctx, c) {
    const { slab, data, t } = ctx;
    if (!data.patches) return;
    for (const p of data.patches) {                                     // foam: white suds with a bubbly top
      if (p.on < 0) continue;
      const k = Math.min(1, (t - p.on) / 14), h = Math.round(10 * k);
      c.fillStyle = '#e6e2d8'; c.fillRect(Math.round(p.x), slab.y - h, PATCH, h + 2);
      c.fillStyle = '#fbf9f3';
      for (let b = 0; b < 5; b++) { const bx = p.x + 6 + b * 12, by = slab.y - h - 3 + ((b * 7 + (t >> 3)) % 3); c.fillRect(Math.round(bx), Math.round(by), 8, 6); }
    }
    // the muster point sign and the warden beside it
    const sign = art(ctx, 'ev-muster'), warden = art(ctx, 'ev-warden'), y = data.s.y, x = Math.round(data.x);
    c.imageSmoothingEnabled = false;
    if (sign) c.drawImage(sign, x - 32, y - 111, 64, 111);
    else {
      c.fillStyle = INK; c.fillRect(x - 3, y - 70, 6, 70); c.fillRect(x - 30, y - 112, 60, 46);
      c.fillStyle = GREEN; c.fillRect(x - 28, y - 110, 56, 42);
      c.fillStyle = PAPER; c.font = "700 9px 'Silkscreen'"; c.textAlign = 'center'; c.fillText('MUSTER', x, y - 92); c.fillText('POINT', x, y - 80);
    }
    const wx = x + (data.x < midX(slab) ? 46 : -46), bob = (t >> 4) & 1;
    if (warden) {
      c.save(); c.translate(wx, y - 108 - bob); if (data.x > midX(slab)) c.scale(-1, 1);
      c.drawImage(warden, -32, 0, 63, 108); c.restore();
    } else {
      c.fillStyle = INK; c.fillRect(wx - 14, y - 90, 28, 90); c.fillStyle = '#f08a24'; c.fillRect(wx - 12, y - 70, 24, 36);
      c.fillStyle = '#e9c6a0'; c.fillRect(wx - 10, y - 90, 20, 18);
    }
    // roll-call ring on the spot
    c.globalAlpha = 0.35 + 0.15 * ((t >> 3) & 1); c.fillStyle = GREEN; c.fillRect(x - 80, y - 3, 160, 4); c.globalAlpha = 1;
  },
  drawUI({ world, data }, c) {
    if (!data.rolls) return;
    world.fighters.forEach((f, i) => {
      const x = i ? 600 : 240, done = data.counted.includes(i), k = done ? 1 : data.rolls[i] / ROLL;
      c.fillStyle = INK; c.fillRect(x - 2, 108, 124, 16);
      c.fillStyle = PAPER; c.fillRect(x, 110, 120, 12);
      c.fillStyle = done ? GREEN : (i ? '#c4452e' : NAVY); c.fillRect(x, 110, 120 * k, 12);
    });
    c.font = "700 16px 'Silkscreen'"; c.textAlign = 'center'; c.fillStyle = INK;
    c.fillText('ROLL CALL', 480, 122);
  },
};
