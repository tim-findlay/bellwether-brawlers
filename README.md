# BELLWETHER BATTLERS

A lightly pixelated office **platform fighter** starring your coworkers — eight fighters with real sprite animation and a Brawlhalla-style directional kit, five painted stages (plus Berlin), random office events, keyboard or gamepad, and a CPU-vs-CPU balance harness with five ship gates. Pure HTML5 canvas + vanilla JavaScript ES modules. **No framework, no bundler, no build step** — the only external resource is web fonts from the Google Fonts CDN (graceful system fallbacks).

**Play it live:** https://tim-findlay.github.io/bellwether-brawlers/ *(repo is currently private — Pages serves once it's public again)*

> A parody fighting game. Every face, move, stage and grudge is editable — see [Adding content](#adding-content).

## How to play

**Versus CPU** or **Local Versus** (two players on one keyboard, or two pads). Pick your fighter, pick your opponent, pick an arena, then the VS splash drops you into the fight. In Local Versus both players pick at the same time on their own keys. The main menu also has **How to Play**, **Records** (wins per fighter, kept in this browser) and **Settings** (office events, CPU difficulty, sound, screen shake, reset records). **Esc** (or a pad's Back button) pauses: resume, how to play, restart the match or quit to the menu.

- **3 stocks each, untimed.** The only KO is a **ring-out**: knock your colleague past the edge of the screen (any side).
- **Composure** (your bar) never kills. It drains as you take hits and the emptier it is, the farther every hit sends you. It refills only when you lose a stock — waiting heals nothing.
- **No block.** One **Dodge** button: spot dodge on the ground, dodge-step with a direction, **air dodge** in the air (once per airtime). Dodges share one cooldown.
- **Movement is the game:** run, double-tap to dash (on the ground *or once in the air*), dash-jump for a long flat arc, **three jumps** (one ground, two air), fast-fall, drop through soft platforms, air-drift. Fall past the edge of a stage and you **grab the ledge**: climb up (hold toward), jump straight up, or drop. Recover from a launch with your drift, your air jumps, your air dash, your recovery move and (last) your air dodge.
- **Every button reads the direction you hold** (Brawlhalla-style). **Light** + neutral / side / down on the ground = three fast lights (the side one steps in, the down one pops them up); in the air, Light + direction = the four **aerials**. **Heavy** + neutral / side / down on the ground = three **signatures** — the kill moves (the side one lunges, the down one launches them up); in the air, Heavy = your **recovery** (a rising attack that lifts you, once per airtime) and Heavy + down = a **ground pound** dive. Plus **two specials** on cooldown (pips under the bar) and a **super** on a full gold meter. Statuses announce themselves in words above your head.
- **KO** = ink-burst, then you ride the office chair back down from the top — invulnerable until you act.

### Controls

Bindings are by **physical key position** (US labels shown), so they work on any layout.

| Action | P1 | P2 | Notes |
|---|---|---|---|
| Move | A / D | ← / → | double-tap = dash (ground, or once per airtime in the air) · toward the stage on the ledge = climb |
| Jump | W | ↑ | again in the air = air jump (two per airtime); *held* aims the up-air; on the ledge = ledge jump |
| Down | S | ↓ | hold = fast-fall · tap on a platform = drop through · aims the down-light / down-signature / ground pound · drops off the ledge |
| Light | F | K | + neutral / side / down = the three lights; in the air + direction = the four aerials |
| Heavy | G | L | + neutral / side / down = the three signatures; in the air = recovery, + down = ground pound |
| Special 1 / 2 | H / J | ; / ' | some work in the air |
| Dodge | V | / | spot · step · air dodge |
| **Super** | Space | Enter | full meter |

**Menus:** F / K / Enter confirm · Esc back · Esc pauses a fight (with the full controls overlay — also under HOW TO PLAY on the main menu).

**Gamepads:** plug in any standard-mapping pad (Xbox, PlayStation, most USB pads) — the first pad drives P1, the second P2, alongside the keyboard. Stick / d-pad move, **A** jump, **X** light, **B** heavy, **RB / LB** specials, **Y** super, triggers dodge, Start = Enter, Back = Esc. No rebinding UI yet.

### The roster

| Fighter | Archetype | Specials | Super |
|---|---|---|---|
| **BEN** — The Big Boss | Long-range bully | My Office. Now. (a memo that drags you toward him — jump it) · Off the Lip (chair-surf lunge, works in the air — his recovery) | TWELFTH MAN — unparryable stadium roar (jump it) |
| **TIM** — The Operator | Tempo all-rounder | Scheduled Send (marks the floor under you, strikes a beat later — move) · Zulu Time (rewinds Scheduled Send, next hit +2) | RUN FLOW — dash-through auto-combo |
| **ADRIAN** — The Walking Hazard | Chaos rushdown | Clumsy Charge (trips if he misses — and the fall can still hit you) · Nero Spill (slippery puddle) | FULL AUDIT — multi-hit flail, trips at the end |
| **RICHY** — The Market | Dual-candle zoner | Bull Run (rising candle) · Bear Raid (ground roller — jump it); alternating *landed* candles build bonus damage. Short Squeeze (heavy) **pulls you in** | RATE HIKES — telegraphed chart eruptions |
| **NICK** — The Concierge | Teleport glass cannon | Status Match (teleport behind — also his recovery) · Points Redemption (card fan) | I KNOW YOUR GUY — borrows *your* first special for 10 s |
| **ABI** — The Gatekeeper | Counter-puncher | Calendar Block (melee parry, works in the air → "DECLINED!" + your specials locked) · House Rosé (slowing lob) | PUB O'CLOCK — locks specials, regen until she's hit |
| **MIKE** — The Site Manager | Armored grappler tank | Scaffold Slam (unparryable command grab — jump it; he can throw you either way) · Demolition Day (shockwave that destroys projectiles) | WRECKING BALL — two dodgeable passes. No recovery special: knock him off and guard the edge |
| **SEELYE** — The Lender | Setplay / debt collector, new dad | Drawdown (binder lob, leaves burning paperwork) · Dad Reflexes (catches projectiles for meter) | ENFORCEMENT — parryable cone that collects a LIEN for +8 |

Seelye's LIEN: his heavy and his recovery mark you; his next special collects +4 and Enforcement collects +8. If Mike is in the match the fight can suddenly relocate to **Berlin** (his home turf) — that's an event, not a stage pick.

### Stages

**The Office** · **Buckingham Palace Forecourt** · **The Bellwether Arms** (pub) · **The Rooftop** · **The Platform** (tube station) — one main slab with grabbable ledges, soft platforms, blast zones on all four sides, a hazy painted far layer (`assets/stages/<id>.png`) plus a designed arena piece for the main slab (`assets/stages/<id>-slab.png`), both drop-in like the sprites and a camera that zooms to keep both fighters framed. **Berlin** exists but only Mike's travel schedule can take you there.

### Office events (Settings → can be toggled; ON by default)

All events are telegraphed with a klaxon + banner, are dodgeable or symmetric, push toward the centre and never decide a match:

- **URGENT UNDERWRITING** — both freeze; mash LIGHT; first to submit gets meter.
- **THE WAVE** — a wave sweeps the slab; jump to ride it.
- **SPIN CLASS STAMPEDE** — runaway spin bikes; jump them.
- **FIRE DRILL** — get to the assembly point before roll call.
- **BERLIN TRIP** — Mike only: the stage crossfades to Berlin and he gets a home-turf buff for a stretch.

## Run locally

ES modules + image assets **do not work from `file://`** — serve it:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Any static file server works; there is nothing to install or build.

## Deployment

Every push to `main` deploys the repo root to **GitHub Pages** via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) (upload-pages-artifact → deploy-pages). What's in the repo is what's served.

## Balance harness (dev)

```
http://localhost:8000/?sim=10        # in the browser
node src/dev/sim.js 30 1337          # headless (N per ordered pairing, seed)
node --test 'tests/*.test.mjs'       # engine tests
```

Runs N CPU-vs-CPU matches per ordered pairing (seeded RNG, events on, 3 stocks) and reports the five ship gates from [BALANCE.md](BALANCE.md): every fighter within **42–58%**, a platform-camping profile must not out-perform honest fighting, a ledge-stalling profile must lose outright, engagement flags under 2%, and CPU recovery honesty. `?event=<id>` (e.g. `?event=berlin`) force-fires an event; `?graybox` opens the movement playground; `?art=<stage>` previews a stage. Results land in `window.__SIM_RESULTS`.

## Adding content

Everything is data-driven — see [DESIGN.md](DESIGN.md) for the full architecture.

- **A fighter:** add `src/data/characters/<id>.js` (stats inside the BALANCE.md bands, light/heavy/aerials — the side/down lights, signatures, recovery and ground pound are derived for you, override any of them under `kit` — two specials, super, AI hints, drawn-body palette) and list it in `src/data/characters/index.js`. Drop `assets/headshots/<id>.png` (square photo) for the win screen, and `assets/sprites/<id>/{idle,run,jump,attack}.png` (64 px cells, described in `src/data/sprites.js`) for animation and the select card — **no code change**; without them the drawn cartoon head / body is used.
- **A stage:** add an object to `src/data/stages.js` (geometry: slab, soft platforms, spawns, respawn, camera bounds, blast zones; plus palette/art metadata) and optionally drop a 480×270 `assets/stages/<id>.png` far backdrop and a 512 px wide `assets/stages/<id>-slab.png` arena piece (top edge = walkable top). Without them the procedural layers and slab draw. `selectable: false` keeps it event-only, like Berlin.
- **Front-end art:** replace `assets/ui/logo.png`, `vs.png` or `trophy.png` (keyed PNG, any size; drawn to fit). Delete one and the code-drawn version returns.
- **An event:** add an object to `src/data/events.js` (telegraph, weight, optional `requiresCharacter`, and small start/update/draw hooks).

## License

[MIT](LICENSE)
