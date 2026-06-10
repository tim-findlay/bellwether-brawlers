// FightWorld: owns both fighters, projectiles, zones, strikes and hazards.
// Runs headless for the balance sim (pass stub fx/audio) and under the fight
// screen for play. All special-move behavior is dispatched by move.kind, so
// characters stay pure data.

import { Fighter, GROUND_Y, STAGE_LEFT, STAGE_RIGHT } from './fighter.js';

export const STAGE_W = 480;

export class FightWorld {
  constructor({ cfgs, controllers, fx, audio, rng, settings }) {
    this.fx = fx;
    this.audio = audio;
    this.rng = rng;
    this.settings = settings;
    this.fighters = [
      new Fighter(cfgs[0], 0, controllers[0], this),
      new Fighter(cfgs[1], 1, controllers[1], this),
    ];
    this.projectiles = [];
    this.zones = [];
    this.strikes = [];
    this.hazards = [];
    this.frame = 0;
    this.koHappened = null;
    this.onKO = (f) => { this.koHappened = f; };
    this.instanceSeq = 0;
  }

  other(f) { return this.fighters[0] === f ? this.fighters[1] : this.fighters[0]; }

  resetRound() {
    for (const f of this.fighters) f.resetRound();   // meter persists (cross-round rule)
    this.projectiles = [];
    this.zones = [];
    this.strikes = [];
    this.hazards = [];
    this.koHappened = null;
  }

  update() {
    this.frame++;
    for (const f of this.fighters) f.update();
    this.pushApart();
    this.resolveMelee();
    this.updateProjectiles();
    this.updateZones();
    this.updateStrikes();
    this.updateHazards();
    this.resolveGrabs();
  }

  pushApart() {
    const [a, b] = this.fighters;
    if (a.state === 'ko' || b.state === 'ko') return;
    const gap = 18;
    if (Math.abs(a.x - b.x) < gap && a.grounded && b.grounded) {
      const mid = (a.x + b.x) / 2;
      const l = a.x <= b.x ? a : b, r = a.x <= b.x ? b : a;
      l.x = Math.max(STAGE_LEFT, mid - gap / 2);
      r.x = Math.min(STAGE_RIGHT, mid + gap / 2);
    }
  }

  // ---- melee ---------------------------------------------------------------

  resolveMelee() {
    for (const att of this.fighters) {
      const hb = att.hitbox();
      if (!hb) continue;
      const def = this.other(att);
      if (def.state === 'ko') continue;
      if (!overlap(hb, def.hurtbox())) continue;
      const m = hb.move;

      if (m.unblockable && (def.airborne || def.invulnerable)) continue;   // shout whiffs (wake-up rule)
      if (att.attack) att.attack.hasHit = true;
      if (att.attack && m.kind === 'flurry') {
        att.attack.hits = (att.attack.hits || 0) + 1;
        att.attack.nextHitAt = att.attack.frame + (m.rehit || 6);
        if (att.attack.hits > (m.maxHits || 5)) continue;
      }

      if (def.hasArmorNow()) { def.spendArmor(); continue; }

      let dmg = att.damageOut(m.kind === 'flurry' ? m.dmg : m.dmg, hb.slot);
      if (att.cfg.hooks?.preHit) dmg = att.cfg.hooks.preHit(att, def, dmg, hb.slot, m);

      const chipDmg = att.attack && !att.attack.chipped ? Math.max(1, Math.round((m.totalDmg || m.dmg) * 0.15)) : 0;
      const dir = Math.sign(def.x - att.x) || att.facing;     // knockback away from the attacker (matters for both-sides moves)
      const res = def.takeHit({
        dmg, kb: m.kb, dir, launcher: m.launcher,
        status: m.applyStatus, unblockable: m.unblockable, chipDmg,
      });

      if (res === 'parried') { this.parryCounter(def, att); continue; }
      if (res === 'blocked' && att.attack) att.attack.chipped = true;
      if (res === 'hit') {
        att.gainMeter(dmg * 0.8);
        this.hitFeedback(def, hb.slot, dmg);
        if (att.cfg.hooks?.onHitDealt) att.cfg.hooks.onHitDealt(att, def, hb.slot, m);
      }
    }
  }

