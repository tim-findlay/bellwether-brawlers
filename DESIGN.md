# BELLWETHER BATTLERS — Design Document

*v2 redesign of the Desk Warriors prototype. Repo name stays `desk-warriors`; the game is **Bellwether Battlers**.*

## Vision

A polished, fair, genuinely deep 2-button-plus fighting game starring the office, in a **warm, lightly pixelated, Saturday-morning-sprite** style — daylight palettes, paper-and-ink UI, chunky-but-readable pixels. **Not neon.** Every fighter is a real archetype with a signature mechanic; every strong move is telegraphed and has counterplay; random office events spice rounds without deciding them.

## Art direction

- **Rendering:** fixed-timestep 60 Hz logic; world drawn to a 480×270 offscreen buffer scaled 2× to a 960×540 canvas with `imageSmoothingEnabled = false` → light pixelation without 8-bit mush. UI text drawn crisp at full res in pixel fonts.
- **Type:** `Pixelify Sans` (titles, banners), `Silkscreen` (HUD numbers, labels), `Barlow Condensed` (menus, body). Google Fonts with system fallbacks.
- **Palette:** warm paper `#f2e9d8`, ink `#2b2620`, brick `#c4452e`, corporate navy `#27425f`, brass `#c9a227`. Each stage owns its own daylight palette (below). No glows, no scanlines.
- **Fighters:** stylised drawn pixel bodies (suit colours sampled from the real photos) with **photo heads**: circular-cropped, lightly pixelated (rendered small, scaled up), 2px ink outline ring. Full headshot on select cards and win screen. Abi & Seelye fall back to drawn cartoon heads until their photos land in `assets/headshots/`.

## Architecture (ES modules, zero build)

```
index.html                 entry point (canvas + <script type="module" src="src/main.js">)
assets/headshots/<id>.png  drop-in portraits, id-keyed manifest, graceful fallback
src/main.js                boot, fixed-timestep loop, screen router
src/engine/                input (buffered), fighter FSM, combat (hit/hurtboxes, projectiles,
                           zones, statuses, meter), effects (hitstop/shake/slow-mo/particles),
                           audio (WebAudio synth, no files), assets (manifest loader), events, ai
src/render/                pixel-layer renderer, fighter bodies/heads, HUD, banners
src/screens/               title, menu (mode/stage/settings/help), select, fight, results
src/data/                  characters.js, stages.js, events.js  ← all content lives here
src/dev/sim.js             headless balance harness (?sim=N), dev-only
```

**Data-driven rule:** adding a fighter, stage, or event = adding one object to `src/data/*` (plus optional headshot PNG). Engine code never hard-codes content. The only exception is Berlin's Mike-only trigger, expressed as a data predicate (`requiresCharacter: 'mike'`).

## Universal systems

- **Controls** (P1/P2 layout preserved; one new button pair + super button):

| Action   | P1    | P2    |
|----------|-------|-------|
| Move     | A / D | ← / → |
| Jump     | W     | ↑     |
| Block    | S     | ↓     |
| Light    | F     | K     |
| Heavy    | G     | L     |
| Special 1| H     | ;     |
| Special 2| J     | '     |
| Super    | Space | Enter |

  Esc = pause (controls overlay lives there and on the main menu HELP entry). Every control documented in-game and in README.
- **Input buffer:** 6-frame press buffer consumed on first actionable frame — moves come out when you meant them.
- **Meter:** 0–100. Gain: 50% of damage dealt, 30% of damage taken. Super costs 100. Specials use per-move frame cooldowns (pips on HUD).
- **Blocking:** hold block, facing-dependent (attacks from behind connect — this is what makes teleports/cross-ups real). Chip = 15% (min 1). Blockstun 10f.
- **Statuses** (engine-level, any move can apply): stun, slow, haste, burn (DoT), silence (no specials/super), reversed (controls flipped), armor, damage-buff, lien (mark). Icons above head, all durations visible.
- **Juggle limit:** 1 hit on airborne opponents — no infinites.
- **Rounds:** 60s, first to 2 wins, equal-HP timeout = draw → extra round.
- **Polish:** hitstop (light 3f / heavy 6f / special 8f / super 12f), screenshake on heavy+, KO slow-mo (0.25× for 1s), round banners, rematch flow, per-character win tally in localStorage.

