// Kit rethink (2026-09): the new mechanics, one test each. Same scripted-world
// harness as combat.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FightWorld } from '../src/engine/combat.js';
import { geometryOf } from '../src/data/stages.js';
import { byId } from '../src/data/characters.js';

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
const mk = (a, b, stage = 'office') => {
  const c = [new Script(), new Script()];
  const w = new FightWorld({ cfgs: [byId(a), byId(b)], controllers: c, stage: geometryOf(stage), fx: stubFx, audio: stubAudio, rng: () => 0.5, settings: {} });
  run(w, 5);
  return { w, c, a: w.fighters[0], b: w.fighters[1] };
};
const run = (w, n) => { for (let i = 0; i < n; i++) w.update(); };

test('Ben: My Office. Now. drags the target toward Ben', () => {
  const { w, c, a, b } = mk('ben', 'tim');
  b.body.x = a.x + 160;
  c[0].q.add('s1'); run(w, 1);
  for (let i = 0; i < 80 && b.state !== 'hitstun'; i++) run(w, 1);
  assert.equal(b.state, 'hitstun', 'the memo connects');
  assert.ok(b.body.vx < 0, 'launched back toward Ben (left)');
});

test('Tim: Scheduled Send marks the target and strikes after its delay', () => {
  const { w, c, a, b } = mk('tim', 'mike');
  b.body.x = a.x + 220;
  c[0].q.add('s1'); run(w, 1);
  run(w, a.attack.move.startup);
  assert.equal(w.strikes.length, 1, 'one marked strike');
  assert.ok(Math.abs(w.strikes[0].x - b.x) < 2, 'under the target');
  const g0 = b.gauge;
  run(w, a.cfg.s1.delay + 2);
  assert.ok(b.gauge < g0, 'standing still on the marker gets hit');
});

test('Seelye: Enforcement collects a LIEN for +8', () => {
  const dmgWith = (lien) => {
    const { w, c, a, b } = mk('seelye', 'mike');
    b.body.x = a.x + 70; a.meter = 100;
    if (lien) b.applyStatus('lien', 480);
    const g0 = b.gauge;
    c[0].q.add('super'); run(w, 1); run(w, a.cfg.super.startup + 2);
    return { dmg: g0 - b.gauge, lien: b.hasStatus('lien') };
  };
  const plain = dmgWith(false), marked = dmgWith(true);
  assert.ok(plain.dmg > 0, 'Enforcement connects');
  assert.equal(marked.dmg - plain.dmg, 8);
  assert.equal(marked.lien, false, 'the lien is consumed');
});

test('Abi: Declined silences the attacker, and Calendar Block works in the air', () => {
  const { w, c, a, b } = mk('abi', 'tim');
  b.body.x = a.x + 50;
  a.body.grounded = false; a.body.y -= 60; a.body.vy = 0;        // Abi airborne, level with Tim's reach
  b.body.y = a.body.y; b.body.grounded = false; b.body.vy = 0;
  c[0].q.add('s1'); run(w, 1);
  assert.equal(a.attack?.move.name, 'Calendar Block', 'the parry starts in the air');
  b.body.facing = -1; c[1].q.add('light'); run(w, 12);
  assert.ok(b.hasStatus('silence'), 'Declined locks their specials');
});
