# Bellwether Battlers — Project Conventions

## What this is

A lightly pixelated browser fighting game (HTML5 canvas + vanilla JS ES modules) deployed as a static site to GitHub Pages. The repo is `bellwether-brawlers` (renamed from `desk-warriors` 2026-06-10; local checkouts may still use the old folder name); the game is **Bellwether Battlers**.

## Hard rules

- **Zero build step.** Pure static HTML/JS/CSS ES modules. No framework, no bundler, no `package.json`, no dependencies. The only external resource is Google Fonts via CDN (graceful fallback).
- **ES modules + image assets do NOT work from `file://`.** Always test via a local server (`python3 -m http.server`) — never by double-clicking index.html. `index.html` is the entry point.
- **Everything is data-driven.** Characters live in `src/data/characters.js`, stages in `src/data/stages.js`, events in `src/data/events.js`. Engine code (`src/engine/`, `src/render/`) never hard-codes content. Adding content must not require engine changes.
- **Headshots are drop-in.** `assets/headshots/<id>.png` keyed by character id, loaded by manifest with cartoon-head fallback. Adding `abi.png` later must Just Work.
- **Sprites are drop-in too.** `assets/sprites/<id>/{idle,run,jump,attack,hurt}.png` (64 px cells) plus `{heavy,special}.png` (80 px cells, same pixel scale, normalised to the stance frame), all described in `src/data/sprites.js`; a missing strip falls back to `attack`/`idle` with the drawn-body fallback in `src/render/body.js`. A missing sheet must never break a fight. Sheets come from Higgsfield (style formula + per-character prompt, see DESIGN.md Art direction) — keep the `sprites.js` frame counts in step with the PNGs. Every new sheet goes through `tools/art/despill.py` (the magenta key bleeds into the outline as a pink fringe otherwise); `tests/sprite-art.test.mjs` fails on any magenta-tinted palette colour.
- **Stage backdrops are drop-in.** `assets/stages/<id>.png` (480×270, PNG-8, drawn ×4 behind the slab) with the procedural-layer fallback in `src/render/stage.js`. A missing backdrop must never break a stage. The arena piece `assets/stages/<id>-slab.png` (the main slab drawn as a floating chunk of the scene, 512 px wide, top edge = walkable top) is drop-in the same way, falling back to the procedural `drawSlab()`; it never changes geometry.
- **UI art is drop-in.** `assets/ui/{logo,vs,trophy}.png` (Higgsfield, keyed PNG-8) are loaded by `loadUIArt()`; each has a code-drawn fallback in `src/render/ui.js`. Menu screens draw with that kit, not ad-hoc canvas calls.
- **Kits are derived.** A character file declares `light`, `heavy`, `aerials`; `expandKit()` in `src/data/characters/_shared.js` derives the side/down lights, the three signatures, the recovery and the ground pound. Tune per fighter under `kit`, never by hand-copying variants.
- **Never commit `character photos/`** (the raw originals — gitignored). Only the processed `assets/headshots/*.png` are committed; the user explicitly approved publishing those.
- **Display names are first names only.**
- **Not neon.** Warm paper/ink palette, daylight stages, no glows/bloom/scanlines. Diegetic light is fine.
- Keep files under 500 lines. Frame-rate logic is fixed-timestep 60 Hz — never tie gameplay to rAF rate.
- **Engine change policy.** Combat semantics and anything feel-affecting (hit resolution, stun/knockback/armor rules, movement physics, new move kinds) need Tim's explicit sign-off first. Defect fixes with a reproducible repro and before/after evidence, and changes that move hardcoded values into data, are allowed without asking — but must re-pass the BALANCE.md sim gates and be called out explicitly, never buried. Structural rewrites only on request.
- DESIGN.md and BALANCE.md are the source of truth for kits, numbers and fairness rules. Change docs and code together; BALANCE.md is canonical where they conflict.

## Workflow

- **Small, focused commits.** One logical change per commit.
- **Always verify after changes:** serve locally, open the page, confirm no console errors and the title screen renders. For gameplay changes, also run the tests (`node --test 'tests/*.test.mjs'`) and the balance sim (`node src/dev/sim.js 30 1337` and `… 2024`, or `?sim=10` in the browser as a smoke check) and re-check all five BALANCE.md gates before shipping.
- Dev flags: `?sim=N` (balance harness, dynamically imported), `?graybox` (movement playground), `?event=<id>` (force a hazard next roll). Keep them out of normal play paths.

## Deployment

- Push to `main` → GitHub Pages via `.github/workflows/deploy.yml` (repo root, no build). What's in the repo is what's served — don't commit anything that shouldn't be public.
