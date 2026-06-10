# BELLWETHER BATTLERS — Design Document

*v2 redesign of the Desk Warriors prototype. Repo name stays `desk-warriors`; the game is **Bellwether Battlers**. Revised after adversarial design review (balance, fun, feasibility panels).*

## Vision

A polished, fair, genuinely deep fighting game starring the office, in a **warm, lightly pixelated, Saturday-morning-sprite** style — daylight palettes, paper-and-ink UI, chunky-but-readable pixels. **Not neon.** Every fighter is a real archetype with a signature mechanic; every strong move is telegraphed and has counterplay; random office events spice rounds without deciding them.

## Art direction

- **Rendering:** fixed-timestep 60 Hz logic; world drawn to a 480×270 offscreen buffer scaled 2× to a 960×540 canvas with `imageSmoothingEnabled = false` → light pixelation without 8-bit mush. UI text drawn crisp at full res in pixel fonts.
- **Type:** `Pixelify Sans` (titles, banners), `Silkscreen` (HUD numbers, labels), `Barlow Condensed` (menus, body).
- **Palette:** warm paper `#f2e9d8`, ink `#2b2620`, brick `#c4452e`, corporate navy `#27425f`, brass `#c9a227`. Each stage owns its own daylight palette. **Warm diegetic light sources are fine; additive bloom / outer glow never.** Effect colours come from the stage/character palettes, not saturated primaries.
- **Fighters:** stylised drawn pixel bodies (suit colours sampled from the real photos) with **photo heads**: circular-cropped, lightly pixelated, 2px ink outline ring. Full headshot on select cards and win screen. Abi & Seelye fall back to drawn cartoon heads until their photos land in `assets/headshots/`.

## Architecture (ES modules, zero build)

```
index.html                 entry point (canvas + <script type="module" src="src/main.js">)
assets/headshots/<id>.png  drop-in portraits, id-keyed manifest, graceful fallback
src/main.js                boot, fixed-timestep loop, screen router (with transition input lockout)
src/engine/                input (KeyboardEvent.code, buffered), fighter FSM, combat,
                           effects, audio (WebAudio synth), assets, events, ai
src/render/                draw.js (world compositor + fighter bodies), hud.js
src/screens/               title, menu (mode/settings/help), select, fight, results
src/data/                  characters.js, stages.js, events.js  ← all content lives here
src/dev/sim.js             headless balance harness (?sim=N), dynamically imported, dev-only
```

**Data-driven rule:** adding a fighter, stage, or event = adding one object to `src/data/*` (plus optional headshot PNG). Stages compose a small primitive vocabulary (bands, props, oscillators) rather than bespoke engine code. The only conditional content is Berlin's Mike-only trigger, expressed as data (`requiresCharacter: 'mike'`).

## Universal systems

- **Controls** — bindings use **physical key positions** (`KeyboardEvent.code`), shown here as US labels; all bound keys are `preventDefault`ed during play:

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

  **Menus:** confirm = F (P1), K (P2), or Enter; back = Esc. Every screen transition clears pressed-key state and ignores input for 20 frames — a buffered super press can never skip a results screen or trigger an accidental rematch. Esc = pause (controls overlay); HELP on the main menu.
- **Input buffer:** 6-frame press buffer consumed on the first actionable frame.
- **Meter:** 0–100, **persists across rounds, resets each match**. Gain: 80% of damage dealt, 50% of damage taken. A winning round (~100 dealt / ~60 taken) ≈ one full bar → expect supers about once a round from round 2. Super costs 100.
- **Blocking:** hold block, facing-dependent (attacks from behind connect). **Chip is 15% of a move's total damage per move *instance* (min 1)** — multi-hit moves chip once, so chip-and-run stall doesn't scale with hit count.
- **Wake-up rules:** knockdown (40f) and get-up (12f) are fully invulnerable; **command grabs and unblockables whiff against non-actionable opponents** — okizeme unblockable setups don't exist. Timed zone supers still respect get-up invulnerability.
- **Statuses** (engine-level): stun, slow, haste, burn (DoT), silence, reversed, damage-buff, lien. **Every status announces itself in words above the victim's head** ("SILENCED!", "REVERSED! (block still works)", "LIEN!") with a duration bar — no icon-only vocabulary.
- **Juggle limit:** 1 hit on airborne opponents.
- **Rounds:** 60s, first to 2 wins. Timeout winner = **higher percentage of max HP**; equal % = draw → extra round.
- **Polish:** hitstop (light 3f / heavy 6f / special 8f / super 12f), screenshake on heavy+, KO slow-mo, paper-slab banners, rematch flow, per-character win tally in localStorage. Select cards carry each fighter's one-line **counterplay tip** so party players learn the answers where they pick.

