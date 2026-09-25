# Phase 3: The Revamp — v3 combat on the movement core, sprite characters, Higgsfield art

> Started 2026-09-25 on branch `claude/practical-dirac-j8nqlb`. Tim's brief: "fully revamp it, use
> Higgsfield for art direction, seriously improve the physics — fast paced, intermediary animations as
> players run, animated characters, pixel style, deployable." Engine-change sign-off for movement
> physics is given by that brief; every value change is still called out in BALANCE.md.

**Goal:** the game people launch from the title screen IS the v3 platform fighter: momentum movement
(run/dash/double-jump/fast-fall/air-dodge), the composure gauge + ring-out KOs + 3 stocks, the eight
kits ported onto the new core with aerials, sprite-animated fighters generated through Higgsfield
(idle / run / jump / attack sheets per fighter, drop-in with drawn fallback), world-scale stage art,
camera, and a CPU that can navigate platforms and recover.

**Non-goals (still):** mobile/touch, gamepads, online, replays, 3–4 player.

## Work split

| Owner | Files | Contract it depends on |
|---|---|---|
| core (Claude, this session) | `src/data/physics.js`, `src/engine/movement.js` (stun), `src/engine/fighter.js` (rewrite), `src/engine/combat.js` (rewrite), `src/data/characters/*.js`, `src/engine/match.js` (folded into combat), tests | — |
| render agent | `src/render/sprites.js`, `src/render/draw.js` (rewrite), `src/render/stage.js`, `src/render/hud.js`, `src/engine/effects.js` (world-space), `src/engine/assets.js` (sprites + stage art), `src/data/sprites.js`, `src/dev/art.js` (`?art=<stage>` harness) | §Fighter/World contract below |
| ai/events/sim agent (after core lands) | `src/engine/ai.js`, `src/engine/events.js`, `src/data/events.js`, `src/dev/sim.js` | the landed core |
| screens (core owner) | `src/screens/fight.js` (v3), help text, `src/main.js` | both |

## Units & conventions (unchanged from Phase 1–2)

World units are px at camera zoom 1.0; viewport 960×540; stage geometry lives in `stages.js`
(`slabs`, `platforms`, `spawns`, `respawn`, `cameraBounds`, `blast`). Fighter `y` is the FEET. 60 Hz
fixed timestep. Sprites face RIGHT in their sheets; the renderer mirrors for `facing === -1`.

## Fighter / World contract (what the renderer, HUD, AI and screens may read)

```js
// src/engine/fighter.js
new Fighter(cfg, side /*0|1*/, controller, world)
f.cfg, f.side, f.controller, f.world
f.body            // MovementBody: x, y (feet), vx, vy, facing, grounded, onPlatform,
                  //   state: 'idle'|'run'|'dash'|'dodge'|'airdodge'|'air', stateT,
                  //   fastFalling, airJumps, airDodgeOk, stun (hitstun frames left), w, h
f.x, f.y, f.facing, f.grounded, f.airborne   // getters onto body
f.gauge, f.maxGauge        // composure (never kills; refills on stock loss)
f.meter (0..100), f.meterFlash
f.cd = { s1, s2 }
f.statuses                 // Map(name -> { dur, max, data })
f.stocks
f.state                    // 'normal' | 'hitstun' | 'stagger' | 'grabbed' | 'frozen' | 'ko' | 'chair'
f.stateT
f.chair                    // null | { t, x, y, y0 } while riding the respawn chair (state 'chair');
                           //   the body is parked at (x, y) meanwhile
f.attack                   // null | { slot:'light'|'heavy'|'s1'|'s2'|'super', move, frame, hasHit,
                           //          fired, aerial, aim:'n'|'s'|'u'|'d'|null }
f.landLag                  // frames of landing lag remaining (non-actionable while > 0)
f.hurtFlash, f.animT
f.invulnerable, f.actionable        // getters
f.anim                              // getter -> { name, t }
//   name: 'idle' | 'run' | 'dash' | 'jump' | 'fall' | 'fastfall' | 'dodge' | 'airdodge' | 'attack'
//       | 'land' | 'hurt' | 'launched' | 'stagger' | 'ko' | 'chair'
//   t: frames spent in that anim
f.hitbox()  -> null | { x, y, w, h, move, slot }   // world px, y = box centre
f.hurtbox() -> { x, y, w, h }                      // world px, y = box centre
f.takeHit(opts) -> 'hit' | 'miss' | 'parried' | 'armored'

// src/engine/combat.js
new FightWorld({ cfgs, controllers, stage /* geometry */, fx, audio, rng, settings })
w.stage, w.fighters, w.projectiles, w.zones, w.strikes, w.hazards, w.frame
w.over, w.winner, w.events    // events drained by the screen:
                              //   { type:'ko', player, stocksLeft } | { type:'gameover', winner }
w.update(); w.other(f)
// projectile: { x, y, vx, vy, w, h, shape, color, owner, t }
// zone:       { type:'coffee'|'ember'|'smoke', x, y /* surface top */, w, h, life, max }
// strike:     { x, y /* surface top */, w, h, delay, color, marker }
// hazard:     { type:'bike'|'ball', x, y, w, h, vx }
```