## Balance philosophy

See BALANCE.md. Short version: archetype rock-paper-scissors (zoners beat slow tanks, rushdown beats zoners, tanks beat rushdown — softly); every strong option telegraphed ≥ 18f with a stated counter; CPU-vs-CPU sim must keep every fighter's aggregate win rate in the **42–58%** band before ship.

## The roster

*All display names are first names only. Stats format: HP / speed / jump / weight.*

### BEN — "The Big Boss" — long-range bully (space control)
*Very tall, American, the boss, pistachios, surfer, Seahawks.*
110 / 2.9 / 12 / 1.25 — longest normals in the game; wins by deciding where the fight happens.
- **Light — Pistachio Flick:** fastest long poke (range 78), 5 dmg.
- **Heavy — Wingspan:** huge arc, range 96, 12 dmg, slow start (16f) — the wall.
- **Sp1 — Hawk Toss:** flat fast football, 9 dmg. His zoning anchor; jump it.
- **Sp2 — Off the Lip:** surfs forward on a rolling office chair, 8 dmg knock-up launcher; minus on block — committal.
- **Super — TWELFTH MAN:** 30f stadium-roar windup, then an unblockable cone bellow: 18 dmg + wall-carry. Jump the roar or interrupt the windup.
- *Counterplay:* everything is slow up close; rushdown inside his range turns him off.

