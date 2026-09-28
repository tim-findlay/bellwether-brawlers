// The party events (src/data/events/*): The Wave, Spin Class, Fire Drill, Ginger Shot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FightWorld } from '../src/engine/combat.js';
import { EventDirector } from '../src/engine/events.js';
import { EVENTS } from '../src/data/events.js';
import { GINGER_HEAL } from '../src/data/events/ginger.js';
import { geometryOf } from '../src/data/stages.js';
import { byId } from '../src/data/characters.js';
import { PHYS } from '../src/data/physics.js';

class Idle {
  constructor() { this.reversed = false; this.isCPU = true; this.dir = 0; }
  intent() { return { left: this.dir < 0, right: this.dir > 0, down: false, downTapped: false, jump: false, dodge: false, dashLeft: false, dashRight: false }; }
  buffered() { return false; } consume() {} held() { return false; } pressed() { return false; } update() {}
}
const stubFx = { text() {}, spark() {}, dust() {}, ember() {}, confetti() {}, banner() {}, flash() {}, hitstop() {}, shake() {}, slowmo() {} };
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mk = (stage = 'office', seed = 5) => {
  const c = [new Idle(), new Idle()];
  const w = new FightWorld({ cfgs: [byId('tim'), byId('ben')], controllers: c, stage: geometryOf(stage), fx: stubFx, audio: { play() {} }, rng: mulberry32(seed), settings: {} });
  const d = new EventDirector(w, EVENTS, { enabled: true, difficulty: 'normal', stageId: stage });
  for (let i = 0; i < 5; i++) step(w, d);
  return { w, d, c };
};
function step(w, d) { w.update(); d.update(); }
const live = (w, d, id) => { d.firedThisStock = 0; d.force(id); for (let i = 0; i < 500 && !(d.active?.def.id === id && d.active.phase === 'live'); i++) step(w, d); assert.equal(d.active?.phase, 'live', `${id} went live`); return d.active; };
const place = (f, x, y) => { f.body.x = x; f.body.y = y; f.body.vx = 0; f.body.vy = 0; f.body.grounded = true; };

test('the wave: floor fighters wipe out straight up (no damage, no stock), surfers on the boards bank meter', () => {
  const { w, d } = mk('office');
  const [a, b] = w.fighters, slab = w.stage.slabs[0], board = w.stage.platforms[0];
  const ev = live(w, d, 'wave');
  place(a, slab.x + slab.w / 2, slab.y); place(b, board.x + board.w / 2, board.y);
  let popped = false, x0 = a.x;
  for (let i = 0; i < 400 && d.active; i++) {
    if (!popped && a.body.vy < -5) { popped = true; assert.ok(Math.abs(a.x - x0) < 2, 'popped straight up, not along the wave'); }
    if (b.grounded) b.body.x = board.x + board.w / 2;
    step(w, d);
  }
  assert.ok(popped, 'the floor fighter wiped out');
  assert.ok(ev.data.hit.has(a) && !ev.data.hit.has(b), 'the surfer rode over it');
  assert.ok(b.meter >= 10, `surfing banked meter (${b.meter})`);
  for (const f of w.fighters) { assert.equal(f.gauge, f.maxGauge, 'no damage'); assert.equal(f.stocks, 3); }
});

test('spin class: the floor bounces grounded fighters on the DROP, airborne fighters catch the beat (+4), MVP +10', () => {
  const { w, d } = mk('office');
  const [a, b] = w.fighters, slab = w.stage.slabs[0], mid = slab.x + slab.w / 2;
  const ev = live(w, d, 'spin');
  let bounced = 0;
  for (let i = 0; i < 900 && d.active; i++) {
    place(a, mid - 150, slab.y);                                 // Tim stands still on the floor all class
    b.body.x = mid + 150; b.body.y = slab.y - 200; b.body.vy = 0; b.body.grounded = false;   // Ben hangs in the air
    step(w, d);
    if (a.body.vy < -10) bounced++;
  }
  assert.equal(bounced, 6, 'one bounce per bar, six bars');
  assert.equal(ev.data.caught[1], 6);
  assert.equal(b.meter, 6 * 4 + 10, 'six beats caught + MVP');
  assert.equal(a.meter, 0);
});

