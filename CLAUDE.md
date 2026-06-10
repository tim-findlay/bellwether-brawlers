# Bellwether Battlers — Project Conventions

## What this is

A lightly pixelated browser fighting game (HTML5 canvas + vanilla JS ES modules) deployed as a static site to GitHub Pages. The repo is `bellwether-brawlers` (renamed from `desk-warriors` 2026-06-10; local checkouts may still use the old folder name); the game is **Bellwether Battlers**.

## Hard rules

- **Zero build step.** Pure static HTML/JS/CSS ES modules. No framework, no bundler, no `package.json`, no dependencies. The only external resource is Google Fonts via CDN (graceful fallback).
- **ES modules + image assets do NOT work from `file://`.** Always test via a local server (`python3 -m http.server`) — never by double-clicking index.html. `index.html` is the entry point.
- **Everything is data-driven.** Characters live in `src/data/characters.js`, stages in `src/data/stages.js`, events in `src/data/events.js`. Engine code (`src/engine/`, `src/render/`) never hard-codes content. Adding content must not require engine changes.
- **Headshots are drop-in.** `assets/headshots/<id>.png` keyed by character id, loaded by manifest with cartoon-head fallback. Adding `abi.png` later must Just Work.
- **Never commit `character photos/`** (the raw originals — gitignored). Only the processed `assets/headshots/*.png` are committed; the user explicitly approved publishing those.
- **Display names are first names only.**
- **Not neon.** Warm paper/ink palette, daylight stages, no glows/bloom/scanlines. Diegetic light is fine.
- Keep files under 500 lines. Frame-rate logic is fixed-timestep 60 Hz — never tie gameplay to rAF rate.
- DESIGN.md and BALANCE.md are the source of truth for kits, numbers and fairness rules. Change docs and code together; BALANCE.md is canonical where they conflict.

## Workflow

- **Small, focused commits.** One logical change per commit.
- **Always verify after changes:** serve locally, open the page, confirm no console errors and the title screen renders. For gameplay changes, also run the balance sim (`?sim=10`) and re-check the 42–58% band + stall gate before shipping.
- Dev flags: `?sim=N` (balance harness, dynamically imported), `?event=<id>` (force an event next roll). Keep them out of normal play paths.

## Deployment

- Push to `main` → GitHub Pages via `.github/workflows/deploy.yml` (repo root, no build). What's in the repo is what's served — don't commit anything that shouldn't be public.
