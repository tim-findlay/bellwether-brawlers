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
  `kb = (move.kb × KB_BASE_MULT + move.kbScale × KB_SCALE_MULT × emptiness) / weight`, where `emptiness = 1 − gauge/maxGauge` (multipliers 0.8 / 2.0 since the Phase-3b feel pass: early hits flinch, late hits kill).
  **kb is the launch speed in px/frame at base zoom, set (not added) along `kbAngle`** (per-move data, degrees; spikes use 270 ± 15) on the frame the hit lands. Hitstun = `round(kb × HITSTUN_PER_KB)` frames.
  **Kill-class** = kb ≥ 17 on connect (carries a mid-weight from the lip past the widened side blast zone through two air jumps, an air dash and a ledge grab — sim-measured: the 25th-percentile fatal launch is 16.8 px/f, median 25). Hazards cap at 6.0.
  Bands — lights kb 4–6 / kbScale 4–6 · nair/uair same · **side-airs (the aerial kill move) kb 5–7.5 / kbScale 8–13** · spikes kb 5–7 / kbScale 8–10 (angle 270 ± 15) · heavies kb 6–8 / kbScale 10–13, **startup 10–16f** (a heavy is a commitment, never a poke) · specials kb 5–9 / kbScale 6–13 · damage supers kb 8–10 / kbScale 14–18.
