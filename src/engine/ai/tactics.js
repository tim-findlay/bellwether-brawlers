// AI tactics (v3): the decision layer. `think()` returns a plan object every
// reaction period (see ai.js); `hazardResponse()` is polled faster. Ported
// from the v2 archetype brain and re-read for platforms: threats first
// (projectiles, telegraphed unparryables, punish windows), then edge-guarding,
// then the archetype neutral using the full kit — aerials, dash-ins, dodges.
// Distances are world px; kit `range` fields are world px. Never imports
// actions.js (plans are data; actions.js executes them).

import { mainSlab, midOf, roomOn, standingSurface, surfaceBelow, isOffStage } from './nav.js';

const RANGED = ['projectile', 'lob', 'groundProjectile', 'fan', 'columns'];
const MELEE_KINDS = [undefined, 'melee', 'lunge', 'flurry', 'shout', 'dashCombo', 'aerial'];
const HURT_W = 44, BODY_H = 96;

// ---- geometry (mirrors Fighter.hitbox / hurtbox) --------------------------------

// Would move `m` from `f` (aimed `aim` for aerials) overlap opp's hurtbox now?
// `slack` widens the test a little so an approaching CPU swings on arrival.
export function meleeHits(f, m, opp, aim = null, slack = 0) {
  if (!m || !MELEE_KINDS.includes(m.kind)) return false;
  const b = f.body, reach = m.range || 60, h = BODY_H;
  const travel = (m.kind === 'lunge' || m.kind === 'dashCombo' || m.kind === 'flurry') ? (m.travel || 0) : 0;
  const facing = opp.x >= b.x ? 1 : -1;                       // assume we square up before pressing
  let hx, hy, hw, hh;
  if (aim === 'u') { hx = b.x; hy = b.y - h - 10; hw = reach; hh = 50; }
  else if (aim === 'd') { hx = b.x; hy = b.y + 14; hw = reach; hh = 46; }
  else if (m.bothSides || aim === 'n') { hx = b.x; hy = b.y - h * 0.5; hw = reach * 1.7; hh = 64; }
  else { hx = b.x + facing * (reach * 0.55 + travel * 0.5); hy = b.y - h * 0.5; hw = reach + travel; hh = 64; }
  const ob = opp.hurtbox();
  return Math.abs(hx - ob.x) < (hw + ob.w) / 2 + slack && Math.abs(hy - ob.y) < (hh + ob.h) / 2 + slack * 0.5;
}

export function rangedSlot(f) {
  for (const slot of ['s1', 's2']) {
    const m = f.cfg[slot];
    if (m && RANGED.includes(m.kind) && f.cd[slot] <= 0 && !f.hasStatus('silence')) return slot;
  }
  return null;
}

// Straight shots want the target near their height; lobs and ground rollers
// take care of themselves as long as the target is roughly in front.
export function hasLineOfFire(f, m, opp) {
  const dy = opp.y - f.y;
  if (m.kind === 'lob') return Math.abs(opp.x - f.x) > 90 && dy > -180 && dy < 220;
  if (m.kind === 'groundProjectile') return Math.abs(dy) < 30;
  if (m.kind === 'columns') return opp.grounded || Math.abs(dy) < 120;             // marked strike under the target
  return Math.abs(dy) < 100;
}

// A lunge connects when the target sits inside its travel + reach at its height.
function lungeReaches(f, m, opp) {
  const dist = Math.abs(opp.x - f.x);
  return Math.abs(opp.y - f.y) < 70 && dist > 40 && dist < (m.travel || 0) + (m.range || 50) * 0.8;
}
// "Committed": can't move out of the way for a while (attack recovery, landing lag, stun).
function committed(opp) {
  const a = opp.attack;
  return !!(opp.landLag > 0 || opp.body.stun > 0 || opp.state === 'stagger' || (a && a.frame < (a.move.startup || 0) + (a.move.active || 0) + (a.move.recover || 0) - 4));
}

