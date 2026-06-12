# Phase 2: World — Camera, Stage Geometry, Stocks, HUD v3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real stage geometry for the four approved layouts, a dynamic follow/zoom camera, 3-stock ring-out matches with the respawn chair, and the v3 HUD — playable as a movement "versus" build via `?graybox=<stageId>`, with the v2 game untouched.

**Architecture:** Two new pure-logic engine modules (`camera.js`, `match.js`) tested headlessly like `movement.js`; stage geometry lands as data in `stages.js` with structural sanity tests; a new `versus.js` screen composes MovementBody + MatchState + Camera and draws geometry-fidelity stages (real art arrives with the rig in Phase 3+). The graybox's intent adapter is promoted to `src/engine/input.js` as its permanent home.

**Tech Stack:** Vanilla JS ES modules, zero build, zero deps. Tests: `node --test 'tests/*.test.mjs'` (suite currently 37 green; this plan ends at 64).

**Spec:** `DESIGN.md` + `BALANCE.md` v3 (BALANCE canonical; physics values frozen 2026-06-12). Stage layouts per the four approved wireframes (DESIGN "Stages"). Conventions identical to the Phase-1 plan: y = feet, slabs solid, platforms one-way, 60 Hz, plan-verbatim TDD, work on `main`, page loads clean after every commit, no Co-Authored-By trailer, never push until wrap-up.

**World scale:** world units = px at zoom 1.0. Viewport 960×540. Stages ~2.5 viewports wide. **Physics is frozen, so vertical platform spacing must respect the frozen jump arcs**: MID single-jump rise ≈ 104.5 px, jump→double-jump total ≈ 190 px. Low platforms sit ~110 above the slab (double-jump territory), upper platforms ~95–105 above those (single jump from a platform).

---

## File structure

| File | Status | Responsibility |
|------|--------|----------------|
| `src/data/stages.js` | modify | + `geometry` per stage (slabs, platforms, spawns, respawn, cameraBounds, blast) + `STAGE_IDS_V3` export. v2 visuals untouched |
| `src/engine/camera.js` | create | `Camera`: frame-targets math, zoom-to-fit, eased follow, bounds clamp, world↔screen transforms, shake-composing `apply()` |
| `src/engine/match.js` | create | `MatchState`: stocks, ring-out KO, respawn-chair sequence, match over/winner. Pure logic |
| `src/engine/input.js` | modify | + `buildIntent(ctl, input, map)` — the adapter promoted from graybox.js (permanent home) |
| `src/dev/graybox.js` | modify | import `buildIntent` from input.js (delete local `intentFor`); export `drawBody`/`PRESETS` for reuse (re-homed in Phase 3) |
| `src/screens/versus.js` | create | v3 match screen: stage render through the camera, bodies, HUD v3, banners, pause. Dev-flagged for now; becomes the fight screen in Phase 3 |
| `src/main.js` | modify | `?graybox` (flat playground) vs `?graybox=<stageId>` (versus on that stage) |
| `tests/stages.test.mjs` | create | structural invariants for all four geometries |
| `tests/camera.test.mjs` | create | framing/zoom/clamp/ease/transform math |
| `tests/match.test.mjs` | create | stocks, KO latching, chair sequence, match over |

---

### Task 1: Stage geometry data + structural sanity tests

**Files:**
- Modify: `src/data/stages.js` (append geometry to each stage object + new exports; v2 visual fields untouched)
- Test: `tests/stages.test.mjs`

- [ ] **Step 1: Write the failing tests** — `tests/stages.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, STAGE_IDS_V3, geometryOf } from '../src/data/stages.js';

const G = STAGE_IDS_V3.map(id => [id, geometryOf(id)]);

test('all four v3 stages expose geometry', () => {
  assert.deepEqual(STAGE_IDS_V3, ['office', 'palace', 'pub', 'berlin']);
  for (const [id, g] of G) {
    assert.ok(g, `${id} has geometry`);
    for (const k of ['slabs', 'platforms', 'spawns', 'respawn', 'cameraBounds', 'blast'])
      assert.ok(g[k], `${id}.${k}`);
  }
});

test('spawns stand on a slab top, inside the blast rect', () => {
  for (const [id, g] of G) {
    assert.equal(g.spawns.length, 2, `${id} has two spawns`);
    for (const s of g.spawns) {
      const on = g.slabs.some(sl => s.y === sl.y && s.x > sl.x && s.x < sl.x + sl.w);
      assert.ok(on, `${id} spawn (${s.x},${s.y}) on a slab top`);
      assert.ok(s.x > g.blast.left && s.x < g.blast.right, `${id} spawn inside blast x`);
    }
  }
});

test('platform counts match the approved layouts', () => {
  const counts = { office: 3, palace: 2, pub: 3, berlin: 1 };
  for (const [id, g] of G) assert.equal(g.platforms.length, counts[id], id);
});

test('every platform is reachable under the frozen jump arcs', () => {
  // a surface within 190px below (jump -> double-jump) must exist under each platform
  for (const [id, g] of G) for (const p of g.platforms) {
    const supports = [...g.slabs.map(s => ({ x: s.x, w: s.w, y: s.y })), ...g.platforms]
      .filter(s => s !== p && s.y > p.y && s.y - p.y <= 190 &&
                   s.x < p.x + p.w && s.x + s.w > p.x);
    assert.ok(supports.length > 0, `${id} platform at (${p.x},${p.y}) reachable`);
  }
});

test('geometry nests: surfaces inside blast inside cameraBounds', () => {
  for (const [id, g] of G) {
    const b = g.blast, cb = g.cameraBounds;
    for (const s of [...g.slabs, ...g.platforms.map(p => ({ ...p, h: 0 }))]) {
      assert.ok(s.x > b.left && s.x + s.w < b.right, `${id} surface inside blast x`);
      assert.ok(s.y > b.top && s.y + (s.h ?? 0) < b.bottom, `${id} surface inside blast y`);
    }
    assert.ok(b.left >= cb.x + 20 && b.right <= cb.x + cb.w - 20, `${id} blast x inside camera bounds`);
    assert.ok(b.top >= cb.y + 20 && b.bottom <= cb.y + cb.h - 20, `${id} blast y inside camera bounds`);
  }
});

test('respawn point hovers over a slab, above its top', () => {
  for (const [id, g] of G) {
    const over = g.slabs.some(sl => g.respawn.x > sl.x && g.respawn.x < sl.x + sl.w && g.respawn.y < sl.y);
    assert.ok(over, `${id} respawn over a slab`);
  }
});

test('berlin stays event-only; the other three are selectable', () => {
  for (const st of STAGES) {
    if (st.id === 'berlin') assert.equal(st.selectable, false);
    if (['office', 'palace', 'pub'].includes(st.id)) assert.equal(st.selectable, true);
  }
});
```

