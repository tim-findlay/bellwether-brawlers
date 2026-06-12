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

const grounded = (b) => { b.grounded = true; b.vy = 0; b.state = 'idle'; return b; };

test('run accelerates toward runMax and never past it', () => {
  const b = grounded(new MovementBody(MID, { x: 640, y: 700 }));
  step(b, { right: true });
  assert.equal(b.vx, PHYS.RUN_ACCEL);
  assert.equal(b.facing, 1);
  step(b, { right: true }, 60);
  assert.equal(b.vx, MID.runMax);
  assert.equal(b.state, 'run');
});

test('friction decays vx on neutral ground input', () => {
  const b = grounded(new MovementBody(MID, { x: 640, y: 700 }));
  step(b, { right: true }, 30);
  step(b, {}, 1);
  assert.ok(Math.abs(b.vx - MID.runMax * PHYS.RUN_FRICTION) < 1e-9);
  step(b, {}, 120);
  assert.equal(b.vx, 0);                                  // deadzone snaps to 0
  assert.equal(b.state, 'idle');
});

test('air drift is capped below run speed and cannot brake excess momentum instantly', () => {
  const b = new MovementBody(MID, { x: 100, y: 300 });    // clear of all surfaces
  step(b, { right: true }, 120);
  assert.ok(Math.abs(b.vx - b.airMax) < 1e-9);            // drift cap
  b.vx = 8;                                               // excess (e.g. from a dash-jump)
  step(b, { right: true });
  assert.ok(b.vx > b.airMax && b.vx < 8);                 // decays, not clamped
});
