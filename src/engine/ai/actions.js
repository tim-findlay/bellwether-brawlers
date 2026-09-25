// AI plan execution (v3): turns the current plan into this tick's holds and
// presses. Navigation over the stage graph (run, jump, double jump for high
// platforms, drop-through), edge-guarding, and the two sim-only profiles
// (ledge-stall, platform-camp). Pure logic over the AIController's helds/
// queue — the controller decides *what* (tactics.js), this file does *how*.

import { PHYS } from '../../data/physics.js';
import { mainSlab, midOf, safeX, roomOn, standingSurface, surfaceBelow, routeTo, needsDoubleJump, isOffStage } from './nav.js';
import { meleeHits, rangedSlot, hasLineOfFire } from './tactics.js';

const dirKey = (d) => (d > 0 ? 'right' : 'left');

export function act(ai, f, opp, world) {
  const p = ai.plan;
  switch (p.kind) {
    case 'wait': break;
    case 'hold': ai.helds.add(dirKey(p.dir)); break;
    case 'approach': approach(ai, f, opp, world, p); break;
    case 'goto': navigate(ai, f, world, p.x, p.to); break;
    case 'retreat': retreat(ai, f, opp, world); break;
    case 'jump': ai.press('up'); if (p.dir) ai.helds.add(dirKey(p.dir)); ai.plan = { kind: p.then || 'wait', dir: p.dir }; break;
    case 'dodge': ai.press('dodge'); if (p.dir) ai.helds.add(dirKey(p.dir)); if (p.down) ai.helds.add('down'); ai.plan = { kind: 'wait' }; break;
    case 'press': pressMove(ai, f, opp, p.slot); break;
    case 'poke': {                                                        // swing whatever reaches, else close in
      const slot = f.grounded ? poke(ai, f, opp, p.heavyBias ?? 0.5) : null;
      if (slot) pressMove(ai, f, opp, slot); else ai.plan = { kind: 'approach' };
      break;
    }
    case 'aerial': aerialPress(ai, f, opp, p.aim); ai.plan = { kind: 'approach' }; break;
    case 'fastfall': if (f.airborne) { ai.helds.add('down'); if (p.dir) ai.helds.add(dirKey(p.dir)); } else ai.plan = { kind: 'wait' }; break;
    case 'drop': ai.tapDown = true; ai.plan = { kind: 'wait' }; break;
    case 'guard': guard(ai, f, opp, world, p); break;
    case 'crossup': {                                                     // jump over them, then fight from the centre side
      ai.helds.add(dirKey(p.dir));
      if (f.grounded && !p.jumped) { ai.press('up'); p.jumped = true; }
      else if (p.jumped && (Math.sign(opp.x - f.x) !== p.dir || (f.grounded && f.body.stateT > 2))) ai.plan = { kind: 'approach' };
      break;
    }
    case 'ledge': ledgeStall(ai, f, opp, world); break;
    case 'camp': camp(ai, f, opp, world); break;
    default: break;
  }
}

// ---- movement -------------------------------------------------------------------

// Walk / jump / drop toward (x, to). Airborne: drift, double jump for a high
// target once the first jump tops out. Grounded targets off the slab are
// clamped to safe footing — approach never walks off an edge by itself.
export function navigate(ai, f, world, x, to) {
  const stage = world.stage, slab = mainSlab(stage), b = f.body;
  if (f.grounded) {
    const r = routeTo(stage, f, x, to);
    if (r.dir) ai.helds.add(dirKey(r.dir));
    if (r.jump && b.dashT === 0) ai.press('up');
    if (r.drop) ai.tapDown = true;
    return r;
  }
  const tx = to ? x : safeX(slab, x, 24);
  const dir = tx > b.x + 6 ? 1 : tx < b.x - 6 ? -1 : 0;
  if (dir) ai.helds.add(dirKey(dir));
  if (to && b.airJumps > 0 && b.vy > -1.5 && b.y > to.y + 12 && !f.attack) {
    const from = surfaceBelow(stage, b.x, b.y) || slab;
    if (needsDoubleJump(f, from, to) || b.vy > 2) ai.press('up');
  }
  return { dir, jump: false, drop: false, x: tx };
}

function approach(ai, f, opp, world, p) {
  const stage = world.stage, b = f.body;
  const to = standingSurface(stage, opp) || (opp.chair ? null : surfaceBelow(stage, opp.x, opp.y));
  const dx = opp.x - f.x, dist = Math.abs(dx), toward = dx >= 0 ? 1 : -1;
  const stopAt = f.cfg.ai?.stopAt ?? 60;
  const sameLevel = Math.abs(opp.y - f.y) < 70;
  if (f.grounded && sameLevel && dist <= stopAt) {                  // arrived: swing something that reaches
    const slot = poke(ai, f, opp, p.heavyBias ?? 0.35);
    if (slot) { ai.plan = { kind: 'press', slot }; pressMove(ai, f, opp, slot); }
    else ai.helds.add(dirKey(toward));
    return;
  }
  if (p.dash && f.grounded && b.dashT === 0 && b.dashCd === 0 && dist > 160 && sameLevel) {
    ai.dash = toward; p.dash = false;                                // one tick: the body latches the dash
    return;
  }
  navigate(ai, f, world, opp.x - toward * Math.min(stopAt, dist), to);
  if (f.airborne && !f.attack && !ai.swungThisAir) {                 // jump-ins land an aerial when it reaches
    const aim = aerialAim(f, opp, world);
    if (aim) { ai.swungThisAir = true; aerialPress(ai, f, opp, aim); }
  }
}

