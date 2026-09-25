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

- **Gauge band:** 85 (Nick) – 110 (Ben/Seelye). **Weight band:** 0.9 (Nick) – 1.08 (Mike) — narrowed in the Phase-3 pass: weight divides the launch speed linearly, so the old 0.85–1.45 spread alone swung kill thresholds by ~70 %. **Run band:** 4.4 (Mike) – 6.2 (Nick) px/frame at base zoom. Fall speed correlates with weight (floaties live longer upward, die earlier sideways). Per-character values live in `src/data/characters/<id>.js`, inside these bands; `physics.js` holds the universal constants and formulas.
- **Knockback (canonical formula):**
  `kb = (move.kb + move.kbScale × emptiness) / weight`, where `emptiness = 1 − gauge/maxGauge`.
  **kb is the launch speed in px/frame at base zoom, set (not added) along `kbAngle`** (per-move data, degrees; spikes use 270 ± 15) on the frame the hit lands. Hitstun = `round(kb × HITSTUN_PER_KB)` frames.
  **Kill-class** = kb ≥ 12 on connect (carries a mid-weight from the edge past the side blast zone). Hazards cap at 6.0.
  Bands — lights kb 4–6 / kbScale 4–6 · nair/uair same · **side-airs (the aerial kill move) kb 5–7.5 / kbScale 8–13** · spikes kb 5–7 / kbScale 8–10 (angle 270 ± 15) · heavies kb 6–8 / kbScale 10–13, **startup 10–16f** (a heavy is a commitment, never a poke) · specials kb 5–9 / kbScale 6–13 · damage supers kb 8–10 / kbScale 14–18.
