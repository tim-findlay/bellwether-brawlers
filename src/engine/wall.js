// Wall slide + wall jump (Brawlhalla: "sliding on walls to recover", Tim's
// brief). An airborne body that touches the side of a slab below its ledge zone
// clings and slides down slowly — air jumps, dodge and dash refresh, and the
// Fighter refreshes its recovery. Jump kicks off the wall (away and up, no air
// jump spent); holding away or dodging lets go. WALL_JUMP_MAX wall jumps without
// landing and you slip (Brawlhalla's wall slip) — a wall is a way back, never a
// place to stall. Pure movement: no fx, no combat. MovementBody calls these.

import { PHYS } from '../data/physics.js';

const LEDGE_ZONE = 96;          // the top of the wall belongs to the ledge grab (movement.js _tryLedge)
const HANDS = 24;               // px below the head: you cling while your hands are on the wall
const onWall = (b, s) => b.y - b.h + HANDS <= s.y + (s.h ?? 200);

// after _collide: start clinging if we're pressed against a slab side
export function tryWall(b, stage, intent) {
  if (b.grounded || b.stun > 0 || b.dodging || b.dashT > 0 || b.state === 'ledge' || b.state === 'wall') return;
  if (b.wallCd > 0 || b.wallJumps >= PHYS.WALL_JUMP_MAX || b.vy < -3 || intent.down) return;   // hold down: fall past it
  const hw = b.w / 2, dir = (intent.right ? 1 : 0) - (intent.left ? 1 : 0);
  for (const s of stage.slabs) {
    if (b.y < s.y + LEDGE_ZONE || !onWall(b, s)) continue;
    let side = 0;                                              // which face: -1 = the slab's left wall, 1 = its right wall
    if (Math.abs(b.x - (s.x - hw)) <= 2) side = -1;
    else if (Math.abs(b.x - (s.x + s.w + hw)) <= 2) side = 1;
    if (!side || dir === side) continue;                       // holding away: don't grab
    b.wall = { slab: s, side };
    b.x = side < 0 ? s.x - hw : s.x + s.w + hw;
    b.vx = 0; b.vy = Math.min(Math.max(b.vy, 0), PHYS.WALL_SLIDE_MAX);
    b.facing = side;                                           // face away from the wall, ready to kick off
    b.airJumps = PHYS.AIR_JUMPS; b.airDodgeOk = true; b.airDashOk = true; b.airDash = false; b.fastFalling = false;
    b.wallTouched = true;                                      // the Fighter refreshes the recovery on this tick
    b._setState('wall');
    return;
  }
}

// one tick while clinging (instead of the normal air update)
export function wallTick(b, intent, stage) {
  const W = b.wall, s = W.slab, away = W.side, dir = (intent.right ? 1 : 0) - (intent.left ? 1 : 0);
  if (intent.jump) {                                           // wall jump: away and up, no air jump spent
    b.vx = away * PHYS.WALL_JUMP_VX; b.vy = -b.stats.jumpImpulse * PHYS.WALL_JUMP_FACTOR;
    b.wallJumps++; b.consumedJump = true;
    return leave(b, 8);
  }
  if (dir === away || intent.dodge) { b.vx = away * 1.5; return leave(b, 14); }   // let go (a dodge carries on next tick)
  b.vy = Math.min(b.vy + PHYS.GRAV * 0.5, intent.down ? PHYS.WALL_SLIDE_MAX * 2.5 : PHYS.WALL_SLIDE_MAX);   // hold down: slide faster
  b.y += b.vy;
  if (!onWall(b, s)) return leave(b, 0);                      // slid off the bottom of the wall
}

export function leave(b, cd) {
  b.wall = null; b.wallCd = cd;
  b._setState('air');
}
