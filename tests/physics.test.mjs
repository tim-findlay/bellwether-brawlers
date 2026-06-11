import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHYS } from '../src/data/physics.js';

// These values are canonical in BALANCE.md ("physics.js — graybox starting
// values"). If you tune them, change BALANCE.md in the same commit.
test('PHYS matches the BALANCE.md starting-value table', () => {
  assert.equal(PHYS.GRAV, 0.55);
  assert.equal(PHYS.RUN_ACCEL, 0.35);
  assert.equal(PHYS.RUN_FRICTION, 0.82);
  assert.equal(PHYS.AIR_ACCEL, 0.22);
  assert.equal(PHYS.AIR_MAX_FACTOR, 0.85);
  assert.equal(PHYS.FAST_FALL_MULT, 2.5);
  assert.equal(PHYS.DASH_SPEED_FACTOR, 1.8);
  assert.equal(PHYS.DASH_DURATION, 14);
  assert.equal(PHYS.DASH_TAP_WINDOW, 12);
  assert.equal(PHYS.DASH_COOLDOWN, 24);
  assert.equal(PHYS.DASH_JUMP_CARRY, 1.0);
  assert.equal(PHYS.DOUBLE_JUMP_FACTOR, 0.92);
  assert.equal(PHYS.COYOTE_FRAMES, 5);
  assert.equal(PHYS.INPUT_BUFFER, 6);
  assert.equal(PHYS.DODGE_COOLDOWN, 72);
  assert.equal(PHYS.STEP_DODGE_IMPULSE, 3.5);
  assert.equal(PHYS.SPOT_DODGE_DURATION, 18);
  assert.equal(PHYS.AIR_DODGE_DURATION, 22);
  assert.equal(PHYS.AIR_DODGE_IMPULSE, 4.5);
  assert.equal(PHYS.DROP_THROUGH_GRACE, 8);
  assert.equal(PHYS.HITSTUN_PER_KB, 2.4);
});
