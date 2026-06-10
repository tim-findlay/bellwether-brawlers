// CPU controller. Implements the same interface as PlayerController so the
// Fighter never knows who's driving. Archetype hints come from character data.

import { STAGE_LEFT, STAGE_RIGHT } from './fighter.js';

export const DIFFICULTY = {
  easy:   { decide: 30, mistake: 0.28, mashDelay: 55, mashCps: 4.5, superChance: 0.4 },
  normal: { decide: 16, mistake: 0.12, mashDelay: 40, mashCps: 6.5, superChance: 0.75 },
  hard:   { decide: 9,  mistake: 0.04, mashDelay: 28, mashCps: 9,   superChance: 0.95 },
  // sim-only: tries to run away and chip — exists to prove stalling loses (BALANCE.md gate 2)
  stall:  { decide: 14, mistake: 0.08, mashDelay: 40, mashCps: 6.5, superChance: 0.5, runaway: true },
};

export class AIController {
  constructor(profileName, rng) {
    this.profile = DIFFICULTY[profileName] || DIFFICULTY.normal;
    this.rng = rng || Math.random;
    this.reversed = false;       // interface compat; the AI plans in world space anyway
    this.isCPU = true;
    this.helds = new Set();
    this.queue = new Set();
    this.plan = 'wait';
    this.cool = 0;
  }

  held(a) { return this.helds.has(a); }
  buffered(a) { return this.queue.has(a); }
  consume(a) { this.queue.delete(a); }
  pressed(a) { return false; }   // event mashing for CPUs is simulated by the event itself

  // How far a melee move can actually connect from (mirrors Fighter.hitbox geometry).
  reach(m) { return (m.bothSides ? m.range * 0.85 : m.range * 1.05) + 8; }
  // Lunges/dashes cover travel too; grabs connect at exactly their range; range-free
  // kinds (projectiles, lobs, buffs, teleports, zones) manage their own spacing.
  inRange(m, dist) {
    if (!m) return false;
    if (!m.range) return true;
    if (m.kind === 'grab') return dist <= m.range;
    const travel = (m.kind === 'lunge' || m.kind === 'dashCombo' || m.kind === 'flurry') ? (m.travel || 0) : 0;
    return dist <= this.reach(m) + travel;
  }
  // Pick a button that can connect: heavy when it reaches (biased), else light, else keep moving.
  poke(f, dist, heavyBias = 0.55) {
    if (this.inRange(f.cfg.heavy, dist) && this.rng() < heavyBias) return 'heavy';
    if (this.inRange(f.cfg.light, dist)) return 'light';
    if (this.inRange(f.cfg.heavy, dist)) return 'heavy';
    return 'approach';
  }

  update(f, world) {
    const opp = world.other(f);
    this.queue.clear();
    if (f.state === 'ko' || f.state === 'frozen' || f.state === 'grabbed') { this.helds.clear(); return; }

    this.cool--;
    if (this.cool <= 0) {
      this.cool = this.profile.decide + ((this.rng() * 8) | 0);
      this.plan = this.think(f, opp, world);
      if (this.rng() < this.profile.mistake) this.plan = this.mistake();
    }
    this.act(f, opp, world);
  }

