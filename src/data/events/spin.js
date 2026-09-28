// SPIN CLASS — the instructor's playlist takes over. A kick every 24 frames
// (150 BPM), counted in on the HUD: 1 · 2 · 3 · DROP. On every DROP the floor
// bounces — anyone standing on the main slab is popped straight up (no damage,
// no stun) — and anyone already in the air rides it: ON THE BEAT, +4 meter.
// Most beats caught after six bars is CLASS MVP (+10). Spin bikes line the ends
// of the slab. Straight-up pops only, so nobody is ever sent toward a blast zone.

import { PAPER, INK, BRICK, NAVY, BRASS, GREEN, art, pips } from './_shared.js';

const BEAT = 24, BARS = 6, LEAD = 30;                            // LEAD: a bar's breath before the first kick
const onFloor = (f, slab) => f.grounded && Math.abs(f.y - slab.y) < 4 && f.x >= slab.x && f.x <= slab.x + slab.w;

export const SPIN = {
  id: 'spin',
  name: 'SPIN CLASS',
  banner: 'SPIN CLASS!',
  sub: 'be in the air on the DROP — the floor bounces',
  sound: 'bikeBell',
  telegraph: 90,
  weight: 2,
  maxFrames: LEAD + BARS * 4 * BEAT + 30,
  start({ data }) { data.caught = [0, 0]; data.beat = -1; data.flash = 0; data.lead = LEAD; data.bar = BEAT * 4; data.dropAt = BEAT * 3; },   // timing is public (the CPU jumps the drop)
  update({ world, slab, data, fx, audio, t }) {
    if (data.flash > 0) data.flash--;
    const k = t - LEAD;
    if (k >= 0 && k % BEAT === 0 && k < BARS * 4 * BEAT) {
      data.beat = k / BEAT;
      const drop = data.beat % 4 === 3;
      audio.play(drop ? 'drop' : 'kick');
      if (drop) {
        data.flash = 10;
        world.fighters.forEach((f, i) => {
          if (f.chair || f.state === 'ko' || f.hasStatus('holiday')) return;
          if (onFloor(f, slab)) {
            if (f.state === 'normal' && !f.attack) { f.body.vy = -13; f.body.grounded = false; f.body.onPlatform = false; }
            fx.text(f.x, f.y - 130, 'BOUNCED!', BRICK);
            fx.dust(f.x, f.y, '#cbbfa6', 6);
          } else if (!f.grounded && f.state === 'normal') {
            data.caught[i]++;
            f.gainMeter(4);
            fx.text(f.x, f.y - 130, 'ON THE BEAT!', GREEN);
          }
        });
      }
    }
    return k >= BARS * 4 * BEAT + 10;
  },
  end({ world, data, fx, audio }) {
    const [a, b] = data.caught, w = a === b ? -1 : (a > b ? 0 : 1);
    if (w < 0) { fx.banner('CLASS DISMISSED', { dur: 50, sub: 'nobody out-pedalled anybody' }); return; }
    world.fighters[w].gainMeter(10);
    fx.banner('CLASS MVP!', { dur: 70, sub: `${world.fighters[w].cfg.name} +10 meter`, color: GREEN });
    audio.play('heal');
  },
  drawWorld(ctx, c) {
    const { slab, data, t } = ctx;
    const img = art(ctx, 'ev-bike'), k = t - LEAD, phase = k >= 0 ? (k % BEAT) / BEAT : 0;
    const pump = Math.round(Math.max(0, 1 - phase * 3) * 4);   // the bikes rock on every kick
    // two bikes at each end of the slab, facing in
    const spots = [slab.x + 40, slab.x + 130, slab.x + slab.w - 130, slab.x + slab.w - 40];
    spots.forEach((x, i) => {
      const face = i < 2 ? 1 : -1, w = 84, h = img ? Math.round(img.height * w / img.width) : 70, y = slab.y - h - pump;
      c.save(); c.globalAlpha = 0.9; c.translate(Math.round(x), y); if (face < 0) c.scale(-1, 1);
      if (img) { c.imageSmoothingEnabled = false; c.drawImage(img, -w / 2, 0, w, h); }
      else {
        c.fillStyle = INK; c.fillRect(-30, h - 8, 60, 6); c.fillRect(-4, 10, 6, h - 14); c.fillRect(-20, 6, 40, 6);
        c.fillStyle = BRICK; c.beginPath(); c.arc(16, h - 24, 16, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    });
    if (data.flash > 0) {                                        // the floor lights up on the drop
      c.globalAlpha = data.flash / 14; c.fillStyle = BRASS; c.fillRect(slab.x, slab.y - 6, slab.w, 8); c.globalAlpha = 1;
      c.fillStyle = BRASS; for (let x = slab.x + 20; x < slab.x + slab.w; x += 60) c.fillRect(x, slab.y - 18 - data.flash * 2, 4, 10);
    } else if (k >= 0 && phase < 0.2) {                          // a small pulse on the other beats
      c.globalAlpha = 0.3; c.fillStyle = BRASS; c.fillRect(slab.x, slab.y - 3, slab.w, 3); c.globalAlpha = 1;
    }
  },
  drawUI({ world, data, t }, c) {
    if (data.beat === undefined) return;
    const k = t - LEAD, beat = k < 0 ? -1 : Math.floor(k / BEAT) % 4, bar = k < 0 ? 0 : Math.floor(k / (BEAT * 4)) + 1;
    const labels = ['1', '2', '3', 'DROP'];
    c.textAlign = 'center';
    labels.forEach((s, i) => {
      const x = 390 + i * 50, on = i === beat, drop = i === 3;
      c.fillStyle = INK; c.fillRect(x - 22, 104, 44, 26);
      c.fillStyle = on ? (drop ? BRICK : BRASS) : PAPER; c.fillRect(x - 20, 106, 40, 22);
      c.fillStyle = on ? PAPER : INK; c.font = `700 ${drop ? 11 : 14}px 'Silkscreen'`; c.fillText(s, x, 122);
    });
    c.fillStyle = NAVY; c.font = "700 11px 'Silkscreen'"; c.fillText(`BAR ${Math.min(bar, BARS)}/${BARS}`, 480, 146);
    world.fighters.forEach((f, i) => pips(c, i ? 830 : 76, 112, Math.min(6, data.caught[i]), 6, i ? BRICK : NAVY));
  },
};
