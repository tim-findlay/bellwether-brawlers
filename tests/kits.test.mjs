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

test('Ben: Skip Shot (the water polo ball) drags the target toward Ben', () => {
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

test('Mike: holding back on Scaffold Slam throws over the shoulder', () => {
  const throwVx = (back) => {
    const { w, c, a, b } = mk('mike', 'tim');
    b.body.x = a.x + 50;
    c[0].q.add('s1'); run(w, 1);
    if (back) c[0].helds.add('left');
    for (let i = 0; i < 80 && b.state !== 'hitstun'; i++) run(w, 1);
    assert.equal(b.state, 'hitstun', 'the slam lands');
    return b.body.vx;
  };
  assert.ok(throwVx(false) > 0, 'forward throw sends them forward');
  assert.ok(throwVx(true) < 0, 'back throw sends them behind Mike');
});

test('Adrian: a whiffed-lunge trip can hit (Happy Accident) and still self-staggers', () => {
  const { w, c, a, b } = mk('adrian', 'mike');
  b.body.x = a.x - 60;                        // behind him: the lunge whiffs forward, the fall reaches back
  a.body.facing = 1;
  c[0].q.add('s1'); run(w, 1);
  const g0 = b.gauge;
  for (let i = 0; i < 120 && a.state !== 'stagger'; i++) { b.body.x = a.x - 60; run(w, 1); }
  assert.equal(a.state, 'stagger', 'the whiff trips him');
  assert.ok(b.gauge < g0, 'the fall hits the fighter in reach');
});

test("Nick: I Know Your Guy turns his s2 into the opponent's s1, then hands it back", () => {
  const { w, c, a, b } = mk('nick', 'ben');
  b.body.x = a.x + 200; a.meter = 100;
  c[0].q.add('super'); run(w, 1); run(w, a.cfg.super.startup + a.cfg.super.recover + 2);
  assert.ok(a.hasStatus('borrowed'));
  c[0].q.add('s2'); run(w, 1);
  assert.equal(a.attack?.move.name, byId('ben').s1.name, 's2 fires the borrowed special');
  assert.equal(a.attack.move.startup, byId('ben').s1.startup + 2, '+2 startup on a borrowed move');
  run(w, 620);
  assert.equal(a.hasStatus('borrowed'), false, 'the loan runs out');
  a.cd.s2 = 0; c[0].q.add('s2'); run(w, 1);
  assert.equal(a.attack?.move.name, a.cfg.s2.name, 'his own s2 is back');
});

test('Abi: Hollibobs — out of office (untouchable), the mark tracks then locks, Home Time drops on it', () => {
  const { w, c, a, b } = mk('abi', 'tim');
  b.body.x = a.x + 260;
  c[0].q.add('s2'); run(w, 1);
  run(w, a.attack.move.startup);
  assert.ok(a.hasStatus('holiday'), 'she is away');
  assert.ok(a.invulnerable, 'untouchable while away');
  assert.equal(a.takeHit({ dmg: 10 }), 'miss', 'a hit on Abi while away misses');
  b.body.x += 60; run(w, 30);
  const d = a.statusData('holiday');
  assert.ok(Math.abs(d.x - b.x) < 40, 'the mark follows the target');
  while (a.hasStatus('holiday') && !d.locked) run(w, 1);
  const lockedX = d.x; b.body.x += 200; run(w, 5);
  assert.equal(d.x, lockedX, 'locked: moving off the mark now dodges it');
  while (a.hasStatus('holiday')) run(w, 1);
  assert.equal(a.attack?.move.name, 'Home Time', 'drops in with the landing dive');
  assert.ok(Math.abs(a.x - lockedX) < 1, 'on the mark');
});

test('Abi: Home Time hits a target standing on the mark and jet-lags them', () => {
  const { w, c, a, b } = mk('abi', 'tim');
  b.body.x = a.x + 200;
  c[0].q.add('s2'); run(w, 1);
  for (let i = 0; i < 200 && !b.hasStatus('slow'); i++) run(w, 1);
  assert.ok(b.hasStatus('slow'), 'Home Time landed and applied the jet lag');
});

test('Tim: Ask Claude summons a helper that fights for him, and one hit sends it home', () => {
  const { w, c, a, b } = mk('tim', 'mike');
  a.meter = 100; b.body.x = a.x + 300;
  c[0].q.add('super'); run(w, 1);
  run(w, a.attack.move.startup + 1);
  assert.equal(w.assists.length, 1, 'Claude joins');
  const g0 = b.gauge;
  for (let i = 0; i < 200 && b.gauge === g0; i++) run(w, 1);
  assert.ok(b.gauge < g0, 'Claude lands hits on its own');
});

test('Tim: one hit on Claude sends it home', () => {
  const { w, c, a, b } = mk('tim', 'mike');
  a.meter = 100; b.body.x = a.x + 400;
  c[0].q.add('super'); run(w, 1); run(w, a.attack.move.startup + 1);
  const cl = w.assists[0];
  assert.ok(cl && cl.state === 'in', 'Claude is arriving');
  b.body.x = cl.x + 45; b.body.facing = -1;                        // Mike steps in and jabs it while it lands
  c[1].q.add('light');
  for (let i = 0; i < 20 && w.assists.length; i++) run(w, 1);
  assert.equal(w.assists.length, 0, 'booted');
});

test('Tim: Claude clocks off on its own after its time', () => {
  const { w, c, a, b } = mk('tim', 'mike');
  a.meter = 100; b.body.x = a.x - 2000;                           // nobody to fight
  c[0].q.add('super'); run(w, 1); run(w, a.attack.move.startup + 1);
  assert.equal(w.assists.length, 1);
  run(w, a.cfg.super.dur + 5);
  assert.equal(w.assists.length, 0);
});

test('a grabber hit mid-grab lets go (defect: the victim stayed grabbed forever)', () => {
  const { w, c, a, b } = mk('mike', 'tim');
  b.body.x = a.x + 50; a.body.facing = 1; run(w, 1);
  c[0].q.add('s1');
  for (let i = 0; i < 40 && b.state !== 'grabbed'; i++) run(w, 1);
  assert.equal(b.state, 'grabbed');
  a.takeHit({ dmg: 5, kb: 5, kbScale: 5, kbAngle: 40, dir: -1 });   // a third party (Claude, a stray shot) hits Mike
  run(w, 2);
  assert.notEqual(b.state, 'grabbed', 'Tim is released');
});
