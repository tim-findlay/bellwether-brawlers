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
const mk = (a = 'mike', b = 'tim', stage = 'office', seed = 5, stageId = null) => {
  const rng = mulberry32(seed);
  const c = [new Idle(), new Idle()];
  const w = new FightWorld({ cfgs: [byId(a), byId(b)], controllers: c, stage: geometryOf(stage), fx: stubFx, audio: stubAudio, rng, settings: {} });
  const d = new EventDirector(w, EVENTS, { enabled: true, difficulty: 'normal', stageId });
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

const EVENT_STAGE = { sprinkler: 'office', gust: 'rooftop', train: 'tube' };

test('every event runs to completion headlessly without throwing and leaves both fighters actionable', () => {
  for (const ev of EVENTS) {
    const id = ev.id, stage = EVENT_STAGE[id] || 'office';
    const { w, d } = mk('mike', 'tim', stage, 5, stage);
    run(w, d, 5);
    const home = w.stage;
    const t = runEvent(w, d, id);
    assert.ok(t >= 0, `${id} ran to completion`);
    assert.ok(d.fired.includes(id));
    run(w, d, 40);
    for (const f of w.fighters) {
      assert.ok(['normal', 'hitstun'].includes(f.state), `${id}: ${f.cfg.id} is actionable again`);
      assert.equal(f.stocks, 3, `${id}: events never took a stock`);
      assert.equal(f.gauge, f.maxGauge, `${id}: events never cost or heal composure`);
      assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y));
    }
    assert.equal(w.stage, home, `${id}: geometry restored`);
    assert.equal(d.stageOverride, null);
    assert.equal(w.director, d, 'the director is reachable from the world (CPU reads events)');
  }
});

test('stage-bound events only roll on their stages', () => {
  const { w, d } = mk('tim', 'ben', 'palace', 5, 'palace');
  for (let i = 0; i < 40000 && d.fired.length < 12 && !w.over; i++) {
    step(w, d);
    if (d.fired.length >= 2 && !d.active) { d.firedThisStock = 0; }   // keep rolling past the per-stock cap
  }
  for (const id of d.fired) assert.ok(!['sprinkler', 'gust', 'train'].includes(id), `${id} does not belong on the palace`);
});

test('deal deadline: pages fall on mirrored spots, signing gives meter only, three signatures close the deal', () => {
  const { w, d } = mk('tim', 'ben');
  run(w, d, 5);
  const [a, b] = w.fighters, slab = w.stage.slabs[0], mid = slab.x + slab.w / 2;
  d.force('deal');
  let pages = null;
  for (let i = 0; i < 400 && !pages; i++) { step(w, d); if (d.active?.phase === 'live') pages = d.active.data.pages; }
  const xs = pages.map(p => Math.round(p.x - mid)).sort((x, y) => x - y);
  assert.deepEqual(xs, xs.map(x => 0 - x || 0).reverse(), 'pages are mirror-symmetric about centre stage');
  for (let i = 0; i < 200 && !pages.every(p => p.landed); i++) step(w, d);
  const onSlab = pages.filter(p => p.s === slab).slice(0, 3);
  for (const p of onSlab) { a.body.x = p.x; step(w, d); }
  assert.ok(!d.active, 'three signatures close it at once');
  assert.equal(a.meter, 6 * 3 + 15);
  assert.equal(b.meter, 0);
  assert.equal(a.gauge, a.maxGauge);
});

