// Attacks in motion (2026-09-28): ground moves carry the run, step into the hit,
// and stop at the ledge and at the opponent's body. Same scripted-world harness
// as kits.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FightWorld } from '../src/engine/combat.js';
import { geometryOf } from '../src/data/stages.js';
import { byId } from '../src/data/characters.js';
import { PHYS } from '../src/data/physics.js';

class Script {
  constructor() { this.reversed = false; this.isCPU = true; this.it = {}; this.q = new Set(); this.helds = new Set(); }
  intent() { return { left: false, right: false, down: false, downTapped: false, jump: false, dodge: false, dashLeft: false, dashRight: false, ...this.it }; }
  buffered(a) { return this.q.has(a); }
  consume(a) { this.q.delete(a); }
  held(a) { return this.helds.has(a) || !!this.it[a === 'up' ? 'jump' : a]; }
  pressed() { return false; }
}
const stubFx = { text() {}, spark() {}, dust() {}, ember() {}, confetti() {}, banner() {}, flash() {}, hitstop() {}, shake() {}, slowmo() {} };
const stubAudio = { play() {} };
const run = (w, n) => { for (let i = 0; i < n; i++) w.update(); };
const mk = (a = 'tim', b = 'mike') => {
  const c = [new Script(), new Script()];
  const w = new FightWorld({ cfgs: [byId(a), byId(b)], controllers: c, stage: geometryOf('office'), fx: stubFx, audio: stubAudio, rng: () => 0.5, settings: {} });
  run(w, 5);
  const slab = w.stage.slabs[0];
  return { w, c, a: w.fighters[0], b: w.fighters[1], slab };
};
// park b far to the left so it never interferes; a starts at x facing right
const setup = (x, opts = {}) => {
  const t = mk(opts.a, opts.b);
  t.b.body.x = t.slab.x + 30; t.a.body.x = x; t.a.body.facing = 1;
  run(t.w, 2); t.a.body.facing = 1;
  return t;
};
// run `runFrames` holding right, press `slot` with a neutral stick, then hold `hold`
// through the move; returns the x travelled from the press to the end of the move
function swing({ runFrames = 0, slot = 'light', hold = {}, x } = {}) {
  const t = setup(x ?? t0x());
  const { w, c, a } = t;
  c[0].it = { right: true }; run(w, runFrames); a.body.facing = 1;
  const x0 = a.body.x;
  c[0].it = {}; c[0].q.add(slot); run(w, 1);
  assert.ok(a.attack, `${slot} started`);
  c[0].it = hold;
  for (let i = 0; i < 200 && a.attack; i++) run(w, 1);
  c[0].it = {};
  return { dx: a.body.x - x0, a, t };
}
let _x = null;
const t0x = () => _x ?? (_x = (() => { const s = mk().slab; return s.x + s.w * 0.35; })());

test('a standing light still steps into the hit', () => {
  const { dx } = swing({ slot: 'light' });
  assert.ok(dx >= 6, `neutral light stepped ${dx.toFixed(1)} px`);
});

test('a running light carries the run through the swing', () => {
  const stand = swing({ slot: 'light' }).dx, runIn = swing({ runFrames: 20, slot: 'light' }).dx;
  // the old plant (RUN_FRICTION from the first frame) kept at most runMax * 0.76 / 0.24 ≈ 18 px
  assert.ok(runIn - stand > 22, `running light slid ${(runIn - stand).toFixed(1)} px further than a standing one`);
});

test('holding forward keeps more speed; holding back brakes', () => {
  const neutral = swing({ runFrames: 20, slot: 'heavy' }).dx;
  const fwd = swing({ runFrames: 20, slot: 'heavy', hold: { right: true } }).dx;
  const back = swing({ runFrames: 20, slot: 'heavy', hold: { left: true } }).dx;
  assert.ok(fwd > neutral && neutral > back, `fwd ${fwd.toFixed(1)} > neutral ${neutral.toFixed(1)} > back ${back.toFixed(1)}`);
});

