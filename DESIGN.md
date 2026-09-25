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
- **Statuses** survive with worded callouts and duration bars (slow, haste, burn, silence, lien, dmgUp, nextHit, borrowed; caps in BALANCE.md — `reversed` stays in the engine but no roster move applies it since the kit rethink). Burn drains the gauge but can never take a stock.
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
- **Proportions (Phase 3c, Tim's note "big heads, smaller bodies"):** all eight fighters are chibi, Brawlhalla-style — an oversized head about a third to two-fifths of the height, compact body, short limbs. Sheets were regenerated from one big-head base image per fighter (`image_references`), prompts in `docs/HANDOFF-prompts.md`. The drawn fallback in `src/render/body.js` uses the same proportions (18-unit legs and torso, 26-unit head). Mike is **fit and stocky, broad-shouldered, no belly** (`body.build: 'broad'`); his `weight` 1.12 is a balance stat, not his look. He reads early forties — brown hair under the hard hat, no grey. **Heights:** every sheet is normalised to fill its cell, so relative height is set per fighter by `scale` in `src/data/sprites.js` (render only, never hitboxes) and mirrored by `body.height` for the fallback: Abi 0.93 (just shorter than Tim), Mike 0.96. Seelye wears a forest-green quarter-zip over a white button-down, no tie.
- **Drop-in rule:** a missing sheet (or a missing `SPRITES` entry) falls back to the drawn body in `src/render/body.js` (shared skeleton + outfit palette from character data), exactly as a missing headshot falls back to the cartoon head. Adding `assets/sprites/<newId>/…` must Just Work.
- **Backdrops (Higgsfield, Phase 3b):** every stage has a drop-in `assets/stages/<id>.png` — a 480×270 pixel painting (`gpt_image_2_5` 16:9, same style formula as the sprites, quantized to 32 colours, PNG-8) drawn ×4 behind the slab with a 0.25–0.3 parallax; a missing file falls back to the procedural v2 layers. Tim's note "the background needs to better fit the design of the players" is the brief: same ink outlines, same paper light, props at sprite scale.
- **Move presentation (kit-rethink pass, render only — `src/render/moves.js`):** every fighter has seven strips: idle, run, jump, attack (lights and aerials), **heavy** (their own signature swing: Ben's backhand sweep, Tim's satchel, Adrian's flailing shove, Richy's hammer-fist, Nick's roundhouse, Abi's palm strike, Mike's shoulder barge, Seelye's uppercut), **special** (the cast: Ben's memo throw, Tim's phone, Adrian's coffee fling, Richy's chart line, Nick's card fan, Abi's stop palm, Mike's grab-and-slam, Seelye's binder toss) and **hurt**. Strips are phase-synced: wind-up frames over the startup, the key frame (full extension / release, `key` in `sprites.js`) held through the active frames, follow-through over the recovery. On top: pixel smears shaped like the hitbox (forward arc, low sweep, overhead, spin ring, rising streak, dive lines, shout waves) in the fighter's trim colour; wind-up tells on heavies/supers (brass ring for supers, a brick "!" for unparryables); afterimages on dashes, lunges and teleports; comic ink-and-paper impact stars; launch trails that lengthen with the launch; projectile trails and tumble; a slanted super cut-in in the player's colour.
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

**Status (2026-09-25):** Phases 1–5 landed on `claude/practical-dirac-j8nqlb` in the Phase-3 revamp (plan: `docs/superpowers/plans/2026-09-25-phase3-revamp.md`): momentum core retuned for pace, v3 combat (composure, launches, aerials, stocks, chair), Higgsfield sprite sheets for all eight, camera + world-scale stages, platform-aware CPU, events ported, and balance pass 1 with all five sim gates passing (BALANCE.md). **Phase 3b (2026-09-25, Tim's two playtest notes):** feel pass 2 (three jumps, air dash, ledge grab, softer low-gauge launches, shorter hitstun, 35 % wider stages), the Brawlhalla-style directional kit, six Higgsfield backdrops, two new stages (Rooftop, Platform), gamepad input, gentler CPU (1P defaults to Easy), Abi and Seelye redrawn, and balance pass 2 with all five gates passing on two seeds (BALANCE.md). Open: a human pass on the new kit, a rebind UI, online play (see Out of scope). **Kit rethink (2026-09-25):** one verb per fighter (roster below), signed off by Tim; five approved engine items (I Know Your Guy, Happy Accident, Declined silence, aimable Scaffold Slam, air parry) plus two data moves (strike columns and the parry riposte are now move data) and one defect fix (the parry riposte whiffed against airborne attackers); balance pass 3 passes all five gates on both seeds (BALANCE.md).

**Port list (carry from v2):** move-kind dispatch, statuses + callouts, hooks, input buffering, FX (hitstop/shake/slow-mo/particles), audio synth bank, EventDirector, screens/router, headshot pipeline, localStorage tallies, sim harness skeleton. **Drop list:** see core rules.

## The roster

*Stats: gauge / run speed / weight (fall class). Per-character numbers in character data; bands in BALANCE.md. Every fighter: ground Light + Heavy (kept from v2), four aerials (Light + direction), two specials (per-move `air` flag), super. Recovery strength is a balance axis — who gets a recovery special is deliberate.*

*Kit rethink (2026-09-25, Tim's note "a bit stale / dated"; proposal and sign-off: `docs/PROPOSAL-kits.md`): every kit now turns on **one verb nobody else has** — Ben controls space, Tim steals tempo, Adrian gambles, Richy alternates, Nick steals kit, Abi denies, Mike absorbs and throws, Seelye marks and collects. The derived recoveries and ground pounds carry per-fighter identity through `kit` overrides.*

### BEN — "The Big Boss" — long-range bully
110 / 4.8 / 1.06 (fast-faller) — Paynter trench coat, Chelsea boots. Decides where the fight happens.
- **My Office. Now.** (s1, air-usable): a slow straight memo that **drags the target toward Ben** (angle 150°, replaces the Hawk Toss lob). **Off the Lip** (chair-surf lunge — his air recovery special), **TWELFTH MAN** (unparryable roar cone; grounded, whiffs vs airborne — jump the roar), Pistachio Flick, Wingspan.
- Signatures: **Corner Office** (side — the longest ground reach in the game, 100 px, and the slowest, 18f) · *Bottom Line* (down). Recovery **Chair Surf**: a long, flat, readable diagonal (110 px travel, low lift).
- Aerials: *Air Clearance* (nair sweep) · *Long Reach* (the game's longest side-air) · *Pistachio Pop* (uair) · **L-Plate Drop** (dair spike — the London licence is in progress).
- *Counterplay:* huge but slow; get inside the wingspan and stay there. Jump the memo or it drags you in. Both his recoveries are long straight lines — wait for them.

### TIM — "The Operator" — tempo all-rounder
104 / 5.7 / 1.0 — brown satchel cross-body over the suit; clean-shaven. Steals turns, not stocks.
- **Scheduled Send** (s1, air-usable): marks the floor under the target and strikes 34 frames later (replaces Prompt Injection — no roster move reverses controls any more). **Zulu Time** (rewinds Scheduled Send, next hit +2; 8 s cooldown), **RUN FLOW** (the dash-through auto-combo, renamed from AGI Moment; jump the dash), Quick Sync, Hard Deadline.
- Recovery **Escalation** hits hard (8 dmg, kbScale 10) — he has no recovery special.
- Aerials: *Sync Spin* (satchel 360 nair) · *Satchel Swing* (sair) · **The Drop** (uair bass pulse — EDM canon) · *Deadline Drop* (dair spike).
- *Counterplay:* no recovery special — his jumps are honest; edge-guard him hard. Step off the marker: Scheduled Send only punishes standing still.

### ADRIAN — "The Walking Hazard" — chaos rushdown
94 / 5.8 / 0.97 — fuelled by Nero flat whites.
- **Happy Accident:** when a whiffed move trips him (Clumsy Charge, Faceplant, Overshoot, Facedown), the fall itself hits whoever is at arm's reach (6 dmg, pop-up). The 30f self-stagger still runs in full.
- Kept: Toothbrush Jab, Pivot Table, **Clumsy Charge** (air-usable lunge recovery — self-staggers on a botched landing), **Nero Spill** (the coffee puddle, on whichever platform it lands; Adrian immune), **FULL AUDIT** (multi-hit flail; self-staggers at the end even on hit — that planned trip never triggers Happy Accident).
- Recovery **Overshoot**: the furthest sideways and the lowest (140 px travel), and lands in a heap if it whiffs. Ground pound **Facedown** whiff-staggers like Faceplant.
- Aerials: *Panic Flail* (nair, both sides) · *Overreach* (sair) · *Up-and-Over* (uair) · **Faceplant** (dair spike; self-stagger on a whiffed landing).
- *Counterplay:* whiff-bait everything, but stand just outside arm's reach of the fall, then punish the stagger. His own kit still fights him.

### RICHY — "The Market" — dual-candle zoner
104 / 5.4 / 1.05 — meme connoisseur, Excel macro artisan. The candles oppose: **dodge the Bull, jump the Bear.**
- Kept (the best-designed system in the roster, unchanged): Bid, Short Squeeze (drags closer), **Bull Run** (air-usable, angled up), **Bear Raid** (rolls along its surface), the candle lock (**both candles share one 40-frame lock** — there is always a walk-forward window), **Diversified Portfolio** (+1 gauge damage per landed Bull/Bear alternation, cap +3), **RATE HIKES** (renamed from To The Moon: three rising columns from the main stage; first connecting column only).
- Aerials: *Portfolio Spin* (nair) · **Macro Slap** (sair — he is the Excel macro artisan) · *Uptick* (uair mini-candle) · *Crash Out* (dair spike). The 2021 crypto names are retired.
- *Counterplay:* no recovery special and average air speed — get him off stage and the market closes.

### NICK — "The Concierge" — teleport glass cannon
100 / 6.2 / 0.97 (floaty) — fastest, still the lightest. Knows a guy. Knows *your* guy.
- **I KNOW YOUR GUY** (super, replaces Lifetime Platinum): for 10 s his s2 becomes a copy of **the opponent's s1** — +2 startup, its own cooldown capped at 150f, supers never copied. Using it is a commitment, so meter still builds. HUD tag **ON LOAN**.
- Kept: Name Drop, Fund Structure, **Status Match** (air-usable — *the* recovery teleport; fixed arrival, punishable), **Points Redemption** (card fan).
- Recovery **Priority Boarding**: floaty and high, with 8 i-frames.
- Aerials: *Velvet Rope* (nair) · *Card Fan* (sair) · *Upgrade* (uair) · *Check-Out* (dair spike).
- *Counterplay:* the lightest fighter — everything launches him early and he dies sideways; the teleport arrival is a written invitation. When he borrows your special, you already know its counter.

### ABI — "The Gatekeeper" — defensive counter-puncher
100 / 5.6 / 1.0 — long blonde hair, brick-red blazer, cream blouse, **white trousers**; no bag (Tim's note — the tote is gone from the art; the Tote Swing / Baggage Drop names stay as the joke). Renders just shorter than Tim.
- **Calendar Block** (s1): melee-only parry, **now air-usable**. A parry answers with **Declined** (12 dmg, riposte data on the move) and **locks the attacker's specials for 1.5 s**. Projectiles and grabs pass through.
- Kept: Reschedule, Double-Booked, **House Rosé** (air-usable lob, 20 % slow — now the roster's only slowing lob), **PUB O'CLOCK** (banner **"LAST ORDERS!"** — shove + opponent's specials locked 3.5 s + composure regen 2/s for 5 s, cancelled by any hit. *The one exception to "refills only on stock loss"; see core rules.*).
- Recovery **RSVP** slows on hit.
- Aerials: **Wristband Whirl** (nair) · *Tote Swing* (sair) · *Confetti Pop* (uair) · **Baggage Drop** (dair suitcase spike).
- *Counterplay:* pressure through Last Orders — one hit cancels the regen; bait the parry with a grab or a projectile, it does nothing to either.

### MIKE — "The Site Manager" — armored grappler tank
102 / 4.4 / 1.12 (fastest faller) — early forties, brown hair under the hard hat; fit, stocky and broad-shouldered, no belly (Tim's notes; art only); Manchester United scarf, worn with hi-vis.
- **Scaffold Slam** (grounded unparryable command grab; whiffs vs airborne — jump the wind-up) is now **aimable**: hold back at the release to throw over the shoulder toward the other edge.
- Kept: Hard Hat, Wrecking Swing (1-hit armor — armor rules in BALANCE.md), **Demolition Day** (shockwave that destroys any projectiles it meets), **WRECKING BALL** (high sweep one way, low return drag the other — dodge under the first pass, jump the second), Berlin home-turf buff (+12% damage, +0.3 run).
- Recovery **Scaffold Rise**: the worst climb in the game (low lift) but armored — it can't be swatted, only ledge-guarded. Ground pound **Site Drop** is armored like Demolition Drop.
- Aerials: *Site Sweep* (nair) · *Girder Swing* (sair) · **Header** (uair — top of the league) · **Demolition Drop** (dair, 1-hit armor, slow, brutal spike).
- *Counterplay:* worst recovery in the game by design — no recovery special, heaviest fall. Knock him off and guard the ledge rather than swatting the climb.

### SEELYE — "The Lender" — setplay collector, debt side, new dad
106 / 5.0 / 1.05 — **a regular businessman in a forest-green Peter Millar-style quarter-zip over a white button-down, charcoal trousers, no tie** (Tim's notes: not a BBQ guy; green pullover). The BBQ kit is retired for debt finance and fatherhood.
- **LIEN** is the verb: Leverage (heavy) and **Term Sheet Rise** (recovery) mark the target for 8 s. His next special collects +4 ("LIEN COLLECTED!"); his super collects +8.
- **Drawdown** (s1, air-usable lob — a loan binder; leaves a burning paperwork zone on the platform it lands on), **Dad Reflexes** (projectile catch → +20 meter), **ENFORCEMENT** (super, replaces Low & Slow: a parryable grounded cone, 12 dmg, 24f startup; **+8 on a liened target — "LIEN ENFORCED!"**, 20 total).
- Aerials: *Burp Cloth* (nair) · **Fresh One** (sair — a lobbed diaper; on hit: 1 s slow, callout **"STINKED!"**) · *Night Feed* (uair) · *Hard Maturity* (dair spike).
- *Counterplay:* dodge the Drawdown, don't stand in the paperwork, and never eat Enforcement with a LIEN on you — jump it, or parry it.

## Stages (five player-selectable; Berlin event-only)

All: blast zones on four sides, no walls, ledge grab on every slab lip; soft platforms reachable with jump → air jump. Phase 3b scaled every layout ×1.35 and pushed the blast zones out (+160 px sideways, +90 px down) — Tim's "stage should be larger". All platforms are **static** — any sway is backdrop art, never collision. Each stage has a Higgsfield backdrop (`assets/stages/<id>.png`, drop-in).

1. **THE OFFICE** — the tournament stage. Symmetric tri-plat: desk-island main slab, two low shelf platforms, one high cable-tray platform. Cool morning palette.
2. **PALACE FORECOURT** — the zoner's stage. Widest, flattest main slab; two gate-rail platforms above the edges. Longest survival off the sides.
3. **THE BELLWETHER ARMS** — the scrappy local. Asymmetric: awning + hanging-sign platforms stacked on the pub side, a bench platform on the other. Golden hour, warm diegetic windows — and the chalkboard always reads **"☀ 30°C · THURSDAY · 6PM"**.
4. **THE ROOFTOP** — best view in the building, worst place to fall. Long slab, two low AC-unit platforms and the water tank up top; a tri-plat with the top platform higher than the Office's.
5. **THE PLATFORM** — mind the gap. A long, low tube-station stage: two bench platforms and one hanging roundel sign; play stays close to the floor and the sides are the danger.
6. **BERLIN — EVENT ONLY** — the gate. One wide, high drop-through platform on the Brandenburg silhouette (columns are backdrop, no collision). Arrives only via Mike's BERLIN TRIP and leaves with it.

## Stage hazards (the office events, reworked)

Settings toggle (ON default). The EventDirector survives (plus an optional per-event stage filter); pacing re-anchors to stocks: first roll ~10 s in, then spaced rolls, capped per stock-fall, suppressed while a super is active. Doctrine (canonical in BALANCE.md): **always telegraphed ≥ 1 s, never kill-class knockback, never pushing toward a blast zone, symmetric or dodgeable, never match-deciding.**

*Rethought 2026-09-25 (Tim: "the intermediary events … are still stale from the prior build"): every event gives the fight a **place** or a **reason to move** — contested pickups, a room to hold, new routes, ground to cede — and the fight never stops for it (no freezes, no mashing). Events can be stage-bound (`stages` in `src/data/events.js`). Props are Higgsfield drop-ins (`assets/ui/ev-*.png`) with drawn fallbacks.*

1. **DEAL DEADLINE** — five signature pages flutter down (landing shadows first) onto mirror-symmetric spots: the centre high ground and four on the slab. Touch one to sign it (**+6 meter**); first to three **closes the deal (+15)**. Pages lapse after ~8.5 s. *Counterplay:* it is a race you fight through — trade a hit for a page, or punish the fighter who commits to a pickup.
2. **INVESTMENT COMMITTEE** — an IC room lights up on the centre high ground; where a stage has none (Palace) it starts on one mirrored side platform and moves to the other halfway. Standing in it **alone** banks votes; both inside = CONTESTED, nobody scores. After 5.5 s the majority is **APPROVED (+22 meter)**; a tie or too few votes is DEFERRED. King of the hill on the high ground, where launches kill.
3. **SITE VISIT** — a crane lowers two mirrored scaffold decks over the stage (inside the lips, so they are routes, not free recovery ledges); soft platforms, solid only once landed, for 9 s, blinking before they lift out. Geometry is restored exactly.
4. **SPRINKLER TEST** (office, pub) — sprinklers soak one half of the floor (random side first, then the other half: symmetric by turns). Grounded fighters on the wet half are **slowed** (a short refreshed status). Ground to cede — or to fight for.
5. **BERLIN TRIP** (Mike in match, ~once per match) — full mid-match geometry swap to the gate stage: triggers only while both fighters stand on the main slab; the crossfade repositions both onto the gate slab at equivalent footing, then back the same way. Home-turf buff while abroad. *Porting note: the v2 boarding-pass art shows a surname — v3 art must read first-name only (e.g. "MIKE · SEAT 1A").*
6. **CROSSWIND** (rooftop) / **TRAIN APPROACHING** (tube) — for 5 s, actionable airborne fighters drift **toward centre** (1.4 px/f); launches (stun > 0) and grounded fighters are untouched. Recovering gets easier, jump-ins from the lip get harder. The tube version blurs a train past behind the platform.

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
