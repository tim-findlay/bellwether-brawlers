// Universal movement & knockback constants — BALANCE.md is canonical for
// these numbers ("physics.js — Phase-3 retune"). Tune HERE; update BALANCE.md
// in the same commit. Per-character numbers (runMax, jumpImpulse, fallMax,
// weight, gauge) live in src/data/characters/<id>.js — never here.
//
// Phase-3 retune (2026-09-25, Tim's "seriously improve the physics" brief):
// everything got faster and heavier. Run speeds roughly ×1.7, gravity ×1.5
// with taller impulses (same-height jumps that resolve in fewer frames),
// sharper turnarounds, stronger air control, shorter dash cooldown.

export const PHYS = {
  GRAV: 0.85,               // px/f^2, global (fall speed varies per char, gravity doesn't)
  RUN_ACCEL: 0.9,           // px/f^2 toward the held direction
  TURN_ACCEL_MULT: 2.2,     // extra accel while vx opposes the held direction (skid-turn)
  RUN_FRICTION: 0.76,       // per-frame vx multiplier when no ground input
  AIR_ACCEL: 0.55,
  AIR_MAX_FACTOR: 0.9,      // air drift cap = runMax * this
  FAST_FALL_MULT: 2.2,      // gravity AND fall cap multiplier while fast-falling
  DASH_SPEED_FACTOR: 1.7,   // dash speed = runMax * this
  DASH_DURATION: 12,        // frames
  DASH_TAP_WINDOW: 12,      // max frames between taps to register a dash
  DASH_COOLDOWN: 16,        // frames after a dash ends before the next
  DASH_JUMP_CARRY: 1.0,     // fraction of dash vx kept through a dash-jump
  DOUBLE_JUMP_FACTOR: 1.0,  // double-jump impulse = jumpImpulse * this
  COYOTE_FRAMES: 5,
  INPUT_BUFFER: 6,          // shared with engine/input.js BUFFER_FRAMES
  DODGE_COOLDOWN: 60,       // shared by spot/step/air dodge
  STEP_DODGE_IMPULSE: 6,
  SPOT_DODGE_DURATION: 18,  // also step-dodge duration; i-frames 2-13
  AIR_DODGE_DURATION: 22,   // i-frames 3-15
  AIR_DODGE_IMPULSE: 7,
  DROP_THROUGH_GRACE: 8,    // frames of soft-platform collision ignored after a drop
  HITSTUN_PER_KB: 2.0,      // hitstun frames = round(kb * this)
  LAUNCH_DRAG: 0.975,       // per-frame vx multiplier while stunned in the air
  STUN_LANDING_CLEARS: false,// hitstun is time-based; a landing keeps the remaining frames as ground flinch
  AIR_MOMENTUM_DECAY: 0.985, // per-frame decay of vx above AIR_MAX (dash-jump arc length)
  GROUND_DEADZONE: 0.05,    // |vx| snap-to-zero threshold under friction
};