- **Kill calibration** (checked against the bands, Phase 3b): a top-band Heavy on a mid-weight reads 7.5×0.8 + 13×2.0×emptiness — **6.0 at full gauge (a flinch), 19 at half, 24.2 at 70 % empty** — so a signature kills from the lip once the victim is past half empty and from anywhere once they are near empty; a full-gauge fighter cannot be rung out by any single hit, supers included (a damage super tops out at 8 at emptiness 0). **What a KO looks like in practice (sim finding, pass 2):** the median stock is lost at emptiness 1.0 (the gauge is drained first, then one launch carries them); with the 28–35° side moves and the wider stages, side-blast deaths are now the majority (~55 %) and bottom-blast deaths the rest — a light fighter (Nick) dies sideways almost exclusively. Kills come from gauge drain plus edge proximity, never openers. Spikes KO off-stage at any gauge below ~70% — that's their job; their counterweights are the telegraph rule, the heaviest landing-lag band, and the fact that spiking off-stage risks your own stock.
- **Armor (canonical definition):** during a move's declared armor frames, the first N hits taken (N = the armor value, usually 1) deal their gauge damage and apply their statuses but inflict **no knockback and no hitstun**; the armor is then spent for that use of the move. Unparryables cannot be armored through (Philosophy 2). Armor never blocks throws that connect by their own rules.
- **Damage:** v2 values carry as gauge damage — lights 4–6, heavies 9–14, single-hit specials 7–14 (multi-hit and zone effects run lower per touch), damage supers 18–22 total. **No single interaction above 25 gauge.** Multi-part supers enforce this structurally.
- **Frame data:** every move declares `startup/active/recover` (+ `landLag` for aerials). The engine clamps missing fields to 0 — a 0-frame move is wrong on purpose; declare real frames. Aerials: startup 5–9f lights, landLag 6–14f; dair landLag at the high end.
- **Meter:** gain = 80% gauge damage dealt + 50% taken; super costs 100; persists across stocks, resets each match.
- **Dodge:** spot/step 18f duration, i-frames 2–13; air dodge 22f, i-frames 3–15, directional impulse 7; **air dodge is once per airtime** (refreshed on landing, ledge grab or respawn) on top of the **shared 60f cooldown**. Dodging is a resource: two reads per dodge cycle.
- **Self-stagger** (Adrian's tax, replaces v2 trips): 30f non-actionable, fully vulnerable, no invulnerability on exit. **Hazard stagger:** 20f, never comboable, invulnerable through recovery.
- **Respawn:** invulnerable until first action, hard cap 180f; spawn platform (the chair) descends from centre-top over 60f.

## physics.js — Phase-3 retune (2026-09-25)

*Tim's Phase-3 brief ("seriously improve the physics — fast paced") is the sign-off for this retune; it supersedes the graybox-frozen table (kept in git history). Everything got faster and heavier: run speeds ≈ ×1.7, gravity ×1.55 with taller impulses (jumps of the same height that resolve in fewer frames), a skid-turn multiplier, stronger air control, shorter dash and dodge cooldowns. `src/data/physics.js` and this table change in the same commit. World units: px at base zoom (960×540 viewport). Per-character entries are bands the character files must respect.*

| Constant | Value | Constant | Value |
|----------|-------|----------|-------|
| GRAV (global) | 0.85 px/f² | RUN_ACCEL | 0.9 |
| TURN_ACCEL_MULT | 2.2 (accel × this while vx opposes the held direction) | RUN_FRICTION | 0.76 |
| RUN_MAX | per-char 4.4–6.2 | JUMP_IMPULSE | per-char 14–16 |
| DOUBLE_JUMP | 1.0 × jump · **AIR_JUMPS 2** (three jumps per airtime) | AIR_ACCEL | 0.55 |
| AIR_MAX | 0.9 × run | FAST_FALL_MULT | 2.2 |
| FALL_MAX | per-char 12–16 | DASH_SPEED | 2.0 × run |
| DASH_DURATION | 16f · **AIR_DASH_DURATION 10f** (gravity off, once per airtime) | DASH_TAP_WINDOW | 16f |
| DASH_COOLDOWN | 12f after dash ends | DASH_JUMP_CARRY | 1.0 (full) |
| COYOTE_FRAMES | 5 | INPUT_BUFFER | 6f |
| HITSTUN_PER_KB | 1.6 | LAUNCH_DRAG | 0.975 (vx × this per frame while stunned in the air) |
| KB_BASE_MULT | 0.8 (× move.kb) | KB_SCALE_MULT | 2.0 (× move.kbScale × emptiness) |
| LEDGE_HANG_MAX | 90f (then auto-climb) | LEDGE_INVULN | 20f from the grab |
| LEDGE_REGRAB_CD | 45f after a release | LEDGE_JUMP_FACTOR | 0.8 × jump |
| STUN_LANDING_CLEARS | false (hitstun is time-based; a landing keeps the remaining frames as ground flinch) | DODGE_COOLDOWN | 60f |
| STEP_DODGE_IMPULSE | 6 | SPOT_DODGE_DURATION | 18f (i-frames 2–13) |
| AIR_DODGE_DURATION | 22f (i-frames 3–15) | AIR_DODGE_IMPULSE | 7 |
| DROP_THROUGH_GRACE | 8f | AIR_MOMENTUM_DECAY | 0.985 |
| GROUND_DEADZONE | 0.05 | | |

Jump arcs under the new table (MID: impulse 15): single-jump rise ≈ 132 px in 18 frames; jump → double-jump ≈ 264 px; the third jump (AIR_JUMPS 2, Phase 3b) adds another 132 px of recovery reach, which the KB multipliers and the wider blast zones were tuned against. **Consequence called out:** the low platforms (≈110 px above the slab) are now single-jump reachable — the Phase-2 "deliberately just short" rule is retired in favour of pace; upper platforms still need the double jump or a platform hop.

I-frame windows are **0-indexed engine ticks** counted from the dodge's first full tick (the start tick is tick 0) — combat code must read them with that convention.

Movement semantics (graybox freeze + the Phase-3b feel pass, signed off by Tim's playtest notes): dash initiates on the ground or **once per airtime in the air** (an air dash is a 10f horizontal burst with gravity suspended; it cancels into a jump) and its **direction latches at start — dashes are not steerable**; **ledge grab:** a body falling past a slab lip (vy > 0, ≥ 8f airborne, feet within 8–96 px below the lip, no re-grab for 45f) hangs with 20 i-frames and refreshed jumps/dodge/dash, then climbs (hold toward, or auto at 90f), ledge-jumps (0.8 × impulse) or drops (down/away); hanging is non-actionable, so a hang is never a stall lever (the stall gate checks it); dash-jump carries the momentum airborne; a double jump cancels a still-live dash; jump wins a same-tick drop+jump; fast-fall (down held) lands **on** soft platforms; drop-through needs a fresh tap (DESIGN.md, Movement). **New (Phase 3):** `MovementBody.launch(vx, vy, stun)` is the only way combat moves a body — while `stun > 0` the body ignores intent, keeps gravity, and its vx decays by LAUNCH_DRAG in the air (RUN_FRICTION on the ground). Air dodge still suspends gravity for its 22f; a neutral air dodge zeroes all momentum — a real defensive lever against launches (dodge cooldown 60f makes it one read per launch).

## Sim methodology

`index.html?sim=N` (dev flag; dynamically imported): headless CPU-vs-CPU, Normal AI, hazards ON, all 56 ordered pairings × N across the five selectable stages, seeded RNG. A sim match = 3 stocks, frame-capped at 10,800 (3 min); at the cap the harness scores remaining stocks, then remaining gauge — and the match is flagged for gate 4.

**Ship gates:**
1. **Band:** every fighter's aggregate win rate within **42–58%**.
2. **Anti-camp:** a keep-away/platform-camping profile must not exceed the standard profile by more than noise (≤ 55% aggregate).
3. **Anti-ledge-stall:** an off-stage-loitering/dodge-stalling profile must lose outright (≤ 45% aggregate) — if hovering near blast zones isn't suicidal, recovery is overtuned.
4. **Engagement:** matches with > 12 s between hit interactions, or > 25% combined off-stage-loiter time, get flagged; flags must stay **< 2%** of matches.
5. **Recovery competence (AI honesty):** stocks lost with an unspent double jump while within recovery range must stay **< 10%** — above that, the CPUs are dishonest and the win matrix is noise, not balance. (*Recovery range* is computed by the harness: the loser's remaining jump/air-dodge impulses could still have carried them back over a stage surface from the point of death; the operational definition lives in `sim.js`.)

Two independent samples before shipping a tuning pass: n ≈ 420–560 games per fighter at N = 30–40 (95% CI ≈ ±5); `?sim=10` is a smoke check only. CPU sims stay blind to human-feel issues — graybox and phase playtests govern feel; the gates govern fairness.

**First human playtest should poke:** dash-jump feel vs. Brawlhalla, edge-guard vs. each recovery special, Mike's recovery misery (intended, but is it fun?), spike spam, hazards near edges, Seelye's diaper (is the slow rude off-stage?), Abi's regen exception (does Last Orders feel campy in practice?).

## Current results

**v3 balance pass 2 — Phase 3b (2026-09-25) — all five gates PASS on two independent seeds at N = 30** (`node src/dev/sim.js 30 1337` / `… 2024`, 1680 matches + 840 camp + 840 stall each, five selectable stages, n = 420 games per fighter, 95 % CI ≈ ±5).

| Fighter | seed 1337 | seed 2024 |
|---|---|---|
| Ben | 51.9 % | 52.1 % |
| Tim | 48.7 % | 48.3 % |
| Adrian | 51.7 % | 49.6 % |
| Richy | 51.1 % | 46.3 % |
| Nick | 47.5 % | 49.5 % |
| Abi | 49.8 % | 50.2 % |
| Mike | 55.0 % | 53.6 % |
| Seelye | 44.4 % | 50.2 % |
| **camp (≤ 55)** | 25.7 % | 28.9 % |
| **stall (≤ 45)** | 2.4 % | 2.6 % |
| **engagement flags (< 2 %)** | 0.89 % | 0.65 % |
| **recovery dishonest (< 10 %)** | 0.77 % | 0.80 % |

Matrix, seed 1337 (row beats column, /30): Ben v Tim 15 · Adrian 17 · Richy 18 · Nick 17 · Abi 18 · Mike 14 · Seelye 19 — Tim v Ben 18 · Adrian 18 · Richy 16 · Nick 15 · Abi 12 · Mike 14.5 · Seelye 16 — Adrian v Ben 17 · Tim 14 · Richy 20 · Nick 19 · Abi 18 · Mike 12 · Seelye 20 — Richy v Ben 14 · Tim 19 · Adrian 20 · Nick 14 · Abi 19 · Mike 18 · Seelye 19.5 — Nick v Ben 18 · Tim 16 · Adrian 11 · Richy 13 · Abi 14 · Mike 17 · Seelye 18 — Abi v Ben 11 · Tim 17 · Adrian 8 · Richy 15 · Nick 20 · Mike 12 · Seelye 23 — Mike v Ben 15 · Tim 20 · Adrian 23 · Richy 22 · Nick 18.5 · Abi 11 · Seelye 16 — Seelye v Ben 17 · Tim 14 · Adrian 16 · Richy 15 · Nick 14 · Abi 15 · Mike 17. Avg match 6498 f (108 s, up from 67 s in pass 1 — the price of three jumps, the air dash, the ledge and 35 % wider stages, all asked for); 14 capped (0.8 %), 0 stuck. **Known soft spots:** Seelye sits at the floor on seed 1337 (44 %) and Mike at the ceiling on both (54–55 %); Adrian beats Abi ~3:1 (the ledge and the air dash let his lunges reset for free against a counter-puncher); Mike beats Adrian and Richy ~3:1. A human pass should confirm the kit reads before any of these get a numbers-only fix.

**What pass 2 changed and why** (data + AI only; the feel-pass engine changes are listed in the physics table above and were signed off by Tim's playtest notes):

- *Diagnosis (kill-source instrumentation, 4 games/pairing, before the pass):* with three jumps, the air dash and the ledge, nobody died — 12 % of matches hit the 3-minute cap (avg 135 s) and the KB softening Tim asked for had pushed the fatal launch out of reach; Nick (32 %) lost 99 of 107 stocks to side blasts, Abi (40 %) could not kill, Richy's Bull Run (10 dmg, kbScale 13) was the roster's top killer at 75 % on one seed and Seelye's Brisket Bomb zone was second.
- *physics.js:* KNOCKBACK_MULT 0.85 → KB_BASE_MULT 0.8 / KB_SCALE_MULT 2.0 (the base term keeps low-gauge hits soft — Tim's "it hits you too much" note; the scale term makes late hits carry past the wider blast zones — no more caps). HITSTUN_PER_KB 1.6 (from 2.0, "recovery from being hit should be less time").
- *Kill power up:* Nick Fund Structure 6/10 → 6.5/11, Card Fan kbScale 10 → 11, gauge 95 → 100, weight 0.95 → 0.97; Abi Double-Booked 7/11 → 7/12.5, Tote Swing kbScale 11 → 12; Ben Wingspan kbScale 12.5 → 13, Hawk Toss kbScale 8 → 6 (was over-killing as a lob), Pistachio Flick kb 5 → 5.5; Tim Hard Deadline kbScale 11 → 12; Mike weight 1.08 → 1.15, Wrecking Swing recover 26 → 22.
- *Projectiles pulled out of the kill role:* Richy Bull Run 10 dmg 7/13 → 8 dmg 7/6 (cooldown 80 → 90f), Bear Raid kbScale 9 → 6, Short Squeeze kbScale 11 → 10.5, Meme Slap 7.5/13 → 7/12; Nick Points Redemption kbScale 5 → 3; Abi House Rosé kbScale 4; Tim Prompt Injection kbScale 4; Seelye Brisket Bomb kbScale 5 → 4, Leverage kbScale 11.5 → 11. Projectiles now set up the signature; the signature kills.
- *Kit (Phase 3b, data):* every fighter's Light/Heavy expand into neutral/side/down variants and the air Heavy into a recovery / ground pound (`expandKit()` in `src/data/characters/_shared.js`; derived from the base move within the bands: side light +1 dmg @28°, down light @72° low, side signature +56 px lunge ≤ 32°, down signature @78° low ×0.9 scale, recovery 7 dmg 6/9 @80° with an 11 px/f lift once per airtime, ground pound 9 dmg 7/10 @270° spike with the heaviest landing lag). Per-fighter overrides go in `kit`.
- *AI:* Easy / Normal / Hard slowed down (decide 40 / 22 / 12f, mistake 0.40 / 0.20 / 0.06 — "the computer is way too difficult"); 1P defaults to Easy. The CPU aims its ground presses (side at the edge of reach, down when the target is above or fresh), uses the ledge (waits out its i-frames, ledge-jumps 45 %) and the recovery move before its air dodge.

**v3 balance pass 1 (2026-09-25, superseded) — all five gates PASS on two independent seeds at N = 30** (`node src/dev/sim.js 30 1337` / `… 2024`, 1680 matches + 840 camp + 840 stall each, n = 420 games per fighter, 95 % CI ≈ ±5).

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
