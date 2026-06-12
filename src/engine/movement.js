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
  _jumps(intent) {}        // Task 5
  _dodges(intent) {}       // Task 8
  _collide(stage, prevBottom) {}  // Task 4
  _blast(stage) {}         // Task 9

  _setState(s) { if (this.state !== s) { this.state = s; this.stateT = 0; } }
}