- **Kill calibration** (checked against the bands): a Heavy (7.5 + 12.5×0.7 = 16.3) or top-band side-air (7.5 + 13×0.7 = 16.6) on a mid-weight at ≤ 30% gauge near the edge clears kill-class 12 and KOs. **What a KO looks like in practice (sim finding):** side-blast deaths are rare (~2 %); a kill is a launch that carries the victim so far past the lip that the fall runs out before the drift + double jump gets them back — the bottom blast zone does the work. Kill-class 12 from the edge is right at that threshold under the current LAUNCH_DRAG / fall bands. **Nothing KOs a full-gauge mid-weight from centre stage — supers included** (at emptiness 0 even a damage super tops out at kb 10): kills come from gauge drain or edge proximity, never openers. Spikes KO off-stage at any gauge below ~70% — that's their job; their counterweights are the telegraph rule, the heaviest landing-lag band, and the fact that spiking off-stage risks your own stock.
- **Armor (canonical definition):** during a move's declared armor frames, the first N hits taken (N = the armor value, usually 1) deal their gauge damage and apply their statuses but inflict **no knockback and no hitstun**; the armor is then spent for that use of the move. Unparryables cannot be armored through (Philosophy 2). Armor never blocks throws that connect by their own rules.
- **Damage:** v2 values carry as gauge damage — lights 4–6, heavies 9–14, single-hit specials 7–14 (multi-hit and zone effects run lower per touch), damage supers 18–22 total. **No single interaction above 25 gauge.** Multi-part supers enforce this structurally.
- **Frame data:** every move declares `startup/active/recover` (+ `landLag` for aerials). The engine clamps missing fields to 0 — a 0-frame move is wrong on purpose; declare real frames. Aerials: startup 5–9f lights, landLag 6–14f; dair landLag at the high end.
- **Meter:** gain = 80% gauge damage dealt + 50% taken; super costs 100; persists across stocks, resets each match.
- **Dodge:** spot/step 18f duration, i-frames 2–13; air dodge 22f, i-frames 3–15, directional impulse 4.5; **air dodge is once per airtime** (refreshed on landing or respawn) on top of the **shared 72f cooldown**. Dodging is a resource: two reads per dodge cycle.
- **Self-stagger** (Adrian's tax, replaces v2 trips): 30f non-actionable, fully vulnerable, no invulnerability on exit. **Hazard stagger:** 20f, never comboable, invulnerable through recovery.
- **Respawn:** invulnerable until first action, hard cap 180f; spawn platform (the chair) descends from centre-top over 60f.

## physics.js — Phase-3 retune (2026-09-25)

*Tim's Phase-3 brief ("seriously improve the physics — fast paced") is the sign-off for this retune; it supersedes the graybox-frozen table (kept in git history). Everything got faster and heavier: run speeds ≈ ×1.7, gravity ×1.55 with taller impulses (jumps of the same height that resolve in fewer frames), a skid-turn multiplier, stronger air control, shorter dash and dodge cooldowns. `src/data/physics.js` and this table change in the same commit. World units: px at base zoom (960×540 viewport). Per-character entries are bands the character files must respect.*

| Constant | Value | Constant | Value |
|----------|-------|----------|-------|
| GRAV (global) | 0.85 px/f² | RUN_ACCEL | 0.9 |
| TURN_ACCEL_MULT | 2.2 (accel × this while vx opposes the held direction) | RUN_FRICTION | 0.76 |
| RUN_MAX | per-char 4.4–6.2 | JUMP_IMPULSE | per-char 14–16 |
| DOUBLE_JUMP | 1.0 × jump | AIR_ACCEL | 0.55 |
| AIR_MAX | 0.9 × run | FAST_FALL_MULT | 2.2 |
| FALL_MAX | per-char 12–16 | DASH_SPEED | 1.7 × run |
| DASH_DURATION | 12f | DASH_TAP_WINDOW | 12f |
| DASH_COOLDOWN | 16f after dash ends | DASH_JUMP_CARRY | 1.0 (full) |
| COYOTE_FRAMES | 5 | INPUT_BUFFER | 6f |
| HITSTUN_PER_KB | 2.0 | LAUNCH_DRAG | 0.975 (vx × this per frame while stunned in the air) |
| STUN_LANDING_CLEARS | false (hitstun is time-based; a landing keeps the remaining frames as ground flinch) | DODGE_COOLDOWN | 60f |
| STEP_DODGE_IMPULSE | 6 | SPOT_DODGE_DURATION | 18f (i-frames 2–13) |
| AIR_DODGE_DURATION | 22f (i-frames 3–15) | AIR_DODGE_IMPULSE | 7 |
| DROP_THROUGH_GRACE | 8f | AIR_MOMENTUM_DECAY | 0.985 |
| GROUND_DEADZONE | 0.05 | | |

Jump arcs under the new table (MID: impulse 15): single-jump rise ≈ 132 px in 18 frames; jump → double-jump ≈ 264 px (the double jump is a full jump since the balance pass — the recovery lever that keeps kill-class at 12). **Consequence called out:** the low platforms (≈110 px above the slab) are now single-jump reachable — the Phase-2 "deliberately just short" rule is retired in favour of pace; upper platforms still need the double jump or a platform hop.

I-frame windows are **0-indexed engine ticks** counted from the dodge's first full tick (the start tick is tick 0) — combat code must read them with that convention.

Movement semantics unchanged from the graybox freeze: dash initiates grounded-only (air double-taps do nothing) and its **direction latches at start — dashes are not steerable**; dash-jump carries the momentum airborne; a double jump cancels a still-live dash; jump wins a same-tick drop+jump; fast-fall (down held) lands **on** soft platforms; drop-through needs a fresh tap (DESIGN.md, Movement). **New (Phase 3):** `MovementBody.launch(vx, vy, stun)` is the only way combat moves a body — while `stun > 0` the body ignores intent, keeps gravity, and its vx decays by LAUNCH_DRAG in the air (RUN_FRICTION on the ground). Air dodge still suspends gravity for its 22f; a neutral air dodge zeroes all momentum — a real defensive lever against launches (dodge cooldown 60f makes it one read per launch).

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

**v3 balance pass 1 (2026-09-25) — all five gates PASS on two independent seeds at N = 30** (`node src/dev/sim.js 30 1337` / `… 2024`, 1680 matches + 840 camp + 840 stall each, n = 420 games per fighter, 95 % CI ≈ ±5).

| Fighter | seed 1337 | seed 2024 |
|---|---|---|
| Ben | 42.1 % | 43.8 % |
| Tim | 53.8 % | 50.2 % |
| Adrian | 47.9 % | 47.4 % |
| Richy | 46.0 % | 48.6 % |
| Nick | 52.9 % | 52.9 % |
| Abi | 52.1 % | 46.7 % |
| Mike | 50.7 % | 55.0 % |
| Seelye | 54.5 % | 55.5 % |
| **camp (≤ 55)** | 21.3 % | 23.6 % |
| **stall (≤ 45)** | 0.8 % | 1.2 % |
| **engagement flags (< 2 %)** | 0.06 % | 0.18 % |
| **recovery dishonest (< 10 %)** | 0.08 % | 0.03 % |

Matrix, seed 1337 (row beats column, /30): Ben v Tim 14 · Adrian 13 · Richy 20 · Nick 9 · Abi 18 · Mike 15 · Seelye 6 — Tim v Ben 23 · Adrian 22 · Richy 19 · Nick 21 · Abi 14 · Mike 13 · Seelye 23 — Adrian v Ben 18 · Tim 21 · Richy 21 · Nick 15 · Abi 16 · Mike 17 · Seelye 25 — Richy v Ben 12 · Tim 15 · Adrian 17 · Nick 17 · Abi 15 · Mike 19 · Seelye 9 — Nick v Ben 21 · Tim 18 · Adrian 20 · Richy 11 · Abi 18 · Mike 20 · Seelye 16 — Abi v Ben 17 · Tim 17 · Adrian 26 · Richy 16 · Nick 19 · Mike 12 · Seelye 20 — Mike v Ben 12 · Tim 15 · Adrian 21 · Richy 15 · Nick 11 · Abi 22 · Seelye 20 — Seelye v Ben 25 · Tim 19 · Adrian 23 · Richy 19 · Nick 20 · Abi 15 · Mike 17. Avg match 4010 f (67 s); 0 capped, 0 stuck. **Known soft spots:** Ben sits at the bottom of the band (both seeds); Seelye beats Ben and Richy ~5:1 (Leverage's lien + Brisket zones vs two fighters who want distance); Abi beats Adrian ~6:1 (the parry eats his lunge/flurry). Worth a second pass with human playtest notes, not a numbers-only one.

**What the pass changed and why** (all data + AI; no combat semantics touched):

- *Diagnosis (kill-source instrumentation over 4 games/pairing):* ~85 % of KOs were lip heavies, deaths were 98 % bottom-blast, and the pre-pass matrix was decided by whose heavy connected in a walk-up exchange — startup 8–9f heavies (Nick, Abi) and the armored one (Mike) won every trade; Richy's 150° pull-heavy never killed outward; weight 0.85–1.45 swung the same hit's launch by 70 %.
- *physics.js:* HITSTUN_PER_KB 2.4 → 2.0 (launched fighters act sooner), DOUBLE_JUMP_FACTOR 0.95 → 1.0 (recovery reach), LAUNCH_DRAG 0.98 → 0.975 (launches shed speed a touch faster; kill-class stays 12 from the lip).
- *Heavy startups into a 10–16f band:* Nick 9 → 12, Abi 8 → 10, Adrian 10 → 11, Tim 11 → 12, Richy 11 → 12 (Seelye 12, Mike 14, Ben 16 unchanged). Mike's Wrecking Swing recover 22 → 26 (the armor now costs a real punish window).
- *Weights narrowed:* Mike 1.45 → 1.08, Ben 1.25 → 1.06, Seelye 1.15 → 1.05, Richy 1.0 → 1.05, Abi 0.9 → 1.0, Adrian 0.95 → 0.97, Nick 0.85 → 0.9. Gauges: Mike 110 → 102, Richy 96 → 104, Abi 90 → 96, Adrian 86 → 94.
- *Kill power:* Mike heavy 8/14 → 7/11.5, Ben Wingspan 8/14 → 7.5/12.5 (dmg 12 → 11), Seelye Leverage 7/12 → 7/11.5 (dmg 13 → 11), Nick heavy 6.5/12 → 6/10, Tim heavy 7/12 → 7/11, Abi heavy 6.5/11 → 7/12 (dmg 9 → 10), Adrian Pivot Table 7/11 → 7/12 (dmg 9 → 10), Richy Short Squeeze 6/10 → 6.5/11 (still a 150° pull). Side-airs: Richy Meme Slap 7/12 → 7.5/13, Adrian Overreach and Abi Tote Swing 6/10 → 6.5/11. Richy's candles are his outward kill tool now: Bull Run 6/8 @70° → 7/13 @40° (dmg 9 → 10, cooldown 130 → 80f), Bear Raid 6/7 @55° → 6/9 @45° (cooldown 150 → 100f); Adrian's Clumsy Charge 7/9 → 8/11.
- *Lights:* Mike Hard Hat 6 dmg 5.5/6 → 5 dmg 5/6; Seelye Term Sheet 6 → 5 dmg; Abi Reschedule and Adrian Toothbrush Jab 4 → 5 dmg (Jab recover 14 → 10); Richy Bid recover 9 → 8. Richy runMax 5.2 → 5.4.
- *AI (src/engine/ai/):* lights are the neutral poke (heavy bias 0.35, rising with the target's emptiness / edge proximity / kill mode 0.85); the CPU respects a heavy or armored swing in its path (dodge or hop out, then punishes the recovery) and never feeds a light into armor frames; a zoner never retreats onto the lip; a pull-heavy fighter (Richy) kills with candles and the side-air in kill mode.
- *Hit provenance:* `takeHit` now receives `from` and `move` (data only — used by the kill-source diagnostic and available to FX).

v2 final (historical, 2026-06-10, health-bar rules): all eight fighters passed 42–58% at N=30 and N=40 with stall-bot ≤ 0.1%. v2 numbers are retired with the pivot and kept only in git history.
