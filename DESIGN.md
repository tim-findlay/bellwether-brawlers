# BELLWETHER BATTLERS — Design Document

*v3 — the platform-fighter pivot. Brawlhalla is the movement reference. Supersedes the v2 health-bar fighter design; BALANCE.md stays canonical for numbers where the two could drift.*

## Vision

A movement-first platform fighter starring the office. Run, dash-jump, double-jump and air-dodge around floating stages; knock your colleagues past the blast zones to take their three stocks. Every fighter keeps their v2 identity — archetype, specials, super — and gains a full aerial kit. Warm paper-and-ink look, now **near-HD**: smooth ink-outlined characters with posterized shading and real limb animation. **Not neon.** Daylight stages, diegetic light only, no glows.

**Display names are first names only — no last names anywhere in game content** (including incidental art: signage, boarding passes, nameplates).

## The core rules

- **Match:** 1v1, **3 stocks** each, untimed. No rounds, no clock. Lose all three stocks, lose the match.
- **The only KO is a ring-out.** Cross a blast zone (all four sides) and you lose a stock.
- **Composure gauge:** the health bar survives as a launch-resistance gauge. It drains as you take hits and never kills — the emptier it is, the farther every hit sends you. Capacity is the old HP stat (85–110): tanks resist launches instead of out-lasting attrition. Refills only on stock loss — there is no heal-by-waiting. *Single design-level exception:* ABI's PUB O'CLOCK regen (see her entry) — it makes her opponent engage, the opposite of camping, and any hit cancels it.
- **Knockback** scales with the move's power and how empty the victim's gauge is, divided by weight (formula and bands in BALANCE.md). Hitstun scales with knockback. No juggle limit — aerial strings are the game now.
- **Respawn:** ink-burst KO, then you descend from centre-top riding an office chair — invulnerable until you act (hard cap 3 s).
- **No block.** One **Dodge** button: spot dodge on the ground (tap a direction for a dodge-step), **air dodge** with a directional impulse in the air — once per airtime, your recovery's last resource after the three jumps, the air dash and the recovery move. All dodges share one cooldown. Chip damage, blockstun and facing-dependent block are gone.
- **Ledge grab (Phase 3b, Tim's ask).** Falling past a slab lip catches it: 20 i-frames, jumps / dodge / dash refreshed, then climb (hold toward, or automatically after 1.5 s), ledge-jump (a shorter jump straight up onto the stage) or drop (hold down or away). No re-grab for 0.75 s after letting go, and hanging is non-actionable — it is a recovery, not a stall (the sim's stall gate checks that). Soft platforms still catch you from above.
- **Meter & supers stay:** 0–100, gain = 80% of gauge damage dealt + 50% taken, persists across stocks, resets each match. Damage supers are retuned to launch toward blast zones; utility supers (LIFETIME PLATINUM, PUB O'CLOCK, LOW & SLOW) keep their v2 roles.
- **Statuses** survive with worded callouts and duration bars (slow, haste, burn, reversed, silence, lien, dmgUp, nextHit; caps in BALANCE.md). Burn drains the gauge but can never take a stock.
- **Dropped from v2, deliberately (do not port):** block/chip/blockstun, the knockdown/get-up state machine and its okizeme rules, the 1-hit juggle limit, rounds, the 60 s timer and the timeout rule. Two small fixed-frame *states* (not statuses) replace knockdown: **self-stagger** (non-actionable and fully vulnerable — the punish window, Adrian's tax; the one thing that "misses" it is an unparryable, which whiffs vs non-actionable fighters by its own rule) and the **hazard stagger** (brief, never comboable, with recovery invulnerability — hazard losers only).

## Movement (the heart of the game)

Universal constants live in **`src/data/physics.js`**; per-character movement numbers (run, jump impulses, fall max, weight, gauge) live in that fighter's `src/data/characters/<id>.js` within the bands BALANCE.md sets. The engine reads, never hard-codes. Starting values in BALANCE.md; canonical after the Phase-1 graybox playtest.

- **Run** with acceleration and friction; per-character top speed.
- **Dash:** double-tap a direction — on the ground a 2× speed burst; **in the air** (once per airtime) a short horizontal burst with gravity switched off that cancels into a jump. Tap window and cooldown in BALANCE.md. **Dash-jump** keeps the momentum for a long flat arc.
- **Three jumps:** everyone has a ground jump plus **two air jumps** (Phase 3b); impulses per character. Landing or a ledge grab refreshes them.
- **Air drift:** separate air acceleration and max air speed.
- **Fast-fall:** *hold* down while descending (~2.5× fall, cancels on hit). A fast-falling fighter **lands on** soft platforms.
- **Drop-through:** a *fresh down tap* while standing on a soft platform (attack presses take precedence: down+Light on a platform is just a Light). After a drop, soft-platform collision is ignored for a grace window (BALANCE.md).
- **Air dodge:** i-frames + a directional impulse; once per airtime, refreshed on landing, ledge grab or respawn; doubles as recovery.
- **Ledge:** see core rules — grab, climb, ledge-jump, drop.
- Feel floor: 5-frame coyote time, 6-frame input buffer (jump/dodge/attacks), per-aerial landing lag, per-character fall speed (gravity is global).

Fixed-timestep 60 Hz logic is unchanged. Never tie gameplay to rAF rate.

## Controls

Physical key positions (`KeyboardEvent.code`), US labels. All bound keys `preventDefault`ed in play. Menus: confirm F/K/Enter, back Esc; 20-frame input lockout on screen transitions.

| Action | P1 | P2 | Notes |
|--------|----|----|-------|
| Move | A / D | ← / → | double-tap = dash (ground, or once per airtime in the air); toward the stage while hanging = climb |
| Jump | W | ↑ | key-down edge in air = air jump (two per airtime); *held* = aims up-air; on the ledge = ledge jump |
| Down | S | ↓ | fast-fall (hold) · drop-through (tap) · aims down-light / down-signature / ground pound · drops off the ledge |
| Light | F | K | + neutral / side / down on the ground = the three lights; + n/s/u/d in the air = the four aerials |
| Heavy | G | L | + neutral / side / down on the ground = the three **signatures** (kill moves); in the air = **recovery** (up), **ground pound** (down held) |
| Special 1 / 2 | H / J | ; / ' | per-move `air` flag in data |
| Dodge | V | / | spot · step · air dodge |
| Super | Space | Enter | full meter |

**Jump-key rule (canonical):** an air jump triggers on the key-down *edge* while airborne; aerial aim reads the *held* directions on the frame Light is pressed — so up-air is "keep W held (e.g. from your jump), press Light", and a fresh mid-air W tap is always an air jump.

**Gamepads (Phase 3b):** any standard-mapping pad (Xbox / PlayStation / most USB pads) drives P1 (first pad) or P2 (second pad) alongside the keyboard through the Gamepad API — left stick or d-pad to move, **A** jump, **X** light, **B** heavy, **RB / LB** specials, **Y** super, either trigger dodge, Start = Enter, Back = Esc. No rebinding UI yet (deliberate; the mapping lives in `src/engine/input.js`).

## The directional kit (Brawlhalla-style, Phase 3b)

Tim's brief: *"a different movement / attack for each directional type of hit"* — the Brawlhalla model, where the held direction and the button decide the move and the moves decide where you end up (sources: [brawlhalla.wiki.gg/wiki/Attacks](https://brawlhalla.wiki.gg/wiki/Attacks), [brawlhalla.fandom.com/wiki/Attacks](https://brawlhalla.fandom.com/wiki/Attacks), [Combat mechanics / Terminology](https://brawlhalla-archive.fandom.com/wiki/Combat_mechanics), [supercombo notation](https://wiki.supercombo.gg/w/Brawlhalla/Notation)). Every fighter has the same twelve-slot shape:

| Button | ground neutral | ground side | ground down | air |
|---|---|---|---|---|
| **Light** | *neutral light* — the fast poke | *side light* — step-in string starter, sends sideways (28°) | *down light* — a low sweep that pops them up (72°), the combo starter | nair / **sair** / uair / dair-spike (held direction) |
| **Heavy** | *neutral signature* — the v2 heavy | *side signature* — the heavy with a lunge, ≤ 32°: the horizontal kill | *down signature* — a low launcher (78°): the vertical kill, late | **recovery** — a rising strike that lifts you (once per airtime) · **ground pound** (down held) — a diving spike with the heaviest landing lag |

The variants are *derived* from each fighter's base light / heavy / aerials by `expandKit()` in `src/data/characters/_shared.js` (deltas and the four fixed recovery / ground-pound values in BALANCE.md) and named per fighter in `kit.names`; any field can be overridden per fighter in `kit`. Specials and supers keep their v2 identity on their own buttons. Movement and attacks intertwine the way Brawlhalla's do: the side signature is a lunge, the down light launches into the air game, the recovery is both an attack and your fourth jump, and the ground pound is how you chase someone down from above (and eat 20 frames of lag if you miss).

## Art direction

- **Fidelity (Phase 3, shipped):** chunky 16-bit pixel-art fighters on a 64 px cell grid drawn at 1.5× (96 world px tall) with nearest-neighbour scaling, over stages drawn at full canvas resolution through the camera. The 480×270 pixel buffer survives only for the title backdrop and select previews. Palette and fonts carry over from v2 (paper `#f2e9d8`, ink `#2b2620`, brick, navy, brass; Pixelify Sans / Silkscreen / Barlow Condensed). **Not neon:** no glows, bloom or scanlines; daylight stages, diegetic light only.
- **Sprites (Higgsfield pipeline):** every fighter has four sheets — `assets/sprites/<id>/idle.png` (6 frames @ 6 fps), `run.png` (8 @ 14), `jump.png` (6 @ 12), `attack.png` (6 @ 16) — described by `src/data/sprites.js` and animated by `src/render/sprites.js`. They were generated with Higgsfield (`gpt_image_2_5` sprite strips from one shared style formula and a per-character description; key-colour background), sliced to 64 px cells, quantized to 24 colours and saved as PNG-8. Sprites face right; the renderer mirrors. Anim mapping: `idle→idle`, `run|dash→run` (dash at 1.6×), `jump→jump` frames 0–40 %, `fall→jump` frames 60–100 % held, `attack→attack` scrubbed across startup+active+recover, `land→idle` squashed, `dodge→run` frame 3 at half alpha, `hurt|launched|stagger→idle` tinted (launched rotates with velocity), `ko→` ink-burst, `chair→` idle on the drawn chair.
- **Proportions (Phase 3c, Tim's note "big heads, smaller bodies"):** all eight fighters are chibi, Brawlhalla-style — an oversized head about a third to two-fifths of the height, compact body, short limbs. Sheets were regenerated from one big-head base image per fighter (`image_references`), prompts in `docs/HANDOFF-prompts.md`. The drawn fallback in `src/render/body.js` uses the same proportions (18-unit legs and torso, 26-unit head). Mike is **fit and stocky, broad-shouldered, no belly** (`body.build: 'broad'`); his `weight` 1.15 is a balance stat, not his look.
- **Drop-in rule:** a missing sheet (or a missing `SPRITES` entry) falls back to the drawn body in `src/render/body.js` (shared skeleton + outfit palette from character data), exactly as a missing headshot falls back to the cartoon head. Adding `assets/sprites/<newId>/…` must Just Work.
- **Backdrops (Higgsfield, Phase 3b):** every stage has a drop-in `assets/stages/<id>.png` — a 480×270 pixel painting (`gpt_image_2_5` 16:9, same style formula as the sprites, quantized to 32 colours, PNG-8) drawn ×4 behind the slab with a 0.25–0.3 parallax; a missing file falls back to the procedural v2 layers. Tim's note "the background needs to better fit the design of the players" is the brief: same ink outlines, same paper light, props at sprite scale.
- **Stage model (Phase 3c, Tim's note "stages that look like the characters are actually in them"):** two layers. (1) The **far layer** `assets/stages/<id>.png` is prompted hazy and low-contrast with an empty lower-middle band, then a flat **depth wash** in the sky colour (`DEPTH_WASH = 0.18` in `src/render/stage.js`, per-stage `art.wash` overrides) pushes it further back — one flat tone, no gradient or glow. (2) The **arena piece** `assets/stages/<id>-slab.png` is the main slab drawn as one designed object: a floating chunk of the scene (office desks and filing cabinets, palace paving over clay and rock, pub cellar with barrels, Berlin cornice, rooftop brick parapet, tube platform edge), 512 px wide, PNG-8 with 1-bit alpha. It is stretched to the slab's collision width with its top edge on the walkable top and hangs as far below as the art goes; geometry never changes with the art. A missing piece falls back to the procedural `drawSlab()`. Soft platforms stay procedural (`PLATFORM_STYLES`); matching art for them is an optional later pass.
- **Heads:** the real photos appear only as the staff-ID card on the win screen; select cards show the fighter's animated idle sprite (Tim's note: "feature the playable characters, not the headshots"), or the drawn fallback body when a sheet is missing (`assets/headshots/<id>.png`, manifest + drawn fallback, drop-in rule unchanged).
- **Front end (Phase 3c UI pass, Tim's note "make it feel like a full proper game"):** every menu screen draws with one kit, `src/render/ui.js`: paper plaques with an ink drop shadow, keycap hint bars, a slide-out menu list, stamps, stat bars, stage thumbnails built from the real far layer + arena piece, and a layout mini-map. Screens change behind a paper-strip wipe. The flow is title (all eight fighters on the Office arena piece) → main menu (featured-fighter card over the cycling stage art) → character select (roster strip + two player panels with stats and moves; simultaneous picks in Local Versus) → arena carousel → VS splash → fight (READY? / FIGHT!, portrait busts on the HUD plates, pause menu) → win screen (winner on the stage's arena piece with the trophy, loser in shadow, rematch / change fighters / main menu). Three pieces are Higgsfield art, drop-in under `assets/ui/<name>.png`: `logo`, `vs` and `trophy` (`gpt_image_2_5`, keyed, PNG-8). Each falls back to a code-drawn version in the kit, so a missing file never breaks a screen. Menu text, panels and HUD stay code-drawn because they are live.
- **Camera:** follows the fighters' midpoint, zooms continuously to frame both with padding, clamps to per-stage bounds, eased follow; screenshake composes on top. Off-screen fighters get an edge arrow until they recover or KO.

## Architecture (ES modules, zero build)

```
index.html                    entry point
assets/headshots/<id>.png     drop-in portraits (select/win screens)
assets/sprites/<id>/<anim>.png drop-in sprite sheets (idle/run/jump/attack)
src/data/sprites.js           sheet descriptions (cell, frames, fps) + SPRITE_SCALE
src/main.js                   boot, fixed-timestep loop, screen router
src/data/physics.js           ← universal movement & knockback constants
src/data/characters/<id>.js   one fighter per file (+ index.js roster);
                              per-character stats live here
src/data/stages.js            visuals + GEOMETRY: slab, soft platforms,
                              spawns, respawn, camera bounds, blast zones
src/data/events.js            stage hazards (reworked office events)
src/engine/movement.js        momentum physics, platform collision, fighter FSM
src/engine/camera.js          follow/zoom/clamp + shake composition
src/engine/combat.js          knockback/stocks + ported move-kind dispatch,
                              statuses, hooks (preHit / onProjectileResolved)
src/engine/ai/                navigation, tactics, recovery, edge-guard
src/engine/                   input, effects, audio, assets, events (ported)
src/render/sprites.js         sheet loader + frame picker + mirrored draw
src/render/body.js            drawn fallback body, KO burst, respawn chair
src/render/stage.js, objects.js  stage dressing / projectiles, zones, hazards
src/render/draw.js, hud.js    world compositor, gauge/stock/meter HUD
src/screens/                  title, menu, select, fight, results (ported)
src/dev/sim.js                balance harness (?sim=N)
src/dev/graybox.js            Phase-1 movement playground (?graybox)
```

**Data-driven rule unchanged:** adding a fighter, stage or hazard = adding data (+ optional headshot). Engine code never hard-codes content — and v3 fixes v2's violations (floor/wall constants move from `fighter.js` into stage data; projectile/zone shapes move from `draw.js` into data). **Files stay under 500 lines** — the `characters/<id>.js` and `ai/` splits exist to keep it that way.

**Dev flags:** `?sim=N` (balance harness), `?graybox` (movement playground), `?event=<id>` (force a hazard). All dynamically imported, never in normal play paths.

## Build plan (canonical sequencing)

Five phases, small rollbackable commits throughout; the page must load clean after every commit.

1. **Graybox movement playground** — new movement core + `physics.js` + flat slab/soft platforms/training dummy behind `?graybox`. **HARD STOP: Tim playtests and tunes the feel. No further phase starts until he signs off; the surviving `physics.js` values then become canonical in BALANCE.md.**
2. **World** — camera, real stage geometry, blast zones, stocks, respawn chair, HUD v3.
3. **Characters in pairs** — Ben+Tim, Adrian+Richy, Nick+Abi, Mike+Seelye; aerials, rig outfits, retuned specials. Playable after each pair.
4. **AI** — navigation, recovery, edge-guarding, Easy/Normal/Hard.
5. **Content & gates** — hazards rework, music (incl. the Seelye trigger), random card, help text; then the full sim-gate run and BALANCE.md results.

**Status (2026-09-25):** Phases 1–5 landed on `claude/practical-dirac-j8nqlb` in the Phase-3 revamp (plan: `docs/superpowers/plans/2026-09-25-phase3-revamp.md`): momentum core retuned for pace, v3 combat (composure, launches, aerials, stocks, chair), Higgsfield sprite sheets for all eight, camera + world-scale stages, platform-aware CPU, events ported, and balance pass 1 with all five sim gates passing (BALANCE.md). **Phase 3b (2026-09-25, Tim's two playtest notes):** feel pass 2 (three jumps, air dash, ledge grab, softer low-gauge launches, shorter hitstun, 35 % wider stages), the Brawlhalla-style directional kit, six Higgsfield backdrops, two new stages (Rooftop, Platform), gamepad input, gentler CPU (1P defaults to Easy), Abi and Seelye redrawn, and balance pass 2 with all five gates passing on two seeds (BALANCE.md). Open: a human pass on the new kit, a rebind UI, online play (see Out of scope).

**Port list (carry from v2):** move-kind dispatch, statuses + callouts, hooks, input buffering, FX (hitstop/shake/slow-mo/particles), audio synth bank, EventDirector, screens/router, headshot pipeline, localStorage tallies, sim harness skeleton. **Drop list:** see core rules.

## The roster

*Stats: gauge / run speed / weight (fall class). Per-character numbers in character data; bands in BALANCE.md. Every fighter: ground Light + Heavy (kept from v2), four aerials (Light + direction), two specials (per-move `air` flag), super. Recovery strength is a balance axis — who gets a recovery special is deliberate.*

### BEN — "The Big Boss" — long-range bully
110 / 4.8 / 1.06 (fast-faller) — Paynter trench coat, Chelsea boots. Decides where the fight happens.
- Kept: Pistachio Flick, Wingspan, **Hawk Toss** (air-usable lob), **Off the Lip** (chair-surf lunge — now his air recovery), **TWELFTH MAN** (unparryable roar cone; grounded, whiffs vs airborne — jump the roar).
- Aerials: *Air Clearance* (nair sweep) · *Long Reach* (the game's longest side-air) · *Pistachio Pop* (uair) · **L-Plate Drop** (dair spike — the London licence is in progress).
- *Counterplay:* huge but slow; get inside the wingspan and stay there. His recovery is one straight lunge — wait for it.

### TIM — "The Operator" — tempo all-rounder
100 / 5.4 / 1.0 — brown satchel cross-body over the suit; clean-shaven. Steals turns, not stocks.
- Kept: Quick Sync, Hard Deadline, **Prompt Injection** (air-usable cursed e-mail; reversal ends on his next hit), **Zulu Time** (resets special cooldowns, next hit +2), **AGI MOMENT** (dash-through auto-combo; jump the dash).
- Aerials: *Sync Spin* (satchel 360 nair) · *Satchel Swing* (sair) · **The Drop** (uair bass pulse — EDM canon) · *Deadline Drop* (dair spike).
- *Counterplay:* no recovery special — his jumps are honest; edge-guard him hard and don't get clipped by the e-mail.

### ADRIAN — "The Walking Hazard" — chaos rushdown
94 / 5.8 / 0.97 — fuelled by Nero flat whites.
- Kept: Toothbrush Jab, Pivot Table, **Clumsy Charge** (air-usable lunge recovery — self-staggers on a botched landing), **Nero Spill** (the coffee puddle, now on whichever platform it lands; Adrian immune), **FULL AUDIT** (multi-hit flail; self-staggers at the end even on hit).
- Aerials: *Panic Flail* (nair, both sides) · *Overreach* (sair) · *Up-and-Over* (uair) · **Faceplant** (dair spike; self-stagger on a whiffed landing).
- *Counterplay:* whiff-bait everything; his own kit fights him. (Self-stagger: non-actionable and fully vulnerable — the punish window, defined in core rules.)

### RICHY — "The Market" — dual-candle zoner
104 / 5.4 / 1.05 — meme connoisseur, Excel macro artisan. The candles oppose: **dodge the Bull, jump the Bear.**
- Kept: Bid, Short Squeeze (drags closer — scarier near edges), **Bull Run** (air-usable, angled up — clips jumpers), **Bear Raid** (rolls along the surface it lands on), the candle lock (**both candles share one 45-frame cooldown** — there is always a walk-forward window per cycle), **Diversified Portfolio** (+1 *gauge damage* per Bull/Bear alternation that connects, cap +3), **TO THE MOON** (three columns from the main stage; first connecting column only, retuned to launch).
- Aerials: *Portfolio Spin* (nair) · **Meme Slap** (sair, freshly printed) · *Pump* (uair mini-candle) · *Crash Out* (dair spike).
- *Counterplay:* no recovery special and average air speed — get him off stage and the market closes.

### NICK — "The Concierge" — teleport glass cannon
100 / 6.2 / 0.97 (floaty) — fastest, deadliest, still the lightest (pass 2 gave him real signatures instead of paper armour).
- Kept: Name Drop, Fund Structure, **Status Match** (now air-usable — *the* recovery teleport; fixed arrival, punishable), **Points Redemption** (card fan), **LIFETIME PLATINUM** (+speed/+damage, builds no meter).
- Aerials: *Velvet Rope* (nair) · *Card Fan* (sair) · *Upgrade* (uair) · *Check-Out* (dair spike).
- *Counterplay:* the lightest fighter — everything launches him early and he dies sideways; the teleport arrival is a written invitation.

### ABI — "The Gatekeeper" — defensive counter-puncher
96 / 5.6 / 1.0 — long blonde hair, brick-red blazer, cream blouse, **white trousers**; no bag (Tim's note — the tote is gone from the art; the Tote Swing / Baggage Drop names stay as the joke).
- Kept: Reschedule, Double-Booked, **Calendar Block** (ground melee-only parry — extra precious in a blockless game; projectiles pass through), **House Rosé** (air-usable lob, 20% slow), **PUB O'CLOCK** (banner: **"LAST ORDERS!"** — shove + opponent's specials locked 3.5 s + composure regen 2/s for 5 s, cancelled by any hit. *The one exception to "refills only on stock loss"; see core rules.*).
- Aerials: **Wristband Whirl** (nair) · *Tote Swing* (sair) · *Confetti Pop* (uair) · **Baggage Drop** (dair suitcase spike).
- *Counterplay:* pressure through Last Orders — one hit cancels the regen; bait the parry, it does nothing to projectiles or grabs.

### MIKE — "The Site Manager" — armored grappler tank
102 / 4.4 / 1.15 (fastest faller) — fit, stocky and broad-shouldered, no belly (Tim's note; art only); Manchester United scarf, worn with hi-vis.
- Kept: Hard Hat, Wrecking Swing (1-hit armor — armor rules in BALANCE.md), **Scaffold Slam** (grounded unparryable command grab; whiffs vs airborne — jump the wind-up), **Demolition Day** (shockwave that destroys any projectiles it meets), **WRECKING BALL** (high sweep one way, low return drag the other — dodge under the first pass, jump the second), Berlin home-turf buff (+12% damage, +0.3 run).
- Aerials: *Site Sweep* (nair) · *Girder Swing* (sair) · **Header** (uair — top of the league) · **Demolition Drop** (dair, 1-hit armor, slow, brutal spike).
- *Counterplay:* worst recovery in the game by design — no recovery special, heaviest fall. Knock him off and guard the edge.

### SEELYE — "The Pitmaster" — setplay collector, new dad
110 / 5.0 / 1.05 — **a regular businessman in a charcoal suit, white shirt and olive tie** (Tim's note: not a BBQ guy). The BBQ kit — Brisket Bomb, Dad Reflexes, LOW & SLOW — stays for now; the smoke is his hobby, not his outfit.
- Kept: Term Sheet, Leverage (applies **LIEN**: his next special on the marked target +4, "LIEN COLLECTED!"), **Brisket Bomb** (lob + ember zone on the platform it lands on), **Dad Reflexes** (projectile catch → +20 meter), **LOW & SLOW** (drifting smoke blankets half the stage; walk out or cede ground).
- Aerials: *Tongs Out* (nair) · **Fresh One** (sair — a lobbed diaper; on hit: 1 s slow, callout **"STINKED!"**) · *Smoke Ring* (uair) · *Brisket Drop* (dair spike).
- *Counterplay:* dodge the lobs, fight him before the zones stack, and don't let the lien resolve.

## Stages (five player-selectable; Berlin event-only)

All: blast zones on four sides, no walls, ledge grab on every slab lip; soft platforms reachable with jump → air jump. Phase 3b scaled every layout ×1.35 and pushed the blast zones out (+160 px sideways, +90 px down) — Tim's "stage should be larger". All platforms are **static** — any sway is backdrop art, never collision. Each stage has a Higgsfield backdrop (`assets/stages/<id>.png`, drop-in).

1. **THE OFFICE** — the tournament stage. Symmetric tri-plat: desk-island main slab, two low shelf platforms, one high cable-tray platform. Cool morning palette.
2. **PALACE FORECOURT** — the zoner's stage. Widest, flattest main slab; two gate-rail platforms above the edges. Longest survival off the sides.
3. **THE BELLWETHER ARMS** — the scrappy local. Asymmetric: awning + hanging-sign platforms stacked on the pub side, a bench platform on the other. Golden hour, warm diegetic windows — and the chalkboard always reads **"☀ 30°C · THURSDAY · 6PM"**.
4. **THE ROOFTOP** — best view in the building, worst place to fall. Long slab, two low AC-unit platforms and the water tank up top; a tri-plat with the top platform higher than the Office's.
5. **THE PLATFORM** — mind the gap. A long, low tube-station stage: two bench platforms and one hanging roundel sign; play stays close to the floor and the sides are the danger.
6. **BERLIN — EVENT ONLY** — the gate. One wide, high drop-through platform on the Brandenburg silhouette (columns are backdrop, no collision). Arrives only via Mike's BERLIN TRIP and leaves with it.

## Stage hazards (the office events, reworked)

Settings toggle (ON default). The EventDirector survives; pacing re-anchors to stocks: first roll ~10 s in, then spaced rolls, capped per stock-fall, suppressed while a super is active. Doctrine (canonical in BALANCE.md): **always telegraphed ≥ 1 s, never kill-class knockback, never pushing toward a blast zone, symmetric or dodgeable, never match-deciding.**

1. **URGENT UNDERWRITING** — triggers only when both fighters are grounded; freeze + "SUBMIT!" mash. Winner **+20 meter** (no gauge reward); loser gets a brief hazard stagger (never comboable, invulnerable on recovery).
2. **THE WAVE** — chant + arrow, then the wave shoves grounded fighters **toward centre stage** (2 gauge). Jump to ride it.
3. **SPIN CLASS STAMPEDE** — riderless bikes cross the main slab at staggered times; jumpable, platform-avoidable.
4. **FIRE DRILL** — assembly marker on the main slab; runtime-computed window; misses cost 6 gauge, no stun, never near a blast zone.
5. **BERLIN TRIP** (Mike in match, ~once per match) — full mid-match geometry swap to the gate stage: triggers only while both fighters stand on the main slab; the crossfade repositions both onto the gate slab at equivalent footing, then back the same way. Home-turf buff while abroad. *Porting note: the v2 boarding-pass art shows a surname — v3 art must read first-name only (e.g. "MIKE · SEAT 1A").*

## Audio

All WebAudio synthesis — **zero audio files, zero licensing risk** on a public repo.

- **Music (new in v3):** a procedural arcade-fighter loop (driving bass arpeggio, brass-ish stabs) with per-stage variation. **If Seelye is in the match, the entire soundtrack switches to a 90s boom-bap groove** — swung drums, dusty hats, deep bass.
- **SFX:** the 26-entry synth bank carries over; new entries: jump, double-jump, land, dodge whoosh, dash, spike thunk, blast-zone KO, stock-lost sting, respawn chair descent.

## UI & screens

- **HUD:** composure bars in the v2 paper-plate style (green → amber → brick as they drain), **3 desk-chair stock pips** per side, meter bar, special cooldown pips, status word-callouts projected through the camera. No timer.
- **Select:** grid + a **"?" random card** on the opponent pick (CPU or P2). Cards keep photos, archetype, counterplay tip, win tally.
- **Help/menus:** rewritten for v3 verbs — run/dash/double-jump/fast-fall/dodge/recovery, stocks and blast zones. Pause (Esc) overlay unchanged.
- **Results:** winner photo + stocks remaining; rematch flow and localStorage win tally carry over.

## CPU

Three difficulties — **Easy / Normal / Hard** — scaling reaction delay, mistake rate, super willingness, and the new v3 knobs: recovery-mixup quality, edge-guard aggression, resource discipline. **Default Easy for 1P** (Phase 3b: Tim's "the computer is way too difficult to beat"; Easy reacts in 40 frames and fumbles 40 % of its decisions, Normal 22 / 20 %, Hard 12 / 6 %). The sim always runs Normal.

New capability layers (all difficulties, scaled): **navigation** (per-stage platform graph: run/jump/drop-through routes), **recovery** (drift back, double jump at the right height, air dodge last, kit recovery special if available), **edge-guarding** (hold the edge, wait out dodges, or go out for the spike — budgeted against its own resources).

Competence floor (the sim assumes this): never burn the double jump early off-stage, always attempt recovery, never spike with no jumps left, fast-fall out of juggles, jump telegraphed unparryables (they whiff vs airborne), respect parry/catch stances. A kit slot the CPU can't use shows up as a dead spot in the win matrix — that's a finding, not noise.

## Out of scope (this milestone)

Mobile/touch, online play, replays, training mode, 3–4 player, second supers, a rebind UI. **Multiplayer direction (agreed strategy, not yet built):** local 2P is keyboard + up to two gamepads today; online should be deterministic lockstep/rollback over a WebRTC DataChannel — the engine is already a fixed-step 60 Hz simulation driven by per-frame input bitfields, which is exactly what rollback needs — with a tiny signaling service (a Cloudflare Worker or similar) for the handshake, since GitHub Pages cannot host a server.
