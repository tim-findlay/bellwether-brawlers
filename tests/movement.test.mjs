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

test('dash bursts at dashSpeed for DASH_DURATION, then cools down', () => {
  const b = landed();
  step(b, { dashRight: true, right: true });
  assert.equal(b.state, 'dash');
  assert.ok(Math.abs(b.vx - b.dashSpeed) < 1e-9);
  step(b, { right: true }, PHYS.DASH_DURATION);
  assert.equal(b.state, 'run');
  assert.equal(b.dashCd, PHYS.DASH_COOLDOWN - 1);
  step(b, { dashRight: true, right: true });               // inside cooldown: ignored
  assert.notEqual(b.state, 'dash');
});

test('air double-taps never dash', () => {
  const b = new MovementBody(MID, { x: 640, y: 300 });
  step(b, { dashRight: true, right: true });
  assert.notEqual(b.state, 'dash');
});

test('dash-jump carries full dash speed into the air', () => {
  const b = landed();
  step(b, { dashRight: true, right: true }, 3);
  step(b, { jump: true, right: true });
  assert.equal(b.grounded, false);
  assert.ok(Math.abs(b.vx) >= b.dashSpeed * PHYS.DASH_JUMP_CARRY - 0.01);
  step(b, { right: true }, 10);
  assert.ok(Math.abs(b.vx) > b.airMax);                    // excess momentum persists awhile
});

test('holding the opposite direction mid-dash cannot reverse the dash', () => {
  const b = landed();
  step(b, { dashRight: true, right: true }, 2);
  step(b, { left: true }, 4);                              // fight the dash
  assert.ok(b.vx > 0, 'dash direction is latched at dash start');
  assert.equal(b.state, 'dash');
});

test('coyote boundary: free on airborne tick 5, spends the double jump on tick 6', () => {
  const run = (airTicks) => {
    const b = new MovementBody(MID, { x: 396, y: 690 });
    step(b, IDLE, 10);
    let guard = 0;
    while (b.grounded && guard++ < 120) step(b, { left: true });
    step(b, IDLE, airTicks - 1);
    step(b, { jump: true });                               // jump on airborne tick `airTicks`
    return b.airJumps;
  };
  assert.equal(run(PHYS.COYOTE_FRAMES), 1);                // tick 5: still a free ground jump
  assert.equal(run(PHYS.COYOTE_FRAMES + 1), 0);            // tick 6: double jump spent
});

test('double jump after coyote expiry cancels a still-live dash', () => {
  const b = new MovementBody(MID, { x: 370, y: 690 });     // near the slab's left corner
  step(b, IDLE, 10);
  step(b, { dashLeft: true, left: true });                 // dash off the edge
  let guard = 0;
  while (b.grounded && guard++ < 10) step(b, { left: true });
  assert.ok(b.dashT > 0, 'dash still live at ground loss');
  step(b, IDLE, PHYS.COYOTE_FRAMES);                       // outlive the coyote window
  step(b, { jump: true });
  assert.equal(b.airJumps, 0, 'air jump consumed (not coyote)');
  assert.equal(b.dashT, 0, 'double jump kills the dash');
});

test('drop-through clears stale coyote time', () => {
  const b = onPlatform();
  b.coyoteT = 3;                                           // stale window from a prior edge slip
  step(b, { down: true, downTapped: true });
  step(b, { jump: true });
  assert.equal(b.airJumps, 0, 'jump after a deliberate drop is the air jump');
});

test('jump wins a same-tick drop + jump', () => {
  const b = onPlatform();
  step(b, { down: true, downTapped: true, jump: true });
  assert.equal(b.grounded, false);
  assert.equal(b.airJumps, 1, 'full ground jump, double jump preserved');
  assert.ok(b.vy < -MID.jumpImpulse * PHYS.DOUBLE_JUMP_FACTOR, 'full impulse, not the weaker air jump');
});

