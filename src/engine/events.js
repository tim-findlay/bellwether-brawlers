// Stage-hazard director (v3): schedules, telegraphs and runs the data-defined
// events in src/data/events.js on real stage geometry. Pacing re-anchors to
// stocks (no round timer any more): first roll ~10 s in, spaced rolls after
// that, capped per stock-fall, suppressed while a super is live. Doctrine
// (BALANCE.md philosophy 5): telegraphed >= 1 s, never kill-class knockback,
// never toward a blast zone, symmetric or dodgeable, never match-deciding.
//
// The director hangs itself on world.director so the CPU (engine/ai) can see
// live hazards — a fire-drill marker or an incoming wave front is public info.

const FIRST_ROLL = 600;            // ~10 s in
const FIRST_JITTER = 180;
const SPACING = 900;               // 15 s between events…
const SPACING_JITTER = 480;        // …plus up to 8 s
const PER_STOCK_CAP = 2;           // events between consecutive stock-falls
const READY_GRACE = 120;           // ticks a telegraphed event waits for its start condition
const RETRY = 45;

export class EventDirector {
  constructor(world, defs, { enabled = true, difficulty = 'normal' } = {}) {
    this.world = world;
    this.defs = defs;
    this.enabled = enabled;
    this.difficulty = difficulty;
    this.active = null;            // { def, t, phase: 'telegraph'|'live', data, wait }
    this.usedThisMatch = new Set();
    this.firedThisStock = 0;
    this.stockMark = this.totalStocks();
    this.nextRoll = world.frame + FIRST_ROLL + ((world.rng() * FIRST_JITTER) | 0);
    this.stageOverride = null;     // stage id the renderer should paint (Berlin)
    this.stageFade = 0;            // frames of paper crossfade left (renderer reads it)
    this.forcedId = null;
    this.fired = [];               // ids in firing order (sim/telemetry)
    world.director = this;
  }

  // v2 compat: screens that still call roundStart() get a match reset.
  roundStart() { this.reset(); }
  reset() {
    this.active = null; this.stageOverride = null; this.firedThisStock = 0;
    this.stockMark = this.totalStocks();
    this.nextRoll = this.world.frame + FIRST_ROLL + ((this.world.rng() * FIRST_JITTER) | 0);
    if (this.forcedId) this.nextRoll = this.world.frame + 90;
  }

  // dev flag (?event=<id>): force a specific event to fire next roll
  force(id) { this.forcedId = id; this.nextRoll = this.world.frame + 90; }

  totalStocks() { return this.world.fighters.reduce((s, f) => s + f.stocks, 0); }

  superActive() {
    const w = this.world;
    return w.fighters.some(f => (f.attack && f.attack.slot === 'super') || f.hasStatus('noMeter'))
      || w.hazards.some(h => h.type === 'ball') || w.zones.some(z => z.type === 'smoke');
  }

  update() {
    if (!this.enabled) return;
    const w = this.world;
    if (this.stageFade > 0) this.stageFade--;
    if (w.over) { if (this.active?.phase === 'live') this.finish(); return; }

    const stocks = this.totalStocks();                       // a stock fell: the cap resets
    if (stocks < this.stockMark) { this.stockMark = stocks; this.firedThisStock = 0; }

    if (this.active) {
      const a = this.active;
      a.t++;
      if (a.phase === 'telegraph' && a.t >= a.def.telegraph) {
        const ready = !a.def.ready || a.def.ready(this.ctx(a));
        if (ready) { a.phase = 'live'; a.t = 0; a.def.start?.(this.ctx(a)); }
        else if (a.t >= a.def.telegraph + READY_GRACE) {         // condition never came: call it off
          a.def.abort?.(this.ctx(a));
          this.active = null;
          this.nextRoll = w.frame + SPACING / 2;
        }
        return;
      }
      if (a.phase === 'live') {
        const done = a.def.update?.(this.ctx(a));
        if (done || a.t > (a.def.maxFrames || 900)) this.finish();
      }
      return;
    }

    if (w.frame < this.nextRoll) return;
    if (this.firedThisStock >= PER_STOCK_CAP) return;
    if (this.superActive() || w.fighters.some(f => f.chair || f.state === 'ko')) { this.nextRoll = w.frame + RETRY; return; }

    const roster = w.fighters.map(f => f.cfg.id);
    const usable = (d) => !(d.oncePerMatch && this.usedThisMatch.has(d.id)) && (!d.requiresCharacter || roster.includes(d.requiresCharacter));
    let def;
    if (this.forcedId) {
      def = this.defs.find(d => d.id === this.forcedId && usable(d));   // a forced once-per-match event still fires once
      if (!def) { this.forcedId = null; return; }
    } else {
      const eligible = this.defs.filter(d => usable(d) && (!d.canRoll || d.canRoll(this.ctx({ data: {}, t: 0 }))));
      if (!eligible.length) { this.nextRoll = w.frame + RETRY; return; }
      const total = eligible.reduce((s, d) => s + (d.weight || 1), 0);
      let pick = w.rng() * total;
      def = eligible[0];
      for (const d of eligible) { pick -= (d.weight || 1); if (pick <= 0) { def = d; break; } }
    }
    this.forcedId = null;
    this.firedThisStock++;
    if (def.oncePerMatch) this.usedThisMatch.add(def.id);
    this.fired.push(def.id);
    this.active = { def, t: 0, phase: 'telegraph', data: {} };
    w.fx.banner(def.banner, { dur: def.telegraph + 20, sub: def.sub || '', color: '#c4452e' });
    w.audio.play(def.sound || 'klaxon');
  }

  finish() {
    const a = this.active;
    a.def.end?.(this.ctx(a));
    this.active = null;
    this.nextRoll = this.world.frame + SPACING + ((this.world.rng() * SPACING_JITTER) | 0);
  }

  ctx(a = this.active) {
    const w = this.world;
    return {
      world: w, fx: w.fx, audio: w.audio, rng: w.rng, stage: w.stage, slab: w.stage.slabs[0],
      data: a.data, t: a.t, director: this, difficulty: this.difficulty,
    };
  }

  // Inside the camera transform: world px, surfaces at their real y.
  drawWorld(ctx) { if (this.active?.phase === 'live') this.active.def.drawWorld?.(this.ctx(), ctx); }
  // Screen space, 960x540.
  drawUI(ctx) { if (this.active) this.active.def.drawUI?.(this.ctx(), ctx); }
}
