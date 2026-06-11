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
- **No block.** One **Dodge** button: spot dodge on the ground (tap a direction for a dodge-step), **air dodge** with a directional impulse in the air — once per airtime, your recovery's third resource after the two jumps. All dodges share one cooldown. Chip damage, blockstun and facing-dependent block are gone.
- **No ledge-grab.** Like Brawlhalla, you recover by flying back over the stage; soft platforms catch you from above.
- **Meter & supers stay:** 0–100, gain = 80% of gauge damage dealt + 50% taken, persists across stocks, resets each match. Damage supers are retuned to launch toward blast zones; utility supers (LIFETIME PLATINUM, PUB O'CLOCK, LOW & SLOW) keep their v2 roles.
- **Statuses** survive with worded callouts and duration bars (slow, haste, burn, reversed, silence, lien, dmgUp, nextHit; caps in BALANCE.md). Burn drains the gauge but can never take a stock.
- **Dropped from v2, deliberately (do not port):** block/chip/blockstun, the knockdown/get-up state machine and its okizeme rules, the 1-hit juggle limit, rounds, the 60 s timer and the timeout rule. Two small fixed-frame *states* (not statuses) replace knockdown: **self-stagger** (non-actionable and fully vulnerable — the punish window, Adrian's tax; the one thing that "misses" it is an unparryable, which whiffs vs non-actionable fighters by its own rule) and the **hazard stagger** (brief, never comboable, with recovery invulnerability — hazard losers only).

## Movement (the heart of the game)

Universal constants live in **`src/data/physics.js`**; per-character movement numbers (run, jump impulses, fall max, weight, gauge) live in that fighter's `src/data/characters/<id>.js` within the bands BALANCE.md sets. The engine reads, never hard-codes. Starting values in BALANCE.md; canonical after the Phase-1 graybox playtest.

- **Run** with acceleration and friction; per-character top speed.
- **Dash:** double-tap a direction *on the ground* (tap window and cooldown in BALANCE.md; air double-taps do nothing) — a speed burst. **Dash-jump** keeps the momentum for a long flat arc.
- **Double jump:** everyone has two jumps; impulses per character.
- **Air drift:** separate air acceleration and max air speed.
- **Fast-fall:** *hold* down while descending (~2.5× fall, cancels on hit). A fast-falling fighter **lands on** soft platforms.
- **Drop-through:** a *fresh down tap* while standing on a soft platform (attack presses take precedence: down+Light on a platform is just a Light). After a drop, soft-platform collision is ignored for a grace window (BALANCE.md).
- **Air dodge:** i-frames + a directional impulse; once per airtime, refreshed on landing or respawn; doubles as recovery.
- Feel floor: 5-frame coyote time, 6-frame input buffer (jump/dodge/attacks), per-aerial landing lag, per-character fall speed (gravity is global).

Fixed-timestep 60 Hz logic is unchanged. Never tie gameplay to rAF rate.

## Controls

Physical key positions (`KeyboardEvent.code`), US labels. All bound keys `preventDefault`ed in play. Menus: confirm F/K/Enter, back Esc; 20-frame input lockout on screen transitions.

| Action | P1 | P2 | Notes |
|--------|----|----|-------|
| Move | A / D | ← / → | double-tap on the ground = dash |
| Jump | W | ↑ | key-down edge in air = double jump; *held* = aims up-air |
| Down | S | ↓ | fast-fall (hold) · drop-through (tap) · aims down-air |
| Light / aerials | F | K | + held direction in air = n/s/u/d-air |
| Heavy | G | L | ground-only kill commit |
| Special 1 / 2 | H / J | ; / ' | per-move `air` flag in data |
| Dodge | V | / | spot · step · air dodge |
| Super | Space | Enter | full meter |

**Jump-key rule (canonical):** double jump triggers on the key-down *edge* while airborne; aerial aim reads the *held* directions on the frame Light is pressed — so up-air is "keep W held (e.g. from your jump), press Light", and a fresh mid-air W tap is always a double jump.

## Art direction

- **Fidelity:** near-HD ink-outline characters (~128 px source height) with flat posterized shading — "Brawlhalla, faintly pixel-flavoured". The 480×270 pixel buffer retires; the world draws at full canvas resolution through the camera. Palette and fonts carry over from v2 (paper `#f2e9d8`, ink `#2b2620`, brick, navy, brass; Pixelify Sans / Silkscreen / Barlow Condensed).
- **Animation rig:** one shared procedural 2D skeleton (torso, head, two-segment arms and legs) drawn as ink-outlined limbs. Keyframed pose cycles shared by the cast: idle breathing, run cycle (legs pump, arms swing), jump tuck, fall splay, fast-fall dive, dash lean, dodge roll, hitstun flail, launch tumble, KO ink-burst, plus per-move swing poses tagged in character data. Characters are proportions + palette + **outfit layers** riding the rig (coat, satchel, scarf, hardhat…) with secondary motion — coat-tails and bag-sway sell the momentum.
- **Heads are drawn**, same style and grid as the body. The real photos live on select cards and win screens only (`assets/headshots/<id>.png`, manifest + drawn fallback, drop-in rule unchanged).
- **Camera:** follows the fighters' midpoint, zooms continuously to frame both with padding, clamps to per-stage bounds, eased follow; screenshake composes on top. Off-screen fighters get an edge arrow until they recover or KO.

## Architecture (ES modules, zero build)

```
index.html                    entry point
assets/headshots/<id>.png     drop-in portraits (select/win screens)
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
src/render/rig.js             skeleton, pose cycles, outfit layers
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

**Port list (carry from v2):** move-kind dispatch, statuses + callouts, hooks, input buffering, FX (hitstop/shake/slow-mo/particles), audio synth bank, EventDirector, screens/router, headshot pipeline, localStorage tallies, sim harness skeleton. **Drop list:** see core rules.

## The roster

*Stats: gauge / run speed / weight (fall class). Per-character numbers in character data; bands in BALANCE.md. Every fighter: ground Light + Heavy (kept from v2), four aerials (Light + direction), two specials (per-move `air` flag), super. Recovery strength is a balance axis — who gets a recovery special is deliberate.*

### BEN — "The Big Boss" — long-range bully
110 / 2.8 / 1.25 (fast-faller) — Paynter trench coat, Chelsea boots. Decides where the fight happens.
- Kept: Pistachio Flick, Wingspan, **Hawk Toss** (air-usable lob), **Off the Lip** (chair-surf lunge — now his air recovery), **TWELFTH MAN** (unparryable roar cone; grounded, whiffs vs airborne — jump the roar).
- Aerials: *Air Clearance* (nair sweep) · *Long Reach* (the game's longest side-air) · *Pistachio Pop* (uair) · **L-Plate Drop** (dair spike — the London licence is in progress).
- *Counterplay:* huge but slow; get inside the wingspan and stay there. His recovery is one straight lunge — wait for it.

### TIM — "The Operator" — tempo all-rounder
100 / 3.1 / 1.0 — brown satchel cross-body over the suit; clean-shaven. Steals turns, not stocks.
- Kept: Quick Sync, Hard Deadline, **Prompt Injection** (air-usable cursed e-mail; reversal ends on his next hit), **Zulu Time** (resets special cooldowns, next hit +2), **AGI MOMENT** (dash-through auto-combo; jump the dash).
- Aerials: *Sync Spin* (satchel 360 nair) · *Satchel Swing* (sair) · **The Drop** (uair bass pulse — EDM canon) · *Deadline Drop* (dair spike).
- *Counterplay:* no recovery special — his jumps are honest; edge-guard him hard and don't get clipped by the e-mail.

### ADRIAN — "The Walking Hazard" — chaos rushdown
86 / 3.4 / 0.95 — fuelled by Nero flat whites.
- Kept: Toothbrush Jab, Pivot Table, **Clumsy Charge** (air-usable lunge recovery — self-staggers on a botched landing), **Nero Spill** (the coffee puddle, now on whichever platform it lands; Adrian immune), **FULL AUDIT** (multi-hit flail; self-staggers at the end even on hit).
- Aerials: *Panic Flail* (nair, both sides) · *Overreach* (sair) · *Up-and-Over* (uair) · **Faceplant** (dair spike; self-stagger on a whiffed landing).
- *Counterplay:* whiff-bait everything; his own kit fights him. (Self-stagger: non-actionable and fully vulnerable — the punish window, defined in core rules.)

### RICHY — "The Market" — dual-candle zoner
96 / 3.0 / 1.0 — meme connoisseur, Excel macro artisan. The candles oppose: **dodge the Bull, jump the Bear.**
- Kept: Bid, Short Squeeze (drags closer — scarier near edges), **Bull Run** (air-usable, angled up — clips jumpers), **Bear Raid** (rolls along the surface it lands on), the candle lock (**both candles share one 45-frame cooldown** — there is always a walk-forward window per cycle), **Diversified Portfolio** (+1 *gauge damage* per Bull/Bear alternation that connects, cap +3), **TO THE MOON** (three columns from the main stage; first connecting column only, retuned to launch).
- Aerials: *Portfolio Spin* (nair) · **Meme Slap** (sair, freshly printed) · *Pump* (uair mini-candle) · *Crash Out* (dair spike).
- *Counterplay:* no recovery special and average air speed — get him off stage and the market closes.

### NICK — "The Concierge" — teleport glass cannon
85 / 3.7 / 0.85 (floaty) — fastest, deadliest, flimsiest.
- Kept: Name Drop, Fund Structure, **Status Match** (now air-usable — *the* recovery teleport; fixed arrival, punishable), **Points Redemption** (card fan), **LIFETIME PLATINUM** (+speed/+damage, builds no meter).
- Aerials: *Velvet Rope* (nair) · *Card Fan* (sair) · *Upgrade* (uair) · *Check-Out* (dair spike).
- *Counterplay:* 85 gauge means everything launches him early; the teleport arrival is a written invitation.

### ABI — "The Gatekeeper" — defensive counter-puncher
90 / 3.3 / 0.9 — festival wristbands and a packed holiday tote.
- Kept: Reschedule, Double-Booked, **Calendar Block** (ground melee-only parry — extra precious in a blockless game; projectiles pass through), **House Rosé** (air-usable lob, 20% slow), **PUB O'CLOCK** (banner: **"LAST ORDERS!"** — shove + opponent's specials locked 3.5 s + composure regen 2/s for 5 s, cancelled by any hit. *The one exception to "refills only on stock loss"; see core rules.*).
- Aerials: **Wristband Whirl** (nair) · *Tote Swing* (sair) · *Confetti Pop* (uair) · **Baggage Drop** (dair suitcase spike).
- *Counterplay:* pressure through Last Orders — one hit cancels the regen; bait the parry, it does nothing to projectiles or grabs.

### MIKE — "The Site Manager" — armored grappler tank
110 / 2.4 / 1.45 (fastest faller) — Manchester United scarf, worn with hi-vis.
- Kept: Hard Hat, Wrecking Swing (1-hit armor — armor rules in BALANCE.md), **Scaffold Slam** (grounded unparryable command grab; whiffs vs airborne — jump the wind-up), **Demolition Day** (shockwave that destroys any projectiles it meets), **WRECKING BALL** (high sweep one way, low return drag the other — dodge under the first pass, jump the second), Berlin home-turf buff (+12% damage, +0.3 run).
- Aerials: *Site Sweep* (nair) · *Girder Swing* (sair) · **Header** (uair — top of the league) · **Demolition Drop** (dair, 1-hit armor, slow, brutal spike).
- *Counterplay:* worst recovery in the game by design — no recovery special, heaviest fall. Knock him off and guard the edge.

### SEELYE — "The Pitmaster" — setplay collector, new dad
110 / 3.0 / 1.15 — running on no sleep and good smoke.
- Kept: Term Sheet, Leverage (applies **LIEN**: his next special on the marked target +4, "LIEN COLLECTED!"), **Brisket Bomb** (lob + ember zone on the platform it lands on), **Dad Reflexes** (projectile catch → +20 meter), **LOW & SLOW** (drifting smoke blankets half the stage; walk out or cede ground).
- Aerials: *Tongs Out* (nair) · **Fresh One** (sair — a lobbed diaper; on hit: 1 s slow, callout **"STINKED!"**) · *Smoke Ring* (uair) · *Brisket Drop* (dair spike).
- *Counterplay:* dodge the lobs, fight him before the zones stack, and don't let the lien resolve.

## Stages (1–3 player-selectable; Berlin event-only)

All: blast zones on four sides, no walls, no ledge-grab; soft platforms reachable with jump → double-jump, high platforms need a dash-jump or a platform hop. Layouts per the approved wireframes; all platforms are **static** — any sway is backdrop art, never collision.

1. **THE OFFICE** — the tournament stage. Symmetric tri-plat: desk-island main slab, two low shelf platforms, one high cable-tray platform. Cool morning palette.
2. **PALACE FORECOURT** — the zoner's stage. Widest, flattest main slab; two gate-rail platforms above the edges. Longest survival off the sides.
3. **THE BELLWETHER ARMS** — the scrappy local. Asymmetric: awning + hanging-sign platforms stacked on the pub side, a bench platform on the other. Golden hour, warm diegetic windows — and the chalkboard always reads **"☀ 30°C · THURSDAY · 6PM"**.
4. **BERLIN — EVENT ONLY** — the gate. One wide, high drop-through platform on the Brandenburg silhouette (columns are backdrop, no collision). Arrives only via Mike's BERLIN TRIP and leaves with it.

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

Three difficulties — **Easy / Normal / Hard** — scaling reaction delay, mistake rate, super willingness, and the new v3 knobs: recovery-mixup quality, edge-guard aggression, resource discipline. Default Normal.

New capability layers (all difficulties, scaled): **navigation** (per-stage platform graph: run/jump/drop-through routes), **recovery** (drift back, double jump at the right height, air dodge last, kit recovery special if available), **edge-guarding** (hold the edge, wait out dodges, or go out for the spike — budgeted against its own resources).

Competence floor (the sim assumes this): never burn the double jump early off-stage, always attempt recovery, never spike with no jumps left, fast-fall out of juggles, jump telegraphed unparryables (they whiff vs airborne), respect parry/catch stances. A kit slot the CPU can't use shows up as a dead spot in the win matrix — that's a finding, not noise.

## Out of scope (this milestone)

Mobile/touch, gamepads, online play, replays, training mode, 3–4 player, second supers.
