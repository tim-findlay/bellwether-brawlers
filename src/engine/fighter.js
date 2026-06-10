// Fighter entity: state machine, physics, statuses, move lifecycle.
// All content (stats, moves, hooks) comes from src/data/characters.js.

export const GROUND_Y = 232;
export const STAGE_LEFT = 26;
export const STAGE_RIGHT = 454;
export const GRAV = 0.32;

const SLOT_PRIORITY = ['super', 's2', 's1', 'heavy', 'light'];

// States: idle walk jump block blockstun hitstun launched knockdown getup
//         attack parry catch grabbed frozen ko
export class Fighter {
  constructor(cfg, side, controller, world) {
    this.cfg = cfg;
    this.side = side;
    this.controller = controller;
    this.world = world;
    this.maxhp = cfg.stats.hp;
    this.meter = 0;
    this.meterFlash = false;
    this.roundsWon = 0;
    this.custom = {};                  // per-character hook scratch (Richy streak, etc.)
    this.resetRound();
  }

  resetRound() {
    this.x = this.side === 0 ? 150 : 330;
    this.y = GROUND_Y;
    this.vx = 0; this.vy = 0;
    this.facing = this.side === 0 ? 1 : -1;
    this.grounded = true;
    this.hp = this.maxhp;
    this.cd = { s1: 0, s2: 0 };
    this.state = 'idle';
    this.stateT = 0;
    this.attack = null;
    this.statuses = new Map();
    this.controller.reversed = false;
    this.juggleUsed = false;
    this.animT = (this.side + 1) * 17;
    this.hurtFlash = 0;
    this.blocking = false;
    this.hitstun = 0;
    this.blockstun = 0;
    this.eventMash = 0;
    this.custom = {};
  }

  get opp() { return this.world.other(this); }

  get actionable() {
    return this.grounded && !this.attack &&
      (this.state === 'idle' || this.state === 'walk' || this.state === 'block');
  }

  get airborne() { return !this.grounded; }

  get invulnerable() {
    return this.state === 'knockdown' || this.state === 'getup' ||
      (this.attack && this.attack.iframes && this.attack.frame < this.attack.iframes);
  }

  // grabs and unblockables whiff against these (wake-up rule)
  get grabbable() {
    return this.grounded && !this.invulnerable &&
      !['knockdown', 'getup', 'launched', 'grabbed', 'frozen', 'ko'].includes(this.state);
  }

  hasStatus(n) { return this.statuses.has(n); }
  statusData(n) { return this.statuses.get(n)?.data; }

  applyStatus(name, dur, data = {}) {
    this.statuses.set(name, { dur, max: dur, data });
    if (name === 'reversed') {
      this.controller.reversed = true;
      this.world.fx.text(this.x, this.y - 70, 'REVERSED!', '#c4452e');
    }
    if (name === 'silence') this.world.fx.text(this.x, this.y - 70, 'SPECIALS LOCKED!', '#c4452e');
    if (name === 'lien') this.world.fx.text(this.x, this.y - 70, 'LIEN!', '#c9a227');
  }

  clearStatus(name) {
    this.statuses.delete(name);
    if (name === 'reversed') this.controller.reversed = false;
  }

  effSpeed() {
    let s = this.cfg.stats.speed;
    if (this.hasStatus('haste')) s *= 1.4;
    if (this.hasStatus('slow')) s *= 0.78;
    if (this.hasStatus('berlin')) s += 0.18;
    return s;
  }

  // Outgoing damage after buffs; consumes one-shot buffs. preHit hooks
  // (Seelye's LIEN) run at the combat layer where the defender is known.
  damageOut(base, slot) {
    let d = base;
    const up = this.statusData('dmgUp');
    if (up) d += up.amount;
    if (this.hasStatus('berlin')) d = Math.round(d * 1.12);
    if (this.hasStatus('nextHit')) { d += this.statusData('nextHit').amount; this.clearStatus('nextHit'); }
    if (this.cfg.hooks?.damageOut) d = this.cfg.hooks.damageOut(this, d, slot);
    return Math.max(1, Math.round(d));
  }

