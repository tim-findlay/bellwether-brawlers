// Fighter (v3): a kit riding a MovementBody. Owns the composure gauge, meter,
// cooldowns, statuses, the attack lifecycle (ground moves + aerials + landing
// lag), knockback intake, the two staggers and the respawn chair. All content
// (stats, moves, hooks) comes from src/data/characters/. Pure logic — no DOM.
//
// Contract for renderer/HUD/AI: docs/superpowers/plans/2026-09-25-phase3-revamp.md

import { MovementBody } from './movement.js';
import { PHYS } from '../data/physics.js';

export const STOCKS = 3;
export const CHAIR_DESCENT = 60;     // frames: bounds-top -> respawn hover point
export const RESPAWN_CAP = 180;      // forced release (3 s)
export const SELF_STAGGER = 30;      // Adrian's tax: non-actionable, fully vulnerable
export const HAZARD_STAGGER = 20;    // hazard losers: brief, invulnerable through recovery
const SLOT_PRIORITY = ['super', 's2', 's1', 'heavy', 'light'];
const NEUTRAL = Object.freeze({ left: false, right: false, down: false, downTapped: false, jump: false, dodge: false, dashLeft: false, dashRight: false });
const HURT_W = 44;

export class Fighter {
  constructor(cfg, side, controller, world) {
    this.cfg = cfg; this.side = side; this.controller = controller; this.world = world;
    this.maxGauge = cfg.stats.gauge;
    this.meter = 0; this.meterFlash = false;
    this.stocks = STOCKS;
    this.custom = {};
    this.stats = { ...cfg.stats };               // live copy: effRunMax writes into it
    this.spawn(world.stage.spawns[side]);
  }

  // Fresh body at `pos` (match start, chair release). Gauge refills here only.
  spawn(pos) {
    this.body = new MovementBody(this.stats, pos);
    this.body.facing = pos.x < (this.world.stage.respawn?.x ?? pos.x) ? 1 : -1;
    this.gauge = this.maxGauge;
    this.cd = { s1: 0, s2: 0 };
    this.state = 'normal'; this.stateT = 0;
    this.attack = null; this.landLag = 0; this.chair = null; this.hazardInv = 0; this.tripOnLand = false;
    this.statuses = new Map();
    this.controller.reversed = false;
    this.hurtFlash = 0; this.animT = (this.side + 1) * 17;
    this._animName = 'idle'; this._animT = 0;
    this.custom = {};
  }

  // ---- proxies & queries ---------------------------------------------------
  get x() { return this.chair ? this.chair.x : this.body.x; }
  get y() { return this.chair ? this.chair.y : this.body.y; }
  get facing() { return this.body.facing; }
  get grounded() { return this.body.grounded; }
  get airborne() { return !this.body.grounded; }
  get opp() { return this.world.other(this); }
  get actionable() {
    return this.state === 'normal' && !this.attack && this.landLag === 0 && !this.body.dodging && this.body.stun === 0 && this.body.state !== 'ledge';
  }
  get invulnerable() {
    if (this.state === 'chair' || this.state === 'ko') return true;
    if (this.hazardInv > 0) return true;
    if (this.body.invulnerable()) return true;
    return !!(this.attack && this.attack.move.iframes && this.attack.frame < this.attack.move.iframes);
  }
  // grabs and unparryables whiff against these (wake-up rule)
  get grabbable() { return this.grounded && !this.invulnerable && this.state === 'normal'; }
  get anim() { return { name: this._animName, t: this._animT }; }