### TIM — "The Operator" — tempo all-rounder with status tricks
*Sharp suit, AI-obsessed, GMT watch (Zulu time).*
100 / 3.2 / 13 / 1.0 — honest mid-range kit that wins by stealing turns.
- **Light — Quick Sync:** 4 dmg, fast.
- **Heavy — Hard Deadline:** 10 dmg chop, solid knockback.
- **Sp1 — Prompt Injection:** slow glowing orb, 7 dmg + **reverses opponent's left/right controls for 1.5s**. Slow enough to jump or block (blocked = no status).
- **Sp2 — Zulu Time:** watch flash; +40% move speed for 2.5s and +2 dmg on next hit. Telegraphed self-buff — punish the flash if you're close.
- **Super — AGI MOMENT:** screen dims, dash-through auto-combo, 22 dmg. Whiffs entirely if read (it's a dash — jump it).
- *Counterplay:* no armor, no parry — beat him by not getting clipped by the orb.

### ADRIAN — "The Walking Hazard" — chaos rushdown + accidental traps
*Goofy, bumps into things, spills everything, hyper-analytical, beard, toothbrushes.*
92 / 3.5 / 14 / 0.95 — scariest fighter in the game at point blank, and his own worst enemy.
- **Light — Toothbrush Jab:** 4 dmg, very fast.
- **Heavy — Pivot Table:** 9 dmg spin that hits both sides (cross-up insurance).
- **Sp1 — Clumsy Charge:** stumbling lunge, 11 dmg, crosses up on hit. **On whiff he trips and falls down** (1s self-knockdown). Pure risk/reward.
- **Sp2 — Coffee Spill:** flings his coffee; puddle persists 6s; opponent who steps in slips (slide + 4 dmg + short stun). Adrian spilled it, so he knows where it is (immune).
- **Super — FULL AUDIT:** flailing multi-hit analysis rush, 20 dmg — and he trips at the end even when it lands (0.5s vulnerable). Comedy with counterplay built in.
- *Counterplay:* whiff-bait Clumsy Charge; respect the puddle; he's paper if you hit first.

### RICHY — "The Market" — dual-projectile momentum zoner
*Kiwi VP, Rolex, stocks, very funny, sweater-over-shirt.*
96 / 3.1 / 13 / 1.0 — keeps you out with candlesticks; rewarded for diversifying.
- **Light — Bid:** 4 dmg.
- **Heavy — Short Squeeze:** 10 dmg, drags the opponent slightly closer on hit (sets up his preferred range).
- **Sp1 — Bull Run:** fast green candle, 8 dmg, knocks up. Air-level — duck? no: jump OVER or block.
- **Sp2 — Bear Raid:** red candle rolls along the floor, 7 dmg sweep/knockdown. Jump it.
- **Signature — Diversified Portfolio:** alternating Bull→Bear→Bull within 4s adds +1 dmg per alternation (cap +3). One-note spam earns nothing.
- **Super — TO THE MOON:** three telegraphed chart columns erupt under the opponent's zone, 9 dmg each; visible floor markers, stand in the gaps.
- *Counterplay:* both candles have distinct jump/block answers; get in and he's average.

### NICK — "The Concierge" — teleport mixup glass cannon
*Points wizard, knows everyone, hotels, white sneakers.*
85 / 3.9 / 15 / 0.85 — fastest, deadliest, flimsiest.
- **Light — Name Drop:** 4 dmg, 3f startup — fastest button in the game.
- **Heavy — Fund Structure:** 9 dmg.
- **Sp1 — Status Match:** vanishes (10 i-frames), reappears behind the opponent. No damage — it's the mixup engine (back-attacks beat block).
- **Sp2 — Points Redemption:** fan of three cards at spread angles, 3 dmg each — chip and approach cover.
- **Super — LIFETIME PLATINUM:** lounge doors swing open: 5s gold aura, +50% speed, +3 dmg per hit, but builds no meter while active. Run the clock on him.
- *Counterplay:* 85 HP — two good reads end him. Teleport has a fixed arrival spot: heavy it on reaction.

### ABI — "The Gatekeeper" — defensive counter-puncher
*Office manager, schedules everything, short, blonde, wine. No photo yet — drawn head.*
90 / 3.4 / 14 / 0.9 — controls the calendar; you attack when she lets you.
- **Light — Reschedule:** 4 dmg, quick.
- **Heavy — Double-Booked:** 9 dmg, fast for a heavy.
- **Sp1 — Calendar Block:** 20f parry stance ("DECLINED"). Parried melee → auto-counter 12 dmg knockdown; parried projectile → reflected back weaker. Whiff = 25f of recovery (bait it).
- **Sp2 — House Rosé:** lobbed wine glass arc, 7 dmg + 20% slow for 2s.
- **Super — PUB O'CLOCK:** rings the last-orders bell: opponent **silenced** (no specials/super) for 5s and Abi heals 10. Doesn't deal a point of damage — pure tempo.
- *Counterplay:* throws nothing fast full-screen; stay patient, make her whiff the parry.

### MIKE — "The Site Manager" — armored grappler tank
*Construction MD, Mancunian, late 40s, don't get on his bad side, always off to Berlin.*
125 / 2.5 / 11 / 1.45 — slowest, biggest, scariest in grab range.
- **Light — Hard Hat:** 6 dmg.
- **Heavy — Wrecking Swing:** 13 dmg with **1 hit of armor** during the swing — his trademark.
- **Sp1 — Scaffold Slam:** short-range **unblockable command grab**, 14 dmg slam. Jump or stay out.
- **Sp2 — Demolition Day:** stomp → expanding ground shockwave both sides, 10 dmg; long stomp telegraph, jump it.
- **Super — WRECKING BALL:** a ball swings across the stage high then drags back low, 20 dmg; dodge with timed jump/positioning.
- **Home turf:** during the Berlin Trip event, +12% damage, +0.3 speed.
- *Counterplay:* the whole cast outruns him; never let him corner you.

### SEELYE — "The Pitmaster" — slow-burn setplay
*Debt side, new dad, always in on Fridays, low-and-slow BBQ. No photo yet — drawn head.*
104 / 2.8 / 12 / 1.15 — wins minute three of a two-minute fight.
- **Light — Term Sheet:** 5 dmg.
- **Heavy — Leverage:** 11 dmg, applies **LIEN** (mark): Seelye's next special on a marked opponent deals +3 and consumes the mark. The debt always gets collected.
- **Sp1 — Brisket Bomb:** lobbed smoker bomb → ember zone 3s; standing in it burns (DoT, ~1 dmg / 0.5s for 1.5s after leaving).
- **Sp2 — Dad Reflexes:** brief one-handed catch stance: **absorbs any projectile** and converts it to meter. The anti-zoner answer. Useless against melee.
- **Super — LOW & SLOW:** the offset smoker rolls in; drifting smoke blankets the opponent's half for 5s, ticking burn while inside. It drifts slowly — walk out of it, but that cedes ground.
- *Counterplay:* dodge the lobs and he has no fast threat; pressure him before the zones stack.

## Stages (player-selectable; distinct palette + 3-layer parallax)

1. **THE OFFICE** — cool morning light. Far: window-wall with pale city skyline. Mid: glass meeting rooms, plants, whiteboard. Near: desk islands with monitors. Carpet ground. Palette: slate blue `#aebfd1`, glass `#5b7185`, carpet teal-grey `#4a5a58`, post-it accents.
2. **BUCKINGHAM PALACE FORECOURT** — bright stone daylight. Far: palace facade + flag. Mid: black-and-gold gates, one bearskin guard (he blinks; he never reacts). Near: bollards and the railing. Pale stone ground. Palette: stone cream `#d9cba8`, gate black/brass, guard red `#b3402e`, sky `#9db8d9`.
3. **THE BELLWETHER ARMS** (pub exterior) — golden-hour dusk. Far: terraced street silhouette. Mid: brick pub with warm windows, chalkboard, string lights. Near: hanging sign that actually swings, pavement slabs. Palette: brick `#7a4a3a`, window glow `#e8b14f`, sign green `#3f5a40`.
4. **BERLIN — EVENT ONLY** (never in the menu) — blue evening. Brandenburg Gate silhouette, TV tower, distant U-Bahn sign. Palette: night blue `#2a3550`, sandstone `#c8b89a`. Reached only via Mike's BERLIN TRIP event, returns automatically.

## Random events

Settings menu toggle (**ON** by default). Scheduler: first roll 8s into a round, then every 12–18s; max 2 per round; never in the final 5s; never during a super. Every event: **banner + klaxon telegraph ≥ 1s before any effect**, symmetric or dodgeable, never match-deciding.

1. **URGENT UNDERWRITING** — deal-alert klaxon, both freeze, "SUBMIT!" mash prompt (light button). First to fill wins: +8 HP, +15 meter; loser stunned 0.75s. CPU mash starts after a difficulty-scaled human-beatable delay (0.5–0.9s). Max once per round.
2. **THE WAVE** — offsite flashback: direction arrow + rising chant, then a stadium wave sweeps the stage, shoving grounded fighters ~180px (2 dmg). Jump to ride it. Repositioning hazard.
3. **SPIN CLASS STAMPEDE** — "the 7am class got loose": three riderless spin bikes roll across at staggered times (floor level), 5 dmg + comic tumble on contact. Jumpable.
4. **FIRE DRILL** — alarm + assembly-point marker appears at one edge; 3s to stand inside it. Anyone outside at roll call: 6 dmg + 0.5s stun. Forces both fighters into the same corner — chaos by design.
5. **BERLIN TRIP** (only when Mike is in the match; ~once per match, random round moment) — "MIKE'S OFF TO BERLIN!", a giant boarding pass swooshes across, stage crossfades to Berlin for 12s, Mike gets his home-turf buff, "WILLKOMMEN" stinger, swoosh back. Pure spectacle plus a readable, modest buff.

## CPU

Archetype-aware AI profiles (zoner keeps spacing, grappler corners, counter-puncher fishes for parries) driven from character data (`ai` hints per kit). Difficulty setting (Easy/Normal/Hard) scales reaction delay, mistake rate, and event mash speed. Default Normal.

## Out of scope (this milestone)

Mobile/touch controls, online play, replays, second supers, training mode.
