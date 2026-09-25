import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHYS } from '../src/data/physics.js';

// These values are canonical in BALANCE.md ("physics.js — Phase-3 retune").
// If you tune them, change BALANCE.md in the same commit.
test('PHYS matches the BALANCE.md Phase-3 table', () => {
  assert.equal(PHYS.GRAV, 0.85);
  assert.equal(PHYS.RUN_ACCEL, 0.9);
  assert.equal(PHYS.TURN_ACCEL_MULT, 2.2);
  assert.equal(PHYS.RUN_FRICTION, 0.76);
  assert.equal(PHYS.AIR_ACCEL, 0.55);
  assert.equal(PHYS.AIR_MAX_FACTOR, 0.9);
  assert.equal(PHYS.FAST_FALL_MULT, 2.2);
  assert.equal(PHYS.DASH_SPEED_FACTOR, 2.0);
  assert.equal(PHYS.DASH_DURATION, 16);
  assert.equal(PHYS.DASH_TAP_WINDOW, 16);
  assert.equal(PHYS.DASH_COOLDOWN, 12);
  assert.equal(PHYS.AIR_DASH_DURATION, 10);
  assert.equal(PHYS.AIR_JUMPS, 2);
  assert.equal(PHYS.DASH_JUMP_CARRY, 1.0);
  assert.equal(PHYS.DOUBLE_JUMP_FACTOR, 1.0);
  assert.equal(PHYS.COYOTE_FRAMES, 5);
  assert.equal(PHYS.INPUT_BUFFER, 6);
  assert.equal(PHYS.DODGE_COOLDOWN, 60);
  assert.equal(PHYS.STEP_DODGE_IMPULSE, 6);
  assert.equal(PHYS.SPOT_DODGE_DURATION, 18);
  assert.equal(PHYS.AIR_DODGE_DURATION, 22);
  assert.equal(PHYS.AIR_DODGE_IMPULSE, 7);
  assert.equal(PHYS.DROP_THROUGH_GRACE, 8);
  assert.equal(PHYS.KB_BASE_MULT, 0.8);
  assert.equal(PHYS.KB_SCALE_MULT, 2.0);
  assert.equal(PHYS.HITSTUN_PER_KB, 1.6);
  assert.equal(PHYS.LEDGE_HANG_MAX, 90);
  assert.equal(PHYS.LEDGE_INVULN, 20);
  assert.equal(PHYS.LEDGE_REGRAB_CD, 45);
  assert.equal(PHYS.LEDGE_JUMP_FACTOR, 0.8);
  assert.equal(PHYS.LAUNCH_DRAG, 0.975);
  assert.equal(PHYS.STUN_LANDING_CLEARS, false);
  assert.equal(PHYS.AIR_MOMENTUM_DECAY, 0.985);
  assert.equal(PHYS.GROUND_DEADZONE, 0.05);
});
