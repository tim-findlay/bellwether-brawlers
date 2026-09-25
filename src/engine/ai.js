// CPU controller (v3). Implements the PlayerController interface so the
// Fighter never knows who's driving: intent() per tick, buffered/consume for
// the button slots, held('up') for up-air aim, pressed() for event mashing.
// Archetype hints come from character data (cfg.ai); everything else is
// stage geometry read at runtime. The brain is split under src/engine/ai/:
//   nav.js       stage-graph queries + ballistic flight model
//   recovery.js  the competence floor (drift / special / double jump / dodge)
//   tactics.js   decisions: threats, edge-guard, archetype neutral
//   actions.js   plan execution: navigation, guard, sim-only profiles

import { PHYS } from '../data/physics.js';
import { isOffStage } from './ai/nav.js';
import { recover } from './ai/recovery.js';
import { think, hazardResponse, mistakePlan } from './ai/tactics.js';
import { act, aerialAim, aerialPress } from './ai/actions.js';

// decide: frames between decisions (reaction) · mistake: chance a decision is
// replaced by a mild random one · mashDelay/mashCps: URGENT UNDERWRITING ·
// superChance · edgeGuard: willingness to go out for an aerial · dash: dash-in
// chance per approach · mixup: jump-in / aerial willingness · recoverDelay:
// ticks of hesitation once actionable off-stage (the floor itself never scales).
export const DIFFICULTY = {
  easy:   { decide: 40, mistake: 0.4,  mashDelay: 60, mashCps: 4,   superChance: 0.3,  edgeGuard: 0.1,  dash: 0.05, mixup: 0.15, recoverDelay: 20 },
  normal: { decide: 22, mistake: 0.2,  mashDelay: 45, mashCps: 6,   superChance: 0.6,  edgeGuard: 0.4,  dash: 0.25, mixup: 0.4,  recoverDelay: 8 },
  hard:   { decide: 12, mistake: 0.06, mashDelay: 30, mashCps: 9,   superChance: 0.9,  edgeGuard: 0.7,  dash: 0.5,  mixup: 0.7,  recoverDelay: 2 },
  // sim-only (BALANCE.md gates 2/3): must lose to `normal`. Never offered in the menu.
  stall:  { decide: 16, mistake: 0.08, mashDelay: 40, mashCps: 6.5, superChance: 0.5,  edgeGuard: 0.2,  dash: 0.3,  mixup: 0.3,  recoverDelay: 4, stall: true },
  camp:   { decide: 16, mistake: 0.08, mashDelay: 40, mashCps: 6.5, superChance: 0.5,  edgeGuard: 0.3,  dash: 0.3,  mixup: 0.3,  recoverDelay: 4, camp: true },
};

const NEUTRAL = Object.freeze({ left: false, right: false, down: false, downTapped: false, jump: false, dodge: false, dashLeft: false, dashRight: false });
const IMPATIENCE = 300;          // frames without a hit before waiting/retreating turns into an approach

export class AIController {
  constructor(profileName, rng) {
    this.profileName = DIFFICULTY[profileName] ? profileName : 'normal';
    this.profile = DIFFICULTY[this.profileName];
    this.rng = rng || Math.random;
    this.reversed = false;         // set by the Fighter when Prompt Injection lands
    this.isCPU = true;
    this.helds = new Set();        // left | right | down | up (aim only)
    this.queue = new Map();        // slot -> expiry frame (a human-style press buffer)
    this.it = { ...NEUTRAL };
    this.frame = 0;
    this.cool = 0;
    this.plan = { kind: 'wait' };
    this.mode = 'neutral';         // 'neutral' | 'recovery' | 'chair' (for tests/debug)
    this.aim = null; this.aimUntil = -1; this.aimDir = 1;
    this.dash = 0;                 // ±1 on the tick a dash is requested
    this.tapDown = false;          // fresh down tap this tick (drop-through)
    this.swungThisAir = false;
    this.recoverWait = 0;
    this.reversedAt = -1;
    this.lastHitFrame = 0;         // impatience: nothing landing for a while -> go in
    this._gauges = null;
  }

  // ---- PlayerController interface --------------------------------------------
  held(a) { return this.helds.has(a); }
  buffered(slot) { const e = this.queue.get(slot); return e !== undefined && e >= this.frame; }
  consume(slot) { this.queue.delete(slot); if (slot === 'up') this.it.jump = false; if (slot === 'dodge') this.it.dodge = false; }
  pressed() { return false; }     // event mashing for CPUs is simulated by the event itself
  intent() { return this.it; }
  press(slot) { this.queue.set(slot, this.frame + PHYS.INPUT_BUFFER); }