  parryCounter(def, att) {
    def.attack = null;
    def.state = 'idle';
    def.stateT = 0;
    this.audio.play('parry');
    this.fx.hitstop(8);
    this.fx.text(def.x, def.y - 66, 'DECLINED!', '#27425f');
    att.takeHit({ dmg: 12, kb: 3, dir: def.facing, launcher: true, unblockable: true });
    def.gainMeter(10);
  }

  hitFeedback(def, slot, dmg) {
    const heavy = slot === 'heavy' || slot === 'super' || dmg >= 10;
    this.audio.play(heavy ? 'hitHeavy' : 'hitLight');
    this.fx.hitstop(slot === 'super' ? 12 : heavy ? 6 : 3);
    if (heavy) this.fx.shake(3, 8);
    this.fx.spark(def.x, def.y - 32, '#c4452e', heavy ? 9 : 5);
    this.fx.text(def.x, def.y - 56, String(dmg), '#f2e9d8');
  }

  // ---- special-move firing (dispatch on move.kind) ---------------------------

  fire(f, a) {
    const m = a.move;
    const fn = BEHAVIORS[m.kind];
    if (fn) fn(this, f, m, a);
  }

  spawnProjectile(f, m, over = {}) {
    const e = { ...m, ...over };
    const dmg = f.damageOut(e.dmg, 'special');
    this.projectiles.push({
      x: f.x + f.facing * 16, y: f.y - (e.height ?? 34),
      vx: f.facing * e.speed, vy: e.vy || 0, grav: e.grav || 0,
      w: e.w || 12, h: e.h || 10, color: e.color || '#2b2620', shape: e.shape || 'rect',
      dmg, kb: e.kb || 2, owner: f, status: e.applyStatus || null, launcher: !!e.launcher,
      instance: over.instance ?? a_id(), tag: e.tag || null, dead: false, t: 0, groundHug: !!e.groundHug,
      move: m,
    });
  }