test('investment committee: the fighter holding the room alone wins the vote (+22), a contested room earns nothing', () => {
  const { w, d } = mk('tim', 'ben');
  run(w, d, 5);
  const [a, b] = w.fighters;
  d.force('ic');
  for (let i = 0; i < 400 && d.active?.phase !== 'live'; i++) step(w, d);
  const room = d.active.data;
  let t = 0;
  while (d.active && t++ < 600) { a.body.x = room.x; a.body.y = room.s.y; a.body.vy = 0; a.body.grounded = true; step(w, d); }
  assert.ok(a.meter >= 22, 'Tim held the room: approved');
  assert.equal(b.meter, 0);
  const { w: w2, d: d2 } = mk('tim', 'ben');
  run(w2, d2, 5);
  d2.force('ic');
  for (let i = 0; i < 400 && d2.active?.phase !== 'live'; i++) step(w2, d2);
  const r2 = d2.active.data;
  t = 0;
  while (d2.active && t++ < 600) { for (const f of w2.fighters) { f.body.x = r2.x; f.body.y = r2.s.y; f.body.vy = 0; f.body.grounded = true; } step(w2, d2); }
  assert.ok(w2.fighters.every(f => f.meter === 0), 'contested the whole time: deferred');
});

test('site visit: two mirrored scaffold decks are solid only while landed, then the geometry is restored exactly', () => {
  const { w, d } = mk('tim', 'ben');
  run(w, d, 5);
  const home = w.stage, n = home.platforms.length, slab = home.slabs[0], mid = slab.x + slab.w / 2;
  d.force('site');
  let solid = 0;
  for (let i = 0; i < 1400 && (d.fired.length === 0 || d.active); i++) {
    step(w, d);
    if (w.stage !== home) {
      solid++;
      const decks = w.stage.platforms.slice(n);
      assert.equal(decks.length, 2);
      assert.equal(Math.round(decks[0].x + decks[0].w / 2 - mid), -Math.round(decks[1].x + decks[1].w / 2 - mid), 'mirrored');
    }
  }
  assert.ok(solid >= 520, 'the decks stay ~9 s');
  assert.equal(w.stage, home);
});

test('sprinkler test: only grounded fighters on the wet half are slowed, and the halves swap', () => {
  const { w, d } = mk('tim', 'ben', 'office', 5, 'office');
  run(w, d, 5);
  const [a, b] = w.fighters, slab = w.stage.slabs[0], mid = slab.x + slab.w / 2;
  d.force('sprinkler');
  for (let i = 0; i < 400 && d.active?.phase !== 'live'; i++) step(w, d);
  const first = d.active.data.first;
  const put = () => { a.body.x = mid + first * 200; b.body.x = mid - first * 200; };
  put(); run(w, d, 20);
  assert.ok(a.hasStatus('slow') && !b.hasStatus('slow'), 'wet side slowed, dry side not');
  while (d.active && d.active.t < d.active.data.half + 40) { put(); step(w, d); }
  assert.ok(b.hasStatus('slow'), 'second half: the other side is wet');
});

test('crosswind: airborne fighters drift toward centre, never outward; grounded and launched fighters are untouched', () => {
  const { w, d } = mk('tim', 'ben', 'rooftop', 5, 'rooftop');
  run(w, d, 5);
  const slab = w.stage.slabs[0], mid = slab.x + slab.w / 2, [a] = w.fighters;
  d.force('gust');
  for (let i = 0; i < 400 && d.active?.phase !== 'live'; i++) step(w, d);
  a.body.x = slab.x - 60; a.body.y = slab.y - 150; a.body.grounded = false; a.body.vx = 0; a.body.vy = -6;
  const x0 = a.x; step(w, d);
  assert.ok(a.x > x0, 'pushed back toward centre (inward), not toward the blast zone');
  assert.ok(Math.abs(a.x - x0) < 4, 'a nudge, not a launch');
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

test('pacing: nothing rolls before ~10 s and never more than two events per stock-fall', () => {
  const { w, d } = mk('tim', 'ben');
  for (let i = 0; i < 590; i++) { step(w, d); assert.equal(d.fired.length, 0, 'no event before 10 s'); }
  let last = 0;
  for (let i = 0; i < 9000 && !w.over; i++) { step(w, d); if (d.fired.length > last) { last = d.fired.length; assert.ok(d.firedThisStock <= 2); } }
  assert.ok(d.fired.length >= 2, 'events do fire over a long idle match');
  assert.ok(d.fired.length <= 2, 'with no stock-fall the per-stock cap holds');
});