  // Once per tick, before world.update(). Builds this tick's intent.
  update(f, world) {
    this.frame++;
    for (const [slot, e] of this.queue) if (e < this.frame) this.queue.delete(slot);
    this.helds.clear(); this.dash = 0; this.tapDown = false;

    if (f.state === 'ko' || f.state === 'frozen' || f.state === 'grabbed') { this.queue.clear(); this.it = { ...NEUTRAL }; return; }
    const opp = world.other(f);
    if (f.chair) { this._chair(f, opp); return; }
    if (f.grounded) this.swungThisAir = false;
    const g = [f.gauge, opp.gauge];
    if (!this._gauges || g[0] !== this._gauges[0] || g[1] !== this._gauges[1]) this.lastHitFrame = this.frame;
    this._gauges = g;

    // reversal (Prompt Injection): the CPU stumbles for a beat, then compensates like a human would
    if (this.reversed && this.reversedAt < 0) this.reversedAt = this.frame;
    if (!this.reversed) this.reversedAt = -1;

    if (isOffStage(world.stage, f)) {
      if (this.mode !== 'recovery') { this.mode = 'recovery'; this.recoverWait = this.profile.recoverDelay; this.plan = { kind: 'approach' }; }
      recover(this, f, world);
      if (f.state === 'normal' && f.body.stun === 0 && !f.attack && f.body.airJumps > 0 && !this.swungThisAir) this._edgeAerial(f, opp, world);
      this._compose(f);
      return;
    }
    this.mode = 'neutral';

    this.cool--;
    if (this.cool <= 0) {
      this.cool = this.profile.decide + ((this.rng() * 8) | 0);
      this.plan = think(this, f, opp, world);
      if (this.rng() < this.profile.mistake && this.plan.kind !== 'guard') this.plan = mistakePlan(this, f, opp);
      const passive = this.plan.kind === 'wait' || this.plan.kind === 'retreat';
      if (passive && this.frame - this.lastHitFrame > IMPATIENCE && !this.profile.stall && !this.profile.camp) this.plan = { kind: 'approach', dash: this.rng() < this.profile.dash };
    } else if (this.frame % Math.max(2, Math.ceil(this.profile.decide / 2)) === 0) {
      const hz = hazardResponse(f, world);
      if (hz) this.plan = hz;
    }
    if (f.state === 'normal') act(this, f, opp, world);
    this._compose(f);
  }

  // Off-stage edge-guard swing: an aerial that reaches, with a jump in reserve.
  _edgeAerial(f, opp, world) {
    if (opp.chair || opp.state === 'ko' || opp.invulnerable || !isOffStage(world.stage, opp)) return;
    if (this.rng() > this.profile.edgeGuard) return;
    const aim = aerialAim(f, opp, world);
    if (!aim) return;
    this.swungThisAir = true;
    aerialPress(this, f, opp, aim);
  }

  _chair(f, opp) {
    this.mode = 'chair';
    this.queue.clear(); this.plan = { kind: 'wait' };
    const ready = f.chair.t >= 60 + Math.min(40, this.profile.decide);
    this.it = { ...NEUTRAL };
    if (ready) { this.it[opp.x >= f.x ? 'right' : 'left'] = true; }    // step off toward the fight
  }

  // helds/queue -> the MovementBody intent, with aerial aim overrides and the
  // reversal stumble. Dash flags only ever go out while grounded.
  _compose(f) {
    const b = f.body;
    if (this.aim && this.buffered('light') && this.frame <= this.aimUntil && f.airborne) {
      this.helds.delete('left'); this.helds.delete('right'); this.helds.delete('down'); this.helds.delete('up');
      if (this.aim === 'u') this.helds.add('up');
      else if (this.aim === 'd') this.helds.add('down');
      else if (this.aim === 's') this.helds.add(this.aimDir > 0 ? 'right' : 'left');
    } else if (this.aim && !this.buffered('light')) this.aim = null;

    let left = this.helds.has('left'), right = this.helds.has('right');
    let dashL = this.dash < 0 && f.grounded, dashR = this.dash > 0 && f.grounded;
    const stumble = this.reversed && this.frame - this.reversedAt < this.profile.decide * 2;
    if (stumble) { [left, right] = [right, left]; [dashL, dashR] = [dashR, dashL]; }
    const jump = this.buffered('up');
    this.it = {
      left, right,
      down: this.helds.has('down') || (this.tapDown && !jump),
      downTapped: this.tapDown && !jump,
      jump, dodge: this.buffered('dodge'),
      dashLeft: dashL && b.dashT === 0, dashRight: dashR && b.dashT === 0,
    };
  }
}