  think(f, opp, world) {
    const ai = f.cfg.ai || {};
    const dist = Math.abs(opp.x - f.x);
    const r = this.rng();

    // universal reactions first
    const threat = world.projectiles.find(p => p.owner !== f && Math.sign(f.x - p.x) === Math.sign(p.vx) && Math.abs(p.x - f.x) < 110);
    if (threat) {
      if (f.cfg.s2?.kind === 'catch' && f.cd.s2 <= 0 && r < 0.5) return 's2';
      if (threat.groundHug || threat.y > 200) return r < 0.7 ? 'jump' : 'block';
      return r < 0.55 ? 'block' : 'approach';
    }
    if (opp.attack) {
      const om = opp.attack.move;
      const oFrame = opp.attack.frame;
      // punish recovery: opponent committed and past active frames, and we can reach
      if (oFrame > (om.startup || 0) + (om.active || 0) && r < 0.6) {
        if (this.inRange(f.cfg.heavy, dist)) return 'heavy';
        if (this.inRange(f.cfg.light, dist)) return 'light';
      }
      if (dist < 80 && r < 0.45) {
        if (om.unblockable) return 'jump';                 // grabs & shouts whiff vs airborne — the designed counter
        return ai.style === 'counter' && f.cd.s1 <= 0 ? 's1' : 'block';
      }
    }
    if (opp.state === 'knockdown' && dist > 60) return 'approach';

    if (this.profile.runaway) {
      // stall-bot: keep max range, chip with whatever reaches
      if (dist < 160) return 'retreat';
      if (f.cd.s1 <= 0 && f.cfg.s1.kind !== 'parry' && f.cfg.s1.kind !== 'grab') return 's1';
      return 'retreat';
    }

    // The wheel: a faster fighter with ranged tools kites a slower armored/grab
    // bruiser instead of brawling him — but never into a corner.
    const RANGED = ['projectile', 'lob', 'groundProjectile', 'fan'];
    const hasRanged = RANGED.includes(f.cfg.s1?.kind) || RANGED.includes(f.cfg.s2?.kind);
    const oppBruiser = opp.cfg.heavy?.armor || opp.cfg.s1?.kind === 'grab';
    if (hasRanged && oppBruiser && f.cfg.stats.speed > opp.cfg.stats.speed + 0.25 && ai.style !== 'zoner') {
      const room = opp.x > f.x ? f.x - STAGE_LEFT : STAGE_RIGHT - f.x;
      if (dist < 90 && room > 60 && r < 0.5) return 'retreat';
      if (dist >= 90) {
        const ranged = RANGED.includes(f.cfg.s1?.kind) && f.cd.s1 <= 0 ? 's1'
          : RANGED.includes(f.cfg.s2?.kind) && f.cd.s2 <= 0 ? 's2' : null;
        if (ranged && r < 0.55) return ranged;
      }
    }

    if (f.meter >= 100 && this.rng() < this.profile.superChance) {
      const sd = f.cfg.super.aiRange || [40, 200];
      if (dist >= sd[0] && dist <= sd[1]) return 'super';
    }

    const pref = ai.pref ?? 90;
    if (ai.style === 'zoner') {
      const room = opp.x > f.x ? f.x - STAGE_LEFT : STAGE_RIGHT - f.x;   // space to give
      if (dist < 70) {
        if (room > 50 && r < 0.4) return 'retreat';
        if (f.cd.s2 <= 0 && r < 0.6) return 's2';
        return this.poke(f, dist, 0.6);                // cornered: stand and fight
      }
      if (dist > 120 && f.cd.s1 <= 0 && r < 0.6) return 's1';
      if (dist > 120 && f.cd.s2 <= 0 && r < 0.5) return 's2';
      if (dist > pref) return 'approach';
      return room > 50 ? 'retreat' : 'wait';           // never back yourself into the wall
    }
    if (ai.style === 'grappler') {
      if (f.cd.s1 <= 0 && opp.grabbable && this.inRange(f.cfg.s1, dist) && r < 0.6) return 's1';
      if (dist < 110 && f.cd.s2 <= 0 && world.projectiles.length && r < 0.5) return 's2';
      if (dist < 70) return this.poke(f, dist, 0.6);
      return 'approach';
    }
    if (ai.style === 'rush') {
      if (dist > 130 && f.cd.s1 <= 0 && this.inRange(f.cfg.s1, dist) && r < 0.45) return 's1';
      if (dist < 70) {
        if (f.cd.s2 <= 0 && r > 0.85) return 's2';
        return this.poke(f, dist, 0.5);
      }
      return 'approach';
    }
    if (ai.style === 'counter') {
      if (dist < 60 && f.cd.s1 <= 0 && r < 0.35) return 's1';     // fish for the parry
      if (dist < 70) return this.poke(f, dist, 0.5);
      if (dist > 130 && f.cd.s2 <= 0 && r < 0.4) return 's2';
      return r < 0.6 ? 'approach' : 'wait';
    }
    if (ai.style === 'trap') {
      if (dist > 110 && f.cd.s1 <= 0 && r < 0.55) return 's1';
      if (dist < 70) return this.poke(f, dist, 0.55);
      // never blind-cast a stance (catch/parry waits for the threat reaction above)
      if (f.cd.s2 <= 0 && !['catch', 'parry'].includes(f.cfg.s2?.kind) && r < 0.3) return 's2';
      return 'approach';
    }
    // all-rounder
    if (dist > 140 && f.cd.s1 <= 0 && this.inRange(f.cfg.s1, dist) && r < 0.5) return 's1';
    if (dist < 70) {
      if (f.cd.s2 <= 0 && r < 0.25) return 's2';
      return this.poke(f, dist, 0.55);
    }
    return 'approach';
  }

  mistake() {
    const opts = ['wait', 'jump', 'approach', 'light', 'retreat'];
    return opts[(this.rng() * opts.length) | 0];
  }

  act(f, opp, world) {
    this.helds.clear();
    const dir = opp.x > f.x ? 'right' : 'left';
    const away = dir === 'right' ? 'left' : 'right';
    switch (this.plan) {
      case 'approach': {
        const dist = Math.abs(opp.x - f.x);
        if (dist > (f.cfg.ai?.stopAt ?? 44)) this.helds.add(dir);
        else this.plan = this.poke(f, dist);     // arrive swinging something that reaches
        break;
      }
      case 'retreat': this.helds.add(away); break;
      case 'block': this.helds.add('down'); break;
      case 'jump': this.queue.add('up'); this.plan = 'wait'; break;
      case 'poke':
      case 'light': this.queue.add('light'); this.plan = 'wait'; break;
      case 'heavy': this.queue.add('heavy'); this.plan = 'wait'; break;
      case 's1': this.queue.add('s1'); this.plan = 'wait'; break;
      case 's2': this.queue.add('s2'); this.plan = 'wait'; break;
      case 'super': this.queue.add('super'); this.plan = 'wait'; break;
      case 'wait': default: break;
    }
  }
}
