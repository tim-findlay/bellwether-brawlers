// Fighter (v3): a kit riding a MovementBody. Owns the composure gauge, meter,
// cooldowns, statuses, the attack lifecycle (ground moves + aerials + landing
// lag), knockback intake, the two staggers and the respawn chair. All content
// (stats, moves, hooks) comes from src/data/characters/. Pure logic — no DOM.
//
// Contract for renderer/HUD/AI: docs/superpowers/plans/2026-09-25-phase3-revamp.md

import { MovementBody } from './movement.js';
import { PHYS } from '../data/physics.js';
import { holidayTick, homeTime } from './specials.js';

export const STOCKS = 3;
export const CHAIR_DESCENT = 60;     // frames: bounds-top -> respawn hover point
export const RESPAWN_CAP = 180;      // forced release (3 s)
export const SELF_STAGGER = 30;      // Adrian's tax: non-actionable, fully vulnerable
export const HAZARD_STAGGER = 20;    // hazard losers: brief, invulnerable through recovery
const SLOT_PRIORITY = ['super', 's2', 's1', 'heavy', 'light'];
const NEUTRAL = Object.freeze({ left: false, right: false, down: false, downTapped: false, jump: false, dodge: false, dashLeft: false, dashRight: false });
const HURT_W = 44;
const MELEE_KINDS = new Set([undefined, 'melee', 'lunge', 'flurry', 'shout', 'dashCombo', 'aerial']);

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
    this.attack = null; this.landLag = 0; this.chair = null; this.hazardInv = 0; this.tripOnLand = false; this.recoveryUsed = false;
    this.statuses = new Map();
    this.controller.reversed = false;
    this.hurtFlash = 0; this.cancelFlash = 0; this.animT = (this.side + 1) * 17;
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
    return this.state === 'normal' && !this.attack && this.landLag === 0 && !this.body.dodging && this.body.stun === 0 && this.body.state !== 'ledge' && !this.statuses.has('holiday');
  }
  get invulnerable() {
    if (this.state === 'chair' || this.state === 'ko') return true;
    if (this.hazardInv > 0) return true;
    if (this.statuses.has('holiday')) return true;                  // Hollibobs: off the board
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
    const s = this.statuses.get(name);
    this.statuses.delete(name);
    if (name === 'holiday' && s && this.state !== 'ko') homeTime(this, s.data);
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
    if (slot === 's2' && this.hasStatus('borrowed')) move = this.statusData('borrowed').move;   // I Know Your Guy
    if (!move) return false;
    const air = this.airborne;
    let aerial = false;
    if (slot === 'light' && air) { move = this.cfg.aerials?.[aim] || this.cfg.aerials?.n; if (!move) return false; aerial = true; }
    else if (slot === 'heavy' && air) {                               // air heavy: ground pound (down) or the recovery (once per airtime)
      if (aim === 'd') move = this.cfg.groundPound || null;
      else { if (this.recoveryUsed || !this.cfg.recovery) return false; move = this.cfg.recovery; this.recoveryUsed = true; }
      if (!move) return false; aerial = true;
    }
    else if (slot === 'light') move = this.cfg.lights?.[aim === 'u' ? 'n' : (aim || 'n')] || move;   // n / side / down light
    else if (slot === 'heavy') move = this.cfg.sigs?.[aim === 'u' ? 'n' : (aim || 'n')] || move;     // n / side / down signature
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
    this.attack = { slot, move, frame: 0, hasHit: false, fired: false, aerial, aim: aim || 'n', hits: 0, armorSpent: false };
    this.body.fastFalling = false;
    if (!aerial && this.grounded) {                                    // attacks in motion: keep the run, not the dash
      const b = this.body, cap = this.stats.runMax * PHYS.ATTACK_CARRY_CAP * (move.carry ?? 1);
      if (b.dashT > 0) { b.dashT = 0; b.dashCd = PHYS.DASH_COOLDOWN; }
      b.vx = Math.max(-cap, Math.min(cap, b.vx));
    }
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
      if (this.airborne && m.kind !== 'aerial') this.body.vy = Math.min(this.body.vy, 0);   // lunges hover through their travel
    }
    if (m.step && !a.aerial) {                                           // eased step-in: accelerates into the active frames
      const su = m.startup || 0, s0 = Math.floor(su * 0.35), s1 = su + Math.ceil((m.active || 0) / 2);
      const e = (fr) => { const k = Math.max(0, Math.min(1, (fr - s0) / Math.max(1, s1 - s0))); return k * k * (3 - 2 * k); };
      this.body.x += this.facing * m.step * PHYS.STEP_SCALE * (e(a.frame) - e(a.frame - 1));
    }
    if (m.lift && this.airborne) {                                       // recovery: rise through startup + active
      if (a.frame === 1) this.body.vy = -m.lift;
      else if (a.frame <= (m.startup || 0) + (m.active || 0)) this.body.vy = Math.min(this.body.vy, -m.lift * 0.45);
    }
    if (m.dive && this.airborne && a.frame >= (m.startup || 0)) this.body.vy = Math.max(this.body.vy, m.dive);   // ground pound: drop
    if (!a.fired && a.frame >= (m.startup || 0)) {
      a.fired = true; this.world.fire(this, a);
      if (MELEE_KINDS.has(m.kind)) this.world.audio.play(m.travel || (m.step || 0) >= 24 ? 'lunge' : a.slot === 'heavy' || a.slot === 'super' ? 'swingHeavy' : 'swingLight');
    }
    if (a.frame >= total) {
      const whiffed = !a.hasHit && !['buff', 'parry', 'catch', 'bell', 'zoneSuper', 'teleport', 'borrow'].includes(m.kind);
      this.attack = null;
      // Adrian's tax: a whiffed lunge trips — on the ground now, in the air on the
      // botched landing (DESIGN: "self-staggers on a botched landing").
      if (whiffed && m.whiffTrip) { if (this.grounded) this.stagger(SELF_STAGGER, true, true); else this.tripOnLand = true; }
      else if (m.endTrip) this.stagger(SELF_STAGGER, true);
      if (whiffed && this.cfg.hooks?.onWhiff) this.cfg.hooks.onWhiff(this, m);
    }
  }

  // accident: the trip came from a whiffed move (not Full Audit's planned end-trip)
  stagger(frames, selfInflicted = false, accident = false) {
    this.attack = null; this.landLag = 0;
    this.state = 'stagger'; this.stateT = 0; this.staggerT = frames;
    if (selfInflicted) {
      this.world.audio.play('slip');
      this.world.fx.dust(this.x, this.y, '#cbbfa6', 6);
      this.world.fx.text(this.x, this.y - 110, 'OOPS', '#c4452e');
      if (accident && this.cfg.tripHit) this._tripHit(this.cfg.tripHit);
    } else this.hazardInv = frames + 12;                       // hazard stagger: never comboable
  }

  // Adrian's Happy Accident: the fall itself is a small hitbox at arm's reach.
  // The self-stagger still runs in full — the punish window survives.
  _tripHit(m) {
    const o = this.opp, w = this.world;
    if (!o || o.chair || o.state === 'ko' || Math.abs(o.x - this.x) > (m.range || 70) || Math.abs(o.y - this.y) > 50) return;
    const dmg = this.damageOut(m.dmg, 'special');
    const res = o.takeHit({ dmg, kb: m.kb, kbScale: m.kbScale, kbAngle: m.kbAngle, dir: Math.sign(o.x - this.x) || this.facing, from: this, move: m });
    if (res === 'parried') { w.parryCounter(o, this); return; }
    if (res !== 'hit') return;
    this.gainMeter(dmg * 0.8);
    w.hitFeedback(o, 'special', dmg, m);
    w.fx.text(this.x, this.y - 130, 'HAPPY ACCIDENT!', '#c9a227');
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
    const speed = (kb * PHYS.KB_BASE_MULT + kbScale * PHYS.KB_SCALE_MULT * emptiness) / this.cfg.stats.weight;
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
    this.world.audio.play('chair');
    this.state = 'chair'; this.stateT = 0;
    this.gauge = this.maxGauge;
    return false;
  }

  // ---- per-frame -----------------------------------------------------------
  update() {
    this.animT++; this.stateT++;
    if (this.hurtFlash > 0) this.hurtFlash--;
    if (this.cancelFlash > 0) this.cancelFlash--;
    if (this.hazardInv > 0) this.hazardInv--;
    if (this.cd.s1 > 0) this.cd.s1--;
    if (this.cd.s2 > 0) this.cd.s2--;
    this.tickStatuses();
    this.stats.runMax = this.effRunMax();

    if (this.state === 'ko') { this._tickAnim(); return; }
    if (this.state === 'chair') { this._chair(); this._tickAnim(); return; }
    if (this.state === 'grabbed' && this.opp?.attack?.victim !== this) { this.state = 'normal'; this.stateT = 0; }   // the holder was hit mid-grab: let go
    if (this.state === 'frozen' || this.state === 'grabbed') { this._tickAnim(); return; }
    if (this.statuses.has('holiday')) { holidayTick(this); this._tickAnim(); return; }

    const intent = this.controller.intent(this);
    if (this.state === 'stagger') {
      if (--this.staggerT <= 0) { this.state = 'normal'; this.stateT = 0; }
      this.body.update(NEUTRAL, this.world.stage);
      this._tickAnim(); return;
    }
    if (this.state === 'hitstun' && this.body.stun === 0) { this.state = 'normal'; this.stateT = 0; }

    const x0 = this.body.x;
    if (this.state === 'normal') {
      if (this._cancelOpen() && this._wantsCancel(intent)) { this.attack = null; this.cancelFlash = 6; }   // hit-confirm cancel
      if (this.actionable) this._readButtons(intent);
      if (this.attack && this.state === 'normal') this.advanceAttack();
    }
    // a step-in or slide stops at the edge you stand on and at the opponent's body
    // (a `travel` lunge doesn't: Off the Lip leaves the stage and runs through on purpose)
    const guard = this.attack && !this.attack.aerial && !this.attack.move.travel && this.grounded;
    // movement: locked during ground attacks and landing lag; aerials keep drift
    let mi = intent;
    this.body.friction = null;
    if (this.attack) {
      if (this.attack.aerial) mi = { ...intent, jump: false, dodge: false, downTapped: false, dashLeft: false, dashRight: false };
      else { mi = NEUTRAL; this.body.friction = this._slide(intent); }
    } else if (this.landLag > 0) mi = NEUTRAL;
    if (this.body.stun === 0 && this.state === 'normal' && this.opp && !this.attack && this.landLag === 0 &&
        this.grounded && !intent.left && !intent.right && Math.abs(this.body.vx) < 0.5 && !this.body.dodging)
      this.body.facing = this.opp.x >= this.x ? 1 : -1;            // idle: square up to the opponent
    if (guard) this._guardSlide(x0);
    const b0 = this.body, was = { grounded: b0.grounded, dash: b0.dashT > 0, dodge: b0.dodging, ledge: b0.state === 'ledge', vy: b0.vy };
    this.body.update(mi, this.world.stage);
    this._moveSounds(was);
    if (this.body.consumedJump) this.controller.consume('up');
    if (this.body.consumedDodge) this.controller.consume('dodge');
    if (this.body.dashT > 0 && this.body.dashT % 3 === 0) this.world.fx.dust(this.x - this.body.dashDir * 12, this.y - (this.body.airDash ? 34 : 0), '#cbbfa6', 2);
    if (this.attack && !this.attack.aerial && this.grounded && Math.abs(this.body.vx) > 2.5 && this.animT % 4 === 0)
      this.world.fx.dust(this.x - Math.sign(this.body.vx) * 10, this.y, '#cbbfa6', 2);   // sliding-attack scuff
    if (this.body.landed) {
      if (this.attack?.aerial) {
        const m = this.attack.move, whiffed = !this.attack.hasHit;
        this.landLag = m.landLag || 8; this.attack = null;
        if (whiffed && m.whiffStagger) this.tripOnLand = true;     // Faceplant: whiffed dair, botched landing
      }
      if (this.tripOnLand) { this.tripOnLand = false; this.stagger(SELF_STAGGER, true, true); }
      this.recoveryUsed = false;
      this.world.fx.dust(this.x, this.y, '#cbbfa6', 3);
    }
    if (this.landLag > 0) this.landLag--;
    this._tickAnim();
  }

  // Hit-confirm cancel window: a light that connected, past HIT_CANCEL_FRAC of its recovery.
  _cancelOpen() {
    const a = this.attack, m = a?.move;
    if (!a || a.slot !== 'light' || !a.hasHit) return false;
    return a.frame > (m.startup || 0) + (m.active || 0) + Math.ceil((m.recover || 0) * PHYS.HIT_CANCEL_FRAC);
  }
  _wantsCancel(intent) {
    const c = this.controller;
    return c.buffered('light') || c.buffered('heavy') || intent.jump || intent.dashLeft || intent.dashRight;
  }

  // Ground friction while a ground move runs (PHYS "attacks in motion"): the
  // wind-up and active frames slide, holding forward keeps more speed, holding
  // back brakes, the recovery plants. carry 0 plants at once.
  _slide(intent) {
    const a = this.attack, m = a.move, carry = m.carry ?? 1;
    if (carry <= 0) return 0;
    if (a.frame > (m.startup || 0) + (m.active || 0)) return null;
    const dir = (intent.right ? 1 : 0) - (intent.left ? 1 : 0);
    if (dir === -this.facing) return null;
    return Math.pow(dir === this.facing ? PHYS.ATTACK_SLIDE_HOLD : PHYS.ATTACK_SLIDE, 1 / carry);
  }

  _guardSlide(x0) {
    const b = this.body, sur = this._surface(), o = this.opp;
    let lo = sur ? sur.x + 4 : -Infinity, hi = sur ? sur.x + sur.w - 4 : Infinity;
    if (o && !o.chair && o.state !== 'ko' && Math.abs(o.y - this.y) < 60) {
      if (this.facing > 0 && o.x > x0) hi = Math.min(hi, Math.max(x0, o.x - PHYS.BODY_GAP));
      if (this.facing < 0 && o.x < x0) lo = Math.max(lo, Math.min(x0, o.x + PHYS.BODY_GAP));
    }
    b.x = Math.max(lo, Math.min(hi, b.x));
    const nx = b.x + b.vx * (b.friction ?? PHYS.RUN_FRICTION);
    if (nx < lo || nx > hi) b.vx = 0;
  }

  // footfalls & motion (audio only): read the body's transitions this tick
  _moveSounds(was) {
    const b = this.body, au = this.world.audio;
    if (b.consumedJump) au.play(was.grounded || was.ledge ? 'jump' : 'airJump');
    if (b.landed && !was.ledge) au.play('land', { gain: Math.min(1.2, 0.35 + Math.max(0, was.vy) / 16) });
    if (!was.dash && b.dashT > 0) au.play('dash');
    if (!was.dodge && b.dodging) au.play('dodge');
    if (!was.ledge && b.state === 'ledge') au.play('ledge');
  }

  _surface() {
    const b = this.body, st = this.world.stage;
    for (const s of [...(st.slabs || []), ...(st.platforms || [])]) if (Math.abs(b.y - s.y) < 2 && b.x >= s.x - 2 && b.x <= s.x + s.w + 2) return s;
    return null;
  }

  _readButtons(intent) {
    const c = this.controller;
    for (const slot of SLOT_PRIORITY) {
      if (!c.buffered(slot)) continue;
      c.consume(slot);
      const aim = intent.down ? 'd' : (!this.grounded && c.held('up')) ? 'u' : (intent.left || intent.right) ? 's' : 'n';
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
      this.attack = null; this.landLag = 0; this.recoveryUsed = false;
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
    if (!MELEE_KINDS.has(m.kind)) return null;
    if (a.frame < (m.startup || 0) || a.frame > (m.startup || 0) + (m.active || 0)) return null;
    const multi = m.kind === 'flurry';
    if (a.hasHit && !multi) return null;
    if (multi && a.frame < (a.nextHitAt || 0)) return null;
    const reach = m.range || 60, h = this.body.h, b = this.body;
    if (m.lift) return { x: b.x + b.facing * 10, y: b.y - h * 0.7, w: reach, h: 90, move: m, slot: a.slot };   // recovery: tall rising arc
    if (m.dive) return { x: b.x, y: b.y + 10, w: reach, h: 50, move: m, slot: a.slot };                            // ground pound: under the feet
    if (m.low) return { x: b.x + b.facing * (reach * 0.5), y: b.y - 22, w: reach, h: 44, move: m, slot: a.slot };   // low sweeps
    if (a.aerial && a.aim === 'u') return { x: b.x, y: b.y - h - 10, w: reach, h: 50, move: m, slot: a.slot };
    if (a.aerial && a.aim === 'd') return { x: b.x, y: b.y + 14, w: reach, h: 46, move: m, slot: a.slot };
    if (m.bothSides || (a.aerial && a.aim === 'n')) return { x: b.x, y: b.y - h * 0.5, w: reach * 1.7, h: 64, move: m, slot: a.slot };
    return { x: b.x + b.facing * (reach * 0.55), y: b.y - h * 0.5, w: reach * PHYS.MELEE_REACH, h: PHYS.MELEE_H, move: m, slot: a.slot };
  }
  hurtbox() {
    const b = this.body;
    const h = this.state === 'stagger' ? b.h * 0.5 : b.h;
    return { x: b.x, y: b.y - h / 2, w: HURT_W, h };
  }
}
