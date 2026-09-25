import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FightWorld } from '../src/engine/combat.js';
import { STOCKS } from '../src/engine/fighter.js';
import { geometryOf } from '../src/data/stages.js';
import { CHARACTERS, byId } from '../src/data/characters.js';

// Scripted controller: an intent + a queue of button presses per frame.
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
const mk = (a = 'tim', b = 'mike', stage = 'office') => {
  const c = [new Script(), new Script()];
  const w = new FightWorld({ cfgs: [byId(a), byId(b)], controllers: c, stage: geometryOf(stage), fx: stubFx, audio: stubAudio, rng: () => 0.5, settings: {} });
  return { w, c };
};
const run = (w, n) => { for (let i = 0; i < n; i++) w.update(); };

test('a fresh world: two fighters on their spawns, full gauge, 3 stocks, grounded after settling', () => {
  const { w } = mk();
  run(w, 5);
  for (const f of w.fighters) {
    assert.equal(f.gauge, f.maxGauge);
    assert.equal(f.stocks, STOCKS);
    assert.equal(f.grounded, true);
    assert.equal(f.state, 'normal');
  }
  assert.ok(w.fighters[0].facing === 1 && w.fighters[1].facing === -1, 'they face each other');
});

test('a light that connects drains composure, launches into hitstun, builds meter both ways', () => {
  const { w, c } = mk();
  const [a, b] = w.fighters;
  run(w, 5);
  b.body.x = a.x + 40;                                   // in reach
  c[0].q.add('light');
  run(w, 1);
  assert.ok(a.attack, 'attack started');
  run(w, 8);
  assert.ok(b.gauge < b.maxGauge, 'gauge drained');
  assert.equal(b.state, 'hitstun');
  assert.ok(b.body.vx > 0, 'launched away from the attacker');
  assert.ok(a.meter > 0 && b.meter > 0);
  run(w, 60);
  assert.equal(b.state, 'normal', 'hitstun wears off');
});

test('knockback scales with emptiness: an empty gauge launches much harder', () => {
  const kbFor = (gauge) => {
    const { w, c } = mk(); const [a, b] = w.fighters;
    run(w, 5); b.body.x = a.x + 40; b.gauge = gauge;
    c[0].q.add('heavy'); run(w, 1); run(w, a.attack.move.startup + 1);
    return Math.hypot(b.body.vx, b.body.vy);
  };
  assert.ok(kbFor(1) > kbFor(110) * 1.8, 'emptiness multiplies the launch');
});

test('ring-out costs a stock, refills the gauge, and the chair brings the loser back', () => {
  const { w, c } = mk();
  const [a] = w.fighters;
  run(w, 5);
  a.gauge = 10;
  a.body.x = w.stage.blast.left - 5;
  run(w, 1);
  assert.equal(a.stocks, STOCKS - 1);
  assert.equal(a.state, 'chair');
  assert.equal(a.gauge, a.maxGauge, 'composure refills on stock loss');
  assert.deepEqual(w.events.at(-1), { type: 'ko', player: 0, stocksLeft: 2 });
  run(w, 70);
  c[0].it.jump = true; run(w, 1); c[0].it.jump = false;
  assert.equal(a.state, 'normal', 'released on the first act after arrival');
  assert.ok(Math.abs(a.x - w.stage.respawn.x) < 1);
});

test('losing the last stock ends the match with the right winner', () => {
  const { w } = mk();
  const [, b] = w.fighters;
  run(w, 5);
  b.stocks = 1; b.body.x = w.stage.blast.right + 5;
  run(w, 1);
  assert.equal(w.over, true);
  assert.equal(w.winner, 0);
});

test('every fighter can start every ground move and its four aerials without throwing', () => {
  for (const cfg of CHARACTERS) {
    const { w, c } = mk(cfg.id, 'tim');
    const [a] = w.fighters;
    run(w, 5);
    a.meter = 100;
    for (const slot of ['light', 'heavy', 's1', 's2', 'super']) {
      a.attack = null; a.cd = { s1: 0, s2: 0 }; a.state = 'normal'; a.staggerT = 0;
      c[0].q.add(slot); run(w, 1);
      run(w, 90);
    }
    for (const aim of ['n', 's', 'u', 'd']) {
      a.attack = null; a.state = 'normal';
      a.body.y -= 200; a.body.grounded = false;
      c[0].q.add('light'); c[0].it = aim === 'u' ? { jump: true } : aim === 'd' ? { down: true } : aim === 's' ? { right: true } : {};
      run(w, 1);
      assert.ok(a.attack?.aerial, `${cfg.id} aerial ${aim}`);
      assert.equal(a.attack.aim, aim);
      run(w, 120); c[0].it = {};
    }
    for (let i = 0; i < 300; i++) w.update();
    for (const f of w.fighters) assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y), `${cfg.id}: no NaN positions`);
  }
});

test("Adrian's whiffed lunge trips on landing, not mid-air; a whiffed Faceplant trips on landing", () => {
  const { w, c } = mk('adrian', 'tim');
  const [a, b] = w.fighters;
  run(w, 5);
  a.body.x = w.stage.slabs[0].x + 40; b.body.x = a.x - 400;// off the platform stack, nobody in front
  a.body.y -= 420; a.body.grounded = false;                // airborne: 16f hover + 18f recover falls ~150 px
  c[0].q.add('s1'); run(w, 1);
  assert.ok(a.attack, 'Clumsy Charge started in the air');
  run(w, 34);                                              // startup 8 + active 8 + recover 18
  assert.equal(a.attack, null);
  assert.notEqual(a.state, 'stagger', 'no stagger while still airborne');
  let landedTrip = false;                                  // land -> 30f self-stagger -> normal
  for (let i = 0; i < 120; i++) { w.update(); if (a.grounded && a.state === 'stagger') landedTrip = true; }
  assert.equal(a.grounded, true);
  assert.ok(landedTrip, 'tripped on the botched landing');
  // Faceplant
  const { w: w2, c: c2 } = mk('adrian', 'tim');
  const [a2, b2] = w2.fighters; run(w2, 5); b2.body.x = a2.x - 400;
  a2.body.y -= 120; a2.body.grounded = false;
  c2[0].q.add('light'); c2[0].it = { down: true }; run(w2, 1); c2[0].it = {};
  assert.equal(a2.attack?.aim, 'd');
  let tripped = false;
  for (let i = 0; i < 120; i++) { w2.update(); if (a2.state === 'stagger') tripped = true; }
  assert.ok(tripped, 'whiffed Faceplant self-staggers on landing');
});