## Balance philosophy

See BALANCE.md (canonical for numbers and the telegraph rule). Soft archetype wheel — zoning pressures tanks, rushdown beats zoning, tanks punish rushdown — as difficulty, not destiny. CPU-vs-CPU sim gate: every fighter 42–58% aggregate, **plus a stall-bot sanity check** (a runaway profile must not beat the cast average by more than chance).

## The roster

*Display names are first names only. Stats: HP / speed (world-px per frame) / jump impulse / weight.*

### BEN — "The Big Boss" — long-range bully (space control)
110 / 1.39 / 5.3 / 1.25 — longest normals in the game; wins by deciding where the fight happens. **His fullscreen answer is Wingspan range, not fireballs.**
- **Light — Pistachio Flick:** fastest long poke (range 78), 5 dmg.
- **Heavy — Wingspan:** huge arc, range 96, 12 dmg, 16f start — the wall.
- **Sp1 — Hawk Toss:** **lobbed** football on a long cooldown — a conditioning tool that punishes predictable jumps and walks, loses to patient ground play. 9 dmg.
- **Sp2 — Off the Lip:** office-chair surf lunge, 8 dmg launcher; minus on block.
- **Super — TWELFTH MAN:** 30f stadium-roar windup → unblockable cone bellow, 18 dmg + wall-carry. Whiffs entirely against airborne or knocked-down opponents — jump the roar.
- *Counterplay:* slow up close; rushdown inside his range turns him off.

### TIM — "The Operator" — tempo all-rounder with status tricks
100 / 1.54 / 5.6 / 1.0 — honest mid-range kit that **steals turns**, never a steroid.
- **Light — Quick Sync:** 4 dmg, fast. **Heavy — Hard Deadline:** 10 dmg chop.
- **Sp1 — Prompt Injection:** a slow **ink-outlined cursed e-mail** (dithered pixel shimmer, no glow), 7 dmg + **reverses movement for 1.2s** — and the reversal **ends early the moment Tim lands another hit** (one stolen turn, never a sequence). Victim sees flipped arrows + "REVERSED! (block still works)". Blocked = no status.
- **Sp2 — Zulu Time:** he winds the watch back: **both special cooldowns reset instantly** and his next hit gains +2. Tempo theft, not speed.
- **Super — AGI MOMENT:** screen dims, dash-through auto-combo, 22 dmg; jump the dash.
- *Counterplay:* no armor, no parry — don't get clipped by the e-mail and he's merely honest.

### ADRIAN — "The Walking Hazard" — chaos rushdown + accidental traps
86 / 1.68 / 5.9 / 0.95
- **Light — Toothbrush Jab:** 4 dmg, very fast. **Heavy — Pivot Table:** 9 dmg, hits both sides.
- **Sp1 — Clumsy Charge:** stumbling lunge, 11 dmg, crosses up on hit; **on whiff he trips** (1s self-knockdown).
- **Sp2 — Coffee Spill:** puddle persists ~4s; opponent who steps in slips (4 dmg + short slide-stun). Adrian is immune — he knows where he spilled it.
- **Super — FULL AUDIT:** flailing multi-hit rush, 20 dmg — **he trips at the end even on hit** (0.5s vulnerable).
- *Counterplay:* whiff-bait the charge; respect the puddle; hit him first.

