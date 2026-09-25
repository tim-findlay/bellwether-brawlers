// FightWorld (v3): owns both fighters, projectiles, zones, strikes and hazards
// on real stage geometry, resolves hits with the composure/knockback rules,
// and runs the stocks / ring-out / respawn-chair match flow. Runs headless
// for the balance sim (stub fx/audio) and under the fight screen for play.
// Special-move behavior is dispatched by move.kind, so characters stay data.

import { Fighter } from './fighter.js';

export class FightWorld {
  constructor({ cfgs, controllers, stage, fx, audio, rng, settings }) {
    this.stage = stage;                 // geometry: slabs, platforms, spawns, respawn, cameraBounds, blast
    this.fx = fx; this.audio = audio; this.rng = rng; this.settings = settings;
    this.frame = 0;
    this.projectiles = []; this.zones = []; this.strikes = []; this.hazards = [];
    this.events = [];                   // drained by the screen: 'ko' | 'gameover'
    this.over = false; this.winner = -1;
    this.fighters = [
      new Fighter(cfgs[0], 0, controllers[0], this),
      new Fighter(cfgs[1], 1, controllers[1], this),
    ];
  }

  other(f) { return this.fighters[0] === f ? this.fighters[1] : this.fighters[0]; }
  get mainSlab() { return this.stage.slabs[0]; }

  // Surface (slab or platform) directly under a world point, if any.
  surfaceBelow(x, y) {
    let best = null;
    for (const s of [...this.stage.slabs, ...this.stage.platforms]) {
      if (x < s.x || x > s.x + s.w || s.y < y - 1) continue;
      if (!best || s.y < best.y) best = s;
    }
    return best;
  }
  inBlast(x, y) { const z = this.stage.blast; return x >= z.left && x <= z.right && y >= z.top && y <= z.bottom; }

  // Berlin trip and friends: swap geometry mid-match, keeping relative footing.
  setStage(geometry) {
    const old = this.stage; this.stage = geometry;
    for (const f of this.fighters) {
      if (f.chair) continue;
      const k = (f.body.x - old.slabs[0].x) / old.slabs[0].w;
      f.body.x = geometry.slabs[0].x + Math.min(0.95, Math.max(0.05, k)) * geometry.slabs[0].w;
      f.body.y = geometry.slabs[0].y; f.body.vx = 0; f.body.vy = 0;
    }
    this.projectiles = []; this.zones = []; this.strikes = []; this.hazards = [];
  }

  update() {
    if (this.over) return;
    this.frame++;
    for (const f of this.fighters) f.update();
    this.resolveMelee();
    this.updateProjectiles();
    this.updateZones();
    this.updateStrikes();
    this.updateHazards();
    this.resolveGrabs();
    this.resolveRingOuts();
  }

  // ---- stocks ----------------------------------------------------------------
  resolveRingOuts() {
    const out = this.fighters.filter(f => !f.chair && f.state !== 'ko' && f.body.out);
    if (!out.length) return;
    if (out.length === 2 && this.fighters.every(f => f.stocks === 1)) {   // simultaneous final-stock KO: a draw
      for (const f of this.fighters) f.loseStock();
      this.over = true; this.winner = -1;
      this.events.push({ type: 'gameover', winner: -1 });
      return;
    }
    for (const f of out.sort((a, b) => b.stocks - a.stocks)) {
      this.fx.spark(Math.min(Math.max(f.x, this.stage.blast.left), this.stage.blast.right), Math.min(Math.max(f.y, this.stage.blast.top), this.stage.blast.bottom), '#2b2620', 16, 4);
      const done = f.loseStock();
      const i = this.fighters.indexOf(f);
      if (done) {
        this.over = true; this.winner = 1 - i;
        this.events.push({ type: 'gameover', winner: this.winner });
        return;
      }
      this.events.push({ type: 'ko', player: i, stocksLeft: f.stocks });
    }
  }

