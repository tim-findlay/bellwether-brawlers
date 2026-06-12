# Phase 1: Graybox Movement Playground — Implementation Plan

> Executed through commit `6f1ceb4` (2026-06-12): Tasks 1–10 complete, 37/37 tests green, final series review = SHIP. Playtest passed 2026-06-12 with starting values unchanged; BALANCE.md frozen. Plan fully executed.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v3 momentum-movement core (run/dash/dash-jump/double-jump/air-dodge/fast-fall/drop-through, platform collision, blast-zone exits) and a `?graybox` playground where Tim tunes the feel — the HARD STOP gate before any other v3 phase.

**Architecture:** New pure-logic `MovementBody` in `src/engine/movement.js` driven by intent objects (testable headless under `node --test`), constants in `src/data/physics.js` (canonical values from BALANCE.md), a dev-only screen `src/dev/graybox.js` drawing directly to the 960×540 canvas (no v2 pixel buffer — proves the v3 render path). v2 game untouched and playable at every commit; all work is additive except two small edits (`input.js`, `main.js`).

**Tech Stack:** Vanilla JS ES modules, zero build, zero dependencies. Tests: Node's built-in runner (`node --test`, Node 24 installed) — no package.json (hard project rule).

**Spec:** `DESIGN.md` + `BALANCE.md` v3 (commit `9fcca42`). BALANCE.md is canonical for numbers. Where this plan must choose something the spec leaves open (marked *graybox decision*), the choice is provisional and exists to be tuned in Tim's playtest.

**Branch:** work directly on `main` — Phase 1 is additive, the v2 game stays playable after every commit (project convention: small rollbackable commits).

