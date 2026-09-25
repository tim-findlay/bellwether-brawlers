// AI recovery (v3): the competence floor every difficulty shares. Runs every
// tick while the CPU is off-stage (see nav.isOffStage): drift toward the
// slab, use the kit's recovery special where one exists, double jump at a
// sensible height (never early), air dodge toward the stage last. Never
// fast-falls, never spikes with no jumps left (that lives in tactics).
//
// Order of resources, per DESIGN.md "CPU": drift → recovery special →
// double jump → air dodge. A lunge that self-staggers on a whiff (Adrian's
// Clumsy Charge) is only used when its travel carries him over the slab.

import { PHYS } from '../../data/physics.js';
import { mainSlab, midOf, safeX, flightSim, EDGE_INSET } from './nav.js';

// Which special (if any) is this fighter's recovery tool? Data-driven: an
// air-usable lunge or teleport. Returns { slot, move } or null.
export function recoverySpecial(cfg) {
  for (const slot of ['s1', 's2']) {
    const m = cfg[slot];
    if (m && m.air && (m.kind === 'lunge' || m.kind === 'teleport')) return { slot, move: m };
  }
  return null;
}

// Mutates the controller's helds/queue for this tick. `ai` is the AIController.
export function recover(ai, f, world) {
  const stage = world.stage, slab = mainSlab(stage), b = f.body, z = stage.blast;
  if (b.state === 'ledge') {                                // hanging: wait out the i-frames, then get up
    if (b.stateT <= 6 + ai.profile.recoverDelay) return;
    const opp = world.other(f), toward = -b.ledge.side;
    const pressured = !!opp.attack && Math.abs(opp.x - b.x) < 140 && Math.abs(opp.y - b.y) < 140;
    if (pressured && b.stateT < PHYS.LEDGE_HANG_MAX - 12 && ai.rng() < 0.6) return;   // let the swing whiff
    if (ai.rng() < 0.45) ai.press('up'); else ai.helds.add(toward > 0 ? 'right' : 'left');
    return;
  }
  const inset = EDGE_INSET;
  const inSpan = b.x >= slab.x && b.x <= slab.x + slab.w;
  const under = inSpan && b.y > slab.y;                      // beneath the slab: go around, not up
  let dir;
  if (under) dir = b.x < midOf(slab) ? -1 : 1;              // outward to the nearer edge first
  else dir = b.x < slab.x + inset ? 1 : b.x > slab.x + slab.w - inset ? -1 : (b.x < midOf(slab) ? 1 : -1);
  ai.helds.add(dir > 0 ? 'right' : 'left');                 // drift, always (also sets facing once actionable)
  if (b.stun > 0 || b.dodging || f.attack || f.state !== 'normal') return;   // nothing else lands while locked out
  if (ai.recoverWait > 0 && b.y < slab.y - 40) { ai.recoverWait--; return; }   // difficulty: a beat, but never while below the lip

  const gap = under ? 0 : Math.abs(safeX(slab, b.x, 24) - b.x);
  const driftOk = !under && !!flightSim(b, dir, stage).lands;
  if (driftOk) return;                                      // free ride home: spend nothing

  // --- kit recovery special ------------------------------------------------
  const rs = recoverySpecial(f.cfg);
  const canSpecial = rs && f.cd[rs.slot] <= 0 && !f.hasStatus('silence');
  if (canSpecial && rs.move.kind === 'lunge' && !under && b.facing === dir) {
    // a lunge locks drift for its whole duration (startup+active+recover), so it only
    // helps when its travel alone puts us over the slab while we're still above the lip
    const travel = rs.move.travel || 0;
    const carries = gap <= travel - 24 && b.y <= slab.y - 8;
    if (carries && (b.airJumps === 0 || gap > 70)) { ai.press(rs.slot); return; }
  }
  if (canSpecial && rs.move.kind === 'teleport') {
    const opp = world.other(f);
    const oppHome = opp.state === 'normal' && !opp.chair && !!world.surfaceBelow(opp.x, opp.y);
    if (oppHome && (b.airJumps === 0 || gap > 140 || b.y > slab.y + 80)) { ai.press(rs.slot); return; }
  }

  // --- the double jump: at slab level, or now if waiting would lose it ------
  if (b.airJumps > 0) {
    if (b.vy <= 0 && !under) return;                           // still rising: let the arc play out
    const atLevel = b.y >= slab.y - 24;
    const levelOk = flightSim(b, dir, stage, { jump: 'level' }).lands;
    const nowOk = flightSim(b, dir, stage, { jump: 'now' }).lands;
    const emergency = b.y > z.bottom - 320;
    if ((atLevel && !under) || (!levelOk && nowOk) || emergency) ai.press('up');
    return;
  }

  // --- the recovery move (air heavy): a rising strike, once per airtime ------
  if (f.cfg.recovery && !f.recoveryUsed && b.vy > 0 && !under && b.y > slab.y - 40) {
    ai.press('heavy'); return;
  }
  // --- air dodge toward the stage: last resort -------------------------------
  if (b.airDodgeOk && b.dodgeCd === 0 && b.vy > 0 && !under) {
    ai.press('dodge');
  }
}
