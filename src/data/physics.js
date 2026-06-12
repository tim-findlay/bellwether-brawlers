// Universal movement & knockback constants — BALANCE.md is canonical for
// these numbers ("physics.js — graybox starting values"). Tune HERE during
// the graybox playtest; update BALANCE.md in the same commit when frozen.
// Per-character numbers (runMax, jumpImpulse, fallMax, weight, gauge) do
// NOT live here — they belong in src/data/characters/<id>.js (Phase 3).

export const PHYS = {
  GRAV: 0.55,               // px/f^2, global (fall speed varies per char, gravity doesn't)
  RUN_ACCEL: 0.35,
  RUN_FRICTION: 0.82,       // per-frame vx multiplier when no ground input
  AIR_ACCEL: 0.22,
  AIR_MAX_FACTOR: 0.85,     // air drift cap = runMax * this
  FAST_FALL_MULT: 2.5,      // gravity AND fall cap multiplier while fast-falling
  DASH_SPEED_FACTOR: 1.8,   // dash speed = runMax * this
  DASH_DURATION: 14,        // frames
  DASH_TAP_WINDOW: 12,      // max frames between taps to register a dash
  DASH_COOLDOWN: 24,        // frames after a dash ends before the next
  DASH_JUMP_CARRY: 1.0,     // fraction of dash vx kept through a dash-jump
  DOUBLE_JUMP_FACTOR: 0.92, // double-jump impulse = jumpImpulse * this
  COYOTE_FRAMES: 5,
  INPUT_BUFFER: 6,          // shared with engine/input.js BUFFER_FRAMES
  DODGE_COOLDOWN: 72,       // shared by spot/step/air dodge
  STEP_DODGE_IMPULSE: 3.5,
  SPOT_DODGE_DURATION: 18,  // also step-dodge duration; i-frames 2-13
  AIR_DODGE_DURATION: 22,   // i-frames 3-15
  AIR_DODGE_IMPULSE: 4.5,
  DROP_THROUGH_GRACE: 8,    // frames of soft-platform collision ignored after a drop
  HITSTUN_PER_KB: 2.4,      // unused until Phase 2 combat; lives here per doctrine
  AIR_MOMENTUM_DECAY: 0.985, // per-frame decay of vx above AIR_MAX (dash-jump arc length)
  GROUND_DEADZONE: 0.05,    // |vx| snap-to-zero threshold under friction
};
