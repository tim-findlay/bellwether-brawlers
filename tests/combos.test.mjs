// The combo system and its blueprint (DESIGN.md "Combos", BALANCE.md "Combo doctrine").
// The ship rule for any fighter, current or new: every universal route in
// src/data/combos.js lands as a TRUE combo across its composure window, against
// the lightest, a mid-weight and the heaviest opponent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeHolds, runRoute, leniency, LENIENCY } from '../src/dev/combos.js';
import { ROUTES } from '../src/data/combos.js';
import { CHARACTERS } from '../src/data/characters.js';
import { expandKit, aerials } from '../src/data/characters/_shared.js';
import { FightWorld } from '../src/engine/combat.js';
import { DummyController } from '../src/engine/practice.js';
import { geometryOf } from '../src/data/stages.js';
import { byId } from '../src/data/characters.js';
import { PHYS } from '../src/data/physics.js';

const byWeight = [...CHARACTERS].sort((a, b) => a.stats.weight - b.stats.weight);
const OPPONENTS = [byWeight[0].id, 'tim', byWeight[byWeight.length - 1].id];

test('blueprint: every fighter lands every universal route as a true combo, vs light / mid / heavy opponents', () => {
  const fails = [];
  for (const c of CHARACTERS) for (const r of ROUTES) for (const o of OPPONENTS) {
    const h = routeHolds(c.id, r, o);
    if (!h.ok) fails.push(`${c.id} ${r.id} vs ${o} @ ${h.fails.map(f => `${f.e}%(${f.best}/${f.need})`).join(' ')}`);
  }
  assert.deepEqual(fails, []);
});

test('feel: every step of every route forgives a human — at least LENIENCY frames late still lands it', () => {
  const tight = [];
  for (const c of CHARACTERS) for (const r of ROUTES) {
    const l = leniency(c.id, r);
    if (!l.ok) tight.push(`${c.id} ${r.id}: ${l.windows.join('/')}`);
  }
  assert.deepEqual(tight, [], `every step needs >= ${LENIENCY} frames of slack`);
});

test('blueprint: a brand-new fighter built from a bare character file gets working combos for free', () => {
  // a deliberately different frame profile: slow jab, slow heavy, a big body — nothing hand-tuned
  const rookie = expandKit({
    id: 'rookie', name: 'ROOKIE', title: 'THE NEW STARTER', archetype: 'Test fighter',
    body: { suit: '#445566', trim: '#aa8844', skin: '#e0b894', hair: { color: '#553322', style: 'short' }, height: 1.0, extras: [] },
    stats: { gauge: 104, runMax: 5.0, jumpImpulse: 15, fallMax: 13, weight: 1.06 },
    light: { name: 'Stapler', dmg: 5, kb: 5, kbScale: 5, kbAngle: 40, range: 58, startup: 6, active: 3, recover: 14 },
    heavy: { name: 'Hole Punch', dmg: 11, kb: 7, kbScale: 12, kbAngle: 40, range: 66, startup: 16, active: 4, recover: 20 },
    aerials: aerials({ n: 'Spin', s: 'Swipe', u: 'Toss', d: 'Drop' }, { n: { startup: 8 }, s: { startup: 10 } }),
    s1: { name: 'Memo', kind: 'projectile', dmg: 6, kb: 5, kbScale: 5, kbAngle: 30, speed: 5, w: 20, h: 14, cooldown: 300, startup: 12, active: 2, recover: 16 },
    s2: { name: 'Reply All', kind: 'projectile', dmg: 6, kb: 5, kbScale: 5, kbAngle: 30, speed: 5, w: 20, h: 14, cooldown: 300, startup: 12, active: 2, recover: 16 },
    super: { name: 'Offsite', kind: 'melee', dmg: 20, kb: 9, kbScale: 15, kbAngle: 40, range: 80, startup: 14, active: 6, recover: 30 },
  });
  const fails = [];
  for (const r of ROUTES) { const h = routeHolds(rookie, r, 'tim'); if (!h.ok) fails.push(`${r.id} @ ${h.fails.map(f => f.e + '%').join(' ')}`); }
  assert.deepEqual(fails, []);
});