function canSpecial(f, slot) {
  const m = f.cfg[slot];
  return !!m && f.cd[slot] <= 0 && !f.hasStatus('silence') && (f.grounded || m.air);
}

// ---- hazards (polled every few ticks) --------------------------------------------
// Reads the EventDirector through world.director (set by the director).
export function hazardResponse(f, world) {
  const stage = world.stage, slab = mainSlab(stage);
  const onSlab = f.grounded && Math.abs(f.y - slab.y) < 4;
  const a = world.director?.active;
  if (a && a.phase === 'live') {
    const d = a.data;
    if (a.def.id === 'firedrill' && d.x !== undefined && a.t < d.deadline) return { kind: 'goto', x: d.x, to: slab };
    if (a.def.id === 'wave' && onSlab && d.fronts) {
      for (const fr of d.fronts) if (Math.sign(f.x - fr.x) === fr.dir && Math.abs(f.x - fr.x) < 90) return { kind: 'jump' };
    }
  }
  for (const h of world.hazards) {                            // bikes and the wrecking ball's low return
    const approaching = Math.sign(f.x - h.x) === Math.sign(h.vx);
    if (h.type === 'bike' && onSlab && approaching && Math.abs(h.x - f.x) < 120) return { kind: 'jump' };
    if (h.type === 'ball' && h.phase === 1 && onSlab && approaching && Math.abs(h.x - f.x) < 150) return { kind: 'jump' };
  }
  return null;
}

// ---- the brain ---------------------------------------------------------------------

export function think(ai, f, opp, world) {
  const P = ai.profile, r = ai.rng();
  const stage = world.stage, slab = mainSlab(stage);
  const dx = opp.x - f.x, dist = Math.abs(dx), dy = opp.y - f.y;
  const sameLevel = Math.abs(dy) < 70;
  const untouchable = opp.chair || opp.state === 'ko' || opp.invulnerable;
  const oppOff = !opp.chair && opp.state !== 'ko' && isOffStage(stage, opp);
  const b = f.body;

  if (f.airborne) return airThink(ai, f, opp, world, { dist, dy, r, untouchable });

  // 1. projectile threats
  const threat = world.projectiles.find(p => p.owner !== f && Math.sign(f.x - p.x) === Math.sign(p.vx)
    && Math.abs(p.x - f.x) < 160 && Math.abs(p.y - (f.y - 48)) < 110);
  if (threat) {
    const eta = (Math.abs(threat.x - f.x) - 30) / Math.max(1, Math.abs(threat.vx));
    if (f.cfg.s2?.kind === 'catch' && canSpecial(f, 's2') && eta < 30 && r < 0.7) return { kind: 'press', slot: 's2' };
    if (f.cfg.s2?.kind === 'shockwave' && canSpecial(f, 's2') && eta < 20 && r < 0.6) return { kind: 'press', slot: 's2' };
    if (threat.groundHug || threat.y > f.y - 50) return { kind: 'jump', dir: dx >= 0 ? 1 : -1, then: 'approach' };
    if (eta <= 14 && b.dodgeCd === 0 && r < 0.75) return { kind: 'dodge' };
    if (eta > 14) return { kind: 'wait' };
  }

  // 2. the opponent is swinging
  if (opp.attack && !untouchable) {
    const om = opp.attack.move, of = opp.attack.frame, su = om.startup || 0, ac = om.active || 0;
    const jumpIt = om.unparryable || om.kind === 'grab' || om.kind === 'shout' || om.kind === 'dashCombo';
    const inPath = dist < (om.range || 60) + (om.travel || 0) + 60 && sameLevel;
    if (jumpIt && of < su + ac && inPath && r < 0.9) return { kind: 'jump', dir: dx >= 0 ? -1 : 1, then: 'approach' };
    // respect a heavy / armored swing: don't feed it a light — step out, then punish the recovery
    const heavyish = opp.attack.slot === 'heavy' || !!om.armor;
    if (heavyish && of < su + ac && inPath && r < 0.75) {
      if (b.dodgeCd === 0 && dist < 130 && r < 0.45) return { kind: 'dodge', dir: dx >= 0 ? -1 : 1 };
      return { kind: 'jump', dir: dx >= 0 ? -1 : 1, then: 'approach' };
    }
    if (of >= su + ac && r < 0.85) {                                          // punish the recovery
      if (meleeHits(f, f.cfg.heavy, opp, null, 10)) return { kind: 'press', slot: 'heavy' };
      if (meleeHits(f, f.cfg.light, opp, null, 10)) return { kind: 'press', slot: 'light' };
      if (dist < 200 && sameLevel) return { kind: 'approach', dash: true, heavyBias: 0.7 };
    }
    if (f.cfg.s1?.kind === 'parry' && f.cfg.ai?.style === 'counter' && canSpecial(f, 's1') && of < su && inPath && dist < 110 && !om.unparryable && r < 0.6)
      return { kind: 'press', slot: 's1' };
    if (dist < 100 && of < su && b.dodgeCd === 0 && r < 0.35) return { kind: 'dodge', dir: dx >= 0 ? -1 : 1 };
  }

  // 3. sim-only profiles
  if (P.stall) return dist < 56 ? { kind: 'press', slot: 'light' } : { kind: 'ledge' };
  if (P.camp) return { kind: 'camp' };

  // 4. edge-guard
  if (oppOff && standingSurface(stage, f)) {
    const out = r < P.edgeGuard * (b.airJumps > 0 ? 1 : 0) && dist < 200 && dy < 160;
    return { kind: 'guard', out };
  }

  // 5. super
  if (f.meter >= 100 && !untouchable && r < P.superChance && !f.hasStatus('silence')) {
    const sd = f.cfg.super.aiRange || [40, 200];
    const ok = f.cfg.super.unparryable ? opp.grounded : true;
    if (ok && dist >= sd[0] && dist <= sd[1]) return { kind: 'press', slot: 'super' };
  }

  // 6. the opponent is above on a platform / hanging above: go to them
  if (!sameLevel && dy < -60 && dist < 160 && r < 0.6) return { kind: 'approach', dash: false };

  return neutral(ai, f, opp, world, { dist, dy, r, sameLevel, untouchable });
}