test('fire drill: foam is slick only on the middle of the slab, never near the lips; roll call pays +14 then +5', () => {
  const { w, d } = mk('office');
  const [a, b] = w.fighters, slab = w.stage.slabs[0], mid = slab.x + slab.w / 2;
  const ev = live(w, d, 'firedrill');
  for (let i = 0; i < 200; i++) step(w, d);                     // all the foam is down
  for (const p of ev.data.patches) assert.ok(p.x >= slab.x + 100 && p.x + 64 <= slab.x + slab.w - 100, 'foam stops short of the lips');
  for (let i = 0; i < 12; i++) { place(a, mid, slab.y); place(b, slab.x + 30, slab.y); step(w, d); }   // (the status outlives the foam by 8f)
  assert.ok(a.hasStatus('slick') && !b.hasStatus('slick'), 'foamed in the middle, dry at the edge');
  // muster: Tim first, then Ben
  const m = ev.data;
  for (let i = 0; i < 90; i++) { place(a, m.x, m.s.y); step(w, d); }
  for (let i = 0; i < 90 && d.active; i++) { place(b, m.x, m.s.y); step(w, d); }
  assert.equal(a.meter, 14); assert.equal(b.meter, 5);
  assert.ok(!d.active, 'everyone accounted for ends the drill');
  assert.ok(!a.hasStatus('slick') && !b.hasStatus('slick'), 'the foam goes with it');
});

test('slick floor: a fighter who lets go keeps sliding much further than on a dry floor', () => {
  const slide = (slick) => {
    const { w, d, c } = mk('office');
    const [a] = w.fighters, slab = w.stage.slabs[0];
    place(a, slab.x + 200, slab.y); w.fighters[1].body.x = slab.x + slab.w - 40;
    c[0].dir = 1; for (let i = 0; i < 30; i++) { if (slick) a.applyStatus('slick', 8); step(w, d); }
    c[0].dir = 0; const x0 = a.x;
    for (let i = 0; i < 60; i++) { if (slick) a.applyStatus('slick', 8); step(w, d); }
    return a.x - x0;
  };
  const dry = slide(false), wet = slide(true);
  assert.ok(PHYS.SLICK_FRICTION > PHYS.RUN_FRICTION);
  assert.ok(wet > dry * 3, `slides ${wet.toFixed(0)} px foamed vs ${dry.toFixed(0)} px dry`);
});

test('ginger shot: the first to touch it gets +20 composure (never past full); a full gauge takes +5 meter', () => {
  const { w, d } = mk('office');
  const [a, b] = w.fighters;
  a.gauge = a.maxGauge - 50;
  const ev = live(w, d, 'ginger');
  for (let i = 0; i < 200 && !ev.data.landed; i++) step(w, d);
  place(a, ev.data.x, ev.data.s.y); step(w, d);
  assert.equal(a.gauge, a.maxGauge - 50 + GINGER_HEAL);
  assert.ok(!d.active, 'one shot, one drinker');
  a.gauge = a.maxGauge - 5;
  const ev2 = live(w, d, 'ginger');
  for (let i = 0; i < 200 && !ev2.data.landed; i++) step(w, d);
  place(a, ev2.data.x, ev2.data.s.y); step(w, d);
  assert.equal(a.gauge, a.maxGauge, 'capped at full');
  const slab = w.stage.slabs[0];
  place(a, slab.x + 20, slab.y); place(b, slab.x + slab.w - 20, slab.y);   // nobody standing on a spot
  const ev3 = live(w, d, 'ginger');
  for (let i = 0; i < 200 && !ev3.data.landed; i++) step(w, d);
  const m0 = b.meter; place(b, ev3.data.x, ev3.data.s.y); step(w, d);
  assert.equal(b.meter, m0 + 5, 'full gauge: meter instead');
});

test('ginger shot spots are the centre or mirrored either side of it', () => {
  const xs = new Set();
  for (let seed = 1; seed < 30; seed++) {
    const { w, d } = mk('office', seed), slab = w.stage.slabs[0], mid = slab.x + slab.w / 2;
    const ev = live(w, d, 'ginger');
    xs.add(Math.round(ev.data.x - mid));
  }
  for (const x of xs) assert.ok(x === 0 || xs.has(-x) || Math.abs(x) < 120, `spot ${x} is central or mirrored`);
});