test('spot dodge: in place, i-frames exactly 2-13 (0-indexed stateT), shared cooldown starts', () => {
  const b = landed();
  step(b, { dodge: true });                                // start tick ends at stateT 0
  assert.equal(b.state, 'dodge');
  assert.equal(b.consumedDodge, true);
  assert.equal(b.vx, 0);
  assert.equal(b.invulnerable(), false);                   // stateT 0: startup
  step(b); assert.equal(b.invulnerable(), false);          // stateT 1: startup
  step(b); assert.equal(b.invulnerable(), true);           // stateT 2: window opens
  step(b, IDLE, 11); assert.equal(b.invulnerable(), true); // stateT 13: last invulnerable frame
  step(b); assert.equal(b.invulnerable(), false);          // stateT 14: recovery
  assert.ok(b.dodgeCd > 0);
});

test('step dodge: direction held gives a horizontal impulse', () => {
  const b = landed();
  step(b, { dodge: true, right: true });
  assert.ok(b.vx >= PHYS.STEP_DODGE_IMPULSE - 0.01);
});

test('air dodge: impulse along held direction, once per airtime, refreshed on landing', () => {
  const b = landed();
  step(b, { jump: true });
  step(b, IDLE, 5);
  step(b, { dodge: true, right: true });
  assert.equal(b.state, 'airdodge');
  assert.ok(b.vx > 0);
  assert.equal(b.airDodgeOk, false);
  step(b, IDLE, PHYS.AIR_DODGE_DURATION + 1);              // wait out the active dodge (still airborne)
  assert.equal(b.grounded, false);
  b.dodgeCd = 0;                                           // even past cooldown…
  step(b, { dodge: true, right: true });
  assert.equal(b.consumedDodge, false);                    // …no second air dodge this airtime
  assert.notEqual(b.state, 'airdodge');
  step(b, IDLE, 200);                                      // fall back to the slab
  assert.equal(b.grounded, true);
  assert.equal(b.airDodgeOk, true);
});

test('air dodge i-frames are exactly 3-15 (0-indexed stateT)', () => {
  const b = landed();
  step(b, { jump: true });
  step(b, IDLE, 3);
  step(b, { dodge: true, right: true });                   // start tick ends at stateT 0
  assert.equal(b.invulnerable(), false);
  step(b, IDLE, 2); assert.equal(b.invulnerable(), false); // stateT 2: startup
  step(b); assert.equal(b.invulnerable(), true);           // stateT 3: window opens
  step(b, IDLE, 12); assert.equal(b.invulnerable(), true); // stateT 15: last invulnerable frame
  step(b); assert.equal(b.invulnerable(), false);          // stateT 16: recovery
});

test('shared cooldown blocks ground dodges too', () => {
  const b = landed();
  step(b, { dodge: true });
  step(b, IDLE, PHYS.SPOT_DODGE_DURATION + 2);
  step(b, { dodge: true });
  assert.equal(b.consumedDodge, false);                    // still cooling down
});

test('crossing any blast zone sets out', () => {
  for (const [k, pos] of Object.entries({
    left:   { x: -250, y: 500 },  right: { x: 1530, y: 500 },
    top:    { x: 640, y: -350 },  bottom: { x: 640, y: 1250 },  // head (y-96) must clear bottom=1100
  })) {
    const b = new MovementBody(MID, pos);
    b.vy = 0; step(b);
    assert.equal(b.out, true, `blast ${k}`);
  }
});

test('a body on stage is not out', () => {
  const b = landed();
  assert.equal(b.out, false);
});

test('blast asymmetry: generous going up, strict going down', () => {
  const out = (pos, vy = 0) => { const b = new MovementBody(MID, pos); b.vy = vy; step(b); return b.out; };
  assert.equal(out({ x: 640, y: 1150 }), false);           // feet past bottom, head (~1054) not: alive
  assert.equal(out({ x: 640, y: -250 }, -1), false);       // head (~-346) past top, feet not: alive
});
