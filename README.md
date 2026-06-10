# BELLWETHER BATTLERS

A polished, lightly pixelated office fighting game starring your coworkers — eight genuinely different fighters, three British stages, random office events, and a CPU-vs-CPU balance harness. Pure HTML5 canvas + vanilla JavaScript ES modules. **No framework, no bundler, no build step** — the only external resource is web fonts from the Google Fonts CDN (graceful system fallbacks).

**Play it live:** https://tim-findlay.github.io/bellwether-brawlers/ *(repo is currently private — Pages serves once it's public again)*

> A parody fighting game. Every face, move, stage and grudge is editable — see [Adding content](#adding-content).

## How to play

**1 Player (vs CPU)** or **2 Player (local)**. Pick your fighter, pick your opponent, pick an arena. **First to two round wins**; 60-second rounds; timeout goes to whoever has the higher **percentage** of their health.

Every fighter has a light, a heavy, **two distinct specials** (on cooldown — the pips next to your meter), and a **super** that needs a full gold meter. Hold block to guard (attacks from **behind** still connect). Statuses announce themselves in words above your head — `REVERSED!` flips movement only; your buttons still work.

### Controls

Bindings are by **physical key position** (US labels shown), so they work on any layout.

| Action | P1 | P2 |
|---|---|---|
| Move | A / D | ← / → |
| Jump | W | ↑ |
| Block (hold) | S | ↓ |
| Light | F | K |
| Heavy | G | L |
| Special 1 | H | ; |
| Special 2 | J | ' |
| **Super** | Space | Enter |

**Menus:** F / K / Enter confirm · Esc back · Esc pauses a fight (with the full controls overlay — also under HOW TO PLAY on the main menu).

### The roster

| Fighter | Archetype | Specials | Super |
|---|---|---|---|
| **BEN** — The Big Boss | Long-range bully | Hawk Toss (lobbed football) · Off the Lip (chair-surf launcher) | TWELFTH MAN — unblockable stadium roar |
| **TIM** — The Operator | Tempo all-rounder | Prompt Injection (cursed e-mail, briefly reverses movement) · Zulu Time (rewinds his cooldowns) | AGI MOMENT — dash-through auto-combo |
| **ADRIAN** — The Walking Hazard | Chaos rushdown | Clumsy Charge (trips if he misses!) · Coffee Spill (slippery puddle trap) | FULL AUDIT — multi-hit flail, trips at the end |
| **RICHY** — The Market | Dual-projectile zoner | Bull Run (block it) · Bear Raid (jump it) — alternating *landed* candles builds bonus damage | TO THE MOON — telegraphed chart eruptions |
| **NICK** — The Concierge | Teleport glass cannon | Status Match (teleport behind) · Points Redemption (card fan) | LIFETIME PLATINUM — 4s lounge buff |
| **ABI** — The Gatekeeper | Counter-puncher | Calendar Block (melee parry → "DECLINED!") · House Rosé (slowing lob) | PUB O'CLOCK — locks specials, regen until she's hit |
| **MIKE** — The Site Manager | Armored grappler | Scaffold Slam (unblockable command grab) · Demolition Day (shockwave that destroys projectiles) | WRECKING BALL — two dodgeable passes |
| **SEELYE** — The Pitmaster | Setplay / debt collector | Brisket Bomb (ember zone) · Dad Reflexes (catches projectiles for meter) | LOW & SLOW — drifting smoke blanket |

Mike's LIEN note: Seelye's heavy marks you; his next special collects +4. And if Mike is in the match, the fight can suddenly relocate to **Berlin** (his home turf) — that's an event, not a stage pick.

### Stages

**The Office** · **Buckingham Palace Forecourt** · **The Bellwether Arms** (pub) — each with its own palette and parallax. **Berlin** exists but only Mike's travel schedule can take you there.

### Office events (Settings → can be toggled; ON by default)

All events are telegraphed with a klaxon + banner, are dodgeable or symmetric, and never decide a match:

- **URGENT UNDERWRITING** — both freeze; mash LIGHT; first to submit gets a small heal + meter.
- **THE WAVE** — a wave sweeps the floor; jump to ride it.
- **SPIN CLASS STAMPEDE** — three runaway spin bikes; jump them.
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
http://localhost:8000/?sim=10
```

Runs N CPU-vs-CPU matches per ordered pairing headlessly (seeded RNG, events on), prints a win-rate matrix + per-character aggregates to the console and the canvas, and checks two ship gates: every fighter within **42–58%** aggregate, and a stall-bot profile must not beat honest fighting. `?event=<id>` (e.g. `?event=berlin`) force-fires an event for testing. Results also land in `window.__SIM_RESULTS`. See [BALANCE.md](BALANCE.md) for the doctrine and latest results.

## Adding content

Everything is data-driven — see [DESIGN.md](DESIGN.md) for the full architecture.

- **A fighter:** add one object to `src/data/characters.js` (stats, four moves, two specials, super, AI hints, drawn-body palette). Drop `assets/headshots/<id>.png` (square photo) next to the others and the game uses it everywhere automatically — **no code change**; without a photo the drawn cartoon head is used.
- **A stage:** add an object to `src/data/stages.js` (palette + parallax layers built from the pixel helpers). `selectable: false` keeps it event-only, like Berlin.
- **An event:** add an object to `src/data/events.js` (telegraph, weight, optional `requiresCharacter`, and small start/update/draw hooks).

## License

[MIT](LICENSE)
