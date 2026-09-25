import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FightWorld } from '../src/engine/combat.js';
import { EventDirector } from '../src/engine/events.js';
import { EVENTS } from '../src/data/events.js';
import { geometryOf } from '../src/data/stages.js';
import { byId } from '../src/data/characters.js';

class Idle {
  constructor() { this.reversed = false; this.isCPU = true; }
  intent() { return { left: false, right: false, down: false, downTapped: false, jump: false, dodge: false, dashLeft: false, dashRight: false }; }
  buffered() { return false; } consume() {} held() { return false; } pressed() { return false; } update() {}
}
const stubFx = { text() {}, spark() {}, dust() {}, ember() {}, confetti() {}, banner() {}, flash() {}, hitstop() {}, shake() {}, slowmo() {} };
const stubAudio = { play() {} };
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mk = (a = 'mike', b = 'tim', stage = 'office', seed = 5) => {
  const rng = mulberry32(seed);
  const c = [new Idle(), new Idle()];
  const w = new FightWorld({ cfgs: [byId(a), byId(b)], controllers: c, stage: geometryOf(stage), fx: stubFx, audio: stubAudio, rng, settings: {} });
  const d = new EventDirector(w, EVENTS, { enabled: true, difficulty: 'normal' });
  return { w, d, c };
};
const step = (w, d) => { for (const f of w.fighters) f.controller.update(f, w); w.update(); d.update(); };
const run = (w, d, n) => { for (let i = 0; i < n; i++) step(w, d); };
// run until the forced event has started and finished (or the budget runs out)
const runEvent = (w, d, id, budget = 2400) => {
  d.force(id);
  let started = false;
  for (let i = 0; i < budget; i++) {
    step(w, d);
    if (d.active?.def.id === id) started = true;
    if (started && !d.active) return i;
  }
  return -1;
};

test('every event runs to completion headlessly without throwing and leaves both fighters actionable', () => {
  for (const id of ['underwriting', 'wave', 'spin', 'firedrill', 'berlin']) {
    const { w, d } = mk();
    run(w, d, 5);
    const home = w.stage;
    const t = runEvent(w, d, id);
    assert.ok(t >= 0, `${id} ran to completion`);
    assert.ok(d.fired.includes(id));
    run(w, d, 40);
    for (const f of w.fighters) {
      assert.equal(f.state, 'normal', `${id}: ${f.cfg.id} is back to normal`);
      assert.equal(f.stocks, 3, `${id}: hazards never took a stock`);
      assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y));
    }
    assert.equal(w.stage, home, `${id}: geometry restored`);
    assert.equal(d.stageOverride, null);
    assert.equal(w.director, d, 'the director is reachable from the world (CPU reads hazards)');
  }
});

test('the Berlin trip swaps geometry both ways, buffs Mike while abroad, and only fires once', () => {
  const { w, d } = mk('mike', 'tim');
  run(w, d, 5);
  const home = w.stage, mike = w.fighters[0];
  d.force('berlin');
  let abroad = 0;
  for (let i = 0; i < 2400; i++) {
    step(w, d);
    if (d.active?.def.id === 'berlin' && d.active.phase === 'live') {
      abroad++;
      assert.equal(w.stage, geometryOf('berlin'));
      assert.equal(d.stageOverride, 'berlin');
      assert.ok(mike.hasStatus('berlin'));
      for (const f of w.fighters) assert.ok(f.x >= w.stage.slabs[0].x && f.x <= w.stage.slabs[0].x + w.stage.slabs[0].w, 'both stand on the gate slab');
    }
    if (abroad && !d.active) break;
  }
  assert.ok(abroad > 600, 'the trip lasted ~12 s');
  assert.equal(w.stage, home);
  assert.ok(!mike.hasStatus('berlin'));
  assert.ok(d.usedThisMatch.has('berlin'));
  d.force('berlin');
  run(w, d, 400);
  assert.equal(d.fired.filter(x => x === 'berlin').length, 1, 'oncePerMatch holds even when forced');
});

