// Extra move kinds (2026-09-28 roster pass, Tim's brief). Merged into the
// combat behaviour table by combat.js; pure logic, headless-safe.
//
//  holiday — Abi's Hollibobs: she goes Out of Office (invulnerable, off the
//    board) while a landing marker tracks her opponent, locks `lockAt` frames
//    before she returns, then she drops in with the move's `landing` (a diving
//    aerial). The Fighter owns the status timing (fighter.js _holiday/_homeTime).
//  assist — Tim's summon: Claude, a temporary helper that runs at the opponent
//    and throws a jab-jab-push string for `dur` frames. Any hit dismisses it
//    (the counterplay); a parry declines it. Helpers live in world.assists.

export const EXTRA_BEHAVIORS = {
  holiday(w, f, m) {
    const def = w.other(f);
    f.applyStatus('holiday', m.away || 72, { move: m, x: def.x, y: def.grounded ? def.y : null });
    f.body.vx = 0; f.body.vy = 0;
    w.audio.play('jet');
    w.fx.text(f.x, f.y - 130, 'OUT OF OFFICE!', f.cfg.body.trim);
  },
  assist(w, f, m) {
    const surface = w.surfaceBelow(f.x, f.y - 2) || w.mainSlab;
    w.assists.push({
      owner: f, m, name: m.helper || 'CLAUDE',
      x: f.x - f.facing * 44, y: surface.y, vx: 0, vy: 0, grounded: true, facing: f.facing,
      t: 0, st: 0, state: 'in', life: m.dur || 270, dead: false,
    });
    w.audio.play('teleport');
    w.fx.dust(f.x - f.facing * 44, surface.y, '#e9a27f', 10);
    w.fx.text(f.x, f.y - 140, `${m.helper || 'CLAUDE'}: ON IT!`, '#c2613f');
  },
};

// Hollibobs, per tick while away (frozen, invulnerable, undrawn): the landing mark
// tracks the opponent, then locks for the last `lockAt` frames so the drop can be read.
export function holidayTick(f) {
  const st = f.statuses.get('holiday'), d = st.data, o = f.opp, lockAt = d.move.lockAt ?? 26;
  f.body.vx = 0; f.body.vy = 0; f.attack = null; f.landLag = 0;
  d.locked = st.dur <= lockAt;
  if (!d.locked && o && !o.chair) { d.x += Math.max(-5, Math.min(5, o.x - d.x)); d.y = o.grounded ? o.y : d.y ?? o.y; }
}

// The surface the mark sits on: the one the target stood on (else the highest under the mark).
export function markSurface(w, d) {
  return (d.y != null && w.surfaceBelow(d.x, d.y - 2)) || w.surfaceBelow(d.x, w.stage.cameraBounds?.y ?? -2000) || w.stage.slabs[0];
}

// Back from holiday: above the mark, straight into the move's `landing` dive.
export function homeTime(f, d) {
  const w = f.world, s = markSurface(w, d), b = f.body;
  b.x = Math.max(s.x + 20, Math.min(s.x + s.w - 20, d.x));
  // drop from `dropFrom` above, but start below any platform in the way so nothing catches the fall
  let y0 = s.y - (d.move.dropFrom ?? 240);
  for (const p of [...w.stage.slabs, ...w.stage.platforms]) if (p !== s && b.x >= p.x && b.x <= p.x + p.w && p.y < s.y && p.y + 6 > y0) y0 = p.y + 6;
  b.y = y0;
  b.vx = 0; b.vy = 0; b.grounded = false; b.onPlatform = false; b.fastFalling = false;
  f.attack = { slot: 's2', move: d.move.landing, frame: 0, hasHit: false, fired: true, aerial: true, aim: 'd', hits: 0, armorSpent: false };
  w.audio.play('jet');
  w.fx.text(b.x, s.y - 150, 'HOME TIME!', f.cfg.body.trim);
}

const GRAV = 0.85, FALL = 14, W = 36, H = 88;

export const assistBox = (a) => ({ x: a.x, y: a.y - H / 2, w: W, h: H });

