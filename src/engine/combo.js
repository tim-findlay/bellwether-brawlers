// The combo system's input windows (Fighter calls these; PHYS holds the numbers,
// BALANCE.md "Combo doctrine" the rules, DESIGN.md "Combos" the blueprint).
//
//  hit-confirm cancel — a LIGHT that connected may cut its recovery short (past
//    PHYS.HIT_CANCEL_FRAC of it) into a jump, a dash, a light or a heavy.
//  chase dodge — ANY landed melee move (not a super), once its active frames are
//    done, may be cut into a short burst in the held direction (at the victim if
//    none), once per airtime; from PHYS.CHASE_CANCEL_FROM frames in, pressing an
//    attack ends the burst and throws it. The window stays open PHYS.CHASE_LATE
//    frames after the move ends. The follow-up tool: sLight > chase > sAir.

import { PHYS } from '../data/physics.js';

const MELEE_KINDS = new Set([undefined, 'melee', 'lunge', 'flurry', 'shout', 'dashCombo', 'aerial']);
const SLOTS = ['super', 's2', 's1', 'heavy', 'light'];
const endOfActive = (m) => (m.startup || 0) + (m.active || 0);

export function cancelOpen(f) {
  const a = f.attack, m = a?.move;
  if (!a || a.slot !== 'light' || !a.hasHit) return false;
  return a.frame > endOfActive(m) + Math.ceil((m.recover || 0) * PHYS.HIT_CANCEL_FRAC);
}

export function wantsCancel(f, intent) {
  const c = f.controller;
  return c.buffered('light') || c.buffered('heavy') || intent.jump || intent.dashLeft || intent.dashRight;
}

export function chaseOpen(f) {
  const a = f.attack, m = a?.move;
  if (f.chaseUsed) return false;
  if (!a) return f.chaseLate > 0 && f.actionable;                 // just after a landed move ended (PHYS.CHASE_LATE)
  if (!a.hasHit || a.slot === 'super' || !MELEE_KINDS.has(m.kind)) return false;
  return a.frame > endOfActive(m);
}
// once per frame (Fighter.update): a landed melee move that just ended keeps the chase open a beat
export function tickChase(f) {
  const a = f.attack;
  if (a) f._chaseArm = a.hasHit && a.slot !== 'super' && MELEE_KINDS.has(a.move.kind);
  else if (f._chaseArm) { f._chaseArm = false; f.chaseLate = PHYS.CHASE_LATE; }
  if (f.chaseLate > 0 && !a) f.chaseLate--;
}

export function chase(f, intent) {
  const c = f.controller, o = f.opp;
  let dx = (intent.right ? 1 : 0) - (intent.left ? 1 : 0);
  const dy = intent.down ? 1 : c.held('up') ? -1 : 0;
  if (!dx && !dy) dx = o ? (Math.sign(o.x - f.x) || f.facing) : f.facing;   // no direction: at them
  if (dx) f.body.facing = dx;
  f.attack = null; f.chaseUsed = true; f.chaseLate = 0; f.cancelFlash = 6;
  c.consume('dodge');
  f.body.chase(dx, dy);
  f.world.audio.play('dash');
}

// an attack pressed during a chase dodge (past its first frames) cuts it short
export function chaseCuts(f) {
  const b = f.body;
  return b.state === 'chase' && b.stateT >= PHYS.CHASE_CANCEL_FROM && SLOTS.some(s => f.controller.buffered(s));
}
