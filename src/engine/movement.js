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
    this.facing = 1; this.dashDir = 1;
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

    // drop-through: fresh tap, only on one-way platforms (slabs are solid)
    // jump wins a same-tick drop+jump (guard: !intent.jump)
    if (this.grounded && this.onPlatform && intent.downTapped && !intent.jump && !this.dodging) {
      this.grounded = false; this.onPlatform = false;
      this.coyoteT = 0;
      this.dropT = PHYS.DROP_THROUGH_GRACE;
      this.y += 1;
      this._setState('air');
    }

    const dashDir = (intent.dashRight ? 1 : 0) - (intent.dashLeft ? 1 : 0);
    if (dashDir !== 0 && this.grounded && this.dashT === 0 && this.dashCd === 0 && !this.dodging) {
      this.facing = dashDir; this.dashDir = dashDir;       // latch: dash is not steerable
      this.dashT = PHYS.DASH_DURATION; this._setState('dash');
    }

    this._dodges(intent);
    if (!this.dodging) {
      this._horizontal(intent);
      this._jumps(intent);
      this._gravity(intent);
    }
    if (this.coyoteT > 0) this.coyoteT--;   // after _jumps reads it: 5 means 5

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

  _horizontal(intent) {
    const dir = (intent.right ? 1 : 0) - (intent.left ? 1 : 0);
    if (dir !== 0) this.facing = dir;

    if (this.dashT > 0) {                       // dash overrides steering (Task 7)
      this.dashT--;
      this.vx = this.dashDir * this.dashSpeed;
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
        if (Math.abs(this.vx) < PHYS.GROUND_DEADZONE) this.vx = 0;
        this._setState('idle');
      }
    } else {
      const max = this.airMax;
      if (dir !== 0 && (Math.sign(this.vx) !== dir || Math.abs(this.vx) < max)) {
        this.vx = Math.abs(this.vx + dir * PHYS.AIR_ACCEL) > max && Math.sign(this.vx + dir * PHYS.AIR_ACCEL) === dir
          ? dir * max : this.vx + dir * PHYS.AIR_ACCEL;
      }
      if (Math.abs(this.vx) > max) this.vx *= PHYS.AIR_MOMENTUM_DECAY;   // momentum carry decays, never clamps
      this._setState('air');
    }
  }
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
      if (this.dashT > 0) { this.dashT = 0; this.dashCd = PHYS.DASH_COOLDOWN; this.vx *= PHYS.DASH_JUMP_CARRY; }
      this.consumedJump = true;
      this._setState('air');
    }
  }
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

  _blast(stage) {
    const z = stage.blast;
    this.out = this.x < z.left || this.x > z.right || this.y - this.h > z.bottom || this.y < z.top;
  }

  _setState(s) { if (this.state !== s) { this.state = s; this.stateT = 0; } }
}