// Airborne over the stage (recovery handles off-stage): land an aerial, escape
// juggles with a fast-fall, dodge a swing, otherwise keep approaching.
function airThink(ai, f, opp, world, { dist, dy, r, untouchable }) {
  const b = f.body, P = ai.profile;
  const under = dy > 40 && dist < 140;                                        // they're below: a juggle setup
  if (opp.attack && !untouchable && dist < 130 && b.airDodgeOk && b.dodgeCd === 0 && r < 0.6)
    return { kind: 'dodge', dir: opp.x >= f.x ? -1 : 1, down: dy > 0 };
  if (under && r < 0.55 && b.vy > 0 && surfaceBelow(world.stage, b.x, b.y)) return { kind: 'fastfall', dir: opp.x >= f.x ? -1 : 1 };
  if (r < P.mixup) return { kind: 'approach' };                               // approach swings aerials when they reach
  return { kind: 'wait' };
}

// A borrowed special (Nick's I Know Your Guy) sits in s2: use it the way its
// owner's archetype would, when it would connect from here.
function borrowedPress(f, opp, dist, sameLevel, r) {
  const m = f.hasStatus('borrowed') && f.statusData('borrowed').move;
  if (!m || f.cd.s2 > 0 || f.hasStatus('silence') || (f.airborne && !m.air) || r > 0.6) return null;
  let ok;
  if (RANGED.includes(m.kind)) ok = dist > 110 && hasLineOfFire(f, m, opp);
  else if (m.kind === 'grab') ok = opp.grabbable && sameLevel && dist <= (m.range || 68) + 20;
  else if (m.kind === 'lunge') ok = lungeReaches(f, m, opp);
  else if (m.kind === 'teleport') ok = dist > 170;
  else ok = m.kind !== 'parry' && dist < 160;
  return ok ? { kind: 'press', slot: 's2' } : null;
}

