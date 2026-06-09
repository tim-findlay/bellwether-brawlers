# Desk Warriors — Project Conventions

## What this is

A single-file browser fighting game (HTML5 canvas + vanilla JS) deployed as a static site to GitHub Pages.

## Hard rules

- **Zero build step.** Pure static HTML/JS/CSS. No framework, no bundler, no `package.json`, no dependencies. Don't introduce any of these. (The game's only external resource is Google Fonts via CDN, with graceful fallback.)
- **The game is one self-contained file: `index.html`.** Markup, styles, and the entire engine live there. Do not split it into modules or refactor the engine without an explicit request — it works, and regressions matter more than structure.
- **Never commit `character photos/`.** It contains personal photos of real people and is gitignored — the deploy workflow publishes the repo root to a public website.
- **The `CHARACTERS` array is the roster's single source of truth.** It sits at the top of the `<script>` in `index.html`. The select screen, HUD, AI, and move list all read from it. Roster changes = edit that array only. The select grid is laid out for exactly 8 fighters (4×2) — replace fighters rather than appending beyond 8.

## Workflow

- **Small, focused commits.** One logical change per commit.
- **Always verify the page loads after changes:** run `python3 -m http.server` from the repo root, open the page, and confirm the title screen renders with no browser console errors before committing.

## Deployment

- Pushing to `main` deploys the repo root to GitHub Pages via `.github/workflows/deploy.yml` (upload-pages-artifact → deploy-pages). No build step in CI — keep it that way.