  gainMeter(n) {
    if (this.hasStatus('noMeter') || this.state === 'ko') return;
    const before = this.meter;
    this.meter = Math.min(100, this.meter + n);
    if (before < 100 && this.meter >= 100) {
      this.meterFlash = true;
      this.world.audio.play('superReady');
    }
  }

  startMove(slot) {
    const move = this.cfg[slot];
    if (!move) return false;
    if ((slot === 's1' || slot === 's2' || slot === 'super') && this.hasStatus('silence')) {
      this.world.fx.text(this.x, this.y - 64, 'LOCKED', '#c4452e');
      return false;
    }
    if (slot === 's1' || slot === 's2') {
      if (this.cd[slot] > 0) return false;
      this.cd[slot] = move.cooldown;
      if (move.sharedLock) {
        const otherSlot = slot === 's1' ? 's2' : 's1';
        this.cd[otherSlot] = Math.max(this.cd[otherSlot], move.sharedLock);
      }
      this.world.audio.play(move.sound || 'special');
    } else if (slot === 'super') {
      if (this.meter < 100) return false;
      this.meter = 0;
      this.meterFlash = false;
      this.world.audio.play('superGo');
      this.world.fx.flash('#f2e9d8', 5);
      this.world.fx.banner(move.name.toUpperCase(), { dur: 70, sub: this.cfg.name });
    }
    this.attack = { slot, move, frame: 0, hasHit: false, fired: false, iframes: move.iframes || 0, hits: 0, chipped: false };
    this.state = move.kind === 'parry' || move.kind === 'catch' ? move.kind : 'attack';
    this.stateT = 0;
    this.blocking = false;
    if (move.unblockable) this.world.fx.text(this.x, this.y - 72, 'UNBLOCKABLE!', '#c4452e');
    if (this.cfg.hooks?.onMoveStart) this.cfg.hooks.onMoveStart(this, slot, move);
    if ((slot === 's1' || slot === 's2') && move.announce !== false) {
      this.world.fx.text(this.x, this.y - 62, move.name.toUpperCase(), this.cfg.body.trim);
    }
    return true;
  }

  // ---- damage intake -----------------------------------------------------
  // opts: dmg, kb, dir, launcher, status, unblockable, projectile, chipDmg
  takeHit(opts) {
    const { dmg, kb = 2, dir = 1, launcher = false, status = null, unblockable = false, projectile = false } = opts;
    if (this.state === 'ko' || this.invulnerable) return 'miss';
    const w = this.world;

    if (this.state === 'parry' && !projectile && !unblockable && this.parryActive()) return 'parried';

    const guarding = this.blocking || this.state === 'blockstun';   // blockstun keeps the guard up vs multi-hit
    const canBlock = !unblockable && guarding && this.grounded && this.facing === -Math.sign(dir);
    if (canBlock) {
      const chip = opts.chipDmg ?? Math.max(1, Math.round(dmg * 0.15));
      this.hp -= chip;
      this.state = 'blockstun';
      this.stateT = 0;
      this.blockstun = 10;
      this.vx = dir * (1.2 / this.cfg.stats.weight);
      this.hurtFlash = 3;
      if (chip > 0) this.cancelRegen();
      w.audio.play('block');
      w.fx.spark(this.x + this.facing * 11, this.y - 30, '#c9a227', 3, 1);
      this.gainMeter(chip * 0.5);
      this.checkKO();
      return 'blocked';
    }

    if (this.airborne) {
      if (this.juggleUsed) return 'miss';
      this.juggleUsed = true;
    }

    this.hp -= dmg;
    this.cancelRegen();
    this.gainMeter(dmg * 0.5);
    this.attack = null;
    this.blocking = false;
    this.hurtFlash = 5;
    this.vx = dir * (kb / this.cfg.stats.weight);
    if (launcher || this.airborne) {
      this.vy = launcher ? -4.6 : -2.4;
      this.grounded = false;
      this.state = 'launched';
    } else {
      this.state = 'hitstun';
      this.hitstun = 14 + Math.min(8, Math.round(kb * 1.5));
    }
    this.stateT = 0;
    if (status) this.applyStatus(status.name, status.dur, status.data || {});
    // One stolen turn: landing a hit on you ends YOUR attacker-applied reversal early
    if (this.hasStatus('reversed')) this.clearStatus('reversed');
    this.checkKO();
    return 'hit';
  }

