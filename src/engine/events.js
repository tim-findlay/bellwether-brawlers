// Random-event director: schedules, telegraphs and runs data-defined events.
// Event content lives in src/data/events.js; this engine is generic.

const ROUND_FRAMES = 3600;

export class EventDirector {
  constructor(world, defs, { enabled = true, difficulty = 'normal' } = {}) {
    this.world = world;
    this.defs = defs;
    this.enabled = enabled;
    this.difficulty = difficulty;
    this.active = null;            // { def, t, phase: 'telegraph'|'live', data }
    this.usedThisRound = new Set();
    this.usedThisMatch = new Set();
    this.firedThisRound = 0;
    this.nextRoll = 0;
    this.stageOverride = null;     // Berlin
    this.stageFade = 0;
  }

  roundStart() {
    this.usedThisRound.clear();
    this.firedThisRound = 0;
    this.active = null;
    this.stageOverride = null;
    this.nextRoll = this.world.frame + 480 + ((this.world.rng() * 240) | 0);   // first roll ~8-12s in
  }

  superActive() {
    return this.world.fighters.some(f => f.attack && f.attack.slot === 'super');
  }

  update(roundTimer) {
    if (!this.enabled) return;
    const w = this.world;
    if (this.stageFade > 0) this.stageFade--;

    if (this.active) {
      const a = this.active;
      a.t++;
      if (a.phase === 'telegraph' && a.t >= a.def.telegraph) {
        a.phase = 'live';
        a.t = 0;
        a.def.start?.(this.ctx(a));
      }
      if (a.phase === 'live') {
        const done = a.def.update?.(this.ctx(a));
        if (done || a.t > (a.def.maxFrames || 900)) {
          a.def.end?.(this.ctx(a));
          this.active = null;
          this.nextRoll = w.frame + 720 + ((w.rng() * 360) | 0);
        }
      }
      return;
    }

    if (w.frame < this.nextRoll) return;
    if (this.firedThisRound >= 2) return;
    if (roundTimer < 300) return;                       // never in the final 5 seconds
    if (this.superActive()) { this.nextRoll = w.frame + 120; return; }

    const roster = w.fighters.map(f => f.cfg.id);
    const eligible = this.defs.filter(d =>
      !(d.oncePerRound && this.usedThisRound.has(d.id)) &&
      !(d.oncePerMatch && this.usedThisMatch.has(d.id)) &&
      (!d.requiresCharacter || roster.includes(d.requiresCharacter)));
    if (!eligible.length) return;

    const total = eligible.reduce((s, d) => s + (d.weight || 1), 0);
    let pick = w.rng() * total;
    let def = eligible[0];
    for (const d of eligible) { pick -= (d.weight || 1); if (pick <= 0) { def = d; break; } }

    this.firedThisRound++;
    if (def.oncePerRound) this.usedThisRound.add(def.id);
    if (def.oncePerMatch) this.usedThisMatch.add(def.id);
    this.active = { def, t: 0, phase: 'telegraph', data: {} };
    w.fx.banner(def.banner, { dur: def.telegraph + 20, sub: def.sub || '', color: '#c4452e' });
    w.audio.play(def.sound || 'klaxon');
  }

  ctx(a = this.active) {
    return {
      world: this.world,
      fx: this.world.fx,
      audio: this.world.audio,
      rng: this.world.rng,
      data: a.data,
      t: a.t,
      director: this,
      difficulty: this.difficulty,
    };
  }

  drawWorld(ctx) { this.active?.def.drawWorld?.(this.ctx(), ctx); }
  drawUI(ctx) { this.active?.def.drawUI?.(this.ctx(), ctx); }
}