function retreat(ai, f, opp, world) {
  const stage = world.stage, s = standingSurface(stage, f) || mainSlab(stage);
  const away = opp.x >= f.x ? -1 : 1;
  if (f.airborne || roomOn(s, f.x, away) > 60) ai.helds.add(dirKey(away));
  else ai.plan = { kind: 'wait' };
}

// ---- attacks --------------------------------------------------------------------

// Pick a ground button that connects from here: heavy when it reaches and the
// roll says so (biased harder when the opponent is launchable or edge-side).
export function poke(ai, f, opp, heavyBias = 0.5) {
  const slab = mainSlab(f.world.stage);
  const emptiness = 1 - opp.gauge / opp.maxGauge;
  const h = f.cfg.heavy;
  // where would the heavy send them? (angles past 90 pull: the edge behind US is the one that matters)
  const fly = Math.sign(opp.x - f.x || f.facing) * ((h?.kbAngle ?? 40) > 90 ? -1 : 1);
  const edgeDist = fly > 0 ? slab.x + slab.w - opp.x : opp.x - slab.x;
  const edgeSide = edgeDist < 170;
  const bias = Math.min(0.95, heavyBias + emptiness * 0.4 + (edgeSide ? 0.25 : 0));
  const oa = opp.attack;                                                 // never feed a light into armor frames
  if (oa?.move.armor && oa.frame < (oa.move.startup || 0) + (oa.move.active || 0) && !opp.airborne) return null;
  const hh = h && meleeHits(f, h, opp, null, 12);
  const l = f.cfg.light && meleeHits(f, f.cfg.light, opp, null, 10);
  if (hh && ai.rng() < bias) return 'heavy';
  if (l) return 'light';
  if (hh) return 'heavy';
  return null;
}

// Ground/special press with facing discipline: hold toward the opponent for a
// tick when we face the wrong way (the body updates facing before the next
// read), then press. Kinds that don't care about facing press immediately.
export function pressMove(ai, f, opp, slot) {
  const m = f.cfg[slot];
  const toward = opp.x >= f.x ? 1 : -1;
  const facingFree = m && ['buff', 'parry', 'catch', 'teleport', 'bell', 'columns', 'zoneSuper'].includes(m.kind);
  if (!facingFree && f.grounded && f.facing !== toward && !f.attack) { ai.helds.add(dirKey(toward)); return; }
  if ((slot === 'light' || slot === 'heavy') && f.grounded) groundAim(ai, f, opp, slot);
  ai.press(slot);
  ai.plan = { kind: 'wait' };
}

// Which ground variant? Side when they're at the edge of reach (the step-in
// versions reach further), down when they're fresh (the launcher starts the
// air chase) or airborne just above us, neutral otherwise. Held for the
// press's buffer window via ai.gAim (see AIController._compose).
function groundAim(ai, f, opp, slot) {
  const dist = Math.abs(opp.x - f.x), r = ai.rng();
  const base = f.cfg[slot], side = slot === 'light' ? f.cfg.lights?.s : f.cfg.sigs?.s;
  const emptiness = 1 - opp.gauge / opp.maxGauge;
  let aim = 'n';
  if (side && dist > (base.range || 60) * 0.8 && r < 0.75) aim = 's';
  else if (opp.y < f.y - 30 && r < 0.6) aim = 'd';                       // they're above: the launcher / low sweep tracks up
  else if (emptiness < 0.45 && r < 0.4) aim = 'd';
  else if (r < 0.3) aim = 's';
  ai.gAim = aim; ai.gAimDir = opp.x >= f.x ? 1 : -1; ai.gAimUntil = ai.frame + PHYS.INPUT_BUFFER;
}

// Which aerial (if any) would connect right now? Spikes off-stage only with a
// jump in reserve (DESIGN "never spike with no jumps left").
export function aerialAim(f, opp, world) {
  const A = f.cfg.aerials; if (!A) return null;
  const b = f.body;
  const overStage = !!surfaceBelow(world.stage, b.x, b.y);
  if (opp.chair || opp.state === 'ko' || opp.invulnerable) return null;
  if (opp.y < f.y - 40 && meleeHits(f, A.u, opp, 'u', 6)) return 'u';
  if (opp.y > f.y + 30 && (overStage || b.airJumps > 0) && meleeHits(f, A.d, opp, 'd', 6)) return 'd';
  if (meleeHits(f, A.s, opp, 's', 8)) return 's';
  if (meleeHits(f, A.n, opp, 'n', 6)) return 'n';
  return null;
}

export function aerialPress(ai, f, opp, aim) {
  ai.aim = aim; ai.aimUntil = ai.frame + PHYS.INPUT_BUFFER;
  ai.aimDir = opp.x >= f.x ? 1 : -1;
  ai.press('light');
}

