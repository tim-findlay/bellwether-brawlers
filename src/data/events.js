// Stage hazards (the office events, reworked for v3). Each is data + small
// behaviour hooks; src/engine/events.js schedules and telegraphs them.
// Coordinates are world px on world.stage (slab = main slab, y = its top).
// Rules (BALANCE.md philosophy 5): telegraphed >= 1 s, kb <= 6, never toward
// a blast zone, symmetric or dodgeable, hazard rewards are meter-only.
// Hooks: canRoll(ctx) gates the roll · ready(ctx) gates telegraph -> live ·
// start/update/end/abort · drawWorld (camera space) · drawUI (960x540).

import { DIFFICULTY } from '../engine/ai.js';
import { HAZARD_STAGGER } from '../engine/fighter.js';
import { geometryOf } from './stages.js';

const MASH_TARGET = 10;
const PAPER = '#f2e9d8', INK = '#2b2620', BRICK = '#c4452e', NAVY = '#27425f', BRASS = '#c9a227';

const onSlab = (f, slab) => f.state === 'normal' && f.grounded && Math.abs(f.y - slab.y) < 3 && f.x >= slab.x && f.x <= slab.x + slab.w;
const bothGrounded = ({ world }) => world.fighters.every(f => f.state === 'normal' && f.grounded && !f.chair);
const bothOnSlab = ({ world, slab }) => world.fighters.every(f => onSlab(f, slab));

