// Practice arena logic (src/engine/practice.js): the combo counter and the dummy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FightWorld } from '../src/engine/combat.js';
import { ComboTracker, DummyController } from '../src/engine/practice.js';
import { kitRows } from '../src/screens/movelist.js';
import { geometryOf } from '../src/data/stages.js';
import { byId, CHARACTERS } from '../src/data/characters.js';

const fx = new Proxy({}, { get: () => () => {} });
const mk = (mode = 'stand') => {
  const idle = new DummyController('stand');
  const w = new FightWorld({ cfgs: [byId('tim'), byId('ben')], controllers: [idle, new DummyController(mode)], stage: geometryOf('office'), fx, audio: { play() {} }, rng: () => 0.5, settings: {} });
  for (let i = 0; i < 5; i++) w.update();
  const [a, d] = w.fighters;
  const combo = new ComboTracker(w, a, d);
  const step = (n = 1) => { for (let i = 0; i < n; i++) { for (const f of w.fighters) f.controller.update?.(f, w); w.update(); combo.update(); } };
  const hit = (dmg = 5, kb = 4) => d.takeHit({ dmg, kb, kbScale: 4, kbAngle: 45, dir: 1, from: a, move: { name: 'Test Jab' } });
  return { w, a, d, combo, step, hit };
};

test('hits that land while the dummy is still in hitstun count as one true combo', () => {
  const { d, combo, step, hit } = mk();
  hit(); step(3);
  assert.ok(d.state === 'hitstun');
  hit(); step(3); hit();
  assert.equal(combo.hits, 3);
  assert.equal(combo.dmg, 15);
  step(200);
  assert.equal(combo.hits, 0, 'the combo closes once the dummy is free');
  assert.deepEqual(combo.ended, { hits: 3, dmg: 15 });
  assert.equal(combo.best, 3);
  assert.equal(combo.dropped, null, 'nothing was dropped');
});

test('a hit on a dummy that was free a moment ago starts a new combo and reports the drop with the gap', () => {
  const { d, combo, step, hit } = mk();
  hit(); step(3); hit();
  let n = 0; while (!d.actionable && n++ < 200) step();
  step(6);
  hit();
  assert.equal(combo.hits, 1, 'fresh combo');
  // the gap counts from the end of the escape lock (PHYS.POST_STUN_LOCK): 6 free-looking frames, 3 of them locked
  assert.ok(combo.dropped && combo.dropped.gap >= 3 && combo.dropped.gap <= 7, `gap ${combo.dropped?.gap}`);
});

test('frame advantage on hit is measured (dummy free minus attacker free)', () => {
  const { combo, step, hit } = mk();
  hit(5, 6); step(120);
  assert.equal(typeof combo.adv, 'number');
  assert.ok(combo.adv > 0, 'an idle attacker is free before the stunned dummy');
  assert.ok(combo.last.kb > 0 && combo.last.name === 'Test Jab');
});

test('dummy modes: stand stays put, walk moves, jump leaves the floor', () => {
  const s = mk('stand'), x0 = s.d.x; s.step(120); assert.ok(Math.abs(s.d.x - x0) < 1);
  const w = mk('walk'), x1 = w.d.x; w.step(60); assert.ok(Math.abs(w.d.x - x1) > 30);
  const j = mk('jump'); let air = false; for (let i = 0; i < 150; i++) { j.step(); if (!j.d.grounded) air = true; } assert.ok(air);
});

test('every fighter has a full move list (15 rows, every move named and framed)', () => {
  for (const cfg of CHARACTERS) {
    const rows = kitRows(cfg);
    assert.equal(rows.length, 15, `${cfg.id}`);
    for (const [, m] of rows) assert.ok(m.name, `${cfg.id}: unnamed move`);
  }
});