// ---- edge-guarding ---------------------------------------------------------------
// Hold the slab edge on the opponent's side; clip them as they come back over
// with a ground move; throw projectiles down the line; wait out air dodges;
// go out for an aerial only when the plan says so (jumps in reserve).
function guard(ai, f, opp, world, p) {
  const stage = world.stage, slab = mainSlab(stage), b = f.body;
  const side = opp.x < midOf(slab) ? -1 : 1;
  const edgeX = side < 0 ? slab.x + 34 : slab.x + slab.w - 34;
  const dx = opp.x - f.x, dist = Math.abs(dx), dy = opp.y - f.y;
  if (!isOffStage(stage, opp)) { ai.plan = { kind: 'approach' }; return; }
  if (f.airborne) {                                                     // out with them: aerial if it reaches, else home
    if (!ai.swungThisAir && b.airJumps > 0) {
      const aim = aerialAim(f, opp, world);
      if (aim) { ai.swungThisAir = true; aerialPress(ai, f, opp, aim); return; }
    }
    navigate(ai, f, world, safeX(slab, b.x), slab);
    return;
  }
  navigate(ai, f, world, edgeX, slab);
  if (Math.abs(f.x - edgeX) > 24) return;
  ai.helds.clear();                                                     // parked at the edge: face them
  if (f.facing !== Math.sign(dx)) { ai.helds.add(dirKey(dx >= 0 ? 1 : -1)); return; }
  if (opp.body.state === 'airdodge' || opp.invulnerable) return;       // wait out the dodge
  const slot = poke(ai, f, opp, 0.8);
  if (slot) { pressMove(ai, f, opp, slot); ai.plan = { kind: 'guard' }; return; }
  const ranged = rangedSlot(f);
  if (ranged && hasLineOfFire(f, f.cfg[ranged], opp) && ai.rng() < 0.08) { ai.press(ranged); return; }
  if (p.out && dist < 170 && dy > -90 && dy < 150 && b.airJumps > 0) {  // go out: dash-jump toward them
    ai.helds.add(dirKey(side)); ai.press('up'); p.out = false; ai.swungThisAir = false;
  }
}

// ---- sim-only profiles ------------------------------------------------------------
// Ledge-stall (gate 3): loiter at the edge away from the opponent, hop out
// over the blast zone when pressured, dodge-stall on the ground. Recovery
// still applies (that's the point: if this isn't suicidal, recovery is overtuned).
function ledgeStall(ai, f, opp, world) {
  const stage = world.stage, slab = mainSlab(stage), b = f.body;
  const away = opp.x >= f.x ? -1 : 1;
  const edgeX = away < 0 ? slab.x + 30 : slab.x + slab.w - 30;
  const dist = Math.abs(opp.x - f.x);
  if (f.airborne) {
    if (isOffStage(stage, opp) && dist < 90 && b.airDodgeOk && b.dodgeCd === 0) ai.press('dodge');
    return;                                                             // recovery owns the rest
  }
  if (dist < 120 && b.dodgeCd === 0 && ai.rng() < 0.5) { ai.press('dodge'); ai.helds.add(dirKey(away)); return; }
  if (Math.abs(f.x - edgeX) > 20) { navigate(ai, f, world, edgeX, slab); return; }
  if (dist < 260 && ai.rng() < 0.3) { ai.helds.add(dirKey(away)); ai.press('up'); }   // hop out past the lip
}

// Platform-camp (gate 2): sit on the highest platform away from the opponent,
// throw whatever is ranged, relocate when they come up, fight only when cornered.
function camp(ai, f, opp, world) {
  const stage = world.stage, slab = mainSlab(stage), b = f.body;
  const plats = stage.platforms;
  const dist = Math.abs(opp.x - f.x);
  const here = standingSurface(stage, f);
  const ranged = rangedSlot(f);
  if (dist < 70 && f.grounded) { const s = poke(ai, f, opp, 0.4); if (s) pressMove(ai, f, opp, s); return; }
  if (ranged && f.grounded && f.cd[ranged] <= 0 && dist > 140 && hasLineOfFire(f, f.cfg[ranged], opp) && ai.rng() < 0.35) { pressMove(ai, f, opp, ranged); ai.plan = { kind: 'camp' }; return; }
  let target = null, best = -Infinity;
  for (const p of plats) {                                              // farthest-from-opponent platform, highest wins ties
    const score = Math.abs(midOf(p) - opp.x) + (slab.y - p.y) * 0.5 - (p === here && dist < 130 ? 400 : 0);
    if (score > best) { best = score; target = p; }
  }
  if (!target) { retreat(ai, f, opp, world); return; }
  if (here === target && dist > 130) { if (f.facing !== Math.sign(opp.x - f.x)) ai.helds.add(dirKey(opp.x >= f.x ? 1 : -1)); return; }
  navigate(ai, f, world, midOf(target), target);
  if (f.airborne && b.vy > 0 && b.y < target.y - 10 && Math.abs(b.x - midOf(target)) < target.w / 2) ai.helds.add('down');   // land on it
}