export const EVENTS = [
  {
    id: 'underwriting',
    name: 'URGENT UNDERWRITING',
    banner: 'URGENT UNDERWRITING!',
    sub: 'mash LIGHT to submit first!',
    sound: 'klaxon',
    telegraph: 70,
    weight: 3,
    maxFrames: 240,
    canRoll: bothGrounded,
    ready: bothGrounded,                                   // triggers only when both are grounded
    abort({ fx }) { fx.banner('DEAL FELL THROUGH', { dur: 60, sub: 'nobody was at their desk' }); },
    start({ world, data, difficulty }) {
      data.mash = [0, 0];
      data.window = 170;
      data.resolved = false;
      const d = DIFFICULTY[difficulty] || DIFFICULTY.normal;
      data.cpu = world.fighters.map(f => f.controller.isCPU
        ? { delay: d.mashDelay + ((world.rng() * 20) | 0), cps: d.mashCps } : null);
      for (const f of world.fighters) {                  // freeze both: untouchable, unmoving
        f.state = 'frozen'; f.stateT = 0; f.attack = null; f.landLag = 0;
        f.body.vx = 0; f.body.vy = 0; f.body.fastFalling = false;
        f.hazardInv = data.window + 4;
      }
    },
    update(ctx) {
      const { world, data, t, fx, audio } = ctx;
      if (data.resolved) return true;
      world.fighters.forEach((f, i) => {
        if (f.state !== 'frozen') return;
        const cpu = data.cpu[i];
        if (cpu) { if (t > cpu.delay && world.rng() < cpu.cps / 60) data.mash[i]++; }
        else if (f.controller.pressed('light')) { data.mash[i]++; audio.play('mash'); }
      });
      const first = data.mash.findIndex(m => m >= MASH_TARGET);
      if (first < 0 && t < data.window) return false;
      data.resolved = true;
      const wIdx = first >= 0 ? first : (data.mash[0] === data.mash[1] ? -1 : (data.mash[0] > data.mash[1] ? 0 : 1));
      world.fighters.forEach((f, i) => {
        if (f.state === 'frozen') { f.state = 'normal'; f.stateT = 0; }
        f.hazardInv = 0;
        if (i === wIdx) {
          f.gainMeter(20);                                  // meter only — hazards never heal
          fx.text(f.x, f.y - 130, 'SUBMITTED! +20 METER', '#3f5a40');
          audio.play('heal');
        } else if (wIdx >= 0) {
          f.stagger(HAZARD_STAGGER);                        // hazard stagger: brief, never comboable
          fx.text(f.x, f.y - 130, 'TOO SLOW', BRICK);
        }
      });
      if (wIdx < 0) fx.banner('DEAL FELL THROUGH', { dur: 60 });
      return true;
    },
    drawUI(ctx, c) {
      const { world, data, t } = ctx;
      if (!data.mash) return;
      c.font = "700 30px 'Pixelify Sans'"; c.textAlign = 'center';
      c.fillStyle = INK;
      c.fillText('SUBMIT!', 480, 250 + Math.sin(t * 0.4) * 3);
      world.fighters.forEach((f, i) => {
        const x = i === 0 ? 240 : 600;
        c.fillStyle = INK; c.fillRect(x - 2, 268, 124, 16);
        c.fillStyle = PAPER; c.fillRect(x, 270, 120, 12);
        c.fillStyle = i === 0 ? NAVY : BRICK;
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
    maxFrames: 240,
    // Two fronts roll in from both lips and meet at centre: every shove points
    // at centre stage (symmetric, never toward a blast zone). Jumpers ride it.
    start({ slab, data }) {
      data.mid = slab.x + slab.w / 2;
      data.speed = 6;
      data.fronts = [{ x: slab.x - 30, dir: 1 }, { x: slab.x + slab.w + 30, dir: -1 }];
      data.hit = new Set();
    },
    update({ world, slab, data, audio }) {
      for (const fr of data.fronts) fr.x += fr.dir * data.speed;
      for (const f of world.fighters) {
        if (data.hit.has(f) || !onSlab(f, slab) || f.invulnerable) continue;
        for (const fr of data.fronts) {
          if (Math.abs(f.x - fr.x) >= 18) continue;
          data.hit.add(f);
          const toCentre = f.x < data.mid ? 1 : -1;
          f.takeHit({ dmg: 2, kb: 5, kbScale: 0, kbAngle: 60, dir: toCentre });
          audio.play('wave');
          break;
        }
      }
      return data.fronts[0].x >= data.mid && data.fronts[1].x <= data.mid;
    },
    drawWorld({ slab, data }, ctx) {
      if (!data.fronts) return;
      for (const fr of data.fronts) {
        ctx.fillStyle = 'rgba(157,184,217,0.55)';
        for (let i = 0; i < 5; i++) {
          const h = 68 - i * 10;
          ctx.fillRect(fr.x - fr.dir * i * 14 - 10, slab.y - h, 20, h);
        }
        ctx.fillStyle = PAPER;
        ctx.fillRect(fr.x - 12, slab.y - 76, 24, 8);
      }
    },
    drawUI({ t }, c) {
      if (t > 40) return;
      c.font = "700 30px 'Pixelify Sans'"; c.textAlign = 'center'; c.fillStyle = NAVY;
      c.fillText('→ →  ●  ← ←', 480, 240);
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
    maxFrames: 420,
    start({ world, data }) {
      data.dir = world.rng() < 0.5 ? 1 : -1;
      data.spawned = 0;
      data.times = [0, 45, 90];
    },
    update({ world, slab, data, t, audio }) {
      const mid = slab.x + slab.w / 2;
      while (data.spawned < 3 && t >= data.times[data.spawned]) {
        const dir = data.spawned === 1 ? -data.dir : data.dir;   // middle bike comes the other way
        world.addHazard({
          type: 'bike', x: dir > 0 ? slab.x - 40 : slab.x + slab.w + 40, y: slab.y - 16, w: 32, h: 32,
          vx: dir * (4.5 + world.rng() * 1.5), dmg: 5, kb: 4, kbScale: 0, kbAngle: 65, groundedOnly: true, dir,
          update(h, w) {
            h.x += h.vx;
            if (h.x < slab.x - 80 || h.x > slab.x + slab.w + 80) h.dead = true;
            // the shove always points at centre stage, whoever it is about to hit
            const near = w.fighters.find(f => Math.abs(f.x - h.x) < 60);
            if (near) h.dir = near.x < mid ? 1 : -1;
          },
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
    maxFrames: 900,
    start({ world, slab, data }) {
      data.side = world.rng() < 0.5 ? 0 : 1;
      data.w = 130;
      data.x = slab.x + slab.w * (data.side === 0 ? 0.3 : 0.7);   // well inside: never near a blast zone
      // runtime window: the slowest fighter crossing the slab from the far lip, plus a platform descent and a breath
      const slowest = Math.min(...world.fighters.map(f => f.effRunMax()));
      data.deadline = Math.ceil((slab.w * 0.7) / slowest) + 60 + 45;
      for (const z of world.zones) if (Math.abs(z.x - data.x) < (z.w + data.w) / 2) z.dead = true;   // no pick-your-poison
    },
    update({ world, slab, data, t, fx, audio }) {
      if (t < data.deadline) return false;
      for (const f of world.fighters) {
        const inside = Math.abs(f.x - data.x) < data.w / 2 && f.y <= slab.y + 4 && f.y > slab.y - 150;
        const forgiven = ['hitstun', 'stagger', 'grabbed', 'frozen', 'ko', 'chair'].includes(f.state) || f.chair;
        if (!inside && !forgiven) {
          f.gauge = Math.max(0, f.gauge - 6);                       // no stun — never a free setup
          f.hurtFlash = 5;
          f.cancelRegen();
          fx.text(f.x, f.y - 130, 'MISSED ROLL CALL -6', BRICK);
        } else if (inside) fx.text(f.x, f.y - 130, 'PRESENT ✓', '#3f5a40');
      }
      audio.play('pop');
      return true;
    },
    drawWorld({ slab, data, t }, ctx) {
      if (data.x === undefined) return;
      const pulse = (t % 30) < 15;
      ctx.fillStyle = pulse ? 'rgba(196,69,46,0.25)' : 'rgba(196,69,46,0.15)';
      ctx.fillRect(data.x - data.w / 2, slab.y - 120, data.w, 120);
      ctx.fillStyle = BRICK;
      ctx.fillRect(data.x - 3, slab.y - 118, 6, 30);
      ctx.fillRect(data.x - 16, slab.y - 118, 32, 10);
    },
    drawUI({ data, t }, c) {
      if (data.deadline === undefined) return;
      const left = Math.max(0, Math.ceil((data.deadline - t) / 60));
      c.font = "700 22px 'Silkscreen'"; c.textAlign = 'center'; c.fillStyle = BRICK;
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
    canRoll: bothOnSlab,
    ready: bothOnSlab,                                     // only while both stand on the main slab
    abort({ fx }) { fx.banner('FLIGHT CANCELLED', { dur: 60, sub: 'nobody made the gate' }); },
    start({ world, data, director, fx }) {
      data.from = world.stage;
      data.dur = 720;
      world.setStage(geometryOf('berlin'));                // crossfade: equivalent footing on the gate slab
      director.stageOverride = 'berlin';
      director.stageFade = 28;
      const mike = world.fighters.find(f => f.cfg.id === 'mike');
      mike?.applyStatus('berlin', data.dur);
      fx.banner('WILLKOMMEN!', { dur: 70, sub: 'Mike: +damage, +speed', color: NAVY });
    },
    update({ data, t }) { return t >= data.dur; },
    end({ director, world, data, fx }) {
      if (data.from) world.setStage(data.from);            // and back the same way
      director.stageOverride = null;
      director.stageFade = 28;
      const mike = world.fighters.find(f => f.cfg.id === 'mike');
      mike?.clearStatus('berlin');
      fx.banner('AND HE’S BACK', { dur: 60, sub: 'cheap flights, somehow', color: INK });
    },
    drawUI({ t }, c) {
      if (t > 80) return;                                  // boarding-pass swoosh during the telegraph
      const x = -260 + t * 16;
      c.save();
      c.translate(x, 120); c.rotate(-0.06);
      c.fillStyle = INK; c.fillRect(4, 4, 240, 80);
      c.fillStyle = PAPER; c.fillRect(0, 0, 240, 80);
      c.strokeStyle = INK; c.lineWidth = 3; c.strokeRect(0, 0, 240, 80);
      c.fillStyle = BRICK; c.fillRect(0, 0, 240, 18);
      c.fillStyle = PAPER; c.font = "700 13px 'Silkscreen'"; c.textAlign = 'left';
      c.fillText('BOARDING PASS', 8, 14);
      c.fillStyle = INK; c.font = "700 22px 'Pixelify Sans'";
      c.fillText('MAN → BER', 12, 48);
      c.font = "600 13px 'Barlow Condensed'"; c.fillStyle = BRASS;
      c.fillText('MIKE · SEAT 1A · GATE: ALWAYS', 12, 68);
      c.restore();
    },
  },
];
