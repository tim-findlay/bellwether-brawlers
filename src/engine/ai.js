// CPU controller. Implements the same interface as PlayerController so the
// Fighter never knows who's driving. Archetype hints come from character data.

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
    if (opp.attack && dist < 80 && r < 0.45) return ai.style === 'counter' && f.cd.s1 <= 0 ? 's1' : 'block';
    if (opp.state === 'knockdown' && dist > 60) return 'approach';

    if (this.profile.runaway) {
      // stall-bot: keep max range, chip with whatever reaches
      if (dist < 160) return 'retreat';
      if (f.cd.s1 <= 0 && f.cfg.s1.kind !== 'parry' && f.cfg.s1.kind !== 'grab') return 's1';
      return 'retreat';
    }

    if (f.meter >= 100 && this.rng() < this.profile.superChance) {
      const sd = f.cfg.super.aiRange || [40, 200];
      if (dist >= sd[0] && dist <= sd[1]) return 'super';
    }

    const pref = ai.pref ?? 90;
    if (ai.style === 'zoner') {
      if (dist < 70) return r < 0.5 ? 'retreat' : (f.cd.s2 <= 0 ? 's2' : 'poke');
      if (dist > 120 && f.cd.s1 <= 0 && r < 0.6) return 's1';
      if (dist > 120 && f.cd.s2 <= 0 && r < 0.5) return 's2';
      return dist > pref ? 'approach' : 'retreat';
    }
    if (ai.style === 'grappler') {
      if (dist < 50 && f.cd.s1 <= 0 && opp.grabbable && r < 0.6) return 's1';
      if (dist < 110 && f.cd.s2 <= 0 && world.projectiles.length && r < 0.5) return 's2';
      if (dist < 70) return r < 0.6 ? 'heavy' : 'light';
      return 'approach';
    }
    if (ai.style === 'rush') {
      if (dist > 130 && f.cd.s1 <= 0 && r < 0.45) return 's1';
      if (dist < 70) return r < 0.4 ? 'light' : r < 0.75 ? 'heavy' : (f.cd.s2 <= 0 && r < 0.85 ? 's2' : 'light');
      return 'approach';
    }
    if (ai.style === 'counter') {
      if (dist < 60 && f.cd.s1 <= 0 && r < 0.35) return 's1';     // fish for the parry
      if (dist < 70) return r < 0.5 ? 'light' : 'heavy';
      if (dist > 130 && f.cd.s2 <= 0 && r < 0.4) return 's2';
      return r < 0.6 ? 'approach' : 'wait';
    }
    if (ai.style === 'trap') {
      if (dist > 110 && f.cd.s1 <= 0 && r < 0.55) return 's1';
      if (dist < 70) return r < 0.45 ? 'heavy' : 'light';
      if (f.cd.s2 <= 0 && r < 0.3) return 's2';
      return 'approach';
    }
    // all-rounder
    if (dist > 140 && f.cd.s1 <= 0 && r < 0.5) return 's1';
    if (dist < 70) {
      if (f.cd.s2 <= 0 && r < 0.25) return 's2';
      return r < 0.55 ? 'light' : 'heavy';
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
        else this.plan = 'poke';
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
