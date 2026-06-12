# BALANCE.md — Bellwether Battlers

*v3 (platform fighter). Canonical for numbers and rules where DESIGN.md and this file could drift.*

## Philosophy

1. **Soft archetype wheel, re-read for platforms.** Zoners (Richy, Ben) control the stage and force approaches; rushdown (Adrian, Nick) wins up close and off-stage; tanks (Mike, Seelye) survive to high gauge-emptiness and kill earliest. *Soft*: difficulty, not destiny — every fighter has a written answer into every other.
2. **Telegraph rule (canonical, OR-form).** Any move dealing ≥ 12 gauge, carrying a status, **unparryable**, or **spiking** needs at least one of: ≥ 18f readable startup, a distinct sound cue, or a fixed/marked arrival point.
   **Unparryable (v3 definition, replaces v2 "unblockable"):** pierces Calendar Block's parry and Dad Reflexes' catch and cannot be armored through; whiffs against airborne and non-actionable fighters; dodge i-frames avoid it. The universal answer is *jump it*.
3. **Counterplay is a hard requirement.** Every special and super ships with a written counter in DESIGN.md. No counter, no ship. Spikes are covered collectively by the spike counter-rules (telegraph rule; heaviest landing lag; spiking off-stage risks your own stock) — an individual spike needs its own written counter only if it breaks those defaults.
4. **Statuses are short, visible, worded.** *Impairing* statuses (slow, reversed, silence, burn) cap at 3.5 s, callouts + duration bars, nothing self-stacks, reversal still ends when its owner converts. Marks and self-buffs (lien 8 s, LIFETIME PLATINUM's haste/dmgUp 4 s, Zulu Time's nextHit 10 s) are exempt from the cap — they impair nobody — but keep callouts and declared durations. The two staggers are fixed-frame *states* (Numbers doctrine), not statuses.
5. **Hazards never decide matches.** Telegraphed ≥ 1 s; knockback ≤ 6.0 (below kill-class, see Knockback); never directed toward a blast zone; symmetric or dodgeable; suppressed during supers; hazard staggers are never comboable (recovery invulnerability).
6. **No camping packages.** Composure refills **only** on stock loss — waiting heals nothing. *The single exception:* ABI's PUB O'CLOCK regen (2/s for 5 s), which cancels on any hit — it forces her opponent to engage, the opposite of camping; gates 2–4 cover any abuse. Hazard rewards are meter-only. Off-stage time is risk by construction (no ledge invulnerability, air dodge once per airtime). Hazards push toward centre. Self-buff supers that don't commit their user to engaging (LIFETIME PLATINUM) build no meter while active. Camping and ledge-stalling must sim worse than fighting (gates 2–4).
7. **Recovery is a balance axis, not a right.** Who has a recovery special is deliberate (Ben, Adrian, Nick: yes; Mike: emphatically not). Tune kill power against recovery strength, not in isolation.

## Numbers doctrine

- **Gauge band:** 85 (Nick) – 110 (Ben/Mike/Seelye). **Weight band:** 0.85 (Nick) – 1.45 (Mike). **Run band:** 2.4 (Mike) – 3.7 (Nick) px/frame at base zoom. Fall speed correlates with weight (floaties live longer upward, die earlier sideways). Per-character values live in `src/data/characters/<id>.js`, inside these bands; `physics.js` holds the universal constants and formulas.
- **Knockback (canonical formula):**
  `kb = (move.kb + move.kbScale × emptiness) / weight`, where `emptiness = 1 − gauge/maxGauge`.
  **kb is the launch speed in px/frame at base zoom, set (not added) along `kbAngle`** (per-move data, degrees; spikes use 270 ± 15) on the frame the hit lands. Hitstun = `round(kb × HITSTUN_PER_KB)` frames.
  **Kill-class** = kb ≥ 12 on connect (carries a mid-weight from the edge past the side blast zone). Hazards cap at 6.0.
  Starting bands — lights kb 4–6 / kbScale 4–6 · nair/uair same · **side-airs (the aerial kill move) kb 5–7 / kbScale 8–12** · spikes kb 5–7 / kbScale 8–10 (angle 270 ± 15) · heavies kb 6–8 / kbScale 10–14 · specials kb 5–9 / kbScale 6–12 · damage supers kb 8–10 / kbScale 14–18.
