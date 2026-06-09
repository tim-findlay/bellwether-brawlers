# DESK WARRIORS

**Bellwether Brawl** — a neon, arcade-style office fighting game starring your coworkers. Pure HTML5 canvas and vanilla JavaScript in a single file. No framework, no build step, no JS dependencies — the only external resource is web fonts from the Google Fonts CDN (the game falls back to system fonts offline).

**Play it live:** https://tim-findlay.github.io/desk-warriors/

> A parody fighting game — names and moves are fully editable (see [How to add or edit a fighter](#how-to-add-or-edit-a-fighter)).

## How to play

Pick **1 Player (vs CPU)** or **2 Player (local)**, choose your fighter, then the opponent. Matches are **first to two round wins**, 60 seconds per round — KO your opponent or have more health when time runs out. (Equal health at the bell is a draw, which just means an extra round.)

Each fighter has a light attack, a heavy attack, and a unique **special move** (projectile, lunge, or shockwave) with a cooldown — the HUD shows **SPECIAL READY** when it's available. Hold block to shrug off most of an incoming hit's damage.

### Controls

| Action  | Player 1 | Player 2 |
| ------- | -------- | -------- |
| Move    | A / D    | ← / →    |
| Jump    | W        | ↑        |
| Block   | S        | ↓        |
| Light   | F        | K        |
| Heavy   | G        | L        |
| Special | H        | ;        |

**Menus:** navigate with WASD or arrow keys, **Enter** to confirm, **Esc** to go back (Esc during a fight quits to the title screen).

### The roster

| Fighter | Style | Special |
| ------- | ----- | ------- |
| **Ben Easton** | The boss. Tank. | Hawk Toss — football projectile |
| **Tim Findlay** | Balanced | Prompt Injection — AI orb projectile |
| **Adrian D** | Fast & goofy | Clumsy Charge — lunge |
| **Richy A** | Balanced | Bull Run — candlestick projectile |
| **Nick Sterling** | Fast & fragile, quickest jab | Points Redemption — card projectile |
| **Abi Sykes** | Fastest & lightest on the roster | House Rosé — wine projectile |
| **Mike Holford** | Construction tank | Demolition Day — shockwave |
| **Seelye Arms** | All-rounder | Brisket Bomb — projectile |

## Run locally

No install, no build. From the repo root:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. (Any static file server works — or just open `index.html` directly in a browser.)

## Deployment

Every push to `main` triggers the GitHub Actions workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which uploads the repo root as a Pages artifact and deploys it to **GitHub Pages**. There is no build step — what's in the repo is what's served.

## How to add or edit a fighter

The entire roster lives in the **`CHARACTERS` array near the top of the `<script>` in `index.html`**. The select screen, HUD, AI, and move list all read from it — edit one object and everything updates. Each fighter looks like this:

```js
{
  name:    "DAVE",                 // shown on select + HUD (keep it short)
  tagline: "Reply-all menace",     // 1-line description on select screen
  win:     "Per my last email.",   // victory line
  color:   "#ff5d3b",              // main body colour
  accent:  "#ffd23f",              // trim / detail colour
  stats:   { hp:100, speed:3.0, jump:13, weight:1.0 },
  light:   { name:"Jab",      dmg:5,  range:62, start:4,  active:3, recover:9,  kb:3 },
  heavy:   { name:"Haymaker", dmg:11, range:74, start:10, active:4, recover:18, kb:8 },
  special: {
    name:"Reply-All Storm",
    type:"projectile",             // "projectile" | "lunge" | "shockwave"
    dmg:9, kb:7, start:12, recover:22, cooldown:55,
    proj:{ speed:9, w:34, h:26, color:"#ffd23f" }
  }
}
```

Field reference:

- **`stats`** — `hp` is total health, `speed` is movement in px/frame, `jump` is jump impulse, `weight` scales knockback resistance (higher = harder to push around).
- **`light` / `heavy`** — `dmg` damage, `range` reach in px, `start`/`active`/`recover` are the attack's frame phases (startup, hitting, cooldown), `kb` knockback.
- **`special`** — uses `dmg`, `kb`, `start`, `recover` (no `active` field — match the shipped roster entries), plus `cooldown` (frames before reuse). The three types:
  - `"projectile"` — fires a glowing shot; add `proj:{ speed, w, h, color }`.
  - `"lunge"` — a charging strike; add `dist` (charge distance in px).
  - `"shockwave"` — expanding ground ring that hits both sides; add `radius`.

**Tip:** the character-select grid is laid out for exactly 8 fighters (4×2). Prefer *replacing* an existing fighter over appending a 9th — more than 8 will overflow the select screen layout.

## License

[MIT](LICENSE)