  cancelRegen() {
    if (this.hasStatus('regen')) {
      this.clearStatus('regen');
      this.world.fx.text(this.x, this.y - 70, 'LAST ORDERS CANCELLED', '#c4452e');
    }
  }

  parryActive() {
    const m = this.attack?.move;
    return m && this.stateT <= (m.stance || 20);
  }

  checkKO() {
    if (this.hp <= 0 && this.state !== 'ko') {
      this.hp = 0;
      this.state = 'ko';
      this.stateT = 0;
      this.attack = null;
      this.statuses.clear();
      this.controller.reversed = false;
      this.vy = -3.2;
      this.grounded = false;
      this.world.onKO?.(this);
    }
  }

  // ---- per-frame ----------------------------------------------------------

  update() {
    this.animT++;
    this.stateT++;
    if (this.hurtFlash > 0) this.hurtFlash--;
    if (this.cd.s1 > 0) this.cd.s1--;
    if (this.cd.s2 > 0) this.cd.s2--;
    this.tickStatuses();

    if (this.state === 'ko') { this.physics(); return; }
    if (this.state === 'frozen' || this.state === 'grabbed') return;

    if (this.state === 'hitstun' && this.stateT >= this.hitstun) { this.state = 'idle'; this.stateT = 0; }
    else if (this.state === 'blockstun' && this.stateT >= this.blockstun) { this.state = 'idle'; this.stateT = 0; }
    else if (this.state === 'knockdown' && this.stateT >= 40) { this.state = 'getup'; this.stateT = 0; }
    else if (this.state === 'getup' && this.stateT >= 12) { this.state = 'idle'; this.stateT = 0; }
    else if (this.state === 'parry' || this.state === 'catch') {
      const m = this.attack?.move;
      if (this.stateT >= (m?.stance || 20) + (m?.recover || 25)) {
        this.attack = null; this.state = 'idle'; this.stateT = 0;
      }
    }

    if (this.actionable) this.facing = this.opp.x > this.x ? 1 : -1;
    if (this.attack && this.state === 'attack') this.advanceAttack();
    if (!this.attack && this.actionable) this.readInput();
    this.physics();
  }

  tickStatuses() {
    for (const [name, s] of this.statuses) {
      s.dur--;
      if (name === 'burn' && s.dur % 30 === 0 && this.state !== 'ko') {
        this.hp -= s.data.amount || 1;
        this.world.fx.ember(this.x, this.y - 30, 2);
        this.world.audio.play('burn');
        this.checkKO();
      }
      if (name === 'regen' && s.dur % 30 === 0 && this.hp < this.maxhp) {
        this.hp = Math.min(this.maxhp, this.hp + 1);
        this.world.fx.text(this.x, this.y - 58, '+1', '#3f5a40');
      }
      if (s.dur <= 0) this.clearStatus(name);
    }
  }

  advanceAttack() {
    const a = this.attack;
    const m = a.move;
    a.frame++;
    // Missing frame fields clamp to 0 (instant cast) instead of NaN-ing the
    // total, which froze the fighter in the attack forever. BALANCE.md still
    // requires real startup/active/recover on every move.
    const total = (m.startup || 0) + (m.active || 0) + (m.recover || 0);

    if (m.travel && a.frame <= m.startup + (m.active || 0)) {
      this.x += this.facing * (m.travel / (m.startup + (m.active || 0)));
    }

    if (!a.fired && a.frame >= (m.startup || 0)) {
      a.fired = true;
      this.world.fire(this, a);
    }

    if (a.frame >= total) {
      const whiffed = !a.hasHit && !['buff', 'parry', 'catch', 'bell', 'zoneSuper'].includes(m.kind);
      this.attack = null;
      this.state = 'idle';
      this.stateT = 0;
      if (whiffed && m.whiffTrip) this.selfKnockdown();
      else if (m.endTrip) this.selfKnockdown();          // Adrian's FULL AUDIT trips either way
      if (whiffed && this.cfg.hooks?.onWhiff) this.cfg.hooks.onWhiff(this, m);
    }
  }

