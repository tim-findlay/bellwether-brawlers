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

test('a falling body lands on the slab top and stays', () => {
  const b = new MovementBody(MID, { x: 640, y: 690 });    // 10px above slab top
  step(b, IDLE, 30);
  assert.equal(b.y, 700);
  assert.equal(b.grounded, true);
  assert.equal(b.vy, 0);
  assert.equal(b.state, 'idle');
});

test('landing resets air resources', () => {
  const b = new MovementBody(MID, { x: 640, y: 690 });
  b.airJumps = 0; b.airDodgeOk = false; b.fastFalling = true;
  step(b, { down: true }, 30);
  assert.equal(b.airJumps, 1);
  assert.equal(b.airDodgeOk, true);
  assert.equal(b.fastFalling, false);
});

test('slabs are solid from the side', () => {
  const b = new MovementBody(MID, { x: 340, y: 740 });    // left of slab, below its top
  b.vx = 10;
  step(b, { right: true }, 6);
  assert.ok(b.x + b.w / 2 <= 380 + 0.01);                 // pushed out at the face
});

test('slabs are solid from below', () => {
  const b = new MovementBody(MID, { x: 640, y: 880 });    // under the slab (top 700, h 60 -> bottom 760)
  b.vy = -20;
  step(b, IDLE, 4);
  assert.ok(b.y - b.h >= 760 - 0.01);                     // head bumped at the underside
  assert.ok(b.vy >= 0);
});

test('walking off an edge starts coyote time and airtime', () => {
  const b = new MovementBody(MID, { x: 396, y: 690 });
  step(b, IDLE, 30);                                      // land near the left edge
  step(b, { left: true }, 30);                            // run off
  assert.equal(b.grounded, false);
  // coyoteT was set the frame ground was lost (asserted indirectly in Task 5's coyote-jump test)
});

const landed = () => { const b = new MovementBody(MID, { x: 640, y: 690 }); step(b, IDLE, 10); return b; };

test('ground jump applies full impulse and reports consumption', () => {
  const b = landed();
  step(b, { jump: true });
  assert.equal(b.vy, -MID.jumpImpulse + PHYS.GRAV);       // impulse, then this tick's gravity
  assert.equal(b.consumedJump, true);
  assert.equal(b.grounded, false);
  assert.equal(b.airJumps, 1);                            // double jump intact
});

test('double jump uses the air jump at DOUBLE_JUMP_FACTOR and is consumed', () => {
  const b = landed();
  step(b, { jump: true });
  step(b, IDLE, 10);
  step(b, { jump: true });
  assert.ok(Math.abs(b.vy - (-MID.jumpImpulse * PHYS.DOUBLE_JUMP_FACTOR + PHYS.GRAV)) < 1e-9);
  assert.equal(b.airJumps, 0);
  step(b, { jump: true });
  assert.equal(b.consumedJump, false);                    // nothing left to consume
});

test('coyote jump within COYOTE_FRAMES is a free ground jump', () => {
  const b = new MovementBody(MID, { x: 396, y: 690 });
  step(b, IDLE, 10);
  let guard = 0;                                          // run left until the exact tick ground is lost
  while (b.grounded && guard++ < 120) step(b, { left: true });
  assert.equal(b.grounded, false);
  assert.ok(b.coyoteT > 0, 'should be inside the coyote window on the first airborne tick');
  step(b, { jump: true, left: true });                    // jump immediately
  assert.equal(b.airJumps, 1);                            // did NOT spend the double jump
  assert.ok(b.vy < 0);
});

const onPlatform = () => {   // land on the left soft platform (top y=560)
  const b = new MovementBody(MID, { x: 500, y: 540 });
  step(b, IDLE, 20);
  assert.equal(b.y, 560); assert.equal(b.onPlatform, true);
  return b;
};

test('rising through a platform does not land', () => {
  const b = new MovementBody(MID, { x: 500, y: 700 });
  b.vy = -15;
  let everGroundedWhileRising = false;
  for (let i = 0; i < 12; i++) { step(b); if (b.vy < 0 && b.grounded) everGroundedWhileRising = true; }
  assert.equal(everGroundedWhileRising, false);
});

test('fresh down tap on a platform drops through; held down does not', () => {
  const b = onPlatform();
  step(b, { down: true }, 5);                              // held: stays put
  assert.equal(b.grounded, true);
  step(b, { down: true, downTapped: true });               // fresh tap: drop
  assert.equal(b.grounded, false);
  assert.equal(b.dropT, PHYS.DROP_THROUGH_GRACE);          // set after the timer tick; decrements from next frame
  step(b, IDLE, 60);
  assert.equal(b.y, 700);                                  // fell to the slab below
});

test('fast-fall lands ON platforms (down held while descending)', () => {
  const b = new MovementBody(MID, { x: 500, y: 400 });
  step(b, { down: true }, 60);
  assert.equal(b.y, 560);                                  // caught by the platform
  assert.equal(b.grounded, true);
});

test('drop-through from a platform cannot drop through the main slab', () => {
  const b = new MovementBody(MID, { x: 640, y: 690 });
  step(b, IDLE, 10);                                       // grounded on slab
  step(b, { down: true, downTapped: true });
  assert.equal(b.grounded, true);                          // slabs are solid; nothing happens
});
