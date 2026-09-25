// AI navigation helpers (v3): stage-graph queries and a ballistic flight
// model that mirrors MovementBody's air drift. Pure functions over stage
// geometry — no world, no DOM — so the recovery planner, the tactics layer
// and the balance sim (gate 5's "recovery range") all reason the same way.
// Units: world px at zoom 1, 60 Hz frames. y = FEET.

import { PHYS } from '../../data/physics.js';

export const EDGE_INSET = 40;        // "safe footing" is this far inside a slab edge
const FOOT = 17;                     // MovementBody stands while its 36-px box overlaps a surface (half-width, minus a px)

export const allSurfaces = (stage) => [...stage.slabs, ...stage.platforms];
export const mainSlab = (stage) => stage.slabs[0];
export const midOf = (s) => s.x + s.w / 2;
export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

// Highest surface whose top is at or below y under x — what a falling body
// there would land on. `margin` widens every surface horizontally.
export function surfaceBelow(stage, x, y, margin = 0) {
  let best = null;
  for (const s of allSurfaces(stage)) {
    if (x < s.x - margin || x > s.x + s.w + margin || s.y < y - 1) continue;
    if (!best || s.y < best.y) best = s;
  }
  return best;
}

// The surface a grounded fighter stands on (null when airborne).
export function standingSurface(stage, f) {
  if (!f.grounded) return null;
  return surfaceBelow(stage, f.x, f.y, FOOT) || null;   // feet sit ON the surface (y == s.y passes the y-1 filter); lips count
}

// Off-stage = airborne with nothing to land on. Fighters over a soft platform
// or the slab are "on stage" even while airborne (gravity brings them home).
export function isOffStage(stage, f) {
  if (f.grounded) return false;
  return !surfaceBelow(stage, f.x, f.y, FOOT);
}

export function jumpRise(impulse) { return (impulse * impulse) / (2 * PHYS.GRAV); }

// Nearest safe point on the slab for a fighter at x.
export function safeX(slab, x, inset = EDGE_INSET) { return clamp(x, slab.x + inset, slab.x + slab.w - inset); }

// Horizontal room a fighter has on its surface in direction `dir` (±1).
export function roomOn(surface, x, dir) {
  return dir > 0 ? surface.x + surface.w - x : x - surface.x;
}

// Ballistic flight model. `b` is a MovementBody-like { x, y, vx, vy, stats }
// and `dir` the drift direction held for the whole flight. Reproduces the
// body's air rules (AIR_ACCEL toward dir, AIR_MAX cap, momentum decay, GRAV,
// fallMax) with no fast-fall and, optionally, one double jump:
//   jump: null | 'now' | 'level'   ('level' = the tick the feet pass slabTop)
//   extraX: horizontal px credited on the landing test (air-dodge budget)
// Returns { lands: surface|null, frames } — the first surface the feet would
// cross from above while inside its span, or null when the flight leaves the
// blast box first. Capped at 420 frames (7 s) so callers never spin.
export function flightSim(b, dir, stage, { jump = null, extraX = 0, maxFrames = 420 } = {}) {
  const slab = mainSlab(stage), z = stage.blast;
  const runMax = b.stats.runMax, fallMax = b.stats.fallMax;
  const airMax = runMax * PHYS.AIR_MAX_FACTOR;
  const impulse = b.stats.jumpImpulse * PHYS.DOUBLE_JUMP_FACTOR;
  let x = b.x, y = b.y, vx = b.vx, vy = b.vy;
  let jumpLeft = jump ? 1 : 0;
  if (jump === 'now') { vy = -impulse; jumpLeft = 0; }
  const surfaces = allSurfaces(stage);
  for (let t = 1; t <= maxFrames; t++) {
    if (jumpLeft && jump === 'level' && vy > 0 && y >= slab.y - 12) { vy = -impulse; jumpLeft = 0; }
    vy = Math.min(vy + PHYS.GRAV, fallMax);
    if (Math.sign(vx) !== dir || Math.abs(vx) < airMax) {
      const nv = vx + dir * PHYS.AIR_ACCEL;
      vx = Math.abs(nv) > airMax && Math.sign(nv) === dir ? dir * airMax : nv;
    }
    if (Math.abs(vx) > airMax) vx *= PHYS.AIR_MOMENTUM_DECAY;
    const py = y;
    x += vx; y += vy;
    if (vy > 0) {
      const tx = x + extraX * dir;
      for (const s of surfaces) {
        if (py <= s.y && y >= s.y && tx >= s.x - 12 && tx <= s.x + s.w + 12) return { lands: s, frames: t };
      }
    }
    if (x < z.left || x > z.right || y - 96 > z.bottom) return { lands: null, frames: t };
  }
  return { lands: null, frames: maxFrames };
}

// Can the body reach any surface by drifting toward `dir` with no resources?
export function driftReaches(b, dir, stage) { return !!flightSim(b, dir, stage).lands; }

// Route hints from a grounded fighter on `from` toward a target x on surface
// `to` (or null when the target hangs in the air). Returns
//   { dir, jump, drop, x }: hold `dir`, press jump / drop-through this tick.
export function routeTo(stage, f, targetX, to) {
  const from = standingSurface(stage, f) || mainSlab(stage);
  const dir = targetX > f.x + 6 ? 1 : targetX < f.x - 6 ? -1 : 0;
  const out = { dir, jump: false, drop: false, x: targetX };
  if (!to || to === from) {
    if (from === mainSlab(stage)) out.x = safeX(from, targetX, 24);   // never walk off the slab after a target
    out.dir = out.x > f.x + 6 ? 1 : out.x < f.x - 6 ? -1 : 0;
    return out;
  }
  if (to.y < from.y) {                                                  // target above: get under it, then jump
    const under = clamp(targetX, to.x + 16, to.x + to.w - 16);
    out.x = under; out.dir = under > f.x + 8 ? 1 : under < f.x - 8 ? -1 : 0;
    out.jump = Math.abs(under - f.x) < 40;
    return out;
  }
  // target below: drop through when the platform spans the target, else run off the edge
  const spans = targetX > from.x - 20 && targetX < from.x + from.w + 20;
  if (spans && f.body?.onPlatform) { out.drop = true; out.dir = 0; }
  return out;
}

// Does a fighter standing on `from` need a double jump to reach surface `to`?
export function needsDoubleJump(f, from, to) {
  return from.y - to.y > jumpRise(f.stats.jumpImpulse) - 10;
}