  selfKnockdown() {
    this.state = 'knockdown';
    this.stateT = 0;
    this.vx = -this.facing * 1.2;
    this.world.audio.play('slip');
    this.world.fx.dust(this.x, this.y, '#cbbfa6', 6);
    this.world.fx.text(this.x, this.y - 60, 'OOPS', '#c4452e');
  }

  readInput() {
    const c = this.controller;
    this.blocking = c.held('down') && this.grounded;
    if (this.blocking) { this.state = 'block'; this.vx = 0; return; }
    if (this.state === 'block') this.state = 'idle';

    for (const slot of SLOT_PRIORITY) {
      if (c.buffered(slot)) {
        c.consume(slot);
        if (this.startMove(slot)) return;
      }
    }

    let moving = false;
    if (c.held('left')) { this.x -= this.effSpeed(); this.facing = -1; moving = true; }
    if (c.held('right')) { this.x += this.effSpeed(); this.facing = 1; moving = true; }
    if (c.buffered('up') && this.grounded) {
      c.consume('up');
      this.vy = -this.cfg.stats.jump;
      this.grounded = false;
      this.state = 'jump';
      this.world.fx.dust(this.x, this.y, '#cbbfa6', 3);
    }
    if (this.grounded && this.state !== 'jump') this.state = moving ? 'walk' : 'idle';
  }

  physics() {
    this.x += this.vx;
    if (!this.grounded) {
      this.vy += GRAV;
      this.y += this.vy;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        this.vy = 0;
        this.grounded = true;
        this.juggleUsed = false;
        if (this.state === 'launched') { this.state = 'knockdown'; this.stateT = 0; this.world.fx.dust(this.x, this.y, '#cbbfa6', 5); }
        else if (this.state === 'jump') this.state = 'idle';
        else if (this.state === 'ko') this.vx *= 0.6;
      }
    } else {
      this.vx *= 0.78;
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
    }
    this.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, this.x));
  }

  hitbox() {
    const a = this.attack;
    if (!a) return null;
    const m = a.move;
    const meleeKinds = [undefined, 'melee', 'lunge', 'flurry', 'shout', 'dashCombo'];
    if (!meleeKinds.includes(m.kind)) return null;
    if (a.frame < m.startup || a.frame > m.startup + (m.active || 0)) return null;
    const multi = m.kind === 'flurry';
    if (a.hasHit && !multi) return null;
    if (multi && a.frame < (a.nextHitAt || 0)) return null;
    const reach = m.range || 30;
    if (m.bothSides) return { x: this.x, y: this.y - 34, w: reach * 1.7, h: 30, move: m, slot: a.slot };
    return { x: this.x + this.facing * (reach * 0.55), y: this.y - 34, w: reach, h: 30, move: m, slot: a.slot };
  }

  hurtbox() {
    const tall = 50 * (this.cfg.body.height || 1);
    const crouchish = this.state === 'knockdown' || this.state === 'getup' || this.state === 'ko';
    const h = crouchish ? 18 : tall;
    return { x: this.x, y: this.y - h / 2, w: 22, h };
  }

  hasArmorNow() {
    const a = this.attack;
    if (!a || !a.move.armor || a.armorSpent) return false;
    return a.frame >= a.move.armor[0] && a.frame <= a.move.armor[1];
  }

  spendArmor() {
    if (this.attack) this.attack.armorSpent = true;
    this.hurtFlash = 3;
    this.world.audio.play('block');
    this.world.fx.text(this.x, this.y - 64, 'ARMOR', '#c9a227');
  }
}