  updateProjectiles() {
    for (const p of this.projectiles) {
      p.t++;
      p.x += p.vx;
      if (p.grav) { p.vy += p.grav; p.y += p.vy; }
      else if (p.vy) p.y += p.vy;
      if (p.groundHug) p.y = GROUND_Y - p.h / 2;
      if (p.y >= GROUND_Y - 2 && p.grav) { this.projectileLand(p); continue; }
      if (p.x < -30 || p.x > STAGE_W + 30) { p.dead = true; this.resolveProjOutcome(p, 'miss'); continue; }

      const def = this.other(p.owner);
      if (def.state === 'ko' || def.invulnerable) continue;
      if (!overlap({ x: p.x, y: p.y, w: p.w, h: p.h }, def.hurtbox())) continue;

      if (def.state === 'catch' && def.parryActive()) {       // Seelye's Dad Reflexes
        p.dead = true;
        def.gainMeter(20);
        this.audio.play('parry');
        this.fx.text(def.x, def.y - 66, 'CAUGHT! +METER', '#3f5a40');
        if (def.attack) def.attack.hasHit = true;
        this.resolveProjOutcome(p, 'caught');
        continue;
      }

      let dmg = p.dmg;
      if (p.owner.cfg.hooks?.preHit) dmg = p.owner.cfg.hooks.preHit(p.owner, def, dmg, 'special', p.move);
      // chip-per-move-instance: a multi-projectile move (Nick's fan) chips once
      this._chipped = this._chipped || new Set();
      const chipDmg = p.move.chipOnce && this._chipped.has(p.instance) ? 0 : Math.max(1, Math.round(dmg * 0.15));
      const res = def.takeHit({
        dmg, kb: p.kb, dir: Math.sign(p.vx) || p.owner.facing,
        launcher: p.launcher, status: p.status, projectile: true, chipDmg,
      });
      if (res === 'blocked' && p.move.chipOnce) this._chipped.add(p.instance);
      if (res === 'hit' || res === 'blocked') {
        p.dead = true;
        if (res === 'hit') { p.owner.gainMeter(dmg * 0.8); this.hitFeedback(def, 'special', dmg); }
        this.projectileBurst(p);
        this.resolveProjOutcome(p, res);
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.dead);
  }

  projectileLand(p) {
    p.dead = true;
    if (p.move.zoneOnLand) this.addZone({ ...p.move.zoneOnLand, x: p.x, owner: p.owner });
    this.projectileBurst(p);
    this.resolveProjOutcome(p, 'landed');
  }

  projectileBurst(p) { this.fx.spark(p.x, p.y, p.color, 5, 1.2); }

  resolveProjOutcome(p, outcome) {
    if (p.owner.cfg.hooks?.onProjectileResolved) p.owner.cfg.hooks.onProjectileResolved(p.owner, p, outcome);
  }

  // ---- zones (puddles, embers, smoke, assembly) ------------------------------

  addZone(z) {
    this.zones.push({ life: 180, w: 40, y: GROUND_Y, lastTrip: new Map(), drift: 0, ...z });
  }

  updateZones() {
    for (const z of this.zones) {
      z.life--;
      if (z.drift) z.x += z.drift;
      if (z.life <= 0) { z.dead = true; continue; }
      for (const f of this.fighters) {
        if (f === z.owner && z.ownerImmune) continue;
        if (f.state === 'ko' || f.invulnerable || !f.grounded) continue;
        const inside = Math.abs(f.x - z.x) < z.w / 2;
        if (!inside) continue;
        if (z.type === 'coffee') {
          const last = z.lastTrip.get(f) || -999;
          if (this.frame - last < 60) continue;
          z.lastTrip.set(f, this.frame);
          this.audio.play('slip');
          f.takeHit({ dmg: 4, kb: 3, dir: f.x < z.x ? -1 : 1, unblockable: true });
          this.fx.text(f.x, f.y - 60, 'SLIP!', '#7a4a3a');
        } else if (z.type === 'ember' || z.type === 'smoke') {
          if (!f.hasStatus('burn')) f.applyStatus('burn', 90, { amount: z.burn || 1 });
          else f.statuses.get('burn').dur = Math.max(f.statuses.get('burn').dur, 60);
        }
      }
      if (z.type === 'ember' && this.frame % 6 === 0) this.fx.ember(z.x + (this.rng() - 0.5) * z.w, GROUND_Y, 1);
    }
    this.zones = this.zones.filter(z => !z.dead);
  }

  // ---- delayed strikes (Richy's columns, telegraphed eruptions) --------------

  addStrike(s) { this.strikes.push({ activeFor: 8, h: 60, w: 18, hitGroup: null, ...s }); }

  updateStrikes() {
    for (const s of this.strikes) {
      s.delay--;
      if (s.delay > 0) continue;
      s.activeFor--;
      if (s.activeFor <= 0) { s.dead = true; continue; }
      const def = this.other(s.owner);
      if (def.state === 'ko' || def.invulnerable) continue;
      if (s.group && s.groupHit?.done) continue;            // only first connecting column hits
      if (!overlap({ x: s.x, y: GROUND_Y - s.h / 2, w: s.w, h: s.h }, def.hurtbox())) continue;
      const dmg = s.owner.damageOut(s.dmg, 'super');
      const res = def.takeHit({ dmg, kb: s.kb || 3, dir: def.x < s.x ? -1 : 1, launcher: true, chipDmg: Math.max(1, Math.round(dmg * 0.15)) });
      if (res === 'hit') { s.owner.gainMeter(dmg * 0.8); this.hitFeedback(def, 'super', dmg); }
      if ((res === 'hit' || res === 'blocked') && s.groupHit) s.groupHit.done = true;
      s.dead = true;
    }
    this.strikes = this.strikes.filter(s => !s.dead);
  }

  // ---- hazards (bikes, wrecking ball, wave) -----------------------------------

  addHazard(h) { this.hazards.push({ hit: new Set(), ...h }); }

  updateHazards() {
    for (const h of this.hazards) {
      if (h.update) h.update(h, this);
      for (const f of this.fighters) {
        if (h.immune === f || h.hit.has(f) || f.state === 'ko' || f.invulnerable) continue;
        if (h.groundedOnly && !f.grounded) continue;
        if (!overlap({ x: h.x, y: h.y, w: h.w, h: h.h }, f.hurtbox())) continue;
        h.hit.add(f);
        const dmg = h.owner ? h.owner.damageOut(h.dmg, 'super') : h.dmg;
        const res = f.takeHit({ dmg, kb: h.kb || 3, dir: Math.sign(h.vx) || 1, launcher: !!h.launcher, unblockable: !!h.unblockable, chipDmg: Math.max(1, Math.round(dmg * 0.15)) });
        if (res === 'hit' && h.owner) { h.owner.gainMeter(dmg * 0.8); this.hitFeedback(f, 'super', dmg); }
        else if (res === 'hit') this.hitFeedback(f, 'heavy', dmg);
      }
    }
    this.hazards = this.hazards.filter(h => !h.dead);
  }

  // ---- grabs --------------------------------------------------------------

  resolveGrabs() {
    for (const f of this.fighters) {
      const a = f.attack;
      if (!a || a.move.kind !== 'grab' || !a.fired || a.resolved) continue;
      a.resolved = true;
      const def = this.other(f);
      const inRange = Math.abs(def.x - f.x) <= (a.move.range || 34) && Math.sign(def.x - f.x) === f.facing;
      if (inRange && def.grabbable) {
        def.state = 'grabbed';
        def.stateT = 0;
        a.grabT = 22;
        a.victim = def;
        this.audio.play('grab');
        this.fx.hitstop(6);
      } else {
        this.fx.text(f.x, f.y - 60, 'WHIFF', '#8a7f6e');
        this.audio.play('whiff');
      }
    }
    // complete grabs
    for (const f of this.fighters) {
      const a = f.attack;
      if (!a || !a.victim) continue;
      a.grabT--;
      a.victim.x = f.x + f.facing * 16;
      if (a.grabT <= 0) {
        const def = a.victim;
        a.victim = null;
        a.hasHit = true;
        const dmg = f.damageOut(a.move.dmg, 'special');
        def.state = 'idle';                       // released into the slam
        def.takeHit({ dmg, kb: 4, dir: f.facing, launcher: true, unblockable: true });
        f.gainMeter(dmg * 0.8);
        this.hitFeedback(def, 'heavy', dmg);
        this.fx.shake(4, 10);
      }
    }
  }
}

// ---------- special-move behaviors, dispatched by move.kind ----------

let _seq = 0;
function a_id() { return ++_seq; }

const BEHAVIORS = {
  projectile(w, f, m) { w.spawnProjectile(f, m); },

  lob(w, f, m) { w.spawnProjectile(f, { ...m, vy: m.vy ?? -3.4, grav: m.grav ?? 0.18, speed: m.speed ?? 1.4 }); },

  groundProjectile(w, f, m) { w.spawnProjectile(f, { ...m, groundHug: true, height: 8 }); },

  fan(w, f, m) {
    const instance = a_id();
    for (const vy of [-0.9, 0, 0.9]) w.spawnProjectile(f, m, { vy, instance });
  },

  teleport(w, f, m) {
    const def = w.other(f);
    f.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, def.x - def.facing * (m.behind || 30)));
    f.facing = def.x > f.x ? 1 : -1;
    w.audio.play('teleport');
    w.fx.dust(f.x, f.y, '#cbbfa6', 8);
  },

  shockwave(w, f, m) {
    w.audio.play('hitHeavy');
    w.fx.shake(4, 10);
    w.fx.dust(f.x, f.y, '#cbbfa6', 10);
    const def = w.other(f);
    // clank: destroy projectiles inside the radius (Mike's anti-zoning answer)
    for (const p of w.projectiles) if (Math.abs(p.x - f.x) < m.radius) { p.dead = true; w.fx.spark(p.x, p.y, '#c9a227', 6); }
    if (!def.invulnerable && def.grounded && def.state !== 'ko' && Math.abs(def.x - f.x) < m.radius) {
      const dmg = f.damageOut(m.dmg, 'special');
      const res = def.takeHit({ dmg, kb: m.kb, dir: def.x < f.x ? -1 : 1, launcher: true, chipDmg: Math.max(1, Math.round(dmg * 0.15)) });
      if (res === 'hit') { f.gainMeter(dmg * 0.8); w.hitFeedback(def, 'special', dmg); }
    }
  },

  buff(w, f, m) {
    for (const s of m.apply || []) f.applyStatus(s.name, s.dur, s.data || {});
    if (m.resetCooldowns) for (const slot of m.resetCooldowns) f.cd[slot] = 0;
    w.fx.text(f.x, f.y - 66, m.flavor || 'BUFF', f.cfg.body.trim);
    w.audio.play('heal');
  },

  zone(w, f, m) {
    w.addZone({ ...m.zone, x: f.x + f.facing * (m.zone.ahead || 50), owner: f, ownerImmune: !!m.zone.ownerImmune });
  },

  grab() { /* resolved in resolveGrabs */ },

  parry() { /* state machine handles the stance */ },
  catch() { /* projectile loop handles the catch */ },

  bell(w, f, m) {
    const def = w.other(f);
    def.applyStatus('silence', m.silence || 210);
    if (!def.invulnerable && def.state !== 'ko') def.vx += f.facing * 2.6;   // LAST ORDERS shove, 0 dmg
    f.applyStatus('regen', m.regen || 300, {});
    w.audio.play('bell');
    w.fx.banner('LAST ORDERS!', { dur: 60, sub: 'specials locked — pressure Abi to cancel the heal' });
  },

  columns(w, f, m) {
    const def = w.other(f);
    const group = { done: false };
    [-44, 0, 44].forEach((off, i) => {
      const x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, def.x + off));
      w.addStrike({ x, delay: 26 + i * 14, dmg: m.dmg, kb: 3, owner: f, group: true, groupHit: group, marker: true, color: '#3f5a40' });
    });
    w.audio.play('special');
  },

  zoneSuper(w, f, m) {
    const def = w.other(f);
    const half = def.x > STAGE_W / 2 ? 1 : -1;
    w.addZone({
      type: 'smoke', x: half > 0 ? STAGE_W - 110 : 110, w: 200, life: m.dur || 300,
      drift: half * 0.25, owner: f, ownerImmune: true, burn: m.burn || 1,
    });
    w.audio.play('jet');
  },

  hazardSuper(w, f, m) {
    const dir = f.facing;
    w.addHazard({
      type: 'ball', owner: f, immune: f, dmg: m.dmg, kb: 5, launcher: true,
      x: dir > 0 ? STAGE_LEFT : STAGE_RIGHT, y: 158, w: 30, h: 30, vx: dir * 3.2, phase: 0,
      update(h) {
        h.x += h.vx;
        if (h.phase === 0 && (h.x > STAGE_RIGHT || h.x < STAGE_LEFT)) {
          h.phase = 1; h.vx = -h.vx; h.y = 210; h.hit.clear();
        } else if (h.phase === 1 && (h.x > STAGE_RIGHT || h.x < STAGE_LEFT)) h.dead = true;
      },
    });
    w.fx.shake(2, 20);
  },

  shout() { /* melee-kind unblockable cone — hitbox() covers it */ },
  dashCombo() { /* travel + iframes on the move data; melee hitbox covers it */ },
  flurry() { /* multi-hit melee handled in resolveMelee */ },
  melee() {},
};

function overlap(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}