  hasStatus(n) { return this.statuses.has(n); }
  statusData(n) { return this.statuses.get(n)?.data; }
  applyStatus(name, dur, data = {}) {
    this.statuses.set(name, { dur, max: dur, data });
    const fx = this.world.fx;
    if (name === 'reversed') { this.controller.reversed = true; fx.text(this.x, this.y - 130, 'REVERSED!', '#c4452e'); }
    if (name === 'silence') fx.text(this.x, this.y - 130, 'SPECIALS LOCKED!', '#c4452e');
    if (name === 'lien') fx.text(this.x, this.y - 130, 'LIEN!', '#c9a227');
  }
  clearStatus(name) {
    this.statuses.delete(name);
    if (name === 'reversed') this.controller.reversed = false;
  }
  effRunMax() {
    let s = this.cfg.stats.runMax;
    if (this.hasStatus('haste')) s *= 1.4;
    if (this.hasStatus('slow')) s *= 0.78;
    if (this.hasStatus('berlin')) s += 0.5;
    return s;
  }
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
    if (before < 100 && this.meter >= 100) { this.meterFlash = true; this.world.audio.play('superReady'); }
  }

  // ---- moves ---------------------------------------------------------------
  // aim: aerial direction for Light in the air (n/s/u/d); null on the ground.
  startMove(slot, aim = null) {
    let move = this.cfg[slot];
    if (!move) return false;
    const air = this.airborne;
    let aerial = false;
    if (slot === 'light' && air) { move = this.cfg.aerials?.[aim] || this.cfg.aerials?.n; if (!move) return false; aerial = true; }
    else if (slot === 'heavy' && air) return false;                 // ground-only kill commit
    else if ((slot === 's1' || slot === 's2' || slot === 'super') && air && !move.air) return false;
    if ((slot === 's1' || slot === 's2' || slot === 'super') && this.hasStatus('silence')) {
      this.world.fx.text(this.x, this.y - 120, 'LOCKED', '#c4452e');
      return false;
    }
    if (slot === 's1' || slot === 's2') {
      if (this.cd[slot] > 0) return false;
      this.cd[slot] = move.cooldown;
      if (move.sharedLock) { const o = slot === 's1' ? 's2' : 's1'; this.cd[o] = Math.max(this.cd[o], move.sharedLock); }
      this.world.audio.play(move.sound || 'special');
    } else if (slot === 'super') {
      if (this.meter < 100) return false;
      this.meter = 0; this.meterFlash = false;
      this.world.audio.play('superGo');
      this.world.fx.flash('#f2e9d8', 5);
      this.world.fx.banner(move.name.toUpperCase(), { dur: 70, sub: this.cfg.name });
    }
    this.attack = { slot, move, frame: 0, hasHit: false, fired: false, aerial, aim: aerial ? (aim || 'n') : null, hits: 0, armorSpent: false };
    this.body.fastFalling = false;
    if (move.unparryable) this.world.fx.text(this.x, this.y - 134, 'UNPARRYABLE!', '#c4452e');
    if (this.cfg.hooks?.onMoveStart) this.cfg.hooks.onMoveStart(this, slot, move);
    if ((slot === 's1' || slot === 's2') && move.announce !== false) this.world.fx.text(this.x, this.y - 116, move.name.toUpperCase(), this.cfg.body.trim);
    return true;
  }

  advanceAttack() {
    const a = this.attack, m = a.move;
    a.frame++;
    const total = (m.startup || 0) + (m.active || 0) + (m.recover || 0);
    if (m.travel && a.frame <= (m.startup || 0) + (m.active || 0)) {
      this.body.x += this.facing * (m.travel / ((m.startup || 0) + (m.active || 0)));
      if (this.airborne) this.body.vy = Math.min(this.body.vy, 0);   // lunges hover through their travel
    }
    if (!a.fired && a.frame >= (m.startup || 0)) { a.fired = true; this.world.fire(this, a); }
    if (a.frame >= total) {
      const whiffed = !a.hasHit && !['buff', 'parry', 'catch', 'bell', 'zoneSuper', 'teleport'].includes(m.kind);
      this.attack = null;
      // Adrian's tax: a whiffed lunge trips — on the ground now, in the air on the
      // botched landing (DESIGN: "self-staggers on a botched landing").
      if (whiffed && m.whiffTrip) { if (this.grounded) this.stagger(SELF_STAGGER, true); else this.tripOnLand = true; }
      else if (m.endTrip) this.stagger(SELF_STAGGER, true);
      if (whiffed && this.cfg.hooks?.onWhiff) this.cfg.hooks.onWhiff(this, m);
    }
  }

  stagger(frames, selfInflicted = false) {
    this.attack = null; this.landLag = 0;
    this.state = 'stagger'; this.stateT = 0; this.staggerT = frames;
    if (selfInflicted) {
      this.world.audio.play('slip');
      this.world.fx.dust(this.x, this.y, '#cbbfa6', 6);
      this.world.fx.text(this.x, this.y - 110, 'OOPS', '#c4452e');
    } else this.hazardInv = frames + 12;                       // hazard stagger: never comboable
  }

  // ---- damage intake -------------------------------------------------------
  // opts: dmg, kb, kbScale, kbAngle (deg: 0 away from attacker, 90 up, 270 down),
  //       dir (+1/-1 away from the attacker), status, unparryable, projectile
  takeHit(opts) {
    const { dmg, kb = 5, kbScale = 5, kbAngle = 40, dir = 1, status = null, unparryable = false, projectile = false } = opts;
    if (this.state === 'ko' || this.state === 'chair' || this.invulnerable) return 'miss';
    const w = this.world;
    if (this.attack?.move.kind === 'parry' && this.parryActive() && !projectile && !unparryable) return 'parried';
    if (unparryable && (this.airborne || this.state !== 'normal')) return 'miss';   // jump it / it whiffs on staggered targets
    if (this.hasArmorNow()) {
      this.spendArmor();
      this.gauge = Math.max(0, this.gauge - dmg);
      if (status) this.applyStatus(status.name, status.dur, status.data || {});
      return 'armored';
    }
    this.gauge = Math.max(0, this.gauge - dmg);
    this.cancelRegen();
    this.gainMeter(dmg * 0.5);
    this.attack = null; this.landLag = 0; this.tripOnLand = false;
    this.hurtFlash = 5;
    const emptiness = 1 - this.gauge / this.maxGauge;
    const speed = (kb + kbScale * emptiness) / this.cfg.stats.weight * PHYS.KNOCKBACK_MULT;
    const rad = kbAngle * Math.PI / 180;
    let vx = Math.cos(rad) * speed * dir;
    let vy = -Math.sin(rad) * speed;
    if (this.grounded && vy > -2 && kbAngle < 180) vy = -2;      // pop off the floor so flinches read
    const stun = Math.max(8, Math.round(speed * PHYS.HITSTUN_PER_KB));
    this.body.launch(vx, vy, stun);
    this.state = 'hitstun'; this.stateT = 0;
    if (status) this.applyStatus(status.name, status.dur, status.data || {});
    if (this.hasStatus('reversed')) this.clearStatus('reversed');   // one stolen turn
    return 'hit';
  }

  cancelRegen() {
    if (this.hasStatus('regen')) { this.clearStatus('regen'); this.world.fx.text(this.x, this.y - 130, 'LAST ORDERS CANCELLED', '#c4452e'); }
  }
  parryActive() { const m = this.attack?.move; return !!m && this.attack.frame <= (m.stance || 20); }
  hasArmorNow() {
    const a = this.attack;
    if (!a || !a.move.armor || a.armorSpent) return false;
    return a.frame >= a.move.armor[0] && a.frame <= a.move.armor[1];
  }
  spendArmor() {
    if (this.attack) this.attack.armorSpent = true;
    this.hurtFlash = 3;
    this.world.audio.play('block');
    this.world.fx.text(this.x, this.y - 120, 'ARMOR', '#c9a227');
  }

  // ---- stocks --------------------------------------------------------------
  // Ring-out: called by the world when body.out. Returns true when the match
  // is over for this fighter (no stocks left).
  loseStock() {
    this.stocks--;
    this.statuses.clear(); this.controller.reversed = false;
    this.attack = null;
    if (this.stocks <= 0) { this.state = 'ko'; this.stateT = 0; return true; }
    const y0 = this.world.stage.cameraBounds.y + 40;
    this.chair = { t: 0, x: this.world.stage.respawn.x, y: y0, y0 };
    this.state = 'chair'; this.stateT = 0;
    this.gauge = this.maxGauge;
    return false;
  }

  // ---- per-frame -----------------------------------------------------------
  update() {
    this.animT++; this.stateT++;
    if (this.hurtFlash > 0) this.hurtFlash--;
    if (this.hazardInv > 0) this.hazardInv--;
    if (this.cd.s1 > 0) this.cd.s1--;
    if (this.cd.s2 > 0) this.cd.s2--;
    this.tickStatuses();
    this.stats.runMax = this.effRunMax();

    if (this.state === 'ko') { this._tickAnim(); return; }
    if (this.state === 'chair') { this._chair(); this._tickAnim(); return; }
    if (this.state === 'frozen' || this.state === 'grabbed') { this._tickAnim(); return; }

    const intent = this.controller.intent(this);
    if (this.state === 'stagger') {
      if (--this.staggerT <= 0) { this.state = 'normal'; this.stateT = 0; }
      this.body.update(NEUTRAL, this.world.stage);
      this._tickAnim(); return;
    }
    if (this.state === 'hitstun' && this.body.stun === 0) { this.state = 'normal'; this.stateT = 0; }

    if (this.state === 'normal') {
      if (this.actionable) this._readButtons(intent);
      if (this.attack && this.state === 'normal') this.advanceAttack();
    }
    // movement: locked during ground attacks and landing lag; aerials keep drift
    let mi = intent;
    if (this.attack) mi = this.attack.aerial ? { ...intent, jump: false, dodge: false, downTapped: false, dashLeft: false, dashRight: false } : NEUTRAL;
    else if (this.landLag > 0) mi = NEUTRAL;
    if (this.body.stun === 0 && this.state === 'normal' && this.opp && !this.attack && this.landLag === 0 &&
        this.grounded && !intent.left && !intent.right && Math.abs(this.body.vx) < 0.5 && !this.body.dodging)
      this.body.facing = this.opp.x >= this.x ? 1 : -1;            // idle: square up to the opponent
    this.body.update(mi, this.world.stage);
    if (this.body.consumedJump) this.controller.consume('up');
    if (this.body.consumedDodge) this.controller.consume('dodge');
    if (this.body.dashT > 0 && this.body.dashT % 3 === 0) this.world.fx.dust(this.x - this.body.dashDir * 12, this.y - (this.body.airDash ? 34 : 0), '#cbbfa6', 2);
    if (this.body.landed) {
      if (this.attack?.aerial) {
        const m = this.attack.move, whiffed = !this.attack.hasHit;
        this.landLag = m.landLag || 8; this.attack = null;
        if (whiffed && m.whiffStagger) this.tripOnLand = true;     // Faceplant: whiffed dair, botched landing
      }
      if (this.tripOnLand) { this.tripOnLand = false; this.stagger(SELF_STAGGER, true); }
      this.world.fx.dust(this.x, this.y, '#cbbfa6', 3);
    }
    if (this.landLag > 0) this.landLag--;
    this._tickAnim();
  }

  _readButtons(intent) {
    const c = this.controller;
    for (const slot of SLOT_PRIORITY) {
      if (!c.buffered(slot)) continue;
      c.consume(slot);
      const aim = !this.grounded ? (intent.down ? 'd' : c.held('up') ? 'u' : (intent.left || intent.right) ? 's' : 'n') : null;
      if (this.startMove(slot, aim)) return;
    }
  }

  _chair() {
    const r = this.chair;
    r.t++;
    const k = Math.min(1, r.t / CHAIR_DESCENT);
    r.y = r.y0 + (this.world.stage.respawn.y - r.y0) * k;
    const it = this.controller.intent(this);
    const acts = it.left || it.right || it.down || it.jump || it.dodge || SLOT_PRIORITY.some(s => this.controller.buffered(s));
    if ((r.t >= CHAIR_DESCENT && acts) || r.t >= RESPAWN_CAP) {
      const pos = { x: r.x, y: r.y };
      this.chair = null;
      this.body = new MovementBody(this.stats, pos);
      this.body.facing = this.opp && this.opp.x < pos.x ? -1 : 1;
      this.state = 'normal'; this.stateT = 0;
      this.attack = null; this.landLag = 0;
    }
  }

  tickStatuses() {
    for (const [name, s] of this.statuses) {
      s.dur--;
      if (name === 'burn' && s.dur % 30 === 0 && this.state !== 'ko') {
        this.gauge = Math.max(0, this.gauge - (s.data.amount || 1));   // burn drains, never takes a stock
        this.world.fx.ember(this.x, this.y - 40, 2);
        this.world.audio.play('burn');
      }
      if (name === 'regen' && s.dur % 30 === 0 && this.gauge < this.maxGauge) {
        this.gauge = Math.min(this.maxGauge, this.gauge + 1);
        this.world.fx.text(this.x, this.y - 100, '+1', '#3f5a40');
      }
      if (s.dur <= 0) this.clearStatus(name);
    }
  }

  _tickAnim() {
    const b = this.body;
    let n;
    if (this.state === 'chair') n = 'chair';
    else if (this.state === 'ko') n = 'ko';
    else if (this.state === 'stagger') n = 'stagger';
    else if (this.state === 'hitstun' || b.stun > 0) n = b.grounded ? 'hurt' : 'launched';
    else if (this.state === 'grabbed' || this.state === 'frozen') n = 'hurt';
    else if (this.attack) n = 'attack';
    else if (this.landLag > 0) n = 'land';
    else if (b.state === 'ledge') n = 'ledge';
    else if (b.state === 'dodge') n = 'dodge';
    else if (b.state === 'airdodge') n = 'airdodge';
    else if (b.state === 'dash') n = 'dash';
    else if (b.state === 'run') n = 'run';
    else if (!b.grounded) n = b.vy < 0 ? 'jump' : b.fastFalling ? 'fastfall' : 'fall';
    else n = 'idle';
    if (n !== this._animName) { this._animName = n; this._animT = 0; } else this._animT++;
  }

  // ---- boxes (world px, y = centre) -----------------------------------------
  hitbox() {
    const a = this.attack;
    if (!a) return null;
    const m = a.move;
    const meleeKinds = [undefined, 'melee', 'lunge', 'flurry', 'shout', 'dashCombo', 'aerial'];
    if (!meleeKinds.includes(m.kind)) return null;
    if (a.frame < (m.startup || 0) || a.frame > (m.startup || 0) + (m.active || 0)) return null;
    const multi = m.kind === 'flurry';
    if (a.hasHit && !multi) return null;
    if (multi && a.frame < (a.nextHitAt || 0)) return null;
    const reach = m.range || 60, h = this.body.h, b = this.body;
    if (a.aerial && a.aim === 'u') return { x: b.x, y: b.y - h - 10, w: reach, h: 50, move: m, slot: a.slot };
    if (a.aerial && a.aim === 'd') return { x: b.x, y: b.y + 14, w: reach, h: 46, move: m, slot: a.slot };
    if (m.bothSides || (a.aerial && a.aim === 'n')) return { x: b.x, y: b.y - h * 0.5, w: reach * 1.7, h: 64, move: m, slot: a.slot };
    return { x: b.x + b.facing * (reach * 0.55), y: b.y - h * 0.5, w: reach, h: 64, move: m, slot: a.slot };
  }
  hurtbox() {
    const b = this.body;
    const h = this.state === 'stagger' ? b.h * 0.5 : b.h;
    return { x: b.x, y: b.y - h / 2, w: HURT_W, h };
  }
}