**Read first:** `CLAUDE.md` (engine change policy, zero-build rules), `BALANCE.md` §"physics.js — graybox starting values", `DESIGN.md` §"Movement" + §"Controls" + §"Build plan", `src/engine/input.js` (the class you'll extend), `src/main.js` (the loop and flag wiring).

---

## File structure

| File | Status | Responsibility |
|------|--------|----------------|
| `src/data/physics.js` | create | Universal movement constants (`PHYS`) — the file Tim edits during the playtest |
| `src/engine/movement.js` | create | `MovementBody`: movement FSM, integration, surface collision, blast-zone exit. Pure logic, no DOM |
| `src/engine/input.js` | modify | Add `dodge` key to both maps; add previous-press tracking + `doubleTapped()` |
| `src/dev/graybox.js` | create | Playground screen: graybox stage data, intent adapter, debug renderer, presets. Dev-only, dynamically imported |
| `src/main.js` | modify | Wire `?graybox` flag (dynamic import, like `?sim`) |
| `tests/input.test.mjs` | create | Double-tap detection tests |
| `tests/movement.test.mjs` | create | Movement-core behavior tests (the bulk of the suite) |

Conventions used throughout: `y` is a body's **feet** position; the body box is `[x−w/2, y−h] → [x+w/2, y]`. World units are px at base zoom (960×540 viewport). A *slab* is solid from every side; a *platform* is one-way (land from above only). 60 Hz fixed timestep — `MovementBody.update()` is called once per logic tick.

Intent object passed to `MovementBody.update(intent, stage)` each tick (the graybox adapter builds it from `PlayerController`; tests build it literally):

```js
{ left, right, down: bool,     // held
  downTapped: bool,            // fresh down press this tick
  jump: bool,                  // buffered jump intent (body sets .consumedJump when it fires)
  dodge: bool,                 // buffered dodge intent (body sets .consumedDodge when it fires)
  dashLeft, dashRight: bool }  // double-tap detections from Input.doubleTapped
```

Stage object: `{ slabs: [{x,y,w,h}], platforms: [{x,y,w}], blast: {left,right,top,bottom}, spawn: {x,y} }` (platform `y` is its top; platforms have no thickness for collision).

---

### Task 1: `src/data/physics.js` — constants locked to BALANCE.md

**Files:**
- Create: `src/data/physics.js`
- Test: `tests/physics.test.mjs`

- [x] **Step 1: Write the failing test** — `tests/physics.test.mjs`:

```js
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
```

- [x] **Step 2: Run it; expect failure** — `node --test tests/physics.test.mjs` → FAIL (`Cannot find module .../src/data/physics.js`).

- [x] **Step 3: Implement** — `src/data/physics.js`:

```js
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
};
```

- [x] **Step 4: Run it; expect pass** — `node --test tests/physics.test.mjs` → PASS (1 test).

- [x] **Step 5: Commit**

```bash
git add src/data/physics.js tests/physics.test.mjs
git commit -m "Phase 1: physics.js — universal movement constants, locked to BALANCE.md by test"
```

---

### Task 2: `MovementBody` skeleton — gravity, integration, fall cap

**Files:**
- Create: `src/engine/movement.js`
- Test: `tests/movement.test.mjs`

- [x] **Step 1: Write the failing tests** — `tests/movement.test.mjs`:

```js
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
```

- [x] **Step 2: Run; expect failure** — `node --test tests/movement.test.mjs` → FAIL (module not found).

- [x] **Step 3: Implement the skeleton** — `src/engine/movement.js`:

```js
// MovementBody — the v3 momentum-movement core. Pure logic: no DOM, no
// renderer, no Input class; driven by per-tick intent objects so it runs
// identically in the game, the graybox, the sim and node --test.
// Units: px at base zoom, 60Hz frames. y = FEET. Body box is
// [x-w/2, y-h] -> [x+w/2, y]. Slabs are solid; platforms are one-way.

import { PHYS } from '../data/physics.js';

export class MovementBody {
  constructor(stats, spawn) {
    this.stats = stats;          // { runMax, jumpImpulse, fallMax, weight }
    this.w = 36; this.h = 96;    // near-HD capsule footprint
    this.x = spawn.x; this.y = spawn.y;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.grounded = false;
    this.onPlatform = false;     // grounded specifically on a one-way platform
    this.state = 'air';          // idle | run | dash | dodge | airdodge | air
    this.stateT = 0;
    this.airJumps = 1;           // the double jump
    this.airDodgeOk = true;      // once per airtime
    this.fastFalling = false;
    this.coyoteT = 0;
    this.dashT = 0; this.dashCd = 0;
    this.dodgeT = 0; this.dodgeCd = 0;
    this.dodgeVec = null;        // {x,y} during step/air dodge
    this.dropT = 0;              // soft-platform collision ignored while > 0
    this.out = false;            // crossed a blast zone
    this.consumedJump = false;   // adapter reads these to consume buffered presses
    this.consumedDodge = false;
  }

  get airMax() { return this.stats.runMax * PHYS.AIR_MAX_FACTOR; }
  get dashSpeed() { return this.stats.runMax * PHYS.DASH_SPEED_FACTOR; }
  get dodging() { return this.state === 'dodge' || this.state === 'airdodge'; }

  // i-frame query for later phases + the graybox readout
  invulnerable() {
    if (this.state === 'dodge') return this.stateT >= 2 && this.stateT <= 13;
    if (this.state === 'airdodge') return this.stateT >= 3 && this.stateT <= 15;
    return false;
  }

  update(intent, stage) {
    this.consumedJump = false; this.consumedDodge = false;
    this.stateT++;
    if (this.dashCd > 0) this.dashCd--;
    if (this.dodgeCd > 0) this.dodgeCd--;
    if (this.dropT > 0) this.dropT--;
    if (this.coyoteT > 0) this.coyoteT--;

    this._dodges(intent);
    if (!this.dodging) {
      this._horizontal(intent);
      this._jumps(intent);
      this._gravity(intent);
    }

    const prevBottom = this.y;
    this.x += this.vx;
    this.y += this.vy;
    this._collide(stage, prevBottom);
    this._blast(stage);
  }

  _gravity(intent) {
    this.fastFalling = !this.grounded && intent.down && this.vy > 0;
    const m = this.fastFalling ? PHYS.FAST_FALL_MULT : 1;
    if (!this.grounded) this.vy = Math.min(this.vy + PHYS.GRAV * m, this.stats.fallMax * m);
  }

  _horizontal(intent) {}   // Task 3
  _jumps(intent) {}        // Task 5
  _dodges(intent) {}       // Task 8
  _collide(stage, prevBottom) {}  // Task 4
  _blast(stage) {}         // Task 9

  _setState(s) { if (this.state !== s) { this.state = s; this.stateT = 0; } }
}
```

- [x] **Step 4: Run; expect pass** — `node --test tests/movement.test.mjs` → 2 PASS. (Bodies fall forever — collision is Task 4.)

- [x] **Step 5: Commit** — `git add src/engine/movement.js tests/movement.test.mjs && git commit -m "Phase 1: MovementBody skeleton — gravity, integration, fall cap"`

---

### Task 3: Run acceleration & friction

**Files:** Modify `src/engine/movement.js` (`_horizontal`), append to `tests/movement.test.mjs`.

- [x] **Step 1: Failing tests** (append; note these need ground — give the body `grounded` manually until Task 4 lands):

```js
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
```

- [x] **Step 2: Run; expect the three new tests to FAIL.**

- [x] **Step 3: Implement `_horizontal`:**

```js
  _horizontal(intent) {
    const dir = (intent.right ? 1 : 0) - (intent.left ? 1 : 0);
    if (dir !== 0) this.facing = dir;

    if (this.dashT > 0) {                       // dash overrides steering (Task 7)
      this.dashT--;
      this.vx = this.facing * this.dashSpeed;
      if (this.dashT === 0) { this.dashCd = PHYS.DASH_COOLDOWN; this._setState(this.grounded ? 'run' : 'air'); }
      return;
    }

    if (this.grounded) {
      if (dir !== 0) {
        this.vx += dir * PHYS.RUN_ACCEL;
        const max = this.stats.runMax;
        if (Math.abs(this.vx) > max && Math.sign(this.vx) === dir) this.vx = dir * max;
        this._setState('run');
      } else {
        this.vx *= PHYS.RUN_FRICTION;
        if (Math.abs(this.vx) < 0.05) this.vx = 0;
        this._setState('idle');
      }
    } else {
      const max = this.airMax;
      if (dir !== 0 && (Math.sign(this.vx) !== dir || Math.abs(this.vx) < max)) {
        this.vx = Math.abs(this.vx + dir * PHYS.AIR_ACCEL) > max && Math.sign(this.vx + dir * PHYS.AIR_ACCEL) === dir
          ? dir * max : this.vx + dir * PHYS.AIR_ACCEL;
      }
      if (Math.abs(this.vx) > max) this.vx *= 0.985;   // momentum carry decays, never clamps
      this._setState('air');
    }
  }
```

- [x] **Step 4: Run; all movement tests PASS** — `node --test tests/movement.test.mjs`.

- [x] **Step 5: Commit** — `git commit -am "Phase 1: ground run accel/friction + capped air drift with momentum carry"`

---

### Task 4: Surface collision — solid slabs, landing resets

**Files:** Modify `src/engine/movement.js` (`_collide`), append tests.

- [x] **Step 1: Failing tests:**

```js
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
```

- [x] **Step 2: Run; new tests FAIL.**

- [x] **Step 3: Implement `_collide`:**

```js
  _collide(stage, prevBottom) {
    const hw = this.w / 2;
    const wasGrounded = this.grounded;
    this.grounded = false; this.onPlatform = false;

    for (const s of stage.slabs) {
      const overlapX = this.x + hw > s.x && this.x - hw < s.x + s.w;
      if (!overlapX) continue;
      // land on top
      if (this.vy >= 0 && prevBottom <= s.y && this.y >= s.y) { this._land(s.y); continue; }
      // inside the slab body? resolve smallest axis
      const top = s.y, bottom = s.y + s.h;
      if (this.y > top && this.y - this.h < bottom) {
        if (this.vy < 0 && this.y - this.h <= bottom && prevBottom - this.h >= bottom - 1) {
          this.y = bottom + this.h; this.vy = 0;          // head bump from below
        } else {
          const fromLeft = this.x < s.x + s.w / 2;        // side push-out
          this.x = fromLeft ? s.x - hw : s.x + s.w + hw;
          this.vx = 0;
        }
      }
    }

    if (this.dropT <= 0) for (const p of stage.platforms) {
      const overlapX = this.x + hw > p.x && this.x - hw < p.x + p.w;
      if (overlapX && this.vy >= 0 && prevBottom <= p.y && this.y >= p.y) { this._land(p.y); this.onPlatform = true; }
    }

    if (wasGrounded && !this.grounded && this.vy >= 0) this.coyoteT = PHYS.COYOTE_FRAMES;
  }

  _land(top) {
    this.y = top; this.vy = 0; this.grounded = true;
    this.airJumps = 1; this.airDodgeOk = true; this.fastFalling = false;
    if (this.state === 'air' || this.state === 'airdodge') this._setState('idle');
  }
```

- [x] **Step 4: Run; all PASS.**

- [x] **Step 5: Commit** — `git commit -am "Phase 1: solid slab collision, landing resets, coyote trigger"`

---

### Task 5: Jumps — ground, buffered intent, double jump, coyote

**Files:** Modify `src/engine/movement.js` (`_jumps`), append tests.

- [x] **Step 1: Failing tests:**

```js
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
```

- [x] **Step 2: Run; FAIL.**

- [x] **Step 3: Implement `_jumps`:**

```js
  _jumps(intent) {
    if (!intent.jump) return;
    if (this.grounded || this.coyoteT > 0) {
      this.vy = -this.stats.jumpImpulse;
      this.grounded = false; this.coyoteT = 0;
      this.consumedJump = true;
      if (this.dashT > 0) { this.dashT = 0; this.dashCd = PHYS.DASH_COOLDOWN; this.vx *= PHYS.DASH_JUMP_CARRY; }
      this._setState('air');
    } else if (this.airJumps > 0) {
      this.airJumps--;
      this.vy = -this.stats.jumpImpulse * PHYS.DOUBLE_JUMP_FACTOR;
      this.consumedJump = true;
      this._setState('air');
    }
  }
```

*(Note: `_jumps` runs before `_gravity` in `update()`, so the first post-jump tick reads `-impulse + GRAV` — the tests encode that.)*

- [x] **Step 4: Run; all PASS.**

- [x] **Step 5: Commit** — `git commit -am "Phase 1: ground/double jumps with coyote time and dash-jump momentum carry"`

---

### Task 6: One-way platforms — landing, drop-through, fast-fall interplay

**Files:** Modify nothing new (collision landed in Task 4; drop-through trigger goes in `update`), append tests.

- [x] **Step 1: Failing tests:**

```js
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
```

- [x] **Step 2: Run; FAIL** (no drop-through trigger yet).

- [x] **Step 3: Implement** — add to `update()`, immediately after the timers block:

```js
    // drop-through: fresh tap, only on one-way platforms (slabs are solid)
    if (this.grounded && this.onPlatform && intent.downTapped && !this.dodging) {
      this.grounded = false; this.onPlatform = false;
      this.dropT = PHYS.DROP_THROUGH_GRACE;
      this.y += 1;
      this._setState('air');
    }
```

- [x] **Step 4: Run; all PASS.**

- [x] **Step 5: Commit** — `git commit -am "Phase 1: one-way platforms — drop-through tap vs fast-fall hold"`

---

### Task 7: Dash & dash-jump + `Input.doubleTapped`

**Files:**
- Modify: `src/engine/input.js` (maps + double-tap tracking)
- Test: `tests/input.test.mjs` + append to `tests/movement.test.mjs`

- [x] **Step 1: Failing tests** — `tests/input.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Input, P1MAP, P2MAP } from '../src/engine/input.js';

// drive key events without a DOM
const press = (inp, code) => { if (!inp.held[code]) inp.pending.add(code); inp.held[code] = true; };
const release = (inp, code) => { inp.held[code] = false; };

test('both maps bind dodge (V and Slash per DESIGN.md controls)', () => {
  assert.equal(P1MAP.dodge, 'KeyV');
  assert.equal(P2MAP.dodge, 'Slash');
});

test('doubleTapped fires on two presses inside the window, not on one, not on slow taps', () => {
  const inp = new Input();
  press(inp, 'KeyD'); inp.beginFrame();
  assert.equal(inp.doubleTapped('KeyD', 12), false);        // first tap
  release(inp, 'KeyD');
  for (let i = 0; i < 5; i++) inp.beginFrame();             // 5 frames later
  press(inp, 'KeyD'); inp.beginFrame();
  assert.equal(inp.doubleTapped('KeyD', 12), true);         // second tap inside window
  release(inp, 'KeyD');
  for (let i = 0; i < 20; i++) inp.beginFrame();            // way past the window
  press(inp, 'KeyD'); inp.beginFrame();
  assert.equal(inp.doubleTapped('KeyD', 12), false);
});

test('lockout clears double-tap history', () => {
  const inp = new Input();
  press(inp, 'KeyD'); inp.beginFrame(); release(inp, 'KeyD');
  inp.lockout(20);
  for (let i = 0; i < 21; i++) inp.beginFrame();
  press(inp, 'KeyD'); inp.beginFrame();
  assert.equal(inp.doubleTapped('KeyD', 30), false);
});
```

And in `tests/movement.test.mjs`:

```js
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
```

And append to the assertions in `tests/physics.test.mjs` (inside the existing test):

```js
  assert.equal(PHYS.AIR_MOMENTUM_DECAY, 0.985);
  assert.equal(PHYS.GROUND_DEADZONE, 0.05);
});
```

- [x] **Step 2: Run both files; FAIL.**

- [x] **Step 3: Implement.** In `src/engine/input.js`:
  - Add `dodge: 'KeyV'` to `P1MAP` and `dodge: 'Slash'` to `P2MAP` (PREVENT picks them up automatically via `Object.values`).
  - In the constructor add `this.prevPressFrame = {};`
  - In `beginFrame()` change the press-frame loop to:
    ```js
    for (const k of this.pressedNow) { this.prevPressFrame[k] = this.pressFrame[k]; this.pressFrame[k] = this.frame; }
    ```
  - In `lockout()` add `this.prevPressFrame = {};`
  - Add the method:
    ```js
    doubleTapped(code, win = 12) {
      if (!this.pressedNow.has(code)) return false;
      const prev = this.prevPressFrame[code];
      return prev !== undefined && this.frame - prev <= win;
    }
    ```
  - Add `dodge` passthrough to `PlayerController` (nothing needed — `held/buffered/pressed` already map by action name).

  In `src/engine/movement.js`, add dash start to `update()` right before `this._dodges(intent)`:
    ```js
    const dashDir = (intent.dashRight ? 1 : 0) - (intent.dashLeft ? 1 : 0);
    if (dashDir !== 0 && this.grounded && this.dashT === 0 && this.dashCd === 0 && !this.dodging) {
      this.facing = dashDir; this.dashDir = dashDir;       // latch: dash is not steerable
      this.dashT = PHYS.DASH_DURATION; this._setState('dash');
    }
    ```
    Plus two fixes from the Task 6 review (drop-through trigger in `update()`):
    - Add `!intent.jump` to the drop guard (`grounded && onPlatform && intent.downTapped && !intent.jump && !this.dodging`) — **jump wins a same-tick drop+jump**; otherwise the drop fires first and the jump silently becomes the weaker air jump.
    - Add `this.coyoteT = 0;` inside the drop block — a deliberate drop must not leave a stale coyote window that turns the next air jump into a free ground jump.

    Plus two defect fixes from the Task 5 review (both have repros; called out per the engine-change policy, not buried):
    - **Coyote off-by-one:** `update()` decrements `coyoteT` before `_jumps` reads it, so the real window is 4 frames, not the 5 that BALANCE.md/`PHYS.COYOTE_FRAMES` promise. Fix: DELETE `if (this.coyoteT > 0) this.coyoteT--;` from the top timer block and insert it immediately AFTER the `if (!this.dodging) { ... }` block closes (before the `prevBottom` line), with the comment `// after _jumps reads it: 5 means 5`. The boundary test above pins both edges.
    - **Double jump must cancel a live dash:** mirror the dash-clear into `_jumps`' air branch — after `this.vy = -this.stats.jumpImpulse * PHYS.DOUBLE_JUMP_FACTOR;` add `if (this.dashT > 0) { this.dashT = 0; this.dashCd = PHYS.DASH_COOLDOWN; this.vx *= PHYS.DASH_JUMP_CARRY; }` (same line the ground branch already has). Otherwise a dash carried off a ledge keeps overriding `vx` straight through the double jump.

    Plus three small movement.js fixes that landed as review findings on Task 3 (docs+code together, engine-change policy "values into data"):
    - Constructor: add `this.dashDir = 1;` next to `this.facing = 1;`
    - In `_horizontal`'s dash branch, change `this.vx = this.facing * this.dashSpeed;` to `this.vx = this.dashDir * this.dashSpeed;` — otherwise holding the opposite direction mid-dash reverses the dash at full speed via the live `facing` update.
    - Replace the two magic numbers with data constants: `this.vx *= 0.985;` → `this.vx *= PHYS.AIR_MOMENTUM_DECAY;` and `Math.abs(this.vx) < 0.05` → `Math.abs(this.vx) < PHYS.GROUND_DEADZONE`. Add to `src/data/physics.js`: `AIR_MOMENTUM_DECAY: 0.985,  // per-frame decay of vx above AIR_MAX (dash-jump arc length)` and `GROUND_DEADZONE: 0.05,    // |vx| snap-to-zero threshold under friction`. Add matching rows to BALANCE.md's "physics.js — graybox starting values" table (same commit — BALANCE.md is canonical for numbers).

    (`_horizontal` already handles the dash override and cooldown from Task 3; `_jumps` already handles the carry from Task 5.)

- [x] **Step 4: Run; all PASS** — `node --test 'tests/*.test.mjs'`.

- [x] **Step 5: Commit** — `git add -A && git commit -m "Phase 1: dash via grounded double-tap (latched dir), dash-jump carry; Input.doubleTapped + dodge keys; momentum/deadzone constants to data"` (includes BALANCE.md table rows).

---

### Task 8: Dodges — spot, step, air; shared cooldown; once per airtime

**Files:** Modify `src/engine/movement.js` (`_dodges`), append tests.

- [x] **Step 1: Failing tests:**

```js
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
```

- [x] **Step 2: Run; FAIL.**

- [x] **Step 3: Implement `_dodges`:**

```js
  _dodges(intent) {
    if (this.dodging) {                                    // tick an active dodge
      this.dodgeT--;
      if (this.state === 'airdodge') {                     // graybox decision: air dodge
        const k = this.dodgeT / PHYS.AIR_DODGE_DURATION;   // suspends gravity, impulse decays
        this.vx = this.dodgeVec.x * k; this.vy = this.dodgeVec.y * k;
      } else {
        this.vx = this.dodgeVec ? this.dodgeVec.x * (this.dodgeT / PHYS.SPOT_DODGE_DURATION) : 0;
        this.vy = 0;
      }
      if (this.dodgeT <= 0) this._setState(this.grounded ? 'idle' : 'air');
      return;
    }
    if (!intent.dodge || this.dodgeCd > 0 || this.dashT > 0) return;
    const dx = (intent.right ? 1 : 0) - (intent.left ? 1 : 0);
    const dy = (intent.down ? 1 : 0) - (intent.jump ? 0 : 0); // vertical aim: down only (up = jump key)
    if (this.grounded) {
      this.dodgeT = PHYS.SPOT_DODGE_DURATION;
      this.dodgeVec = dx !== 0 ? { x: dx * PHYS.STEP_DODGE_IMPULSE, y: 0 } : null;
      if (dx !== 0) this.vx = dx * PHYS.STEP_DODGE_IMPULSE;
      this._setState('dodge');
    } else {
      if (!this.airDodgeOk) return;
      this.airDodgeOk = false;
      const len = Math.hypot(dx, dy) || 1;
      this.dodgeVec = { x: (dx / len) * PHYS.AIR_DODGE_IMPULSE, y: (dy / len) * PHYS.AIR_DODGE_IMPULSE };
      this.vx = this.dodgeVec.x; this.vy = this.dodgeVec.y;   // impulse applies on the start tick
      this.dodgeT = PHYS.AIR_DODGE_DURATION;
      this._setState('airdodge');
    }
    this.dodgeCd = PHYS.DODGE_COOLDOWN;
    this.consumedDodge = true;
  }
```

*(Graybox decisions, flagged for the playtest: air dodge suspends gravity for its 22 frames and its impulse decays linearly; vertical air-dodge aim is down-only for now since up is the jump key; a step dodge that slides off a ledge hovers at constant height for its remaining frames; a same-tick down-tap + dodge on a platform resolves as drop-through + air dodge (spends the airtime dodge); a neutral air dodge wipes ALL incoming momentum to zero — that last one must become an explicit decision before Phase-2 knockback. All are one-line tunables.)*

- [x] **Step 4: Run; all PASS.**

- [x] **Step 5: Commit** — `git commit -am "Phase 1: spot/step/air dodges — shared cooldown, once per airtime"`

---

### Task 9: Blast zones

**Files:** Modify `src/engine/movement.js` (`_blast`), append tests.

- [x] **Step 1: Failing tests:**

```js
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
```

Hardening note (review fold-forward): also add this comment directly above the `this.out = ...` line in `_blast`:

```js
    // platform-fighter convention: out the bottom when the HEAD clears it,
    // out the top only when the FEET clear it — generous up, strict down.
```

- [x] **Step 2: Run; FAIL.**

- [x] **Step 3: Implement `_blast`:**

```js
  _blast(stage) {
    const z = stage.blast;
    this.out = this.x < z.left || this.x > z.right || this.y - this.h > z.bottom || this.y < z.top;
  }
```

*(Note `y - this.h > z.bottom`: you are out the bottom when your head clears it; and out the top only when your feet clear it — generous on the way up, strict on the way down, the platform-fighter convention.)*

- [x] **Step 4: Run; all PASS** — full suite: `node --test 'tests/*.test.mjs'` → expect 37 passing tests (33 movement + 3 input + 1 physics).

- [x] **Step 5: Commit** — `git commit -am "Phase 1: blast-zone exit detection"`

---

### Task 10: The graybox screen + `?graybox` wiring

**Files:**
- Create: `src/dev/graybox.js`
- Modify: `src/main.js` (dev-flag block, lines 77–87)

No unit tests — this is the visual shell over tested logic. Manual verification in Step 3.

- [x] **Step 1: Implement `src/dev/graybox.js`:**

```js
// Phase-1 movement playground (?graybox). Dev-only, dynamically imported.
// Draws straight to the 960x540 canvas — no v2 pixel buffer (v3 render path).
// Tuning loop: edit src/data/physics.js -> reload. 1/2/3 = body presets,
// R = reset both bodies. P2 keys drive the second body (the "dummy").

import { PHYS } from '../data/physics.js';
import { MovementBody } from '../engine/movement.js';
import { P1MAP, P2MAP, PlayerController } from '../engine/input.js';

const PAPER = '#f2e9d8', INK = '#2b2620', NAVY = '#27425f', BRICK = '#c4452e', BRASS = '#c9a227';

export const GRAYBOX_STAGE = {
  slabs: [{ x: 230, y: 380, w: 500, h: 70 }],
  // Low plats sit 110px up: a MID single jump rises ~104.5 — deliberately just
  // short, per DESIGN ("soft platforms reachable with jump -> double-jump").
  // If the playtest wants single-jump plats, lower these, don't buff jumps.
  platforms: [{ x: 290, y: 270, w: 140 }, { x: 530, y: 270, w: 140 }, { x: 410, y: 175, w: 140 }],
  // Blast lines sit INSIDE the 960x540 canvas so the dashed border is actually
  // visible — there is no camera until Phase 2. Real stages get bigger margins.
  blast: { left: 30, right: 930, top: 25, bottom: 515 },
  spawn: { x: 480, y: 380 },
};

export const PRESETS = {
  1: { name: 'FLOATY (nick-ish)', runMax: 3.7, jumpImpulse: 12, fallMax: 9, weight: 0.85 },
  2: { name: 'MID (tim-ish)',     runMax: 3.1, jumpImpulse: 11, fallMax: 11, weight: 1.0 },
  3: { name: 'HEAVY (mike-ish)',  runMax: 2.4, jumpImpulse: 10, fallMax: 13, weight: 1.45 },
};

function intentFor(ctl, input, map) {
  return {
    left: ctl.held('left'), right: ctl.held('right'), down: ctl.held('down'),
    downTapped: ctl.pressed('down'),
    jump: input.buffered(map.up, PHYS.INPUT_BUFFER),     // PHYS owns the buffer length
    dodge: input.buffered(map.dodge, PHYS.INPUT_BUFFER),
    dashLeft: input.doubleTapped(map.left, PHYS.DASH_TAP_WINDOW),
    dashRight: input.doubleTapped(map.right, PHYS.DASH_TAP_WINDOW),
  };
}

export function makeGraybox(G) {
  const c = G.canvas.getContext('2d');
  const ctl1 = new PlayerController(G.input, P1MAP);
  const ctl2 = new PlayerController(G.input, P2MAP);
  let b1, b2, preset = 2, koFlash = 0;

  const reset = () => {
    b1 = new MovementBody(PRESETS[preset], { x: 400, y: 380 });
    b2 = new MovementBody(PRESETS[2], { x: 560, y: 380 });
  };

  const drive = (body, ctl, map) => {
    const intent = intentFor(ctl, G.input, map);
    body.update(intent, GRAYBOX_STAGE);
    if (body.consumedJump) ctl.consume('up');
    if (body.consumedDodge) ctl.consume('dodge');
    if (body.out) {                                  // ring-out: instant respawn (stocks = Phase 2)
      koFlash = 8;
      const s = body.stats;
      Object.assign(body, new MovementBody(s, GRAYBOX_STAGE.spawn));
    }
  };

  const drawBody = (b, color) => {
    c.fillStyle = color;
    c.fillRect(b.x - b.w / 2, b.y - b.h, b.w, b.h);
    c.fillStyle = b.invulnerable() ? BRASS : INK;    // facing tick / i-frame flag
    c.fillRect(b.x + b.facing * (b.w / 2 - 3), b.y - b.h + 12, 6, 10);
  };

  return {
    enter() { reset(); },
    update() {
      for (const k of [1, 2, 3]) if (G.input.keyPressed(`Digit${k}`)) { preset = k; reset(); }
      if (G.input.keyPressed('KeyR')) reset();
      drive(b1, ctl1, P1MAP);
      drive(b2, ctl2, P2MAP);
      if (koFlash > 0) koFlash--;
    },
    draw() {
      c.fillStyle = koFlash > 0 ? '#fff7e6' : PAPER;
      c.fillRect(0, 0, 960, 540);
      // blast zones
      c.strokeStyle = BRICK; c.setLineDash([8, 6]); c.lineWidth = 2;
      const z = GRAYBOX_STAGE.blast;
      c.strokeRect(z.left, z.top, z.right - z.left, z.bottom - z.top);
      c.setLineDash([]);
      // surfaces
      c.fillStyle = '#b9b1a2';
      for (const s of GRAYBOX_STAGE.slabs) c.fillRect(s.x, s.y, s.w, s.h);
      c.fillStyle = INK;
      for (const p of GRAYBOX_STAGE.platforms) c.fillRect(p.x, p.y, p.w, 5);
      drawBody(b2, BRICK);
      drawBody(b1, NAVY);
      // debug readout
      c.fillStyle = INK; c.font = '14px monospace'; c.textAlign = 'left';
      const rows = [
        `P1 ${PRESETS[preset].name}  state:${b1.state}  vx:${b1.vx.toFixed(2)} vy:${b1.vy.toFixed(2)}`,
        `grounded:${b1.grounded} plat:${b1.onPlatform} airJumps:${b1.airJumps} airDodge:${b1.airDodgeOk}`,
        `dashCd:${b1.dashCd} dodgeCd:${b1.dodgeCd} coyote:${b1.coyoteT} fastFall:${b1.fastFalling}`,
        `[1/2/3] preset  [R] reset  — tune src/data/physics.js and reload`,
      ];
      rows.forEach((r, i) => c.fillText(r, 16, 22 + i * 18));
    },
  };
}
```

- [x] **Step 2: Wire the flag** — in `src/main.js`, replace the dev-flags block (after the `?sim` block, before `G.go('title')`):

```js
  if (qp.has('graybox')) {
    const { makeGraybox } = await import('./dev/graybox.js');
    G.screens.graybox = makeGraybox(G);
  }

  G.go(qp.has('graybox') ? 'graybox' : 'title');
```

(The existing `G.go('title');` line is replaced by the conditional one. The rAF loop below is untouched — the graybox runs at fixed 60 Hz like everything else.)

- [x] **Step 3: Manual verification checklist** (serve with `python3 -m http.server 8000` from the repo root, then open `http://localhost:8000/index.html?graybox`):
  - No console errors on load; paper-tone playground renders with dashed blast border, gray slab, 3 ink platforms, navy (P1) and brick (P2) bodies.
  - A/D run with visible accel; double-tap D dashes; W jumps; W again double-jumps; dash→W gives a long flat arc.
  - Hold S while falling = visibly faster fall that still lands on platforms; tap S on a platform = drop through; tap S on the slab = nothing.
  - V dodges (gold tick during i-frames); air V gives one directional dodge per airtime.
  - Run off the left edge and jump within a few frames — coyote jump works.
  - Fall past the dashed line — screen flashes, body respawns at centre.
  - 1/2/3 switch presets and visibly change feel; R resets.
  - P2 (arrows + `/`) drives the brick body identically.
  - **Regression:** open `http://localhost:8000/index.html` (no flag) — title screen renders, menus work, a quick fight plays normally.
  - **Regression:** `http://localhost:8000/index.html?sim=10` still runs and reports the v2 gates.

- [x] **Step 4: Run the full test suite** — `node --test 'tests/*.test.mjs'` → all pass.

- [x] **Step 5: Commit**

```bash
git add src/dev/graybox.js src/main.js
git commit -m "Phase 1: ?graybox movement playground — presets, debug readout, respawn"
```

---

### Task 11: Phase wrap-up

- [x] **Step 1: Full verification** — `node --test 'tests/*.test.mjs'` (all green), plus the Task 10 manual checklist if not just done.
- [x] **Step 2: Line-count check** — `wc -l src/engine/movement.js src/dev/graybox.js src/data/physics.js` → every file < 500.
- [x] **Step 3: Push** — `git push` (Pages serves main; the graybox is dev-flag-only and harmless in public).
- [x] **Step 4: BALANCE.md sync** — at freeze time: add the dodge duration/impulse rows (SPOT_DODGE_DURATION 18, AIR_DODGE_DURATION 22, AIR_DODGE_IMPULSE 4.5) to the starting-values table, and document the i-frame frame-numbering convention in the Dodge bullet ("windows are 0-indexed engine ticks from the dodge's first full tick: spot 2–13 of 18, air 3–15 of 22").
- [x] **Step 5: HARD STOP.** Tell Tim the graybox is ready at `?graybox` with the controls + preset keys, and ask for feel notes (BALANCE.md lists what to poke: dash-jump arc vs Brawlhalla, fast-fall snappiness, air-dodge-as-recovery, dodge cooldown rhythm — plus the flagged graybox decisions: facing-flip during a latched dash, step-dodge ledge hover, neutral air dodge momentum wipe, drop+dodge same-tick behavior). **Do not begin Phase 2.** After his pass: freeze the tuned `physics.js` values into BALANCE.md (same commit), then plan Phase 2.

---

## Out of scope for this plan (later phases)

Camera, real stages, stocks/HUD, combat/aerials, the animation rig, AI, hazards, music, sim-gate rework — Phases 2–5, each planned after the Phase-1 playtest verdict.