test('a dash into an attack is capped at a run, not a flying dash', () => {
  const t = setup(t0x());
  const { w, c, a } = t;
  c[0].it = { dashRight: true }; run(w, 1); c[0].it = {}; run(w, 3);
  assert.equal(a.body.state, 'dash', 'dashing');
  c[0].q.add('light'); run(w, 1);
  assert.ok(a.attack && Math.abs(a.body.vx) <= a.stats.runMax * PHYS.ATTACK_CARRY_CAP + 1e-6, `vx ${a.body.vx.toFixed(2)}`);
  assert.equal(a.body.dashT, 0, 'the dash ended');
});

test('a step-in stops at the ledge instead of walking off', () => {
  const s = mk().slab, edge = s.x + s.w;
  const { a } = swing({ runFrames: 0, slot: 'heavy', hold: { right: true }, x: edge - 12 });
  assert.ok(a.grounded && a.body.x <= edge, `x ${a.body.x.toFixed(1)} vs edge ${edge}`);
});

test('a step-in stops at the opponent instead of running through', () => {
  const { w, c, a, b, slab } = mk('tim', 'mike');
  a.body.x = slab.x + slab.w * 0.4; b.body.x = a.body.x + 44; run(w, 2);
  a.body.facing = 1;
  c[0].q.add('heavy'); run(w, 1);
  run(w, a.attack.move.startup);
  assert.ok(a.body.x < b.body.x, 'still in front of the target');
});

test('a travel lunge still leaves the stage on purpose (Off the Lip)', () => {
  const s = mk().slab, edge = s.x + s.w;
  const { w, c, a } = setup(edge - 20, { a: 'ben' });
  c[0].q.add('s2'); run(w, 1);
  run(w, a.attack.move.startup + a.attack.move.active);
  assert.ok(a.body.x > edge, `lunged past the lip: x ${a.body.x.toFixed(1)} edge ${edge}`);
});

// ---- hit-confirm cancels (2026-09-28) ------------------------------------------
const lightSetup = (gap) => {
  const { w, c, a, b, slab } = mk('tim', 'mike');
  a.body.x = slab.x + slab.w * 0.4; b.body.x = a.body.x + gap; run(w, 2); a.body.facing = 1;
  c[0].q.add('light'); run(w, 1);
  const m = a.attack.move;
  return { w, c, a, b, m, open: (m.startup || 0) + (m.active || 0) + Math.ceil((m.recover || 0) * PHYS.HIT_CANCEL_FRAC) };
};

test('a light that connects cancels its recovery into another light', () => {
  const { w, c, a, m, open } = lightSetup(50);
  while (a.attack && !a.attack.hasHit && a.attack.frame < 30) run(w, 1);
  assert.ok(a.attack?.hasHit, 'the light connected');
  const first = a.attack;
  while (a.attack === first && a.attack.frame < open) run(w, 1);
  c[0].q.add('light'); run(w, 2);                     // the window is strict (> open): the press lands next tick
  assert.ok(a.attack && a.attack !== first, 'a new light started out of the cancel');
  assert.ok(first.frame < (m.startup || 0) + (m.active || 0) + (m.recover || 0), 'before the old recovery ran out');
});

test('a whiffed light keeps its whole recovery (no cancel)', () => {
  const { w, c, a, m } = lightSetup(400);
  const first = a.attack, total = (m.startup || 0) + (m.active || 0) + (m.recover || 0);
  run(w, (m.startup || 0) + (m.active || 0) + 2);
  c[0].q.add('light'); c[0].it = { jump: true }; run(w, 1); c[0].it = {};
  assert.equal(a.attack, first, 'still in the whiffed light');
  assert.equal(a.attack.hasHit, false);
  while (a.attack === first) run(w, 1);
  assert.ok(first.frame >= total - 1, `ran its full recovery (${first.frame}/${total})`);
});

test('the cancel window opens only after HIT_CANCEL_FRAC of the recovery', () => {
  const { w, c, a, open } = lightSetup(50);
  while (a.attack && !a.attack.hasHit && a.attack.frame < 30) run(w, 1);
  const first = a.attack;
  assert.ok(first.frame < open, 'hit lands before the window');
  c[0].q.add('light'); run(w, 1);
  assert.equal(a.attack, first, 'an early press is buffered, not a cancel');
});