function neutral(ai, f, opp, world, { dist, dy, r, sameLevel, untouchable }) {
  const P = ai.profile, ai_ = f.cfg.ai || {}, style = ai_.style || 'allround';
  const stage = world.stage, slab = mainSlab(stage), b = f.body;
  const here = standingSurface(stage, f) || slab;
  const away = opp.x >= f.x ? -1 : 1;
  const room = roomOn(here, f.x, away);
  const ranged = rangedSlot(f);
  const close = dist < 80 && sameLevel;
  const dash = r < P.dash;
  const jumpIn = { kind: 'jump', dir: opp.x >= f.x ? 1 : -1, then: 'approach' };
  if (untouchable) return dist > 120 ? { kind: 'approach' } : { kind: 'wait' };
  const lent = borrowedPress(f, opp, dist, sameLevel, r);
  if (lent) return lent;

  // cornered with the opponent between us and centre: hop over rather than trade on the lip
  const centreSide = Math.sign(midOf(slab) - f.x) === Math.sign(opp.x - f.x);
  if (here === slab && room < 130 && centreSide && dist < 220 && sameLevel && r < 0.45) return { kind: 'crossup', dir: opp.x >= f.x ? 1 : -1 };

  // kill mode: they launch now — convert with the heavy / a side-air rather than chip
  const emptiness = 1 - opp.gauge / opp.maxGauge;
  const pullHeavy = (f.cfg.heavy?.kbAngle ?? 40) > 90;                       // Richy: the heavy drags them in, the side-air / candles kill
  if (emptiness > 0.5 && sameLevel && r < 0.6) {
    if (pullHeavy && ranged && dist > 110 && hasLineOfFire(f, f.cfg[ranged], opp) && r < 0.4) return { kind: 'press', slot: ranged };
    if (pullHeavy && dist < 180 && r < 0.45) return jumpIn;
    if (close) return { kind: 'poke', heavyBias: pullHeavy ? 0.4 : 0.85 };
    if (dist < 200 && r < P.mixup * 0.5) return jumpIn;
    return { kind: 'approach', dash, heavyBias: 0.85 };
  }
  // back-pedalling from someone faster is free hits in the back: only retreat with the legs for it
  const canRetreat = room > 90 && (f.cfg.stats.runMax >= opp.cfg.stats.runMax - 0.2 || room > 220);

  // the wheel: a faster fighter with ranged tools kites an armored/grab bruiser — never into a corner
  const oppBruiser = opp.cfg.heavy?.armor || opp.cfg.s1?.kind === 'grab';
  if (ranged && oppBruiser && f.cfg.stats.runMax > opp.cfg.stats.runMax + 0.3 && style !== 'zoner') {
    if (dist < 110 && canRetreat && r < 0.5) return { kind: 'retreat' };
    if (dist >= 110 && hasLineOfFire(f, f.cfg[ranged], opp) && r < 0.55) return { kind: 'press', slot: ranged };
  }
  if (style === 'zoner') {
    const pref = ai_.pref ?? 240;
    if (dist < 90) {
      if (canRetreat && room > 200 && r < 0.35) return { kind: 'retreat' };   // a zoner never backs onto the lip
      if (b.dodgeCd === 0 && r < 0.5) return { kind: 'dodge', dir: opp.x >= f.x ? 1 : -1 };   // step through, back to centre
      if (canSpecial(f, 's2') && r < 0.6 && hasLineOfFire(f, f.cfg.s2, opp)) return { kind: 'press', slot: 's2' };
      return { kind: 'poke', heavyBias: 0.35 };
    }
    if (dist > 130 && canSpecial(f, 's1') && hasLineOfFire(f, f.cfg.s1, opp) && r < 0.65) return { kind: 'press', slot: 's1' };
    if (dist > 130 && canSpecial(f, 's2') && hasLineOfFire(f, f.cfg.s2, opp) && r < 0.5) return { kind: 'press', slot: 's2' };
    if (dist > pref) return { kind: 'approach', dash: false };
    if (dist < 150 && r < 0.3 && sameLevel) return jumpIn;                    // meme slap from above
    return canRetreat && room > 200 && dist < pref * 0.6 ? { kind: 'retreat' } : { kind: 'wait' };
  }
  if (style === 'grappler') {
    if (canSpecial(f, 's1') && opp.grabbable && sameLevel && dist <= (f.cfg.s1.range || 68) + 20 && r < 0.6) return { kind: 'press', slot: 's1' };
    if (canSpecial(f, 's2') && dist < 140 && (world.projectiles.length || (opp.grounded && sameLevel)) && r < 0.4) return { kind: 'press', slot: 's2' };
    if (close) return { kind: 'poke', heavyBias: 0.4 };
    return { kind: 'approach', dash };
  }
  if (style === 'rush') {
    if (canSpecial(f, 's1') && f.cfg.s1.kind === 'lunge' && lungeReaches(f, f.cfg.s1, opp) && (!f.cfg.s1.whiffTrip || committed(opp)) && r < 0.5) return { kind: 'press', slot: 's1' };
    if (dist > 170 && canSpecial(f, 's1') && f.cfg.s1.kind === 'teleport' && r < 0.4) return { kind: 'press', slot: 's1' };
    if (close) {
      if (canSpecial(f, 's2') && r > 0.85) return { kind: 'press', slot: 's2' };
      return { kind: 'poke', heavyBias: 0.35 };
    }
    if (dist < 220 && dist > 90 && sameLevel && r < P.mixup * 0.5) return jumpIn;
    return { kind: 'approach', dash };
  }
  if (style === 'counter') {
    if (close) return { kind: 'poke', heavyBias: 0.35 };
    if (dist > 140 && canSpecial(f, 's2') && hasLineOfFire(f, f.cfg.s2, opp) && r < 0.45) return { kind: 'press', slot: 's2' };
    if (dist < 200 && dist > 90 && sameLevel && r < P.mixup * 0.4) return jumpIn;
    return r < 0.7 ? { kind: 'approach', dash: dash && r < 0.3 } : { kind: 'wait' };
  }
  if (style === 'trap') {
    if (dist > 130 && canSpecial(f, 's1') && hasLineOfFire(f, f.cfg.s1, opp) && r < 0.55) return { kind: 'press', slot: 's1' };
    if (close) return { kind: 'poke', heavyBias: 0.35 };
    return { kind: 'approach', dash: dash && r < 0.4 };
  }
  // all-rounder
  if (dist > 150 && canSpecial(f, 's1') && ranged === 's1' && hasLineOfFire(f, f.cfg.s1, opp) && r < 0.5) return { kind: 'press', slot: 's1' };
  if (canSpecial(f, 's1') && f.cfg.s1.kind === 'lunge' && lungeReaches(f, f.cfg.s1, opp) && r < 0.3) return { kind: 'press', slot: 's1' };
  if (close) {
    if (canSpecial(f, 's2') && r < 0.25) return { kind: 'press', slot: 's2' };
    return { kind: 'poke', heavyBias: 0.35 };
  }
  if (dist < 220 && dist > 90 && sameLevel && r < P.mixup * 0.4) return jumpIn;
  return { kind: 'approach', dash };
}

export function mistakePlan(ai, f, opp) {
  const opts = [{ kind: 'wait' }, { kind: 'jump' }, { kind: 'approach' }, { kind: 'press', slot: 'light' }, { kind: 'retreat' }];
  return opts[(ai.rng() * opts.length) | 0];
}