### RICHY — "The Market" — dual-projectile momentum zoner
96 / 1.49 / 5.6 / 1.0 — the candles oppose: **BLOCK the bull, JUMP the bear.**
- **Light — Bid:** 5 dmg. **Heavy — Short Squeeze:** 10 dmg, drags the opponent closer.
- **Sp1 — Bull Run:** tall green candle (sign-green `#3f5a40`, palette not neon) **angled upward — it clips jumpers**. 9 dmg knock-up. Block it.
- **Sp2 — Bear Raid:** low red candle (brick `#c4452e`) rolling along the floor, 8 dmg knockdown. Jump it.
- **Shared lock:** throwing either candle locks **both** for 45f — there is always a walk-forward window per cycle.
- **Signature — Diversified Portfolio:** alternations grant +1 dmg (cap +3) **only when the previous candle hit or was blocked** — pot-shots at air earn nothing. "DIVERSIFIED +N!" tag on payoff.
- **Super — TO THE MOON:** three telegraphed chart columns erupt across the opponent's zone; **only the first column that connects deals damage** (9) — the rest whiff past. Floor markers, stand in the gaps.
- *Counterplay:* each candle has a distinct answer; inside mid-range he's average.

### NICK — "The Concierge" — teleport mixup glass cannon
85 / 1.87 / 6.2 / 0.85 — fastest, deadliest, flimsiest.
- **Light — Name Drop:** 5 dmg, 3f startup. **Heavy — Fund Structure:** 10 dmg.
- **Sp1 — Status Match:** 12f visible wind-up shimmer, then reappears behind the opponent (fixed arrival spot — heavy it on reaction). No damage; the mixup engine.
- **Sp2 — Points Redemption:** fan of three cards, 3 dmg each; chips once (per-move chip rule) — not a stall engine.
- **Super — LIFETIME PLATINUM:** 4s lounge access: **2px brass card-frame outline + confetti ticks** (no aura/glow), +40% speed, +3 dmg per hit, builds no meter while active.
- *Counterplay:* 85 HP — two reads end him; the teleport arrival is fixed and punishable.

### ABI — "The Gatekeeper" — defensive counter-puncher
90 / 1.63 / 5.9 / 0.9 — controls the calendar, **not** the projectile lanes.
- **Light — Reschedule:** 4 dmg. **Heavy — Double-Booked:** 9 dmg, fast.
- **Sp1 — Calendar Block:** 20f **melee-only** parry stance ("DECLINED!"): parried melee → 12 dmg counter knockdown. Projectiles pass right through it — she schedules meetings, she doesn't field fireballs. Whiff = 25f recovery.
- **Sp2 — House Rosé:** lobbed wine glass, 7 dmg + 20% slow 2s.
- **Super — PUB O'CLOCK:** "LAST ORDERS!" — an immediate 0-dmg shove, opponent's specials/super **locked for 3.5s** (padlock over their pips, "SPECIALS LOCKED" banner; their cooldowns keep ticking underneath), and Abi **regens 2 HP/s for 5s — cancelled the instant she takes any damage, chip included**.
- *Counterplay (written, as required):* pressure her through last orders — one hit cancels the heal; the silence delays your specials, it doesn't delete them. She has no fast fullscreen threat; make her whiff the parry.

### MIKE — "The Site Manager" — armored grappler tank
110 / 1.2 / 5.1 / 1.45
- **Light — Hard Hat:** 6 dmg. **Heavy — Wrecking Swing:** 14f start, 10 dmg, **1 hit of armor** during the swing.
- **Sp1 — Scaffold Slam:** 16f wind-up with a big "UNBLOCKABLE!" flash → short-range command grab, 14 dmg slam. **Whiffs against airborne or non-actionable opponents.**
- **Sp2 — Demolition Day:** stomp → expanding shockwave both sides, 10 dmg — **and it clanks (destroys) any projectiles inside the radius**: his answer to the candle wall.
- **Super — WRECKING BALL:** high sweep one way, low drag back the other; stay grounded for pass one, jump pass two. 20 dmg, once.
- **Home turf:** Berlin Trip gives +12% damage, +0.3 speed.
- *Counterplay:* outrun him; never get cornered; jump the grab wind-up.

