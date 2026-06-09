// Random events. Each is data + small behavior hooks; the EventDirector in
// src/engine/events.js schedules and telegraphs them. Rules (BALANCE.md):
// always telegraphed, symmetric or dodgeable, never match-deciding.

import { GROUND_Y } from '../engine/fighter.js';
import { DIFFICULTY } from '../engine/ai.js';

const MASH_TARGET = 10;

export const EVENTS = [
  {
    id: 'underwriting',
    name: 'URGENT UNDERWRITING',
    banner: 'URGENT UNDERWRITING!',
    sub: 'mash LIGHT to submit first!',
    sound: 'klaxon',
    telegraph: 70,
    weight: 3,
    oncePerRound: true,
    maxFrames: 240,
    start({ world, data, difficulty }) {
      data.mash = [0, 0];
      data.window = 170;
      data.resolved = false;
      const d = DIFFICULTY[difficulty] || DIFFICULTY.normal;
      data.cpu = world.fighters.map(f => f.controller.isCPU
        ? { delay: d.mashDelay + ((world.rng() * 20) | 0), cps: d.mashCps } : null);
      for (const f of world.fighters) {
        if (f.state !== 'ko') { data['prev' + f.side] = true; f.state = 'frozen'; f.attack = null; f.blocking = false; }
      }
    },
    update(ctx) {
      const { world, data, t, fx, audio } = ctx;
      if (data.resolved) return true;
      world.fighters.forEach((f, i) => {
        if (f.state !== 'frozen') return;
        const cpu = data.cpu[i];
        if (cpu) {
          if (t > cpu.delay && world.rng() < cpu.cps / 60) data.mash[i]++;
        } else if (f.controller.pressed('light')) {
          data.mash[i]++;
          audio.play('mash');
        }
      });
      const winner = data.mash.findIndex(m => m >= MASH_TARGET);
      if (winner >= 0 || t >= data.window) {
        data.resolved = true;
        let wIdx = winner >= 0 ? winner : (data.mash[0] === data.mash[1] ? -1 : (data.mash[0] > data.mash[1] ? 0 : 1));
        world.fighters.forEach((f, i) => {
          if (f.state === 'frozen') { f.state = 'idle'; f.stateT = 0; }
          if (i === wIdx) {
            f.hp = Math.min(f.maxhp, f.hp + 5);
            f.gainMeter(15);
            fx.text(f.x, f.y - 70, 'SUBMITTED! +5', '#3f5a40');
            audio.play('heal');
          } else if (wIdx >= 0) {
            // non-comboable: brief shove into invulnerable get-up
            f.vx = (f.x < world.fighters[wIdx].x ? -1 : 1) * 2.4;
            f.state = 'getup';
            f.stateT = 0;
            fx.text(f.x, f.y - 70, 'TOO SLOW', '#c4452e');
          }
        });
        if (wIdx < 0) fx.banner('DEAL FELL THROUGH', { dur: 60 });
        return true;
      }
      return false;
    },
    drawUI(ctx, c) {
      const { world, data, t } = ctx;
      if (!data.mash) return;
      c.font = "700 26px 'Pixelify Sans'";
      c.textAlign = 'center';
      c.fillStyle = '#2b2620';
      c.fillText('SUBMIT!', 480, 250 + Math.sin(t * 0.4) * 3);
      world.fighters.forEach((f, i) => {
        const x = i === 0 ? 240 : 600;
        c.fillStyle = '#2b2620'; c.fillRect(x - 2, 268, 124, 16);
        c.fillStyle = '#f2e9d8'; c.fillRect(x, 270, 120, 12);
        c.fillStyle = i === 0 ? '#27425f' : '#c4452e';
        c.fillRect(x, 270, 120 * Math.min(1, data.mash[i] / MASH_TARGET), 12);
      });
    },
  },
  {
    id: 'wave',
    name: 'THE WAVE',
    banner: 'THE WAVE!',
    sub: 'offsite flashback — jump to ride it',
    sound: 'wave',
    telegraph: 80,
    weight: 3,
    maxFrames: 200,
    start({ world, data }) {
      data.dir = world.rng() < 0.5 ? 1 : -1;
      data.x = data.dir > 0 ? -20 : 500;
      data.hit = new Set();
    },
    update({ world, data, audio }) {
      data.x += data.dir * 5;
      for (const f of world.fighters) {
        if (data.hit.has(f) || !f.grounded || f.state === 'ko' || f.invulnerable) continue;
        if (Math.abs(f.x - data.x) < 14) {
          data.hit.add(f);
          f.takeHit({ dmg: 2, kb: 4.5, dir: data.dir, unblockable: true });
          audio.play('wave');
        }
      }
      return data.dir > 0 ? data.x > 500 : data.x < -20;
    },
    drawWorld({ data }, ctx) {
      if (data.x === undefined) return;
      ctx.fillStyle = 'rgba(157,184,217,0.55)';
      for (let i = 0; i < 5; i++) {
        const h = 34 - i * 5;
        ctx.fillRect(data.x - data.dir * i * 7 - 5, GROUND_Y - h, 10, h);
      }
      ctx.fillStyle = '#f2e9d8';
      ctx.fillRect(data.x - 6, GROUND_Y - 38, 12, 4);
    },
    drawUI({ data, t }, c) {
      if (t > 40) return;
      c.font = "700 30px 'Pixelify Sans'";
      c.textAlign = 'center';
      c.fillStyle = '#27425f';
      c.fillText(data.dir > 0 ? '→ → →' : '← ← ←', 480, 240);
    },
  },
  {
    id: 'spin',
    name: 'SPIN CLASS STAMPEDE',
    banner: 'SPIN CLASS STAMPEDE!',
    sub: 'the 7am class got loose — jump the bikes',
    sound: 'bikeBell',
    telegraph: 70,
    weight: 3,
    maxFrames: 320,
    start({ world, data }) {
      data.dir = world.rng() < 0.5 ? 1 : -1;
      data.spawned = 0;
      data.times = [0, 45, 90];
    },
    update({ world, data, t, audio }) {
      while (data.spawned < 3 && t >= data.times[data.spawned]) {
        const dir = data.spawned === 1 ? -data.dir : data.dir;   // middle bike comes the other way
        world.addHazard({
          type: 'bike', x: dir > 0 ? -16 : 496, y: GROUND_Y - 9, w: 16, h: 16,
          vx: dir * (2.1 + world.rng() * 0.7), dmg: 5, kb: 3, launcher: true, groundedOnly: true,
          update(h) { h.x += h.vx; if (h.x < -24 || h.x > 504) h.dead = true; },
        });
        audio.play('bikeBell');
        data.spawned++;
      }
      return data.spawned >= 3 && !world.hazards.some(h => h.type === 'bike');
    },
  },
  {
    id: 'firedrill',
    name: 'FIRE DRILL',
    banner: 'FIRE DRILL!',
    sub: 'get to the assembly point!',
    sound: 'alarm',
    telegraph: 70,
    weight: 2,
    oncePerRound: true,
    maxFrames: 700,
    start({ world, data }) {
      data.side = world.rng() < 0.5 ? 0 : 1;
      data.x = data.side === 0 ? 56 : 424;
      data.w = 74;
      // runtime-computed window: worst-case walk / slowest fighter + 0.75s
      const slowest = Math.min(...world.fighters.map(f => f.effSpeed()));
      data.deadline = Math.ceil((480 - data.w) / slowest) + 45;
      // clear ground hazards inside the marker (no pick-your-poison)
      for (const z of world.zones) if (Math.abs(z.x - data.x) < (z.w + data.w) / 2) z.dead = true;
    },
    update({ world, data, t, fx, audio }) {
      if (t < data.deadline) return false;
      for (const f of world.fighters) {
        const inside = Math.abs(f.x - data.x) < data.w / 2;
        const forgiven = ['hitstun', 'knockdown', 'launched', 'getup', 'grabbed', 'frozen', 'ko'].includes(f.state);
        if (!inside && !forgiven) {
          f.hp -= 6;                       // no stun — never a free grab setup
          f.hurtFlash = 5;
          f.cancelRegen();
          fx.text(f.x, f.y - 70, 'MISSED ROLL CALL -6', '#c4452e');
          f.checkKO();
        } else if (inside) {
          fx.text(f.x, f.y - 70, 'PRESENT ✓', '#3f5a40');
        }
      }
      audio.play('pop');
      return true;
    },
    drawWorld({ data, t }, ctx) {
      if (data.x === undefined) return;
      const pulse = (t % 30) < 15;
      ctx.fillStyle = pulse ? 'rgba(196,69,46,0.25)' : 'rgba(196,69,46,0.15)';
      ctx.fillRect(data.x - data.w / 2, GROUND_Y - 60, data.w, 60);
      ctx.fillStyle = '#c4452e';
      ctx.fillRect(data.x - 2, GROUND_Y - 58, 4, 14);
      ctx.fillRect(data.x - 8, GROUND_Y - 58, 16, 5);
    },
    drawUI({ data, t }, c) {
      if (data.deadline === undefined) return;
      const left = Math.max(0, Math.ceil((data.deadline - t) / 60));
      c.font = "700 22px 'Silkscreen'";
      c.textAlign = 'center';
      c.fillStyle = '#c4452e';
      c.fillText(`ASSEMBLE: ${left}`, 480, 240);
    },
  },
  {
    id: 'berlin',
    name: 'BERLIN TRIP',
    banner: "MIKE'S OFF TO BERLIN!",
    sub: 'home turf incoming',
    sound: 'jet',
    telegraph: 90,
    weight: 4,
    oncePerMatch: true,
    requiresCharacter: 'mike',
    maxFrames: 800,
    start({ world, data, director, fx }) {
      director.stageOverride = 'berlin';
      director.stageFade = 28;
      const mike = world.fighters.find(f => f.cfg.id === 'mike');
      mike?.applyStatus('berlin', 720);
      data.dur = 720;
      fx.banner('WILLKOMMEN!', { dur: 70, sub: 'Mike: +damage, +speed', color: '#27425f' });
    },
    update({ data, t }) { return t >= data.dur; },
    end({ director, world, fx }) {
      director.stageOverride = null;
      director.stageFade = 28;
      const mike = world.fighters.find(f => f.cfg.id === 'mike');
      mike?.clearStatus('berlin');
      fx.banner('AND HE’S BACK', { dur: 60, sub: 'cheap flights, somehow', color: '#2b2620' });
    },
    drawUI({ t }, c) {
      // boarding-pass swoosh during the telegraph
      if (t > 80) return;
      const x = -260 + t * 16;
      c.save();
      c.translate(x, 120);
      c.rotate(-0.06);
      c.fillStyle = '#2b2620'; c.fillRect(4, 4, 240, 80);
      c.fillStyle = '#f2e9d8'; c.fillRect(0, 0, 240, 80);
      c.strokeStyle = '#2b2620'; c.lineWidth = 3; c.strokeRect(0, 0, 240, 80);
      c.fillStyle = '#c4452e'; c.fillRect(0, 0, 240, 18);
      c.fillStyle = '#f2e9d8';
      c.font = "700 13px 'Silkscreen'"; c.textAlign = 'left';
      c.fillText('BOARDING PASS', 8, 14);
      c.fillStyle = '#2b2620';
      c.font = "700 22px 'Pixelify Sans'";
      c.fillText('MAN → BER', 12, 48);
      c.font = "600 13px 'Barlow Condensed'";
      c.fillText('HOLFORD / M    SEAT 1A    GATE: ALWAYS', 12, 68);
      c.restore();
    },
  },
];