// One tick for every helper; dead ones are dropped.
export function updateAssists(w) {
  for (const a of w.assists) step(w, a);
  w.assists = w.assists.filter(a => !a.dead);
}

export function dismissAssist(w, a, why) {
  if (a.dead) return;
  a.dead = true;
  w.fx.dust(a.x, a.y, '#e9a27f', 10);
  w.fx.text(a.x, a.y - 110, why, '#c2613f');
  w.audio.play('pop');
}

function step(w, a) {
  a.t++; a.st++;
  const tgt = w.other(a.owner), m = a.m;
  if (a.t >= a.life) return dismissAssist(w, a, 'TASK COMPLETE');
  if (a.owner.state === 'ko' || a.owner.chair) return dismissAssist(w, a, 'LOGGED OFF');
  // body: gravity + one-way landing on any surface below
  const py = a.y;
  if (!a.grounded) { a.vy = Math.min(a.vy + GRAV, FALL); }
  a.x += a.vx; a.y += a.vy;
  const s = w.surfaceBelow(a.x, py - 1);
  if (s && a.vy >= 0 && a.y >= s.y && py <= s.y + 2) { a.y = s.y; a.vy = 0; a.grounded = true; }
  else if (!s || a.y < s.y - 1) a.grounded = false;
  if (!w.inBlast(a.x, a.y)) return dismissAssist(w, a, 'OUT OF SCOPE');

  const away = !tgt || tgt.chair || tgt.state === 'ko';
  const dx = away ? 0 : tgt.x - a.x, dy = away ? 0 : tgt.y - a.y;
  if (a.state === 'in') { a.vx = 0; if (a.st >= 14) { a.state = 'chase'; a.st = 0; } return; }
  if (a.state === 'rest') { a.vx *= 0.7; if (a.st >= (m.rest ?? 22)) { a.state = 'chase'; a.st = 0; } return; }
  if (a.state === 'chase') {
    if (away || tgt.invulnerable) { a.vx *= 0.7; return; }
    a.facing = Math.sign(dx) || a.facing;
    a.vx = a.facing * (m.speed || 6.5);
    if (a.grounded && dy < -80 && a.st > 16) { a.vy = -(m.jump || 15); a.grounded = false; }   // hop up after them
    if (Math.abs(dx) < 58 && Math.abs(dy) < 60) { a.state = 'combo'; a.st = 0; a.vx = a.facing * 1.5; }
    return;
  }
  // combo: jab (6), jab (16), push (30), done at 44
  a.vx *= 0.8;
  const hits = m.string || [{ at: 6, dmg: 3, kb: 3, kbScale: 2, kbAngle: 40 }, { at: 16, dmg: 3, kb: 3, kbScale: 2, kbAngle: 40 }, { at: 30, dmg: 8, kb: 7, kbScale: 13, kbAngle: 38 }];
  for (const h of hits) if (a.st === h.at) strike(w, a, tgt, h);
  if (a.st >= (m.comboLen || 44)) { a.state = 'rest'; a.st = 0; }
}

function strike(w, a, tgt, h) {
  if (!tgt || tgt.chair || tgt.state === 'ko') return;
  const box = { x: a.x + a.facing * 34, y: a.y - 48, w: 64, h: 70 }, hb = tgt.hurtbox();
  if (Math.abs(box.x - hb.x) >= (box.w + hb.w) / 2 || Math.abs(box.y - hb.y) >= (box.h + hb.h) / 2) return;
  const dmg = a.owner.damageOut(h.dmg, 'super');
  const res = tgt.takeHit({ dmg, kb: h.kb, kbScale: h.kbScale, kbAngle: h.kbAngle, dir: a.facing, from: a.owner, move: { name: a.name } });
  if (res === 'parried') { tgt.attack = null; w.audio.play('parry'); return dismissAssist(w, a, 'DECLINED!'); }
  if (res === 'hit' || res === 'armored') w.hitFeedback(tgt, 'super', dmg, h);
}