- [ ] **Step 2: Run; expect failure** — `node --test tests/stages.test.mjs` → FAIL (`STAGE_IDS_V3` not exported).

- [ ] **Step 3: Implement.** In `src/data/stages.js`, add a `geometry` field to each of the four stage objects and two exports at the bottom. Geometry values (world units; each stage's personality per the approved wireframes — Office symmetric tri-plat, Palace widest/flattest, Pub asymmetric, Berlin one wide high plat):

```js
// THE OFFICE — symmetric tri-plat (the tournament stage)
geometry: {
  slabs: [{ x: 920, y: 760, w: 560, h: 70 }],
  platforms: [{ x: 985, y: 650, w: 150 }, { x: 1265, y: 650, w: 150 }, { x: 1122, y: 552, w: 156 }],
  spawns: [{ x: 1060, y: 760 }, { x: 1340, y: 760 }],
  respawn: { x: 1200, y: 700 },
  cameraBounds: { x: 330, y: 60, w: 1740, h: 1280 },
  blast: { left: 480, right: 1920, top: 130, bottom: 1190 },
},

// PALACE FORECOURT — widest, flattest (the zoner's stage)
geometry: {
  slabs: [{ x: 820, y: 780, w: 760, h: 70 }],
  platforms: [{ x: 905, y: 668, w: 170 }, { x: 1325, y: 668, w: 170 }],
  spawns: [{ x: 980, y: 780 }, { x: 1420, y: 780 }],
  respawn: { x: 1200, y: 715 },
  cameraBounds: { x: 230, y: 40, w: 1940, h: 1320 },
  blast: { left: 390, right: 2010, top: 110, bottom: 1230 },
},

// THE BELLWETHER ARMS — asymmetric (the scrappy local)
geometry: {
  slabs: [{ x: 940, y: 770, w: 520, h: 70 }],
  platforms: [{ x: 965, y: 658, w: 140 },   // awning (pub side)
              { x: 1000, y: 560, w: 96 },    // hanging sign (static)
              { x: 1295, y: 700, w: 130 }],  // bench (low, other side)
  spawns: [{ x: 1075, y: 770 }, { x: 1330, y: 770 }],
  respawn: { x: 1200, y: 705 },
  cameraBounds: { x: 350, y: 70, w: 1700, h: 1260 },
  blast: { left: 500, right: 1900, top: 140, bottom: 1180 },
},

// BERLIN — the gate (event-only)
geometry: {
  slabs: [{ x: 890, y: 790, w: 620, h: 70 }],
  platforms: [{ x: 1040, y: 640, w: 320 }],  // gate roof: wide, high (dash-jump or double-jump)
  spawns: [{ x: 1030, y: 790 }, { x: 1370, y: 790 }],
  respawn: { x: 1200, y: 725 },
  cameraBounds: { x: 320, y: 60, w: 1760, h: 1300 },
  blast: { left: 470, right: 1930, top: 130, bottom: 1210 },
},
```

And at the bottom of the file:

```js
// v3 platform-fighter geometry (Phase 2+). v2 visuals above are untouched.
export const STAGE_IDS_V3 = ['office', 'palace', 'pub', 'berlin'];
export function geometryOf(id) { return stageById(id)?.geometry ?? null; }
```

*(Height sanity, frozen physics: low plats sit 110–112 above their slab — double-jump territory; Office top plat is 98 above the low plats and Pub's sign is 98 above the awning — single jump from a platform; Pub's bench is 70 — single jump from the slab; Berlin's roof is 150 — dash-jump or double-jump. The reachability test enforces ≤ 190.)*

- [ ] **Step 4: Run; expect pass** — `node --test tests/stages.test.mjs` → 7 PASS; full suite 44/44.

- [ ] **Step 5: Commit** — `git add src/data/stages.js tests/stages.test.mjs && git commit -m "Phase 2: stage geometry for the four layouts, with structural sanity tests"`

---

### Task 2: Camera — framing & zoom-to-fit math

**Files:**
- Create: `src/engine/camera.js`
- Test: `tests/camera.test.mjs`

- [ ] **Step 1: Failing tests** — `tests/camera.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Camera } from '../src/engine/camera.js';

export const BOUNDS = { x: 0, y: 0, w: 1920, h: 1080 };
export const cam = (opts = {}) => new Camera(960, 540, BOUNDS, opts);

test('a single target frames at max zoom, centered on it', () => {
  const c = cam();
  const t = c.target([{ x: 700, y: 500 }]);
  assert.equal(t.x, 700);
  assert.equal(t.y, 500);
  assert.equal(t.zoom, c.maxZoom);
});

test('two distant targets zoom out to fit both plus padding', () => {
  const c = cam({ pad: 150 });
  const t = c.target([{ x: 200, y: 500 }, { x: 1400, y: 500 }]);
  assert.equal(t.x, 800);
  // needed width = 1200 + 2*150 = 1500 -> zoom = 960/1500 = 0.64
  assert.ok(Math.abs(t.zoom - 960 / 1500) < 1e-9);
});

test('zoom never drops below minZoom (bounds-fit) or above maxZoom', () => {
  const c = cam();
  const far = c.target([{ x: 0, y: 0 }, { x: 1920, y: 1080 }]);
  assert.equal(far.zoom, c.minZoom);
  const near = c.target([{ x: 960, y: 540 }, { x: 961, y: 541 }]);
  assert.equal(near.zoom, c.maxZoom);
});

test('minZoom defaults to exactly bounds-fit', () => {
  const c = cam();
  // 960/1920 = 0.5, 540/1080 = 0.5 -> minZoom 0.5
  assert.equal(c.minZoom, 0.5);
});
```

- [ ] **Step 2: Run; expect failure** (module not found).

- [ ] **Step 3: Implement** — `src/engine/camera.js`:

```js
// Camera — pure framing math for the v3 world. Follows targets, zooms to fit,
// eases, clamps to per-stage cameraBounds, and converts world<->screen.
// Screenshake composes via apply()'s offset args; it never moves this.x/y.

export class Camera {
  constructor(viewW, viewH, bounds, opts = {}) {
    this.viewW = viewW; this.viewH = viewH;
    this.bounds = bounds;                       // world rect the camera may show
    this.pad = opts.pad ?? 150;                 // world px kept around targets
    // cover-fit: at full zoom-out the view stays INSIDE the bounds (no stray
    // space past the camera box on either axis)
    this.minZoom = opts.minZoom ?? Math.max(viewW / bounds.w, viewH / bounds.h);
    this.maxZoom = opts.maxZoom ?? 1.15;
    this.ease = opts.ease ?? 0.12;              // per-frame lerp factor
    this.x = bounds.x + bounds.w / 2;
    this.y = bounds.y + bounds.h / 2;
    this.zoom = this.minZoom;
  }

  // Desired framing for target points; pure, no state change.
  target(points) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    const w = (maxX - minX) + this.pad * 2;
    const h = (maxY - minY) + this.pad * 2;
    const fit = Math.min(this.viewW / w, this.viewH / h);
    const zoom = Math.min(this.maxZoom, Math.max(this.minZoom, fit));
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom };
  }
}
```

- [ ] **Step 4: Run; expect pass** — 4 PASS; full suite 48/48.

- [ ] **Step 5: Commit** — `git add src/engine/camera.js tests/camera.test.mjs && git commit -m "Phase 2: camera framing and zoom-to-fit math"`

---

### Task 3: Camera — eased follow, bounds clamp, transforms

**Files:** Modify `src/engine/camera.js`, append to `tests/camera.test.mjs`.

- [ ] **Step 1: Failing tests** (append):

```js
test('update eases toward the target and converges', () => {
  const c = cam();
  const pts = [{ x: 700, y: 400 }];
  c.update(pts);
  assert.notEqual(c.x, 700);                              // one step is partial
  for (let i = 0; i < 300; i++) c.update(pts);
  assert.ok(Math.abs(c.x - 700) < 1);                     // converged
  assert.ok(Math.abs(c.zoom - c.maxZoom) < 0.01);
});

test('the view never shows outside cameraBounds', () => {
  const c = cam();
  for (let i = 0; i < 300; i++) c.update([{ x: 10, y: 10 }]);   // corner target
  const halfW = c.viewW / 2 / c.zoom, halfH = c.viewH / 2 / c.zoom;
  assert.ok(c.x - halfW >= BOUNDS.x - 1e-9, 'left edge clamped');
  assert.ok(c.y - halfH >= BOUNDS.y - 1e-9, 'top edge clamped');
});

test('worldToScreen round-trips with the current transform', () => {
  const c = cam();
  for (let i = 0; i < 50; i++) c.update([{ x: 600, y: 700 }]);
  const s = c.worldToScreen(600, 700);
  assert.ok(s.x >= 0 && s.x <= 960 && s.y >= 0 && s.y <= 540, 'target on screen');
  const w = c.screenToWorld(s.x, s.y);
  assert.ok(Math.abs(w.x - 600) < 1e-6 && Math.abs(w.y - 700) < 1e-6);
});

test('apply sets the canvas transform with shake composed as an offset', () => {
  const c = cam();
  const calls = [];
  const ctx = { setTransform: (...a) => calls.push(a) };
  c.apply(ctx, 7, -3);
  const [zx, , , zy, tx, ty] = calls[0];
  assert.equal(zx, c.zoom); assert.equal(zy, c.zoom);
  assert.equal(tx, c.viewW / 2 - c.x * c.zoom + 7);
  assert.equal(ty, c.viewH / 2 - c.y * c.zoom - 3);
});
```

- [ ] **Step 2: Run; new tests FAIL** (`c.update is not a function`).

- [ ] **Step 3: Implement** (append methods to the class):

```js
  update(points) {
    const t = this.target(points);
    this.zoom += (t.zoom - this.zoom) * this.ease;
    this.x += (t.x - this.x) * this.ease;
    this.y += (t.y - this.y) * this.ease;
    this._clamp();
  }

  _clamp() {
    const b = this.bounds;
    const halfW = this.viewW / 2 / this.zoom, halfH = this.viewH / 2 / this.zoom;
    this.x = halfW * 2 >= b.w ? b.x + b.w / 2
      : Math.min(Math.max(this.x, b.x + halfW), b.x + b.w - halfW);
    this.y = halfH * 2 >= b.h ? b.y + b.h / 2
      : Math.min(Math.max(this.y, b.y + halfH), b.y + b.h - halfH);
  }

  worldToScreen(wx, wy) {
    return { x: (wx - this.x) * this.zoom + this.viewW / 2,
             y: (wy - this.y) * this.zoom + this.viewH / 2 };
  }
  screenToWorld(sx, sy) {
    return { x: (sx - this.viewW / 2) / this.zoom + this.x,
             y: (sy - this.viewH / 2) / this.zoom + this.y };
  }

  // World-space drawing transform; screenshake rides as a screen-space offset.
  apply(ctx, shakeX = 0, shakeY = 0) {
    ctx.setTransform(this.zoom, 0, 0, this.zoom,
      this.viewW / 2 - this.x * this.zoom + shakeX,
      this.viewH / 2 - this.y * this.zoom + shakeY);
  }
  static reset(ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); }
```

- [ ] **Step 4: Run; all PASS** — full suite 52/52.

- [ ] **Step 5: Commit** — `git commit -am "Phase 2: camera eased follow, bounds clamp, world/screen transforms"`

---

### Task 4: Promote the intent adapter to `src/engine/input.js`

**Files:**
- Modify: `src/engine/input.js` (add `buildIntent`), `src/dev/graybox.js` (use it; export `drawBody`/`PRESETS`)
- Test: append one test to `tests/input.test.mjs`

- [ ] **Step 1: Failing test** (append to `tests/input.test.mjs`):

```js
import { buildIntent, PlayerController } from '../src/engine/input.js';

test('buildIntent maps controller state to a MovementBody intent', () => {
  const inp = new Input();
  const ctl = new PlayerController(inp, P1MAP);
  press(inp, 'KeyD'); press(inp, 'KeyW'); inp.beginFrame();
  const i = buildIntent(ctl, inp, P1MAP);
  assert.equal(i.right, true);
  assert.equal(i.left, false);
  assert.equal(i.jump, true);                              // buffered
  assert.equal(i.dodge, false);
  assert.equal(i.dashRight, false);                        // single tap, no dash
});
```

(Adjust the existing import line to include `buildIntent` and `PlayerController` rather than adding a duplicate import.)

- [ ] **Step 2: Run; FAIL** (`buildIntent` not exported).

- [ ] **Step 3: Implement.** In `src/engine/input.js` (add `import { PHYS } from '../data/physics.js';` at the top):

```js
// Adapter: one MovementBody intent per logic tick from a PlayerController.
// Promoted from the Phase-1 graybox; the versus/fight screens share it.
export function buildIntent(ctl, input, map) {
  return {
    left: ctl.held('left'), right: ctl.held('right'), down: ctl.held('down'),
    downTapped: ctl.pressed('down'),
    jump: input.buffered(map.up, PHYS.INPUT_BUFFER),
    dodge: input.buffered(map.dodge, PHYS.INPUT_BUFFER),
    dashLeft: input.doubleTapped(map.left, PHYS.DASH_TAP_WINDOW),
    dashRight: input.doubleTapped(map.right, PHYS.DASH_TAP_WINDOW),
  };
}
```

In `src/dev/graybox.js`: delete the local `intentFor`, import `{ P1MAP, P2MAP, PlayerController, buildIntent }` from `../engine/input.js`, change the `drive()` call to `buildIntent(ctl, G.input, map)`, and remove the now-unused `PHYS` import; hoist `drawBody` out of the closure as `export function drawBody(c, b, color) { ... }` (same body, takes the 2d context as its first arg) and export `PRESETS` (already exported) — `makeGraybox` calls `drawBody(c, b2, BRICK)` etc.

- [ ] **Step 4: Run; all PASS** — full suite 53/53. Also `node --check src/dev/graybox.js`.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "Phase 2: promote buildIntent to engine/input.js; graybox shares it and exports drawBody"`

---

### Task 5: MatchState — stocks & ring-out KO

**Files:**
- Create: `src/engine/match.js`
- Test: `tests/match.test.mjs`

- [ ] **Step 1: Failing tests** — `tests/match.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MatchState, STOCKS, CHAIR_DESCENT, RESPAWN_CAP } from '../src/engine/match.js';
import { geometryOf } from '../src/data/stages.js';

const MID = { runMax: 3.1, jumpImpulse: 11, fallMax: 11, weight: 1.0 };
export const IDLE = Object.freeze({
  left: false, right: false, down: false, downTapped: false,
  jump: false, dodge: false, dashLeft: false, dashRight: false,
});
const STAGE = geometryOf('office');
const newMatch = () => new MatchState(STAGE, [MID, MID]);
const step = (m, i0 = IDLE, i1 = IDLE, n = 1) => { for (let k = 0; k < n; k++) m.update([{ ...IDLE, ...i0 }, { ...IDLE, ...i1 }]); };

test('a fresh match: 3 stocks each, both bodies on their spawns, not over', () => {
  const m = newMatch();
  assert.equal(m.players[0].stocks, STOCKS);
  assert.equal(m.players[1].stocks, STOCKS);
  assert.equal(m.players[0].body.x, STAGE.spawns[0].x);
  assert.equal(m.over, false);
});

test('crossing a blast zone costs exactly one stock and starts the chair', () => {
  const m = newMatch();
  m.players[0].body.x = STAGE.blast.left - 5;              // teleport out
  step(m);
  assert.equal(m.players[0].stocks, STOCKS - 1);
  assert.ok(m.players[0].respawn, 'riding the chair');
  step(m, IDLE, IDLE, 5);                                  // out body is parked — no double count
  assert.equal(m.players[0].stocks, STOCKS - 1);
});

test('the survivor keeps playing while the other rides the chair', () => {
  const m = newMatch();
  m.players[0].body.x = STAGE.blast.left - 5;
  step(m);
  const x1 = m.players[1].body.x;
  step(m, IDLE, { right: true }, 30);
  assert.ok(m.players[1].body.x > x1, 'P2 still moves');
});
```

- [ ] **Step 2: Run; FAIL** (module not found).

- [ ] **Step 3: Implement** — `src/engine/match.js`:

```js
// MatchState — v3 stocks/ring-out/respawn rules. Pure logic: no rendering,
// no input classes; consumes per-player intent objects like MovementBody.
// Invulnerability rule (DESIGN): you are untouchable while riding the chair;
// release (acting, or the hard cap) ends it. Phase-3 combat must treat
// `player.respawn != null` as invulnerable.

import { MovementBody } from './movement.js';

export const STOCKS = 3;
export const CHAIR_DESCENT = 60;   // frames: bounds-top -> respawn hover point
export const RESPAWN_CAP = 180;    // forced release (3 s)

const ACTS = (it) => it.left || it.right || it.down || it.jump || it.dodge;

export class MatchState {
  constructor(stage, statsPair) {
    this.stage = stage;
    this.players = statsPair.map((stats, i) => ({
      stats,
      body: new MovementBody(stats, stage.spawns[i]),
      stocks: STOCKS,
      respawn: null,             // { t, x, y, y0 } while riding the chair
    }));
    this.over = false;
    this.winner = -1;
    this.events = [];            // drained by the screen: 'ko' | 'gameover'
  }

  update(intents) {
    if (this.over) return;
    this.players.forEach((p, i) => {
      if (p.respawn) { this._chair(p, intents[i]); return; }
      p.body.update(intents[i], this.stage);
      if (p.body.out) this._ko(p, i);
    });
  }

  _ko(p, i) {
    p.stocks--;
    if (p.stocks <= 0) {
      this.over = true;
      this.winner = 1 - i;
      this.events.push({ type: 'gameover', winner: this.winner });
      return;
    }
    this.events.push({ type: 'ko', player: i });
    const y0 = this.stage.cameraBounds.y + 40;
    p.respawn = { t: 0, x: this.stage.respawn.x, y: y0, y0 };
  }

  _chair(p, intent) {
    const r = p.respawn;
    r.t++;
    const k = Math.min(1, r.t / CHAIR_DESCENT);
    r.y = r.y0 + (this.stage.respawn.y - r.y0) * k;
    const release = (r.t >= CHAIR_DESCENT && ACTS(intent)) || r.t >= RESPAWN_CAP;
    if (release) {
      p.body = new MovementBody(p.stats, { x: r.x, y: r.y });
      p.respawn = null;
    }
  }
}
```

- [ ] **Step 4: Run; all PASS** — full suite 56/56.

- [ ] **Step 5: Commit** — `git add src/engine/match.js tests/match.test.mjs && git commit -m "Phase 2: MatchState — stocks, ring-out KO, survivor keeps playing"`

---

### Task 6: MatchState — chair release, hard cap, match over

**Files:** Modify nothing (the code landed in Task 5); append tests pinning the sequence.

- [ ] **Step 1: Failing-or-pinning tests** (append to `tests/match.test.mjs`):

```js
test('chair: descends over CHAIR_DESCENT frames, releases on first act after arrival', () => {
  const m = newMatch();
  m.players[0].body.x = STAGE.blast.left - 5;
  step(m);                                                  // KO -> chair starts
  step(m, { jump: true }, IDLE, 10);                        // acting DURING descent: ignored
  assert.ok(m.players[0].respawn, 'still riding mid-descent');
  step(m, IDLE, IDLE, CHAIR_DESCENT);                       // arrive
  assert.ok(Math.abs(m.players[0].respawn.y - STAGE.respawn.y) < 1e-9, 'hovering at the respawn point');
  step(m, { jump: true });                                  // act -> release
  assert.equal(m.players[0].respawn, null);
  assert.equal(m.players[0].body.x, STAGE.respawn.x);
  assert.equal(m.players[0].stocks, STOCKS - 1);
});

test('chair: hard cap forces release with no input', () => {
  const m = newMatch();
  m.players[0].body.x = STAGE.blast.left - 5;
  step(m);
  step(m, IDLE, IDLE, RESPAWN_CAP + 1);
  assert.equal(m.players[0].respawn, null, 'released by the cap');
});

test('losing the last stock ends the match with the right winner', () => {
  const m = newMatch();
  m.players[1].stocks = 1;
  m.players[1].body.x = STAGE.blast.right + 5;
  step(m);
  assert.equal(m.over, true);
  assert.equal(m.winner, 0);
  assert.deepEqual(m.events.at(-1), { type: 'gameover', winner: 0 });
  const x = m.players[0].body.x;
  step(m, { right: true }, IDLE, 10);                       // frozen after game over
  assert.equal(m.players[0].body.x, x);
});
```

Also append this to `tests/stages.test.mjs` (fold-forward from the Task 1 review — the structural tests verifiably pass even if a platform drifts 300px; this pins the approved layouts):

```js
test('layout personalities are pinned', () => {
  const cx = (s) => s.x + s.w / 2;
  const off = geometryOf('office'), pal = geometryOf('palace'),
        pub = geometryOf('pub'), ber = geometryOf('berlin');
  const oc = cx(off.slabs[0]);                                  // office: mirror symmetry
  assert.equal(cx(off.platforms[0]) + cx(off.platforms[1]), oc * 2);
  assert.equal(cx(off.platforms[2]), oc);
  assert.equal(off.spawns[0].x + off.spawns[1].x, oc * 2);
  for (const g of [off, pub, ber])                              // palace: widest, flat, mirrored
    assert.ok(pal.slabs[0].w > g.slabs[0].w, 'palace slab is the widest');
  assert.equal(pal.platforms[0].y, pal.platforms[1].y);
  assert.equal(cx(pal.platforms[0]) + cx(pal.platforms[1]), cx(pal.slabs[0]) * 2);
  const [awning, sign, bench] = pub.platforms;                  // pub: stacked side + low bench
  assert.ok(sign.x >= awning.x && sign.x + sign.w <= awning.x + awning.w, 'sign over the awning');
  assert.ok(sign.y < awning.y && bench.y > awning.y);
  assert.equal(cx(ber.platforms[0]), cx(ber.slabs[0]));         // berlin: roof centred, high
  assert.ok(ber.slabs[0].y - ber.platforms[0].y > 104.5, 'roof above single-jump rise');
  for (const g of [off, pal, pub, ber]) {                       // respawn inside blast (else
    assert.ok(g.respawn.x > g.blast.left && g.respawn.x < g.blast.right);   // chair release = insta-KO)
    assert.ok(g.respawn.y > g.blast.top && g.respawn.y < g.blast.bottom);
  }
});
```

And two comment/doc corrections in the same commit (frozen physics: a dash-jump adds horizontal speed only — it cannot reach a high platform): in `src/data/stages.js`, berlin's geometry comment becomes `// gate roof: wide, high (double-jump territory)`; in `DESIGN.md` §Stages, "high platforms need a dash-jump or a platform hop" becomes "high platforms need a double jump or a platform hop".

Plus input-adapter hardening from the Task 4 review (same commit):
- In `src/engine/input.js`, change `export const BUFFER_FRAMES = 6;` to `export const BUFFER_FRAMES = PHYS.INPUT_BUFFER;` (one source of truth; behaviorally identical today — values-into-data, called out).
- Add this comment directly above `export function buildIntent`:
  ```js
  // NOTE: `ctl.reversed` swaps held left/right but NOT the dash double-taps
  // below (raw key codes). Whether a reversed player's dash should reverse is
  // an open Phase-3 combat decision — Tim's call. Do not "fix" silently.
  ```
- Extend the existing `buildIntent` test in `tests/input.test.mjs` (add `PHYS` to its imports from physics.js) by appending inside the test body:
  ```js
  release(inp, 'KeyW');
  for (let f = 0; f < PHYS.INPUT_BUFFER; f++) inp.beginFrame();
  assert.equal(buildIntent(ctl, inp, P1MAP).jump, true);    // last buffered frame
  inp.beginFrame();
  assert.equal(buildIntent(ctl, inp, P1MAP).jump, false);   // window expired: PHYS owns the length
  release(inp, 'KeyD');
  for (let f = 0; f < 15; f++) inp.beginFrame();            // clear the tap window
  press(inp, 'KeyD'); inp.beginFrame(); release(inp, 'KeyD');
  for (let f = 0; f < 4; f++) inp.beginFrame();
  press(inp, 'KeyD'); inp.beginFrame();
  const i2 = buildIntent(ctl, inp, P1MAP);
  assert.equal(i2.dashRight, true);                         // adapter wires doubleTapped -> dash
  assert.equal(i2.dashLeft, false);
  ```

Plus one defect guard from the camera review (silent, permanent failure mode — called out per the engine-change policy): at the top of `Camera.target()` in `src/engine/camera.js` add

```js
    if (!points.length) return { x: this.x, y: this.y, zoom: this.zoom };  // never NaN-poison the lerp
```

pinned by this test appended to `tests/camera.test.mjs`:

```js
test('an empty target list leaves the camera where it is (no NaN poisoning)', () => {
  const c = cam();
  for (let i = 0; i < 30; i++) c.update([{ x: 700, y: 400 }]);
  const { x, y, zoom } = c;
  c.update([]);
  assert.ok(Number.isFinite(c.x) && Number.isFinite(c.y));
  assert.equal(c.x, x); assert.equal(c.y, y); assert.equal(c.zoom, zoom);
});
```

- [ ] **Step 2: Run** — the chair/match-over tests may already pass (code landed in Task 5); the personality test must pass against the Task-1 data as committed. Any failure = genuine defect — investigate before touching anything.

- [ ] **Step 3: One guarded implementation change** (fold-forward from the Task 5 review — double-KO on final stocks corrupted the winner; rule chosen: **draw**, flagged for Tim at the Task 8 checkpoint). Replace `MatchState.update` in `src/engine/match.js` with:

```js
  update(intents) {
    if (this.over) return;
    const out = [];
    this.players.forEach((p, i) => {
      if (p.respawn) { this._chair(p, intents[i]); return; }
      p.body.update(intents[i], this.stage);
      if (p.body.out) out.push(i);
    });
    if (out.length === 2 && this.players.every(p => p.stocks === 1)) {
      this.players.forEach(p => p.stocks--);                // simultaneous final-stock KO:
      this.over = true; this.winner = -1;                   // a DRAW — Tim to confirm
      this.events.push({ type: 'gameover', winner: -1 });
      return;
    }
    for (const i of out) this._ko(this.players[i], i);
  }
```

pinned by these two tests appended to `tests/match.test.mjs`:

```js
test('same-tick double-KO on final stocks is a draw, one event', () => {
  const m = newMatch();
  m.players[0].stocks = 1; m.players[1].stocks = 1;
  m.players[0].body.x = STAGE.blast.left - 5;
  m.players[1].body.x = STAGE.blast.right + 5;
  step(m);
  assert.equal(m.over, true);
  assert.equal(m.winner, -1);
  assert.deepEqual(m.events, [{ type: 'gameover', winner: -1 }]);
});

test('same-tick double-KO with stocks left costs one stock each, both ride chairs', () => {
  const m = newMatch();
  m.players[0].body.x = STAGE.blast.left - 5;
  m.players[1].body.x = STAGE.blast.right + 5;
  step(m);
  assert.equal(m.over, false);
  assert.equal(m.players[0].stocks, STOCKS - 1);
  assert.equal(m.players[1].stocks, STOCKS - 1);
  assert.ok(m.players[0].respawn && m.players[1].respawn);
});
```

Also add one line inside the `layout personalities are pinned` test (chair must descend, never ascend): `for (const g of [off, pal, pub, ber]) assert.ok(g.cameraBounds.y + 40 < g.respawn.y, 'chair starts above its hover point');`

If Step 2 exposed any OTHER defect, fix minimally and report it.

- [ ] **Step 4: Run; all PASS** — full suite 63/63.

- [ ] **Step 5: Commit** — `git add tests/match.test.mjs tests/stages.test.mjs tests/camera.test.mjs tests/input.test.mjs src/engine/match.js src/engine/camera.js src/engine/input.js src/data/stages.js DESIGN.md && git commit -m "Phase 2: double-KO draw rule; pin chair/match-over/layouts; camera + input hardening"`

---

### Task 7: The versus screen + `?graybox=<stage>` wiring

**Files:**
- Create: `src/screens/versus.js`
- Modify: `src/main.js` (extend the graybox flag block)

- [ ] **Step 0: Event-order defect fix first** (fold-forward from the Task 6 review; the screen below consumes `match.events` and assumes gameover is terminal — in a mixed-stock double-KO it currently isn't in one index order). In `src/engine/match.js`, change the final line of `update()` to process the final-stock player last:

```js
    for (const i of out.sort((a, b) => this.players[b].stocks - this.players[a].stocks))
      this._ko(this.players[i], i);
```

Pinned by this test appended to `tests/match.test.mjs` (and add `assert.deepEqual(m.events, [{ type: 'ko', player: 0 }, { type: 'ko', player: 1 }]);` to the existing "stocks left" double-KO test):

```js
test('mixed-stock double-KO: gameover is always the final event, winner correct', () => {
  for (const loser of [0, 1]) {
    const m = newMatch();
    m.players[loser].stocks = 1;
    m.players[0].body.x = STAGE.blast.left - 5;
    m.players[1].body.x = STAGE.blast.right + 5;
    step(m);
    assert.equal(m.over, true);
    assert.equal(m.winner, 1 - loser);
    assert.equal(m.events.at(-1).type, 'gameover');
  }
});
```

Run (red on the new test before the sort, green after; suite becomes 64/64), commit: `git add src/engine/match.js tests/match.test.mjs && git commit -m "Phase 2: gameover is always the terminal match event (mixed-stock double-KO)"`. The cosmetic remainder (the winner ends a mixed double-KO parked on a frozen chair, stock decremented) goes to the Task 8 checkpoint with the draw rule.

The rest of this task has no unit tests — visual shell over tested logic; verify with the Playwright checklist in Step 3.

- [ ] **Step 1: Implement `src/screens/versus.js`:**

```js
// v3 match screen (Phase 2): MovementBody + MatchState + Camera on real stage
// geometry. Dev-flagged via ?graybox=<stageId> for now; becomes the fight
// screen when Phase 3 ports the characters. Stage art is geometry-fidelity —
// the real paint arrives with the rig.

import { MatchState } from '../engine/match.js';
import { Camera } from '../engine/camera.js';
import { P1MAP, P2MAP, PlayerController, buildIntent } from '../engine/input.js';
import { stageById, geometryOf } from '../data/stages.js';
import { PRESETS, drawBody } from '../dev/graybox.js';

const PAPER = '#f2e9d8', INK = '#2b2620', NAVY = '#27425f', BRICK = '#c4452e', BRASS = '#c9a227';

export function makeVersus(G) {
  const c = G.canvas.getContext('2d');
  const ctl1 = new PlayerController(G.input, P1MAP);
  const ctl2 = new PlayerController(G.input, P2MAP);
  let stage, geo, match, camera, banner = null, paused = false;

  const start = (stageId) => {
    const id = geometryOf(stageId) ? stageId : 'office';   // bogus ?graybox=<id> falls back
    stage = stageById(id);
    geo = geometryOf(id);
    match = new MatchState(geo, [PRESETS[2], PRESETS[2]]);
    camera = new Camera(960, 540, geo.cameraBounds);
    banner = { text: stage.name, t: 90 };
  };

  const targets = () => match.players.map(p =>
    p.respawn ? { x: p.respawn.x, y: p.respawn.y } : { x: p.body.x, y: p.body.y - 48 });

  return {
    enter(p) { paused = false; start(p?.stageId ?? 'office'); },
    update() {
      if (G.input.backPressed()) paused = !paused;
      if (paused) { if (G.input.keyPressed('KeyQ')) G.go('title'); return; }
      if (match.over && G.input.keyPressed('KeyR')) start(stage.id);
      const i1 = buildIntent(ctl1, G.input, P1MAP);
      const i2 = buildIntent(ctl2, G.input, P2MAP);
      match.update([i1, i2]);
      [ctl1, ctl2].forEach((ctl, i) => {
        const p = match.players[i];
        if (p.respawn) return;                 // parked body: its consumed* flags are stale
        if (p.body.consumedJump) ctl.consume('up');
        if (p.body.consumedDodge) ctl.consume('dodge');
      });
      for (const ev of match.events.splice(0)) {
        if (ev.type === 'ko') { G.fx.shake(5, 12); banner = { text: 'STOCK LOST!', t: 70 }; G.audio.play('ko'); }
        if (ev.type === 'gameover') { banner = { text: ev.winner < 0 ? 'DRAW!' : `GAME! P${ev.winner + 1} WINS`, t: 9999 }; G.audio.play('bell'); }
      }
      camera.update(targets());
      if (banner && banner.t > 0) banner.t--;
    },
    draw() {
      // sky
      const grad = c.createLinearGradient(0, 0, 0, 540);
      grad.addColorStop(0, stage.sky[0]); grad.addColorStop(1, stage.sky[1]);
      Camera.reset(c);
      c.fillStyle = grad; c.fillRect(0, 0, 960, 540);
      // world
      const shake = G.fx.camera();
      camera.apply(c, shake.x * 2, shake.y * 2);
      c.strokeStyle = BRICK; c.setLineDash([10, 8]); c.lineWidth = 3 / camera.zoom;
      c.strokeRect(geo.blast.left, geo.blast.top, geo.blast.right - geo.blast.left, geo.blast.bottom - geo.blast.top);
      c.setLineDash([]);
      c.fillStyle = stage.groundFill;
      for (const s of geo.slabs) { c.fillRect(s.x, s.y, s.w, s.h); c.strokeStyle = INK; c.lineWidth = 2 / camera.zoom; c.strokeRect(s.x, s.y, s.w, s.h); }
      c.fillStyle = INK;
      for (const p of geo.platforms) c.fillRect(p.x, p.y, p.w, 6);
      match.players.forEach((p, i) => {
        const color = i === 0 ? NAVY : BRICK;
        if (p.respawn) {                       // the office chair
          c.fillStyle = INK;
          c.fillRect(p.respawn.x - 22, p.respawn.y + 4, 44, 8);
          c.fillRect(p.respawn.x - 3, p.respawn.y + 12, 6, 16);
          c.fillStyle = color; c.globalAlpha = 0.85;
          c.fillRect(p.respawn.x - 18, p.respawn.y - 92, 36, 96);
          c.globalAlpha = 1;
        } else drawBody(c, p.body, color);
      });
      Camera.reset(c);
      this.drawHud();
    },
    drawHud() {
      // off-screen arrows
      match.players.forEach((p, i) => {
        if (p.respawn) return;
        const s = camera.worldToScreen(p.body.x, p.body.y - 48);
        if (s.x >= 0 && s.x <= 960 && s.y >= 0 && s.y <= 540) return;
        const ax = Math.min(930, Math.max(30, s.x)), ay = Math.min(510, Math.max(30, s.y));
        c.fillStyle = i === 0 ? NAVY : BRICK;
        c.beginPath(); c.arc(ax, ay, 12, 0, Math.PI * 2); c.fill();
        c.fillStyle = PAPER; c.font = 'bold 13px monospace'; c.textAlign = 'center';
        c.fillText(`P${i + 1}`, ax, ay + 4);
      });
      // plates: composure bar (full until Phase 3) + stock pips
      match.players.forEach((p, i) => {
        const x = i === 0 ? 30 : 930 - 300;
        c.fillStyle = PAPER; c.fillRect(x, 18, 300, 54);
        c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(x, 18, 300, 54);
        c.fillStyle = '#3f5a40'; c.fillRect(x + 8, 26, 284, 16);   // full gauge (combat = Phase 3)
        for (let s = 0; s < 3; s++) {                              // desk-chair stock pips
          const px = x + 12 + s * 24, py = 52;
          c.fillStyle = s < p.stocks ? INK : 'rgba(43,38,32,0.25)';
          c.fillRect(px, py, 14, 10); c.fillRect(px + 5, py + 10, 4, 5);
        }
        c.fillStyle = INK; c.font = 'bold 13px monospace'; c.textAlign = i === 0 ? 'left' : 'right';
        c.fillText(`P${i + 1}`, i === 0 ? x + 8 : x + 292, 14);
      });
      if (banner && banner.t > 0) {
        c.fillStyle = PAPER; c.fillRect(330, 88, 300, 46);
        c.strokeStyle = INK; c.strokeRect(330, 88, 300, 46);
        c.fillStyle = INK; c.font = 'bold 20px monospace'; c.textAlign = 'center';
        c.fillText(banner.text, 480, 118);
      }
      if (match.over) {
        c.fillStyle = INK; c.font = '14px monospace'; c.textAlign = 'center';
        c.fillText('[R] rematch   [Esc] pause -> [Q] quit', 480, 520);
      }
      if (paused) {
        c.fillStyle = 'rgba(43,38,32,0.55)'; c.fillRect(0, 0, 960, 540);
        c.fillStyle = PAPER; c.font = 'bold 22px monospace'; c.textAlign = 'center';
        c.fillText('PAUSED — [Q] quit, [Esc] resume', 480, 270);
      }
    },
  };
}
```

- [ ] **Step 2: Wire the flag in `src/main.js`** — replace the Phase-1 graybox block with:

```js
  const gb = qp.get('graybox');                       // null = absent, '' = flat playground
  if (gb !== null && gb !== '') {
    const { makeVersus } = await import('./screens/versus.js');
    G.screens.versus = makeVersus(G);
  } else if (gb !== null) {
    const { makeGraybox } = await import('./dev/graybox.js');
    G.screens.graybox = makeGraybox(G);
  }

  G.go(gb === null ? 'title' : (gb === '' ? 'graybox' : 'versus'), gb ? { stageId: gb } : undefined);
```

- [ ] **Step 3: Playwright verification** (serve with `python3 -m http.server <port>`; screenshots OUTSIDE the repo):
  - `?graybox=office`: stage-name banner, sky gradient, slab + 3 platforms, dashed blast border, two bodies on spawns, two HUD plates with full green bars + 3 chair pips each. Console clean (3 known 404s OK).
  - Movement: run P1 toward P2 → camera zooms in as they close; run apart → zooms out; nothing outside `cameraBounds` ever visible.
  - Ring-out: run P1 off the left edge past the dashes → shake + "STOCK LOST!" banner, P1's pip empties, the chair descends from the top, pressing a key after arrival drops P1 onto it.
  - Lose three stocks → "GAME! P2 WINS" + [R] rematch works; Esc pauses; Q quits to title.
  - `?graybox=palace`, `?graybox=pub`, `?graybox=berlin` each load with their distinct layout.
  - Regressions: `?graybox` (no value) still the flat playground; bare `index.html` → title; `?sim=10` → v2 gates pass.
- [ ] **Step 4: Full suite** — `node --test 'tests/*.test.mjs'` → 64/64 (Step 0 added one test; the screen adds none).
- [ ] **Step 5: Commit** — `git add src/screens/versus.js src/main.js && git commit -m "Phase 2: versus screen — stages, camera, stocks, chair, HUD v3 behind ?graybox=<stage>"`

---

### Task 8: Wrap-up

- [ ] **Step 1: Full verification** — suite 64/64; `wc -l` on every new/modified file < 500; the Task 7 checklist green.
- [ ] **Step 2: Push** — `git push`.
- [ ] **Step 3: STOP for Tim.** Phase 2 is a checkpoint, not a hard gate: hand Tim `?graybox=office|palace|pub|berlin`, ask him to feel the camera (ease/zoom speed, padding) and the stage sizes/blast distances. Two specific review flags to put in front of him: palace currently has the TIGHTEST side-blast room (430px from slab edge) despite DESIGN calling it longest-side-survival (widening its blast to left 370 / right 2030 restores the ordering if he agrees), the pub P2 spawn sits visually under the bench, and the double-KO rule is currently a DRAW (winner -1) — confirm or pick sudden-death; in a mixed-stock double-KO the winner still loses a stock and ends parked on a frozen chair (cosmetic — confirm). Confirm before Phase 3 (characters in pairs) is planned. Camera knobs (`pad`, `ease`, `maxZoom`) are constructor options — tune in `versus.js`'s `new Camera(...)` call if he has notes; if any survive tuning, consider promoting them to `PHYS`.

---

## Out of scope (later phases)

Combat/aerials/knockback (Phase 3), the animation rig and real stage art, AI (Phase 4), hazards/music/sim gates (Phase 5). The v2 game keeps running untouched until Phase 3 replaces the fight flow.