test('the wave never pushes toward a blast zone: every shove points at centre stage with kb <= 6', () => {
  const { w, d } = mk('tim', 'ben', 'palace');
  run(w, d, 5);
  const slab = w.stage.slabs[0], mid = slab.x + slab.w / 2;
  w.fighters[0].body.x = slab.x + 40; w.fighters[1].body.x = slab.x + slab.w - 40;
  const hits = [];
  for (const f of w.fighters) { const orig = f.takeHit.bind(f); f.takeHit = (o) => { hits.push({ f, x: f.x, ...o }); return orig(o); }; }
  assert.ok(runEvent(w, d, 'wave') >= 0);
  assert.equal(hits.length, 2, 'both grounded fighters got shoved once');
  for (const h of hits) {
    assert.equal(h.dir, h.x < mid ? 1 : -1, `${h.f.cfg.id} was shoved toward centre`);
    assert.ok(h.kb <= 6 && (h.kbScale ?? 0) === 0, 'below kill-class, no emptiness scaling');
  }
  run(w, d, 120);
  for (const f of w.fighters) { assert.equal(f.stocks, 3); assert.ok(f.x > slab.x && f.x < slab.x + slab.w, 'still over the slab'); }
});

test('fire drill: misses cost 6 gauge with no stun, present fighters pay nothing, the marker sits well inside the slab', () => {
  const { w, d } = mk('tim', 'ben', 'office');
  run(w, d, 5);
  const slab = w.stage.slabs[0];
  const [a, b] = w.fighters;
  const g0 = a.gauge;
  d.force('firedrill');
  let live = false, resolved = -1;
  for (let i = 0; i < 2400; i++) {
    step(w, d);
    const act = d.active;
    if (act?.def.id === 'firedrill' && act.phase === 'live' && !live) {
      live = true;
      assert.ok(act.data.x > slab.x + 100 && act.data.x < slab.x + slab.w - 100, 'never near a blast zone');
      a.body.x = act.data.x;                                     // Tim reports to the assembly point
      b.body.x = act.data.x < slab.x + slab.w / 2 ? slab.x + slab.w - 40 : slab.x + 40;   // Ben stays at his desk
    }
    if (live && !d.active) { resolved = i; break; }
  }
  assert.ok(resolved > 0);
  assert.equal(a.gauge, g0, 'present: no cost');
  assert.equal(b.gauge, b.maxGauge - 6, 'missed roll call: -6');
  assert.equal(b.state, 'normal'); assert.equal(b.body.stun, 0); assert.equal(b.attack, null);
});

test('urgent underwriting: only when both are grounded, winner +20 meter, loser gets a non-comboable hazard stagger', () => {
  const { w, d } = mk('tim', 'ben');
  run(w, d, 5);
  const [a, b] = w.fighters;
  b.body.y -= 200; b.body.grounded = false; b.body.vy = -14;     // Ben is in the air: the deal waits for him
  d.force('underwriting');
  let frozenSeen = false, done = -1;
  for (let i = 0; i < 1200; i++) {
    step(w, d);
    if (w.fighters.some(f => f.state === 'frozen')) {
      frozenSeen = true;
      assert.ok(w.fighters.every(f => f.state === 'frozen' || f.state !== 'hitstun'), 'freeze covers both');
    }
    if (frozenSeen && !d.active) { done = i; break; }
  }
  assert.ok(frozenSeen && done > 0, 'the deal went through once both were grounded');
  const winner = w.fighters.find(f => f.meter >= 20), loser = w.fighters.find(f => f !== winner);
  assert.ok(winner, 'someone submitted first');
  assert.equal(winner.gauge, winner.maxGauge, 'meter only, no gauge reward');
  assert.equal(loser.state, 'stagger');
  assert.ok(loser.hazardInv > 0, 'invulnerable through the recovery — never comboable');
  assert.equal(loser.gauge, loser.maxGauge);
  run(w, d, 60);
  assert.ok(w.fighters.every(f => f.state === 'normal'));
});

test('pacing: nothing rolls before ~10 s and never more than two events per stock-fall', () => {
  const { w, d } = mk('tim', 'ben');
  for (let i = 0; i < 590; i++) { step(w, d); assert.equal(d.fired.length, 0, 'no event before 10 s'); }
  let last = 0;
  for (let i = 0; i < 9000 && !w.over; i++) { step(w, d); if (d.fired.length > last) { last = d.fired.length; assert.ok(d.firedThisStock <= 2); } }
  assert.ok(d.fired.length >= 2, 'events do fire over a long idle match');
  assert.ok(d.fired.length <= 2, 'with no stock-fall the per-stock cap holds');
});
