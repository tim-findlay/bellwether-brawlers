// The in-between layer (render only — reads fighter state, never writes it).
// Sprite strips give the key poses; this makes the moves between them read as
// motion, Brawlhalla-style: a damped spring for squash & stretch kicked by
// takeoff, landing, dash starts, hits and an attack's first live frame; eased
// lean so a run tilts in and a stop settles out instead of snapping; a quick
// pinch through a turnaround; anticipation (lean back over the wind-up, a
// forward lunge-stretch on the hit); and a 4-tick crossfade between
// locomotion poses. Steps once per logic tick (world.frame), so pause and
// hitstop freeze it and it never depends on the display's refresh rate.

const K = 0.3, DAMP = 0.7;                 // spring: pull back to rest, keep this much velocity per tick
const EASED = new Set(['idle', 'run', 'dash', 'jump', 'fall', 'fastfall', 'land', 'wall', 'ledge', 'turn']);
const FADES = new Set(['idle', 'run', 'jump', 'fall', 'land']);
const FADE_T = 4;
const S = new WeakMap();

function kick(s, v) { s.sqV += v; }

// read this tick's transitions off the body and push the spring
function step(s, f) {
  const b = f.body, a = f.attack, m = a?.move;
  if (b.grounded && !s.grounded && s.vy > 3) kick(s, -Math.min(0.14, s.vy * 0.011));    // landing: squash, harder the faster you fell
  if (!b.grounded && s.grounded && b.vy < -4) kick(s, 0.1);                            // takeoff: stretch up
  if (b.airJumps < s.airJumps && b.vy < 0) kick(s, 0.08);                              // air jump
  if ((b.state === 'dash' || b.state === 'chase') && s.state !== b.state) kick(s, -0.14);   // dash start: long and low
  if (b.state === 'wall' && s.state !== 'wall') kick(s, -0.1);                         // slap onto the wall
  if ((b.stun || 0) > s.stun + 4) kick(s, -0.12);                                      // hit: crumple
  if (a && m && !a.aerial && a.frame === (m.startup || 0) + 1) kick(s, -0.1);          // the lunge: wide on the first live frame
  if (b.facing !== s.facing && b.grounded) s.flip = 1;
  s.sqV += -K * s.sq; s.sqV *= DAMP; s.sq += s.sqV;
  if (Math.abs(s.sq) < 0.002 && Math.abs(s.sqV) < 0.002) s.sq = s.sqV = 0;
  s.flip = Math.max(0, s.flip - 0.25);
  if (s.fade > 0) s.fade--;
  s.grounded = b.grounded; s.vy = b.vy || 0; s.state = b.state; s.stun = b.stun || 0; s.facing = b.facing; s.airJumps = b.airJumps;
}

// the attack's own lean: back through the wind-up, into it on the hit
function attackLean(f) {
  const a = f.attack, m = a?.move;
  if (!a || !m || a.aerial || m.kind === 'teleport') return 0;
  const face = f.body.facing, su = m.startup || 0, ac = Math.max(1, m.active || 0), fr = a.frame;
  if (fr <= su) return -face * 0.07 * (fr / Math.max(1, su));
  if (fr <= su + ac) return face * 0.1;
  return face * 0.1 * Math.max(0, 1 - (fr - su - ac) / 8);
}

// pose: { anim, frame, opts } as the anim mapping chose them; `name` is the
// fighter's anim state. Mutates pose.opts; returns a ghost to draw under it, or null.
export function animate(f, name, pose) {
  const b = f.body;
  if (!b) return null;
  const tick = f.world?.frame ?? 0;
  let s = S.get(f);
  if (!s) {
    s = { tick, sq: 0, sqV: 0, lean: pose.opts.rot || 0, flip: 0, fade: 0, prev: null, name,
      grounded: b.grounded, vy: b.vy || 0, state: b.state, stun: b.stun || 0, facing: b.facing, airJumps: b.airJumps };
    S.set(f, s);
  }
  const ticks = Math.max(0, Math.min(6, tick - s.tick));
  s.tick = tick;
  if (name !== s.name) {                                          // a pose change: crossfade between locomotion poses
    if (FADES.has(name) && FADES.has(s.name) && s.prev) { s.ghost = s.prev; s.fade = FADE_T; }
    else s.fade = 0;
    s.name = name;
  }
  for (let i = 0; i < ticks; i++) step(s, f);

  const o = pose.opts;
  // lean: eased for movement poses, the anim's own (spins, tumbles) otherwise
  const target = (o.rot || 0) + (f.attack ? attackLean(f) : 0);
  if (EASED.has(name) || (f.attack && !f.attack.aerial)) { s.lean += (target - s.lean) * Math.min(1, 0.35 * Math.max(1, ticks)); o.rot = s.lean; }
  else { s.lean = target; o.rot = target; }
  // air stretch: a touch taller when moving fast vertically
  const air = b.grounded || name === 'wall' ? 0 : Math.min(0.03, Math.abs(b.vy || 0) * 0.0025);
  const sq = s.sq + air;
  o.squashY = (o.squashY ?? 1) * (1 + sq);
  o.squashX = (o.squashX ?? 1) * (1 - sq * 0.8) * (1 - 0.22 * Math.sin(s.flip * Math.PI));
  if (o.squashX < 0.4) o.squashX = 0.4;

  const ghost = s.fade > 0 && s.ghost ? { ...s.ghost, alpha: 0.45 * (s.fade / FADE_T) } : null;
  s.prev = { anim: pose.anim, frame: pose.frame, rot: o.rot, squashX: o.squashX, squashY: o.squashY };
  return ghost;
}