  // ---- melee -----------------------------------------------------------------
  resolveMelee() {
    for (const att of this.fighters) {
      const hb = att.hitbox();
      if (!hb) continue;
      const def = this.other(att);
      if (def.state === 'ko' || def.chair) continue;
      if (!overlap(hb, def.hurtbox())) continue;
      const m = hb.move;
      if (m.unparryable && (def.airborne || def.state !== 'normal')) continue;   // whiffs (jump it)
      if (att.attack) att.attack.hasHit = true;
      if (att.attack && m.kind === 'flurry') {
        att.attack.hits = (att.attack.hits || 0) + 1;
        att.attack.nextHitAt = att.attack.frame + (m.rehit || 6);
        if (att.attack.hits > (m.maxHits || 5)) continue;
      }
      let dmg = att.damageOut(m.dmg, hb.slot);
      if (att.cfg.hooks?.preHit) dmg = att.cfg.hooks.preHit(att, def, dmg, hb.slot, m);
      const dir = Math.sign(def.x - att.x) || att.facing;
      const res = def.takeHit({ dmg, kb: m.kb, kbScale: m.kbScale, kbAngle: m.kbAngle, dir, status: m.applyStatus, unparryable: m.unparryable, from: att, move: m });
      if (res === 'parried') { this.parryCounter(def, att); continue; }
      if (res === 'hit' || res === 'armored') {
        att.gainMeter(dmg * 0.8);
        this.hitFeedback(def, hb.slot, dmg, m);
        if (att.cfg.hooks?.onHitDealt) att.cfg.hooks.onHitDealt(att, def, hb.slot, m);
      }
    }
  }

  // The parry's riposte lives on the parry move as `counter` (Abi's Calendar Block).
  parryCounter(def, att) {
    const c = { dmg: 12, kb: 7, kbScale: 6, kbAngle: 50, meter: 10, name: 'Declined', callout: 'DECLINED!', ...def.attack?.move.counter };
    def.attack = null;
    this.audio.play('parry');
    this.fx.hitstop(8);
    this.fx.text(def.x, def.y - 120, c.callout, '#27425f');
    att.takeHit({ dmg: c.dmg, kb: c.kb, kbScale: c.kbScale, kbAngle: c.kbAngle, dir: def.facing, unparryable: true, status: c.applyStatus || null, from: def, move: { name: c.name } });
    def.gainMeter(c.meter);
  }

  hitFeedback(def, slot, dmg, move) {
    const heavy = slot === 'heavy' || slot === 'super' || dmg >= 10 || (move && move.kbAngle >= 255 && move.kbAngle <= 285);
    this.audio.play(heavy ? 'hitHeavy' : 'hitLight');
    this.fx.hitstop(slot === 'super' ? 12 : heavy ? 6 : 3);
    if (heavy) this.fx.shake(3, 8);
    this.fx.spark(def.x, def.y - 50, '#c4452e', heavy ? 9 : 5, 3);
    this.fx.text(def.x, def.y - 104, String(dmg), '#f2e9d8');
  }

  // ---- special-move firing (dispatch on move.kind) ------------------------------
  fire(f, a) { const fn = BEHAVIORS[a.move.kind]; if (fn) fn(this, f, a.move, a); }

  spawnProjectile(f, m, over = {}) {
    const e = { ...m, ...over };
    const dmg = f.damageOut(e.dmg, 'special');
    this.projectiles.push({
      x: f.x + f.facing * 30, y: f.y - (e.height ?? 60),
      vx: f.facing * e.speed, vy: e.vy || 0, grav: e.grav || 0,
      w: e.w || 24, h: e.h || 20, color: e.color || '#2b2620', shape: e.shape || 'rect',
      dmg, kb: e.kb ?? 5, kbScale: e.kbScale ?? 6, kbAngle: e.kbAngle ?? 40, owner: f,
      status: e.applyStatus || null, instance: over.instance ?? a_id(), tag: e.tag || null,
      dead: false, t: 0, groundHug: !!e.groundHug, surface: e.surface || null, move: m, name: m.name,
    });
  }