- **Kill calibration** (checked against the bands): a Heavy (8 + 14×0.7 = 17.8) or top-band side-air (7 + 12×0.7 = 15.4) on a mid-weight at ≤ 30% gauge near the edge clears kill-class 12 and KOs. **Nothing KOs a full-gauge mid-weight from centre stage — supers included** (at emptiness 0 even a damage super tops out at kb 10): kills come from gauge drain or edge proximity, never openers. Spikes KO off-stage at any gauge below ~70% — that's their job; their counterweights are the telegraph rule, the heaviest landing-lag band, and the fact that spiking off-stage risks your own stock.
- **Armor (canonical definition):** during a move's declared armor frames, the first N hits taken (N = the armor value, usually 1) deal their gauge damage and apply their statuses but inflict **no knockback and no hitstun**; the armor is then spent for that use of the move. Unparryables cannot be armored through (Philosophy 2). Armor never blocks throws that connect by their own rules.
- **Damage:** v2 values carry as gauge damage — lights 4–6, heavies 9–14, single-hit specials 7–14 (multi-hit and zone effects run lower per touch), damage supers 18–22 total. **No single interaction above 25 gauge.** Multi-part supers enforce this structurally.
- **Frame data:** every move declares `startup/active/recover` (+ `landLag` for aerials). The engine clamps missing fields to 0 — a 0-frame move is wrong on purpose; declare real frames. Aerials: startup 5–9f lights, landLag 6–14f; dair landLag at the high end.
- **Meter:** gain = 80% gauge damage dealt + 50% taken; super costs 100; persists across stocks, resets each match.
- **Dodge:** spot/step 18f duration, i-frames 2–13; air dodge 22f, i-frames 3–15, directional impulse 4.5; **air dodge is once per airtime** (refreshed on landing or respawn) on top of the **shared 72f cooldown**. Dodging is a resource: two reads per dodge cycle.
- **Self-stagger** (Adrian's tax, replaces v2 trips): 30f non-actionable, fully vulnerable, no invulnerability on exit. **Hazard stagger:** 20f, never comboable, invulnerable through recovery.
- **Respawn:** invulnerable until first action, hard cap 180f; spawn platform (the chair) descends from centre-top over 60f.

## physics.js — frozen values (graybox sign-off 2026-06-12)

*Tim played the Phase-1 graybox and signed off on the starting values unchanged — these are now canonical. Tuning later is fine, but `src/data/physics.js` and this table change in the same commit. World units: px at base zoom (960×540 viewport; stages ~2.5 viewports wide including blast-zone margins). Per-character entries are bands the character files must respect.*

| Constant | Start | Constant | Start |
|----------|-------|----------|-------|
| GRAV (global) | 0.55 px/f² | RUN_ACCEL | 0.35 |
| RUN_FRICTION | 0.82 | RUN_MAX | per-char 2.4–3.7 |
| JUMP_IMPULSE | per-char 10–12 | DOUBLE_JUMP | 0.92 × jump |
| AIR_ACCEL | 0.22 | AIR_MAX | 0.85 × run |
| FAST_FALL_MULT | 2.5 | FALL_MAX | per-char 9–13 |
| DASH_SPEED | 1.8 × run | DASH_DURATION | 14f |
| DASH_TAP_WINDOW | 12f | DASH_COOLDOWN | 24f after dash ends |
| DASH_JUMP_CARRY | 1.0 (full) | COYOTE_FRAMES | 5 |
| INPUT_BUFFER | 6f | HITSTUN_PER_KB | 2.4 |
| DODGE_COOLDOWN | 72f | STEP_DODGE_IMPULSE | 3.5 |
| DROP_THROUGH_GRACE | 8f soft-plat collision ignored after a drop | | |
| AIR_MOMENTUM_DECAY | 0.985 | GROUND_DEADZONE | 0.05 |
| SPOT_DODGE_DURATION | 18f (i-frames 2–13) | AIR_DODGE_DURATION | 22f (i-frames 3–15) |
| AIR_DODGE_IMPULSE | 4.5 | | |

I-frame windows are **0-indexed engine ticks** counted from the dodge's first full tick (the start tick is tick 0) — combat code must read them with that convention.

Movement semantics frozen with the values: dash initiates grounded-only (air double-taps do nothing) and its **direction latches at start — dashes are not steerable**; dash-jump carries the momentum airborne; a double jump cancels a still-live dash; jump wins a same-tick drop+jump; fast-fall (down held) lands **on** soft platforms; drop-through needs a fresh tap (DESIGN.md, Movement). Air dodge suspends gravity for its 22f and a neutral air dodge zeroes all momentum — **re-confirm that interaction when Phase-2 knockback lands** (an air dodge that cancels launch momentum is a big defensive lever).

## Sim methodology

`index.html?sim=N` (dev flag; dynamically imported): headless CPU-vs-CPU, Normal AI, hazards ON, all 56 ordered pairings × N across the three selectable stages, seeded RNG. A sim match = 3 stocks, frame-capped at 10,800 (3 min); at the cap the harness scores remaining stocks, then remaining gauge — and the match is flagged for gate 4.

**Ship gates:**
1. **Band:** every fighter's aggregate win rate within **42–58%**.
2. **Anti-camp:** a keep-away/platform-camping profile must not exceed the standard profile by more than noise (≤ 55% aggregate).
3. **Anti-ledge-stall:** an off-stage-loitering/dodge-stalling profile must lose outright (≤ 45% aggregate) — if hovering near blast zones isn't suicidal, recovery is overtuned.
4. **Engagement:** matches with > 12 s between hit interactions, or > 25% combined off-stage-loiter time, get flagged; flags must stay **< 2%** of matches.
5. **Recovery competence (AI honesty):** stocks lost with an unspent double jump while within recovery range must stay **< 10%** — above that, the CPUs are dishonest and the win matrix is noise, not balance. (*Recovery range* is computed by the harness: the loser's remaining jump/air-dodge impulses could still have carried them back over a stage surface from the point of death; the operational definition lives in `sim.js`.)

Two independent samples before shipping a tuning pass: n ≈ 420–560 games per fighter at N = 30–40 (95% CI ≈ ±5); `?sim=10` is a smoke check only. CPU sims stay blind to human-feel issues — graybox and phase playtests govern feel; the gates govern fairness.

**First human playtest should poke:** dash-jump feel vs. Brawlhalla, edge-guard vs. each recovery special, Mike's recovery misery (intended, but is it fun?), spike spam, hazards near edges, Seelye's diaper (is the slow rude off-stage?), Abi's regen exception (does Last Orders feel campy in practice?).

## Current results

*Pending Phase 5 — no v3 sim results yet. Gates above define done.*

v2 final (historical, 2026-06-10, health-bar rules): all eight fighters passed 42–58% at N=30 and N=40 with stall-bot ≤ 0.1%. v2 numbers are retired with the pivot and kept only in git history.