Move data (`src/data/characters/<id>.js`) keeps the v2 shape plus v3 fields: `kb`, `kbScale`,
`kbAngle` (deg; 0 = away from attacker, 90 = up, 270 = spike), `air` on specials, `aerials: { n, s, u, d }`
each `{ name, dmg, kb, kbScale, kbAngle, range, startup, active, recover, landLag, spike? }`.

## Sprite contract

`assets/sprites/<id>/<anim>.png` for `anim ∈ idle | run | jump | attack` — horizontal-strip-or-grid
sheets described by `src/data/sprites.js`:

```js
export const SPRITES = {
  tim: { cell: 64, anims: { idle: { frames: 8, fps: 8, loop: true }, run: { frames: 10, fps: 14, loop: true },
                            jump: { frames: 8, fps: 12, loop: false }, attack: { frames: 10, fps: 16, loop: false } } },
  ...
};
export const SPRITE_SCALE = 1.5;   // 64 px cell -> 96 world px
```

Cells fill left-to-right, top-to-bottom; grid columns = `Math.ceil(sqrt(frames))` unless `cols` is
given. Anchor: bottom-centre of the cell sits on `(f.x, f.y)`. Missing sheet (or missing character
entry) ⇒ the drawn fallback body — the drop-in rule from headshots applies to sprites too.

Anim mapping: `idle→idle`, `run|dash→run` (dash plays run at 1.6×), `jump→jump` frames 0..40 %,
`fall|fastfall→jump` frames 60..100 % held, `attack→attack` scrubbed across the move's
startup+active+recover, `land→idle` frame 0 squashed, `dodge|airdodge→run` frame 3 at 50 % alpha
with i-frame flicker, `hurt|launched|stagger→idle` frame 0 tinted (launched rotates with velocity),
`ko→` ink-burst then nothing, `chair→` idle frame 0 sitting on the drawn chair.

## Physics retune (sign-off: Tim's brief; values in BALANCE.md in the same commit)

Snappier ground game and readable air: higher run accel + turnaround, stronger friction, faster
air accel, taller-but-quicker jumps (more gravity), fast-fall bite. Semantics from Phase 1 are kept
(dash grounded-only + latched, dash-jump carry, double jump cancels dash, coyote, buffer, drop-through).
New: `MovementBody.stun` — while > 0 the body ignores intent (no steering, jumps, dodges, dashes),
keeps gravity, and applies `PHYS.LAUNCH_DRAG` to vx; it decrements every tick and is cleared on landing
only if `PHYS.STUN_LANDING_CLEARS` (true — tech-less, Brawlhalla-style).

## Verification gates

`node --test 'tests/*.test.mjs'` green; `python3 -m http.server` + headless Chromium: no console
errors on title, select, fight; a CPU match completes; `?sim=10` runs and reports the BALANCE.md gates.
