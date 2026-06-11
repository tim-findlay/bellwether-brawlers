import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHYS } from '../src/data/physics.js';
import { MovementBody } from '../src/engine/movement.js';

// Shared fixtures ------------------------------------------------------
export const MID = { runMax: 3.1, jumpImpulse: 11, fallMax: 11, weight: 1.0 };
export const STAGE = {
  slabs: [{ x: 380, y: 700, w: 520, h: 60 }],          // main slab, top at y=700
  platforms: [{ x: 430, y: 560, w: 150 }, { x: 700, y: 560, w: 150 }],
  blast: { left: -200, right: 1480, top: -300, bottom: 1100 },
  spawn: { x: 640, y: 700 },
};
export const IDLE = Object.freeze({
  left: false, right: false, down: false, downTapped: false,
  jump: false, dodge: false, dashLeft: false, dashRight: false,
});
export const step = (body, intent = IDLE, n = 1, stage = STAGE) => {
  for (let i = 0; i < n; i++) body.update({ ...IDLE, ...intent }, stage);
};

test('gravity accelerates a falling body and clamps at fallMax', () => {
  const b = new MovementBody(MID, { x: 100, y: 300 });   // mid-air, clear of ALL surfaces
  step(b);                                               // (falls forever — never lands)
  assert.equal(b.vy, PHYS.GRAV);
  step(b, IDLE, 200);
  assert.equal(b.vy, MID.fallMax);                        // clamped
  assert.ok(b.y > 300);
});

test('a body spawned in the air is airborne, not grounded', () => {
  const b = new MovementBody(MID, { x: 640, y: 300 });
  step(b);
  assert.equal(b.grounded, false);
  assert.equal(b.state, 'air');
});
