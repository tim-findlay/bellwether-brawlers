// THE WAVE — a gimmick for the room, never a kill. A wall of water rolls across
// the whole stage; the platforms turn into surfboards and float on it. Anyone
// still on the floor when the crest passes WIPES OUT (popped straight up, no
// damage) and wades about SOGGY while the water's up; anyone on a board surfs
// it for meter. Then it drains. Straight-up pops only: never toward a blast zone.
//
// Phases (live frames): swell 0-50 · crest 50-150 · high water -330 · drain -390.
// Drawing lives in wave-art.js.

import { NAVY, GREEN, standingOn, art } from './_shared.js';
import { crestBox, drawSea, drawCrest, drawBoards, drawBubbles } from './wave-art.js';

const SWELL = 50, CREST = 150, HIGH = 330, DRAIN = 390;
const FOAM = '#f3ead0';

// water surface: just under the lowest platform (so the boards float on it), at least 60 deep
function level(stage, slab) {
  const low = stage.platforms.filter(p => p.y < slab.y).reduce((m, p) => Math.max(m, p.y), -Infinity);
  return Math.min(slab.y - 60, Number.isFinite(low) ? low + 8 : slab.y - 90);
}
const onBoard = (f, stage) => stage.platforms.some(p => standingOn(f, p));

export const WAVE = {
  id: 'wave',
  name: 'THE WAVE',
  banner: "SURF'S UP!",
  sub: 'a wave is coming — get on a board',
  sound: 'surf',
  telegraph: 90,
  weight: 2,
  maxFrames: DRAIN + 10,
  start({ world, slab, stage, data, audio }) {
    data.dir = world.rng() < 0.5 ? 1 : -1;                     // which way it rolls
    data.level = level(stage, slab);
    data.x0 = data.dir > 0 ? slab.x - 520 : slab.x + slab.w + 520;
    data.x1 = data.dir > 0 ? slab.x + slab.w + 520 : slab.x - 520;
    data.hit = new Set(); data.surfed = new Set(); data.meter = [0, 0];
    audio.play('surf');
  },
  update({ world, stage, data, fx, audio, t }) {
    const crest = crestX(data, t), lvl = surface(data, t);
    world.fighters.forEach((f, i) => {
      if (f.chair || f.state === 'ko' || f.hasStatus('holiday')) return;
      const boarded = onBoard(f, stage);
      const passed = t >= SWELL && (data.dir > 0 ? f.x <= crest : f.x >= crest);
      // the crest reaches you below the surface: wipeout (once), popped straight up
      if (passed && t < CREST + 10 && !boarded && f.y > data.level - 4 && !data.hit.has(f)) {
        data.hit.add(f);
        if (f.state === 'normal' && !f.attack) { f.body.vy = -11; f.body.grounded = false; f.body.onPlatform = false; }
        f.applyStatus('soggy', 150); f.applyStatus('slow', 150);
        fx.text(f.x, f.y - 130, 'WIPEOUT!', NAVY);
        fx.dust(f.x, f.y, '#cfe3e8', 14);
        audio.play('splash');
      }
      // high water: waders are slowed, surfers bank meter
      if (t >= SWELL && t < HIGH && passed) {
        if (boarded) {
          if (!data.surfed.has(f)) { data.surfed.add(f); fx.text(f.x, f.y - 130, 'HANG TEN!', GREEN); }
          if (t % 30 === 0) { f.gainMeter(2); data.meter[i] += 2; }
        } else if (f.grounded && f.y > lvl + 2) {
          if (!f.hasStatus('slow') || f.statuses.get('slow').dur < 10) f.applyStatus('slow', 30);
          if (!f.hasStatus('soggy') || f.statuses.get('soggy').dur < 10) f.applyStatus('soggy', 30);
          if (t % 20 === 0) fx.dust(f.x + (world.rng() - 0.5) * 30, lvl, '#cfe3e8', 2);
        }
      }
    });
    return t >= DRAIN;
  },
  end({ world, fx, data }) {
    const best = data.meter[0] === data.meter[1] ? -1 : (data.meter[0] > data.meter[1] ? 0 : 1);
    if (best >= 0 && data.meter[best] >= 6) fx.banner('BEST IN SHOW', { dur: 60, sub: `${world.fighters[best].cfg.name} rode it out`, color: GREEN });
  },
  drawWorld(ctx, c) {                                            // behind the fighters: the body of the sea, then the boards on it
    const { stage, data, t } = ctx;
    if (!data.dir) return;
    const lvl = surface(data, t), wet = t >= SWELL;
    if (wet) sea(ctx, c, lvl, false);
    drawBoards(c, { stage, t, lvl, wet: wet && t < HIGH, img: art(ctx, 'ev-surf'), still: t < SWELL || t > DRAIN - 50 });
  },
  drawFront(ctx, c) {                                            // over the fighters: the water they wade in, bubbles, the crest
    const { data, t, world } = ctx;
    if (!data.dir || t < SWELL) return;
    const lvl = surface(data, t);
    sea(ctx, c, lvl, true);
    drawBubbles(c, world, lvl, t);
    if (t > CREST + 40) return;
    const box = crestBox(ctx, drawX(data, t), data.level);
    if (box) { drawCrest(c, box, t); return; }
    const x = crestX(data, t), B = ctx.stage.cameraBounds, H = Math.min(620, data.level - B.y + 200), bottom = data.level + 200;
    c.fillStyle = NAVY; c.fillRect(Math.min(x, x - data.dir * 260), bottom - H, 260, H);    // drawn stand-in: a blue wall
    c.fillStyle = FOAM; c.fillRect(Math.min(x, x - data.dir * 260), bottom - H, 260, 24);
  },
  drawUI({ data, t }, c) {
    if (data.dir && t > SWELL) return;
    c.font = "700 26px 'Pixelify Sans'"; c.textAlign = 'center'; c.fillStyle = NAVY;
    c.fillText('GET ON A BOARD!', 480, 150);
  },
};

function crestX(data, t) { const k = Math.max(0, Math.min(1, (t - SWELL) / (CREST - SWELL))); return data.x0 + (data.x1 - data.x0) * k; }
// drawn position: keeps rolling past the rules' end point so it leaves the screen instead of parking
function drawX(data, t) { return t <= CREST ? crestX(data, t) : data.x1 + (data.x1 - data.x0) / (CREST - SWELL) * (t - CREST); }
function surface(data, t) {                                      // rises with the crest, holds, then drains below the floor
  if (t <= HIGH) return data.level;
  return data.level + (t - HIGH) / (DRAIN - HIGH) * 260;
}

// The sea: from the crest back toward where the wave came from (all of it once the crest has gone).
function sea(ctx, c, lvl, front) {
  const { data, t, stage } = ctx, B = stage.cameraBounds;
  const crest = t > CREST + 40 ? (data.dir > 0 ? B.x + B.w + 2000 : B.x - 2000) : drawX(data, t);
  const box = t <= CREST + 40 ? crestBox(ctx, crest, data.level) : null;
  const x0 = data.dir > 0 ? B.x - 200 : crest, x1 = data.dir > 0 ? crest : B.x + B.w + 200;
  drawSea(c, { x0, x1, y1: B.y + B.h + 400, lvl, t, box, front });
}