### SEELYE — "The Pitmaster" — setplay that collects inside the round
110 / 1.5 / 5.3 / 1.15 — the debt is collected **this** round, not next match.
- **Light — Term Sheet:** 6 dmg. **Heavy — Leverage:** 13 dmg, applies **LIEN** (big tag over the head).
- **LIEN:** Seelye's next special on a marked opponent deals **+4** and shows "LIEN COLLECTED!" — heavy → special is his core loop and it resolves in seconds.
- **Sp1 — Brisket Bomb:** lobbed bomb: **9 dmg on direct hit**, then a 3s ember zone with burn ticks — herding tool with immediate teeth.
- **Sp2 — Dad Reflexes:** brief one-handed catch stance: **absorbs any projectile** for meter (+20). The cast's only projectile catch — uniquely his.
- **Super — LOW & SLOW:** the offset smoker blankets the opponent's half in drifting smoke for 5s, ticking burn inside; it drifts slowly — walking out is always possible but cedes ground.
- *Counterplay:* dodge the lobs and pressure him before zones stack; his fast threat is short-ranged.

## Stages (player-selectable; distinct palette + 3-layer parallax)

Composed from data primitives (sky band, silhouette band, prop list, oscillating props), not bespoke code.

1. **THE OFFICE** — cool morning light. Window-wall skyline / glass meeting rooms + plants / desk islands with monitors. Palette: slate blue `#aebfd1`, glass `#5b7185`, carpet `#4a5a58`, post-it accents.
2. **BUCKINGHAM PALACE FORECOURT** — bright stone daylight. Facade + flag / black-and-gold gates with one blinking, unbothered guard / bollards. Palette: stone `#d9cba8`, brass, guard red `#b3402e`, sky `#9db8d9`.
3. **THE BELLWETHER ARMS** — golden-hour pub exterior. Terraced silhouettes / brick pub, warm (diegetic, not bloomed) windows, chalkboard / swinging hanging sign, pavement. Palette: brick `#7a4a3a`, window amber `#e8b14f`, sign green `#3f5a40`.
4. **BERLIN — EVENT ONLY** — blue evening, Brandenburg Gate + TV tower silhouettes. Palette: night blue `#2a3550`, sandstone `#c8b89a`. Only via Mike's BERLIN TRIP; returns automatically.

## Random events

Settings toggle (**ON** default). First roll 8s into a round, then every 12–18s; max 2 per round; never in the final 5s; never during a super; klaxon + banner telegraph ≥ 1s. Symmetric or dodgeable; never match-deciding.

1. **URGENT UNDERWRITING** — deal alert, both freeze, "SUBMIT!" mash (light). Winner: +5 HP, +15 meter. Loser: **a brief shove-stagger with get-up invulnerability — never comboable**. CPU mash starts after a human-beatable, difficulty-scaled delay. Once per round. Total swing ≈ one jab, as the doctrine demands.
2. **THE WAVE** — direction arrow + rising chant → stadium wave shoves grounded fighters ~180px (2 dmg). Jump to ride it.
3. **SPIN CLASS STAMPEDE** — three riderless spin bikes roll across at staggered times, 5 dmg + comic tumble. Jumpable.
4. **FIRE DRILL** — assembly marker at one edge; **window computed at runtime** (worst-case walk distance / slowest fighter speed + 0.75s); ground hazards inside the marker are cleared; anyone in hitstun/knockdown during the final second is forgiven. Missing roll call: 6 dmg, **no stun**.
5. **BERLIN TRIP** (Mike in match; ~once per match) — "MIKE'S OFF TO BERLIN!", boarding-pass swoosh, 12s Berlin crossfade, home-turf buff, "WILLKOMMEN" stinger, swoosh back.

## CPU

Archetype-aware profiles from character data (`ai` hints). Difficulty (Easy/Normal/Hard) scales reaction delay, mistake rate, event mash. Default Normal.

Competence floor (all difficulties, scaled by reaction/mistake rate): only swing buttons that can reach (mirrors hitbox geometry), punish whiffed recovery, jump unblockables (they whiff vs airborne), never blind-cast parry/catch stances, never zone into your own corner, and kite armored/grab bruisers when faster with a ranged tool. Balance numbers in BALANCE.md assume this floor.

## Out of scope (this milestone)

Mobile/touch controls, online play, replays, second supers, training mode.
