// Practice arena logic, headless-safe (the screen is src/screens/practice.js).
//
// ComboTracker watches every hit the dummy takes. A hit that lands while the
// dummy is still in hitstun / stagger / a grab continues the combo (a "true"
// combo — they could not have escaped); a hit on an actionable dummy starts a
// new one, and if the last combo only just ended the tracker reports it as
// DROPPED with the gap in frames (how long they were free). It also measures
// frame advantage on hit: frames between the attacker and the dummy each
// becoming actionable again (+ = you are free first).
//
// DummyController: what the dummy does — stand, walk, jump, or anything a real
// controller does (the screen swaps in the CPU or a P2 PlayerController).

const DROP_WINDOW = 40;                   // a fresh hit this soon after a combo ends reads as a drop

export class ComboTracker {
  constructor(world, attacker, dummy) {
    this.world = world; this.attacker = attacker; this.dummy = dummy;
    this.hits = 0; this.dmg = 0; this.last = null; this.best = 0; this.moves = [];   // moves: this combo's hits, in order
    this.endedAt = -1; this.ended = null;  // the finished combo: { hits, dmg } (for the callout)
    this.dropped = null;                   // { gap, at }: the last drop
    this.adv = null; this._adv = null;     // frame advantage on the last hit
    const orig = dummy.takeHit.bind(dummy);
    dummy.takeHit = (o) => {
      const trapped = this.trapped();
      const g0 = dummy.gauge, res = orig(o);
      if (res === 'hit' || res === 'armored') this.record(o, trapped, g0 - dummy.gauge);
      return res;
    };
  }

  // could the dummy have acted? (no = the next hit is a true follow-up)
  trapped() {
    const d = this.dummy;
    return this.hits > 0 && (d.state === 'hitstun' || d.state === 'stagger' || d.state === 'grabbed' || d.body.stun > 0 || d.body.postStun > 0);   // postStun: can't dodge or jump yet
  }

  record(o, trapped, dmg) {
    const f = this.world.frame, d = this.dummy;
    if (!trapped) {
      if (this.hits > 0) this.close();
      if (this.endedAt >= 0 && f - this.endedAt <= DROP_WINDOW && this.ended?.hits >= 1) this.dropped = { gap: f - this.endedAt, at: f };
      this.hits = 0; this.dmg = 0; this.moves = [];
    }
    this.hits++; this.dmg += dmg; this.moves.push(o.move || null);
    this.onHit?.(this.moves);
    this.best = Math.max(this.best, this.hits);
    const speed = Math.hypot(d.body.vx, d.body.vy);
    this.last = { name: o.move?.name || 'hit', dmg, kb: speed, stun: d.body.stun, at: f, emptiness: 1 - d.gauge / d.maxGauge };
    this._adv = { at: f, a: null, d: null };
  }

  close() { this.ended = { hits: this.hits, dmg: this.dmg }; this.endedAt = this.world.frame; }

  // once per logic frame, after world.update()
  update() {
    const f = this.world.frame, d = this.dummy, a = this.attacker;
    const free = (x) => x.actionable || x.state === 'chair' || x.state === 'ko';
    if (this.hits > 0 && free(d) && !this.trapped()) { this.close(); this.hits = 0; this.dmg = 0; }
    const m = this._adv;
    if (m) {
      if (m.a === null && free(a)) m.a = f;
      if (m.d === null && free(d)) m.d = f;
      if (m.a !== null && m.d !== null) { this.adv = m.d - m.a; this._adv = null; }
      else if (f - m.at > 180) this._adv = null;
    }
  }
}

export const DUMMY_MODES = ['stand', 'walk', 'jump', 'cpu', 'p2'];
export const DUMMY_LABEL = { stand: 'STAND', walk: 'WALK', jump: 'JUMP', cpu: 'CPU', p2: 'PLAYER 2' };

export class DummyController {
  constructor(mode = 'stand') { this.mode = mode; this.reversed = false; this.isCPU = true; this.t = 0; this.jumpAt = -1; }
  update() { this.t++; }
  intent(f) {
    const walk = this.mode === 'walk', dir = walk ? (((this.t / 90) | 0) % 2 ? -1 : 1) : 0;
    if (this.mode === 'jump' && f.grounded && this.t % 70 === 0) this.jumpAt = this.t;
    return { left: dir < 0, right: dir > 0, down: false, downTapped: false, jump: this.jumpAt === this.t, dodge: false, dashLeft: false, dashRight: false };
  }
  buffered() { return false; }
  consume() {}
  held() { return false; }
  pressed() { return false; }
}