test('starters are fixed force: the jab shoves the same at full and at empty composure; enders still scale', () => {
  for (const c of CHARACTERS) {
    assert.ok(c.lights.n.kbScale <= 1.5 && c.lights.s.kbScale <= 1.5 && c.lights.d.kbScale <= 1.5 && c.aerials.n.kbScale <= 1.5, `${c.id} starters`);
    assert.ok(c.sigs.s.kbScale >= 8 && c.aerials.s.kbScale >= 8, `${c.id} enders keep their kill scaling`);
    for (const m of [c.lights.n, c.lights.s, c.lights.d, c.aerials.n]) assert.ok(m.stun >= 12, `${c.id} ${m.name} stun`);
  }
});

// a scripted light string on a standing dummy, to probe the rules directly
function world(att = 'adrian', dummy = 'tim') {
  const press = { t: 0, p: {}, update() { this.t++; }, buffered(a) { return this.p[a] !== undefined && this.t - this.p[a] <= 5; },
    consume(a) { delete this.p[a]; }, held() { return false; }, pressed() { return false; }, reversed: false, isCPU: true,
    intent() { return { left: false, right: false, down: false, downTapped: false, jump: this.buffered('up'), dodge: this.buffered('dodge'), dashLeft: false, dashRight: false }; } };
  const dctl = new DummyController('stand');
  const w = new FightWorld({ cfgs: [byId(att), byId(dummy)], controllers: [press, dctl], stage: geometryOf('palace'), fx: new Proxy({}, { get: () => () => {} }), audio: { play() {} }, rng: () => 0.5, settings: {} });
  for (let i = 0; i < 5; i++) w.update();
  const [a, d] = w.fighters; d.body.x = a.x + 56;
  const step = () => { for (const f of w.fighters) f.controller.update?.(f, w); w.update(); };
  return { w, a, d, press, step };
}

test('stale rule: the same move twice in one combo only gets half its fixed stun (no jab loops)', () => {
  const { a, d, press, step } = world();
  press.p.light = press.t; step();
  let first = 0; for (let i = 0; i < 12; i++) { step(); if (d.body.stun > first) first = d.body.stun; }
  assert.ok(first >= a.cfg.lights.n.stun - 2, `first jab stun ${first}`);
  // cancel into the SAME jab
  for (let i = 0; i < 20 && d.body.stun > 0; i++) { press.p.light = press.t; step(); if (a.attack?.frame === 1) break; }
  let second = 0; for (let i = 0; i < 12; i++) { step(); second = Math.max(second, a.attack?.hasHit ? d.body.stun : 0); }
  assert.ok(second > 0 && second <= Math.ceil(a.cfg.lights.n.stun * PHYS.STALE_STUN_MULT) + 1, `stale repeat stun ${second}`);
});

test('escape window: for POST_STUN_LOCK frames after hitstun the victim cannot dodge or jump', () => {
  const { d, step } = world();
  d.body.launch(0, 0, 10);
  for (let i = 0; i < 10; i++) step();
  assert.equal(d.body.stun, 0);
  const intent = { left: false, right: false, down: false, downTapped: false, jump: true, dodge: true, dashLeft: false, dashRight: false };
  const stage = geometryOf('palace');
  for (let i = 0; i < PHYS.POST_STUN_LOCK; i++) { d.body.update(intent, stage); assert.ok(!d.body.dodging && d.body.grounded, `locked on frame ${i}`); }
  d.body.update(intent, stage);
  assert.ok(d.body.dodging || !d.body.grounded, 'free after the lock');
});

test('chase dodge: only after a landed hit, once per airtime, no i-frames, cut short by an attack', () => {
  const { a, d, press, step } = world();
  press.p.dodge = press.t; step();
  assert.notEqual(a.body.state, 'chase', 'no hit, no chase — a plain dodge instead');
  for (let i = 0; i < 70; i++) step();
  press.p.light = press.t; for (let i = 0; i < 8; i++) step();
  assert.ok(a.attack?.hasHit, 'the jab landed');
  press.p.dodge = press.t; step(); step();
  assert.equal(a.body.state, 'chase');
  assert.equal(a.body.invulnerable(), false, 'a chase dodge protects nothing');
  press.p.light = press.t; step(); step();
  assert.ok(a.attack && a.body.state !== 'chase', 'an attack cuts the chase short');
  assert.ok(runRoute('adrian', ROUTES.find(r => r.id === 'chase'), 0).ok);
  void d;
});