  updateProjectiles() {
    for (const p of this.projectiles) {
      p.t++;
      p.x += p.vx;
      if (p.groundHug) {                                   // Bear Raid: rolls along its surface, falls off the end
        if (p.surface && (p.x < p.surface.x || p.x > p.surface.x + p.surface.w)) { p.groundHug = false; p.grav = 0.5; }
        else if (p.surface) p.y = p.surface.y - p.h / 2;
      }
      if (p.grav) { p.vy += p.grav; p.y += p.vy; }
      else if (p.vy) p.y += p.vy;
      if (p.grav && p.vy > 0) {
        const s = this.surfaceBelow(p.x, p.y + p.h / 2);
        if (s && p.y + p.h / 2 >= s.y && p.y - p.vy + p.h / 2 <= s.y + 4) { this.projectileLand(p, s); continue; }
      }
      if (!this.inBlast(p.x, p.y)) { p.dead = true; this.resolveProjOutcome(p, 'miss'); continue; }

      const def = this.other(p.owner);
      if (def.state === 'ko' || def.chair || def.invulnerable) continue;
      if (!overlap({ x: p.x, y: p.y, w: p.w, h: p.h }, def.hurtbox())) continue;

      if (def.attack?.move.kind === 'catch' && def.parryActive()) {        // Seelye's Dad Reflexes
        p.dead = true;
        def.gainMeter(20);
        this.audio.play('parry');
        this.fx.text(def.x, def.y - 120, 'CAUGHT! +METER', '#3f5a40');
        def.attack.hasHit = true;
        this.resolveProjOutcome(p, 'caught');
        continue;
      }
      let dmg = p.dmg;
      if (p.owner.cfg.hooks?.preHit) dmg = p.owner.cfg.hooks.preHit(p.owner, def, dmg, 'special', p.move);
      const res = def.takeHit({ dmg, kb: p.kb, kbScale: p.kbScale, kbAngle: p.kbAngle, dir: Math.sign(p.vx) || p.owner.facing, status: p.status, projectile: true, from: p.owner, move: p.move });
      if (res === 'hit' || res === 'armored') {
        p.dead = true;
        p.owner.gainMeter(dmg * 0.8);
        this.hitFeedback(def, 'special', dmg, p);
        this.projectileBurst(p);
        this.resolveProjOutcome(p, 'hit');
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.dead);
  }

  projectileLand(p, surface) {
    p.dead = true;
    if (p.move.zoneOnLand) this.addZone({ ...p.move.zoneOnLand, x: p.x, y: surface.y, owner: p.owner, surface });
    this.projectileBurst(p);
    this.resolveProjOutcome(p, 'landed');
  }
  projectileBurst(p) { this.fx.spark(p.x, p.y, p.color, 5, 2.4); }
  resolveProjOutcome(p, outcome) {
    if (p.owner.cfg.hooks?.onProjectileResolved) p.owner.cfg.hooks.onProjectileResolved(p.owner, p, outcome);
  }

  // ---- zones (puddles, embers, smoke) — sit on a surface top ---------------------
  addZone(z) {
    const surface = z.surface || this.surfaceBelow(z.x, z.y ?? this.mainSlab.y) || this.mainSlab;
    this.zones.push({ life: 180, w: 80, h: 30, lastTrip: new Map(), drift: 0, ...z, y: surface.y, surface, max: z.life || 180 });
  }

  updateZones() {
    for (const z of this.zones) {
      z.life--;
      if (z.drift) z.x += z.drift;
      if (z.life <= 0) { z.dead = true; continue; }
      for (const f of this.fighters) {
        if (f === z.owner && z.ownerImmune) continue;
        if (f.state !== 'normal' && f.state !== 'hitstun') continue;
        if (f.invulnerable || !f.grounded) continue;
        if (Math.abs(f.y - z.y) > 4 || Math.abs(f.x - z.x) >= z.w / 2) continue;
        if (z.type === 'coffee') {
          const last = z.lastTrip.get(f) || -999;
          if (this.frame - last < 60) continue;
          z.lastTrip.set(f, this.frame);
          this.audio.play('slip');
          f.takeHit({ dmg: 4, kb: 5, kbScale: 3, kbAngle: 60, dir: f.x < z.x ? -1 : 1, unparryable: false, from: z.owner, move: { name: 'Nero Spill' } });
          this.fx.text(f.x, f.y - 110, 'SLIP!', '#7a4a3a');
        } else if (z.type === 'ember' || z.type === 'smoke') {
          if (!f.hasStatus('burn')) f.applyStatus('burn', 90, { amount: z.burn || 1 });
          else f.statuses.get('burn').dur = Math.max(f.statuses.get('burn').dur, 60);
        }
      }
      if (z.type === 'ember' && this.frame % 6 === 0) this.fx.ember(z.x + (this.rng() - 0.5) * z.w, z.y, 1);
    }
    this.zones = this.zones.filter(z => !z.dead);
  }

  // ---- delayed strikes (Richy's columns, Tim's Scheduled Send) --------------------
  addStrike(s) {
    const surface = s.surface || this.surfaceBelow(s.x, s.y ?? this.mainSlab.y) || this.mainSlab;
    this.strikes.push({ activeFor: 8, h: 130, w: 36, ...s, y: surface.y });
  }

  updateStrikes() {
    for (const s of this.strikes) {
      s.delay--;
      if (s.delay > 0) continue;
      s.activeFor--;
      if (s.activeFor <= 0) { s.dead = true; continue; }
      const def = this.other(s.owner);
      if (def.state === 'ko' || def.chair || def.invulnerable) continue;
      if (s.group && s.groupHit?.done) continue;            // only the first connecting column hits
      if (!overlap({ x: s.x, y: s.y - s.h / 2, w: s.w, h: s.h }, def.hurtbox())) continue;
      const slot = s.slot || 'super';
      const dmg = s.owner.damageOut(s.dmg, slot);
      const res = def.takeHit({ dmg, kb: s.kb ?? 8, kbScale: s.kbScale ?? 14, kbAngle: s.kbAngle ?? 75, dir: def.x < s.x ? -1 : 1, from: s.owner, move: s.move || { name: 'strike' } });
      if (res === 'hit') { s.owner.gainMeter(dmg * 0.8); this.hitFeedback(def, slot, dmg); }
      if (res === 'hit' && s.groupHit) s.groupHit.done = true;
      s.dead = true;
    }
    this.strikes = this.strikes.filter(s => !s.dead);
  }

  // ---- hazards (bikes, wrecking ball, wave) ---------------------------------------
  addHazard(h) { this.hazards.push({ hit: new Set(), ...h }); }

  updateHazards() {
    for (const h of this.hazards) {
      if (h.update) h.update(h, this);
      for (const f of this.fighters) {
        if (h.immune === f || h.hit.has(f) || f.state === 'ko' || f.chair || f.invulnerable) continue;
        if (h.groundedOnly && !f.grounded) continue;
        if (!overlap({ x: h.x, y: h.y, w: h.w, h: h.h }, f.hurtbox())) continue;
        h.hit.add(f);
        const dmg = h.owner ? h.owner.damageOut(h.dmg, 'super') : h.dmg;
        const res = f.takeHit({ dmg, kb: h.kb ?? 5, kbScale: h.kbScale ?? 0, kbAngle: h.kbAngle ?? 55, dir: h.dir ?? (Math.sign(h.vx) || 1), unparryable: !!h.unparryable });
        if (res === 'hit' && h.owner) { h.owner.gainMeter(dmg * 0.8); this.hitFeedback(f, 'super', dmg); }
        else if (res === 'hit') this.hitFeedback(f, 'heavy', dmg);
      }
    }
    this.hazards = this.hazards.filter(h => !h.dead);
  }

  // ---- grabs (Mike's Scaffold Slam) ---------------------------------------------------
  resolveGrabs() {
    for (const f of this.fighters) {
      const a = f.attack;
      if (!a || a.move.kind !== 'grab' || !a.fired || a.resolved) continue;
      a.resolved = true;
      const def = this.other(f);
      const inRange = Math.abs(def.x - f.x) <= (a.move.range || 68) && Math.sign(def.x - f.x) === f.facing && Math.abs(def.y - f.y) < 40;
      if (inRange && def.grabbable) {
        def.state = 'grabbed'; def.stateT = 0; def.attack = null;
        a.grabT = 22; a.victim = def;
        this.audio.play('grab');
        this.fx.hitstop(6);
      } else {
        this.fx.text(f.x, f.y - 110, 'WHIFF', '#8a7f6e');
        this.audio.play('whiff');
      }
    }
    for (const f of this.fighters) {
      const a = f.attack;
      if (!a || !a.victim) continue;
      a.grabT--;
      a.victim.body.x = f.x + f.facing * 32; a.victim.body.y = f.y; a.victim.body.vx = 0; a.victim.body.vy = 0;
      if (a.grabT <= 0) {
        const def = a.victim;
        a.victim = null; a.hasHit = true;
        const dmg = f.damageOut(a.move.dmg, 'special');
        def.state = 'normal';                       // released into the slam
        def.takeHit({ dmg, kb: a.move.kb ?? 8, kbScale: a.move.kbScale ?? 10, kbAngle: a.move.kbAngle ?? 45, dir: f.facing, unparryable: true });
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
  lob(w, f, m) { w.spawnProjectile(f, { ...m, vy: m.vy ?? -7, grav: m.grav ?? 0.35, speed: m.speed ?? 3 }); },
  groundProjectile(w, f, m) {
    const surface = w.surfaceBelow(f.x, f.y) || w.mainSlab;
    w.spawnProjectile(f, { ...m, groundHug: true, surface, height: (m.h || 28) / 2 });
  },
  fan(w, f, m) {
    const instance = a_id();
    for (const vy of [-1.8, 0, 1.8]) w.spawnProjectile(f, m, { vy, instance });
  },
  teleport(w, f, m) {
    const def = w.other(f);
    f.body.x = def.x - def.facing * (m.behind || 56);
    f.body.y = def.y; f.body.vx = 0; f.body.vy = Math.min(def.body.vy, 0);
    f.body.grounded = false;
    f.body.facing = def.x > f.x ? 1 : -1;
    w.audio.play('teleport');
    w.fx.dust(f.x, f.y, '#cbbfa6', 8);
  },
  shockwave(w, f, m) {
    w.audio.play('hitHeavy');
    w.fx.shake(4, 10);
    w.fx.dust(f.x, f.y, '#cbbfa6', 10);
    const def = w.other(f);
    for (const p of w.projectiles) if (Math.abs(p.x - f.x) < m.radius && Math.abs(p.y - f.y) < m.radius) { p.dead = true; w.fx.spark(p.x, p.y, '#c9a227', 6, 2.4); }
    if (!def.chair && def.grounded && Math.abs(def.x - f.x) < m.radius && Math.abs(def.y - f.y) < 40) {
      const dmg = f.damageOut(m.dmg, 'special');
      const res = def.takeHit({ dmg, kb: m.kb, kbScale: m.kbScale, kbAngle: m.kbAngle ?? 70, dir: def.x < f.x ? -1 : 1 });
      if (res === 'hit') { f.gainMeter(dmg * 0.8); w.hitFeedback(def, 'special', dmg); }
    }
  },
  buff(w, f, m) {
    for (const s of m.apply || []) f.applyStatus(s.name, s.dur, s.data || {});
    if (m.resetCooldowns) for (const slot of m.resetCooldowns) f.cd[slot] = 0;
    w.fx.text(f.x, f.y - 120, m.flavor || 'BUFF', f.cfg.body.trim);
    w.audio.play('heal');
  },
  zone(w, f, m) {
    w.addZone({ ...m.zone, x: f.x + f.facing * (m.zone.ahead || 100), y: f.y, owner: f, ownerImmune: !!m.zone.ownerImmune });
  },
  grab() {}, parry() {}, catch() {},
  bell(w, f, m) {
    const def = w.other(f);
    def.applyStatus('silence', m.silence || 210);
    if (!def.invulnerable && !def.chair && def.state === 'normal') def.body.launch(f.facing * 5, -3, 10);   // LAST ORDERS shove, 0 dmg
    f.applyStatus('regen', m.regen || 300, {});
    w.audio.play('bell');
    w.fx.banner('LAST ORDERS!', { dur: 60, sub: 'specials locked — pressure Abi to cancel the heal' });
  },
  // Marked strikes around the target. Data: offsets (px from the target), delay +
  // step (frames), kbAngle, color, slot (meter/feedback class) and onTarget (strike
  // the surface under the target instead of the main slab). Defaults = Richy's super.
  columns(w, f, m) {
    const def = w.other(f);
    const group = { done: false };
    const slab = (m.onTarget && w.surfaceBelow(def.x, def.y)) || w.mainSlab;
    (m.offsets || [-90, 0, 90]).forEach((off, i) => {
      const x = Math.max(slab.x + 20, Math.min(slab.x + slab.w - 20, def.x + off));
      w.addStrike({ x, surface: slab, delay: (m.delay ?? 26) + i * (m.step ?? 14), dmg: m.dmg, kb: m.kb, kbScale: m.kbScale, kbAngle: m.kbAngle ?? 80, owner: f, group: true, groupHit: group, marker: true, color: m.color || '#3f5a40', slot: m.slot || 'super', move: m });
    });
    w.audio.play('special');
  },
  zoneSuper(w, f, m) {
    const def = w.other(f);
    const slab = w.mainSlab, mid = slab.x + slab.w / 2;
    const half = def.x > mid ? 1 : -1;
    w.addZone({ type: 'smoke', x: mid + half * slab.w * 0.28, y: slab.y, w: slab.w * 0.5, h: 110, life: m.dur || 300, drift: half * 0.5, owner: f, ownerImmune: true, burn: m.burn || 1, surface: slab });
    w.audio.play('jet');
  },
  hazardSuper(w, f, m) {
    const dir = f.facing, slab = w.mainSlab, b = w.stage.blast;
    w.addHazard({
      type: 'ball', owner: f, immune: f, dmg: m.dmg, kb: m.kb, kbScale: m.kbScale, kbAngle: 40,
      x: dir > 0 ? b.left + 40 : b.right - 40, y: slab.y - 150, w: 60, h: 60, vx: dir * 7, phase: 0,
      update(h) {
        h.x += h.vx;
        const past = h.vx > 0 ? h.x > b.right - 40 : h.x < b.left + 40;
        if (h.phase === 0 && past) { h.phase = 1; h.vx = -h.vx; h.y = slab.y - 40; h.hit.clear(); }
        else if (h.phase === 1 && past) h.dead = true;
      },
    });
    w.fx.shake(2, 20);
  },
  shout() {}, dashCombo() {}, flurry() {}, melee() {}, aerial() {},
};

function overlap(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}
