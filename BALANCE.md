# BALANCE.md — Bellwether Brawlers

*v3 (platform fighter). Canonical for numbers and rules where DESIGN.md and this file could drift.*

## Philosophy

1. **Soft archetype wheel, re-read for platforms.** Zoners (Richy, Ben) control the stage and force approaches; rushdown (Adrian, Nick) wins up close and off-stage; tanks (Mike, Seelye) survive to high gauge-emptiness and kill earliest. *Soft*: difficulty, not destiny — every fighter has a written answer into every other.
2. **Telegraph rule (canonical, OR-form).** Any move dealing ≥ 12 gauge, carrying a status, **unparryable**, or **spiking** needs at least one of: ≥ 18f readable startup, a distinct sound cue, or a fixed/marked arrival point.
   **Unparryable (v3 definition, replaces v2 "unblockable"):** pierces Calendar Block's parry and Dad Reflexes' catch and cannot be armored through; whiffs against airborne and non-actionable fighters; dodge i-frames avoid it. The universal answer is *jump it*.
3. **Counterplay is a hard requirement.** Every special and super ships with a written counter in DESIGN.md. No counter, no ship. Spikes are covered collectively by the spike counter-rules (telegraph rule; heaviest landing lag; spiking off-stage risks your own stock) — an individual spike needs its own written counter only if it breaks those defaults.
4. **Statuses are short, visible, worded.** *Impairing* statuses (slow, silence, burn — and `reversed`, which no roster move applies since the kit rethink) cap at 3.5 s, callouts + duration bars, nothing self-stacks, reversal still ends when its owner converts. Marks and self-buffs (lien 8 s, Zulu Time's nextHit 10 s, I KNOW YOUR GUY's borrowed special 10 s) are exempt from the cap — they impair nobody — but keep callouts and declared durations. The two staggers are fixed-frame *states* (Numbers doctrine), not statuses.
5. **Hazards never decide matches.** Telegraphed ≥ 1 s; knockback ≤ 6.0 (below kill-class, see Knockback); never directed toward a blast zone (the Wave's wipeout and Spin Class's bounce pop straight up; Fire Drill foam stops 110 px short of the lips); symmetric or dodgeable; suppressed during supers; hazard staggers are never comboable (recovery invulnerability).
6. **No camping packages.** Composure refills **only** on stock loss — waiting heals nothing. *The single exception:* ABI's PUB O'CLOCK regen (2/s for 5 s), which cancels on any hit — it forces her opponent to engage, the opposite of camping; gates 2–4 cover any abuse. Hazard rewards are meter — *the second exception:* the **Ginger Shot** event (+20 composure, never past full; +5 meter on a full gauge): one bottle, dropped on the centre or a mirrored spot, first touch only, announced — a contested pickup you fight over, never something you can wait for. Off-stage time is risk by construction (no ledge invulnerability, air dodge once per airtime). Hazards push toward centre. Self-buff supers that don't commit their user to engaging build no meter while active (none on the roster since LIFETIME PLATINUM was retired; the `noMeter` status remains). I KNOW YOUR GUY is not one: its payoff is a special Nick still has to land, so it builds meter. Camping and ledge-stalling must sim worse than fighting (gates 2–4).
7. **Recovery is a balance axis, not a right.** Who has a recovery special is deliberate (Ben, Adrian, Nick: yes; Mike: emphatically not). Tune kill power against recovery strength, not in isolation.

## Numbers doctrine

- **Gauge band:** 96 (Nick) – 110 (Richy) (pass 15; Adrian 108, Ben 100). **Weight band:** 0.97 (Nick/Adrian) – 1.06 (Ben) (pass 12; was 1.10, Mike). **Jump / fall (pass 13):** every fighter jumps 16 and falls at 12 — one generous, floaty air class (Tim: "same jump height (generous) and fall speeds (floaty) for better recovery"); weight is the only thing that separates how fighters fly. — narrowed in the Phase-3 pass (the bands were restated from the data in pass 3; the old 85–110 / 0.9–1.08 text had gone stale after pass 2): weight divides the launch speed linearly, so the old 0.85–1.45 spread alone swung kill thresholds by ~70 %. **Run band:** 5.2 (Mike) – 5.85 (Nick) px/frame at base zoom — pass 12 narrowed it from 4.4–6.2 (Tim: "the characters should not differ this much in speed"; Brawlhalla's speed stat moves run speed only a little). Speed is no longer a balancing lever: pay for strengths with gauge, weight and frame data. Fall speed correlates with weight (floaties live longer upward, die earlier sideways). Per-character values live in `src/data/characters/<id>.js`, inside these bands; `physics.js` holds the universal constants and formulas.
- **Knockback (canonical formula):**
  `kb = (move.kb × KB_BASE_MULT + move.kbScale × KB_SCALE_MULT × emptiness) / weight`, where `emptiness = 1 − gauge/maxGauge` (multipliers 0.8 / 2.0 since the Phase-3b feel pass: early hits flinch, late hits kill).
  **kb is the launch speed in px/frame at base zoom, set (not added) along `kbAngle`** (per-move data, degrees; spikes use 270 ± 15) on the frame the hit lands. Hitstun = `round(kb × HITSTUN_PER_KB)` frames.
  **Kill-class** = kb ≥ 17 on connect (carries a mid-weight from the lip past the widened side blast zone through two air jumps, an air dash and a ledge grab — sim-measured: the 25th-percentile fatal launch is 16.8 px/f, median 25). Hazards cap at 6.0.
  Bands — lights kb 4–6 / kbScale 4–6 as declared, **but the derived combo starters (nLight, sLight, dLight, nAir) are fixed force: kbScale ≤ 1.5, dLight kb 11+ (the pop)** — Combo doctrine below · uair same · **side-airs (the aerial kill move) kb 5–7.5 / kbScale 8–13** · spikes kb 5–7 / kbScale 8–10 (angle 270 ± 15) · heavies kb 6–8 / kbScale 10–13, **startup 10–16f** (a heavy is a commitment, never a poke) · specials kb 5–9 / kbScale 6–13 · damage supers kb 8–10 / kbScale 14–18.
- **Kill calibration** (checked against the bands, Phase 3b): a top-band Heavy on a mid-weight reads 7.5×0.8 + 13×2.0×emptiness — **6.0 at full gauge (a flinch), 19 at half, 24.2 at 70 % empty** — so a signature kills from the lip once the victim is past half empty and from anywhere once they are near empty; a full-gauge fighter cannot be rung out by any single hit, supers included (a damage super tops out at 8 at emptiness 0). **What a KO looks like in practice (sim finding, pass 2):** the median stock is lost at emptiness 1.0 (the gauge is drained first, then one launch carries them); with the 28–35° side moves and the wider stages, side-blast deaths are now the majority (~55 %) and bottom-blast deaths the rest — a light fighter (Nick) dies sideways almost exclusively. Kills come from gauge drain plus edge proximity, never openers. Spikes KO off-stage at any gauge below ~70% — that's their job; their counterweights are the telegraph rule, the heaviest landing-lag band, and the fact that spiking off-stage risks your own stock.
- **Armor (canonical definition):** during a move's declared armor frames, the first N hits taken (N = the armor value, usually 1) deal their gauge damage and apply their statuses but inflict **no knockback and no hitstun**; the armor is then spent for that use of the move. Unparryables cannot be armored through (Philosophy 2). Armor never blocks throws that connect by their own rules.
- **Damage:** v2 values carry as gauge damage — lights 4–6, heavies 9–14, single-hit specials 7–14 (multi-hit and zone effects run lower per touch), damage supers 18–22 total. **No single interaction above 25 gauge.** Multi-part supers enforce this structurally.
- **Frame data:** every move declares `startup/active/recover` (+ `landLag` for aerials). The engine clamps missing fields to 0 — a 0-frame move is wrong on purpose; declare real frames. Aerials: startup 5–9f lights, landLag 6–14f; dair landLag at the high end.
- **Meter:** gain = 80% gauge damage dealt + 50% taken; super costs 100; persists across stocks, resets each match.
- **Dodge:** spot/step 18f duration, i-frames 2–13; air dodge 22f, i-frames 3–15, directional impulse 7; **air dodge is once per airtime** (refreshed on landing, ledge grab or respawn) on top of the **shared 60f cooldown**. Dodging is a resource: two reads per dodge cycle.
- **Self-stagger** (Adrian's tax, replaces v2 trips): 30f non-actionable, fully vulnerable, no invulnerability on exit. **Hazard stagger:** 20f, never comboable, invulnerable through recovery.
- **Respawn:** invulnerable until first action, hard cap 180f; spawn platform (the chair) descends from centre-top over 60f.

## Combo doctrine (2026-09-28 — Brawlhalla-mirrored; DESIGN.md "Combos" is the blueprint)

- **Fixed stun per move** (`stun`, frames). Hitstun = max(8, the move's stun, the launch's flight stun `speed × HITSTUN_PER_KB`). Starters' stun is **derived** from the fighter's own frame data in `expandKit()`; enders (side-airs, signatures, specials) carry none — their launch is their stun.
- **Starters are fixed force** (kbScale ≤ `STARTER_KB_SCALE` 1.5), so a route works across a composure window instead of only at one damage; enders keep the kill scaling. Kill power is unchanged: signatures and side-airs still carry kbScale 8–13.
- **True combo** = the next hit lands before the victim has had more than `POST_STUN_LOCK` (3) free frames; for those frames they cannot dodge, jump or dash.
- **Stale rule:** the same move twice in one combo gets `STALE_STUN_MULT` (½) of its stun — no loops; every combo is a route through the kit.
- **Chase dodge:** after any landed melee hit (not a super), Dodge = a 12-frame burst (`CHASE_DODGE_IMPULSE` 9) in the held direction, no i-frames, once per airtime, cut into any attack from frame 2. It spends no dodge and protects nothing.
- **Feel pass (Tim: "the pop up mechanic isn't working … combos need to feel more fluid"):** a landed light cancels the moment its active frames end (`HIT_CANCEL_FRAC` 0.4 → 0); the input buffer is 8 frames (was 6); the Pop-Up launcher pops straight up (82° → 88°) and **floats** the victim (`LAUNCH_FLOAT` 0.4 gravity for its fixed stun) so they hang at head height; the Pop-Up takes **any** air attack (players hold up after a jump — the up-air counts); starters' derived stun carries `COMBO_MARGIN` 10 frames of human slack (was 3); the chase dodge stays open `CHASE_LATE` 10 frames after the landed move ends (Brawlhalla: 12).
- **Leniency gate:** `node src/dev/combos.js lenient` — every step of every route must still land when pressed **≥ 8 frames late** (tests/combos.test.mjs). Frame-perfect is not the bar; a person on a sofa is. Before this pass the Confirm and Jump-In allowed 3 frames and the Pop-Up needed a single exact timing (a keyboard sim of real presses: holding up, jumping early or late all dropped it).
- **Ship gate (new, alongside the five sim gates):** `tests/combos.test.mjs` — every fighter lands every universal route as a true combo across its window vs the lightest, a mid-weight and the heaviest opponent, and a bare new-fighter file does too.

## physics.js — Phase-3 retune (2026-09-25)

*Tim's Phase-3 brief ("seriously improve the physics — fast paced") is the sign-off for this retune; it supersedes the graybox-frozen table (kept in git history). Everything got faster and heavier: run speeds ≈ ×1.7, gravity ×1.55 with taller impulses (jumps of the same height that resolve in fewer frames), a skid-turn multiplier, stronger air control, shorter dash and dodge cooldowns. `src/data/physics.js` and this table change in the same commit. World units: px at base zoom (960×540 viewport). Per-character entries are bands the character files must respect.*

| Constant | Value | Constant | Value |
|----------|-------|----------|-------|
| GRAV (global) | 0.85 px/f² | RUN_ACCEL | 1.3 (pass 11; was 0.9) |
| TURN_ACCEL_MULT | 2.6 (accel × this while vx opposes the held direction; pass 11, was 2.2) | RUN_FRICTION | 0.7 (pass 11; was 0.76) |
| RUN_MAX | per-char 5.2–5.85 (pass 12) | JUMP_IMPULSE | 16 for everyone (pass 13; was 14–16) |
| DOUBLE_JUMP | 1.0 × jump · **AIR_JUMPS 2** (three jumps per airtime) | AIR_ACCEL | 0.7 (pass 11; was 0.55) |
| AIR_MAX | 0.9 × run | FAST_FALL_MULT | 2.2 |
| FALL_MAX | 12 for everyone (pass 13; was 12–16) | DASH_SPEED | 2.0 × run |
| DASH_DURATION | 16f · **AIR_DASH_DURATION 10f** (gravity off, once per airtime) | DASH_TAP_WINDOW | 16f |
| DASH_COOLDOWN | 12f after dash ends | DASH_JUMP_CARRY | 1.0 (full) |
| COYOTE_FRAMES | 5 | INPUT_BUFFER | 8f (pass 10) |
| HITSTUN_PER_KB | 1.6 | LAUNCH_DRAG | 0.975 (vx × this per frame while stunned in the air) |
| KB_BASE_MULT | 0.8 (× move.kb) | KB_SCALE_MULT | 2.0 (× move.kbScale × emptiness) |
| LEDGE_HANG_MAX | 90f (then auto-climb) | LEDGE_INVULN | 20f from the grab |
| LEDGE_REGRAB_CD | 45f after a release | LEDGE_JUMP_FACTOR | 0.8 × jump |
| STUN_LANDING_CLEARS | false (hitstun is time-based; a landing keeps the remaining frames as ground flinch) | DODGE_COOLDOWN | 60f |
| STEP_DODGE_IMPULSE | 6 | SPOT_DODGE_DURATION | 18f (i-frames 2–13) |
| AIR_DODGE_DURATION | 22f (i-frames 3–15) | AIR_DODGE_IMPULSE | 7 |
| DROP_THROUGH_GRACE | 8f | AIR_MOMENTUM_DECAY | 0.985 |
| GROUND_DEADZONE | 0.05 | | |
| ATTACK_SLIDE | 0.88 (vx × this per frame, ground move startup + active, stick neutral) | ATTACK_SLIDE_HOLD | 0.95 (… holding the facing direction; holding back = RUN_FRICTION) |
| ATTACK_CARRY_CAP | 1.15 × run (entry speed cap; a dash-attack ends the dash) | STEP_SCALE | 1.0 (× every move's `step`; the ?tune knob) |
| BODY_GAP | 34 px | MELEE_H / MELEE_REACH | 76 px / × 1.1 |
| HIT_CANCEL_FRAC | 0 (pass 10: a light that connects may cancel as soon as its active frames end) | DODGE_DASH | true (pass 11: dodge + a direction on the ground = a dash, Brawlhalla's dodge-dash) |
| WALL_SLIDE_MAX | 2.4 px/f (× 2.5 holding down) | WALL_JUMP_VX / FACTOR | 6.5 px/f away · 0.95 × jump |
| WALL_JUMP_MAX | 3 wall jumps per airtime, then wall slip | | |

Jump arcs under the new table (MID: impulse 15): single-jump rise ≈ 132 px in 18 frames; jump → double-jump ≈ 264 px; the third jump (AIR_JUMPS 2, Phase 3b) adds another 132 px of recovery reach, which the KB multipliers and the wider blast zones were tuned against. **Consequence called out:** the low platforms (≈110 px above the slab) are now single-jump reachable — the Phase-2 "deliberately just short" rule is retired in favour of pace; upper platforms still need the double jump or a platform hop.

**Attacks in motion (2026-09-28, Tim's brief: "hit in motion, not stop-and-hit" — his sign-off for this feel change).** A ground move no longer plants the body on its first frame: the entry speed (capped at `ATTACK_CARRY_CAP × runMax`) slides through the startup and active frames under `ATTACK_SLIDE`, holding forward keeps more (`ATTACK_SLIDE_HOLD`), holding back brakes at `RUN_FRICTION`, and the recovery plants. A move's `carry` (0–1, default 1) scales the slide (`carry: 0` plants: Abi's parry). Every derived ground move also has an eased **`step`** (px) that accelerates into the active frames — lights n/s/d 8/18/6, signatures n/s/d 18/56/12 (Ben's Corner Office 40); the side variants' old linear `travel` became `step`. A step or slide **stops at the edge of the surface you stand on and 34 px short of the opponent's centre** (without the second rule a step carried attackers through a close target and left them facing the wrong way — engagement flags rose to 3.4 %); `travel` lunges are exempt (Off the Lip still leaves the stage, Clumsy Charge still runs through). The forward melee box grew 64 → 76 px tall and its reach × 1.1 (short hops slipped over it); the AI's `meleeHits` mirrors the box, the step and the carried run.

**Hit-confirm cancels (2026-09-28, Tim's sign-off).** A **light that connects** (ground or aerial) may cut its recovery short once `HIT_CANCEL_FRAC` of it has passed — into a jump, a dash, or another light / heavy; a brass ring marks the cancel. A whiffed light keeps its full recovery, so the punish window survives. Nothing else cancels. The CPU strings a follow-up into the window with its profile's `mixup` chance (easy 0.15 … hard 0.7).

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

**v3 balance pass 15 — taller walls (2026-09-28) — all five gates PASS on two independent seeds at N = 30; every route passes, every step ≥ 9 f lenient.**

| Fighter | seed 1337 | seed 2024 |
|---|---|---|
| Ben | 52.1 % | 51.1 % |
| Tim | 52.1 % | 56.9 % |
| Adrian | 52.1 % | 42.9 % |
| Richy | 46.4 % | 47.5 % |
| Nick | 51.2 % | 52.1 % |
| Abi | 48.1 % | 49.3 % |
| Mike | 52.9 % | 53.1 % |
| Seelye | 45.0 % | 47.1 % |
| **camp (≤ 55)** | 12.9 % | 12.6 % |
| **stall (≤ 45)** | 0 % | 0.1 % |
| **engagement flags (< 2 %)** | 0.18 % | 0.24 % |
| **recovery dishonest (< 10 %)** | 2.25 % | 2.44 % |

Avg match 5752 / 5800 f (~96 s); 2 / 4 capped, 0 stuck. **Data change (Tim: "make the walls taller so we can catch and then climb back up"):** every main slab's `h` (the wall) is 240 px on every stage (was 70–155, the art's straight side). Caught 250 px down with no air jumps left, two wall jumps and a ledge grab put you back on the stage (tests/movement.test.mjs pins it on three stages). The arena art is drawn that deep by `src/render/slabart.js` (render only): it finds each piece's straight side from its alpha and repeats a band of those rows, so the taper hangs below the wall. Walls favoured the heavy fighters with weak recoveries: Mike beat Adrian 26–4. **Tuning:** Adrian gauge 105 → 108, Toothbrush Jab 4.5 → 5 dmg, Pivot Table 10 → 11 dmg, Clumsy Charge kbScale 11 → 12; Ben gauge 102 → 100. **Soft spots:** Adrian swings 9 points between seeds (52.1 / 42.9 %); Tim 56.9 % on seed 2024.

**v3 balance pass 14 — two new stages (2026-09-28, superseded) — all five gates PASS on two independent seeds at N = 30; every route passes, every step ≥ 9 f lenient.**

| Fighter | seed 1337 | seed 2024 |
|---|---|---|
| Ben | 54.5 % | 53.1 % |
| Tim | 50.2 % | 54.5 % |
| Adrian | 43.7 % | 45.5 % |
| Richy | 48.0 % | 45.5 % |
| Nick | 55.5 % | 49.0 % |
| Abi | 47.6 % | 49.3 % |
| Mike | 52.9 % | 54.3 % |
| Seelye | 47.6 % | 48.8 % |
| **camp (≤ 55)** | 12.9 % | 12.4 % |
| **stall (≤ 45)** | 0.1 % | 0.2 % |
| **engagement flags (< 2 %)** | 0.3 % | 0.36 % |
| **recovery dishonest (< 10 %)** | 2.1 % | 2.07 % |

Avg match 5753 / 5741 f (~96 s); 4 / 4 capped, 0 stuck. **Data:** two selectable stages, BATTERSEA and THE STANDARD (DESIGN.md "Stages" 6–7), join the sim's rotation (seven stages now, 240 games each). **Tuning:** Nick gauge 98 → 96; Richy gauge 107 → 110; Seelye gauge 108 → 106. **AI change, called out:** the CPU gets one reaction roll per Gone Viral snap (`snapRead`: easy 0.35, normal 0.6, hard 0.85) instead of a fresh roll every tick, which had it dodging nearly every snap and left Richy at 38.6 %. **Test changes:** tests/stages.test.mjs lists the two new stages; `STAGE_IDS_V3` is now derived from `STAGES`.

**v3 balance pass 13 — one air class + Tim's kit notes (2026-09-28, superseded) — all five gates PASS on two independent seeds at N = 30; every route passes, every step ≥ 9 f lenient.**

| Fighter | seed 1337 | seed 2024 |
|---|---|---|
| Ben | 50.7 % | 52.6 % |
| Tim | 50.7 % | 50.5 % |
| Adrian | 45.5 % | 42.9 % |
| Richy | 43.2 % | 46.5 % |
| Nick | 57.6 % | 57.6 % |
| Abi | 47.4 % | 49.3 % |
| Mike | 52.9 % | 48.7 % |
| Seelye | 52.0 % | 51.9 % |
| **camp (≤ 55)** | 13.5 % | 11.8 % |
| **stall (≤ 45)** | 0.1 % | 0.7 % |
| **engagement flags (< 2 %)** | 0.42 % | 0.36 % |
| **recovery dishonest (< 10 %)** | 1.91 % | 1.88 % |

Spread 42.9–57.6 %. Avg match 5735 / 5743 f (~96 s — the floaty class lives a little longer); 4 / 3 capped, 0 stuck. **Data:** jumpImpulse 16 and fallMax 12 for all eight. **Kit changes (Tim's notes; DESIGN.md "Pass 13"):** Ben COME ON FULHAM! (new move kind `stampede`, a floor-level crowd hazard, 14 dmg); Richy GONE VIRAL (new kind `meme`: tracking viewfinder, 20f lock, one-frame snap, 18 dmg + a cosmetic meme freeze via `fx.memeShot`); Nick MEMBERSHIP REWARDS (`columns` with five swept marks, one hit max, 12 dmg; strike `h`/`w`/`callout` moved into data); Seelye NAPPY DROP (new zone type `nappy`: a one-shot trap, 10 dmg + slow + LIEN); Tim's Claude takes 3 separate attacks (`hp`). **Engine changes, called out (Tim's notes are the sign-off):** Status Match takes a `range` (200 px: out of range it is a capped blink, i-frames 18 → 6) and a teleport never ends inside a slab; hazards get an `onHit` hook and a zero-size hazard box is inactive; the AI reads the crowd and the meme snap every tick (before, 67 % of crowds landed; now 38 %). **Defect fixed:** a capped or ledge-aimed teleport that ended inside the slab was shoved out to the slab's edge by collision (a free trip to the ledge). **Tuning:** Ben gauge 104 → 102; Nick gauge 105 → 98; Adrian 97 → 105; Abi 100 → 104; Seelye 104 → 108; Tim 104 → 102. **Test changes:** tests/kits.test.mjs replaces the I Know Your Guy test with Membership Rewards, Status Match range, Nappy Drop, Gone Viral and COME ON FULHAM! tests; the Claude test now needs three hits; tests/gamepad.test.mjs pins "stick up aims, never jumps". **Soft spots:** Nick sits at 57.6 % on both seeds (near the band's top); Adrian at 42.9 % on seed 2024.

**v3 balance pass 12 — one speed class (2026-09-28, superseded) — all five gates PASS on two independent seeds at N = 30; every route passes, every step ≥ 8 f lenient.**

| Fighter | seed 1337 | seed 2024 |
|---|---|---|
| Ben | 50.0 % | 54.5 % |
| Tim | 47.1 % | 49.8 % |
| Adrian | 48.6 % | 47.6 % |
| Richy | 48.5 % | 48.6 % |
| Nick | 48.8 % | 48.1 % |
| Abi | 53.6 % | 46.0 % |
| Mike | 50.0 % | 52.9 % |
| Seelye | 53.5 % | 52.6 % |
| **camp (≤ 55)** | 14.9 % | 16.0 % |
| **stall (≤ 45)** | 0.2 % | 0.6 % |
| **engagement flags (< 2 %)** | 0.18 % | 0.06 % |
| **recovery dishonest (< 10 %)** | 1.47 % | 1.85 % |

Spread 46.0–54.5 % (the tightest yet). Avg match 5523 / 5494 f (~92 s); 1 / 1 capped, 0 stuck. **Data change (Tim: "the characters should not differ this much in speed"):** runMax Mike 4.4 → 5.2, Ben 4.8 → 5.3, Seelye 5.0 → 5.4, Richy 5.4 → 5.5, Abi 5.6, Tim 5.7 → 5.65, Adrian 5.8 → 5.7, Nick 6.2 → 5.85 — the order is kept, the gap is 12 % instead of 41 %. Speed alone put Mike at 63 % and Nick at 38–42 %, so the slow tanks paid for it elsewhere. **Tuning:** Mike gauge 102 → 98 and weight 1.10 → 1.05; Ben gauge 110 → 107; Seelye gauge 106 → 104; Nick gauge 100 → 105; Richy gauge 104 → 107; Adrian gauge 94 → 97. Jump heights (impulse 14–16) and fall speeds (12–16) are unchanged. **Soft spots:** Abi swings 7.6 points between seeds; Ben 4.5.

**v3 balance pass 11 — Brawlhalla movement (2026-09-28, superseded) — all five gates PASS on two independent seeds at N = 30; every route passes, every step ≥ 8 f lenient.**

| Fighter | seed 1337 | seed 2024 |
|---|---|---|
| Ben | 55.7 % | 51.9 % |
| Tim | 49.0 % | 52.4 % |
| Adrian | 49.0 % | 45.8 % |
| Richy | 48.1 % | 43.9 % |
| Nick | 50.5 % | 47.6 % |
| Abi | 49.5 % | 54.3 % |
| Mike | 48.8 % | 48.6 % |
| Seelye | 49.3 % | 55.5 % |
| **camp (≤ 55)** | 14.6 % | 16.6 % |
| **stall (≤ 45)** | 0.2 % | 0.2 % |
| **engagement flags (< 2 %)** | 0.06 % | 0.12 % |
| **recovery dishonest (< 10 %)** | 1.8 % | 1.5 % |

Spread 43.9–55.7 %. Avg match 5484 / 5539 f (~91 s); 1 / 1 capped, 0 stuck. **Engine changes, called out (Tim's brief — "as close to movement and fighting style to Brawlhalla as possible", "the sliding on walls to recover is a good feature" — is the sign-off):** (1) snappier ground and air control: RUN_ACCEL 0.9 → 1.3, TURN_ACCEL_MULT 2.2 → 2.6, RUN_FRICTION 0.76 → 0.7, AIR_ACCEL 0.55 → 0.7; (2) **dodge-dash** — dodge + a direction on the ground is a dash (the old step dodge); a neutral ground dodge is still the spot dodge; (3) **wall slide** (`src/engine/wall.js`) — an airborne fighter pressed against a slab side below the ledge zone clings and slides at WALL_SLIDE_MAX, air jumps / air dodge / air dash / the recovery refresh, jump kicks off away and up without spending an air jump, holding away or dodging lets go, holding down falls past; after WALL_JUMP_MAX wall jumps without landing the wall won't hold you (wall slip). The CPU clings a beat (its difficulty's recoverDelay) then wall-jumps. (4) Slab collision depth `h` now matches each arena piece's vertical wall (measured from the art, min 70): office 70, palace 80, pub 80, berlin 115, rooftop 120, tube 150 — the only thing that reads `h` is movement; (5) the derived side light's step 18 → 30 px (it lunges). **Defect fixed on the way:** a wall jump also spent an air jump on the same tick (`_jumps` now skips a jump already consumed). **Test changes, called out:** tests/physics.test.mjs pins the four new accel values; tests/movement.test.mjs adds the wall-slide test. No kit numbers changed.

**v3 balance pass 10 — combo feel (2026-09-28, superseded) — all five gates PASS on two independent seeds at N = 30; every route passes, every step ≥ 8 f lenient.**

| Fighter | seed 1337 | seed 2024 |
|---|---|---|
| Ben | 54.5 % | 51.8 % |
| Tim | 47.9 % | 50.0 % |
| Adrian | 56.2 % | 54.8 % |
| Richy | 50.5 % | 44.3 % |
| Nick | 46.4 % | 48.2 % |
| Abi | 46.2 % | 47.3 % |
| Mike | 48.3 % | 50.7 % |
| Seelye | 50.0 % | 53.0 % |
| **camp (≤ 55)** | 17.5 % | 15.6 % |
| **stall (≤ 45)** | 1.3 % | 0.7 % |
| **engagement flags (< 2 %)** | 0.06 % | 0.18 % |
| **recovery dishonest (< 10 %)** | 0.75 % | 0.82 % |

Spread 44.3–56.2 %. Avg match 5463 / 5520 f (~91 s); 0 / 2 capped, 0 stuck. **Engine change, called out (Tim's brief is the sign-off):** the feel pass in the Combo doctrine (cancel on active end, buffer 8, launcher float, straight-up pop, any-air Pop-Up, margin 10, chase late). Longer, easier combos favoured the fastest starters and the longest reach: Ben 57.6 % and Adrian 58.6–59.6 % over the passes below, Abi 43.6 %. **Tuning:** Ben Pistachio Flick range 74 → 68 and Wingspan kbScale 13 → 12.5; Adrian Toothbrush Jab startup 3 → 4 (the roster's lone 3-frame jab — with shared combos the fastest starter wins) and Clumsy Charge dmg 11 → 10; Abi Double-Booked kbScale 12 → 12.5; Richy Short Squeeze kbScale 11 → 11.5. **Test change, called out:** tests/physics.test.mjs pins INPUT_BUFFER at 8. **Soft spots:** Adrian is top on both seeds again (56.2 / 54.8 %); Richy swings 6 points between seeds.

**v3 balance pass 9 — the combo system (2026-09-28, superseded) — all five gates PASS on two independent seeds at N = 30; every fighter passes every combo route.**

| Fighter | seed 1337 | seed 2024 |
|---|---|---|
| Ben | 54.8 % | 54.8 % |
| Tim | 49.0 % | 51.4 % |
| Adrian | 50.0 % | 53.6 % |
| Richy | 50.5 % | 49.3 % |
| Nick | 49.3 % | 45.0 % |
| Abi | 48.6 % | 47.4 % |
| Mike | 50.2 % | 50.0 % |
| Seelye | 47.6 % | 48.6 % |
| **camp (≤ 55)** | 17.3 % | 19.8 % |
| **stall (≤ 45)** | 1.5 % | 1.1 % |
| **engagement flags (< 2 %)** | 0.06 % | 0.06 % |
| **recovery dishonest (< 10 %)** | 1.26 % | 1.44 % |

Spread 45.0–54.8 % (the tightest yet; pass 8: 45.7–56.9 %). Avg match 5592 / 5605 f (~93 s, down ~8 s: combos add damage); 0 / 0 capped, 0 stuck. **Engine change, called out (Tim's sign-off: "look to mirror it … a blueprint"):** the Combo doctrine above — fixed stun, fixed-force starters, the escape lock, the stale rule, the chase dodge — plus the CPU now plays the routes out after a starter lands (`engine/ai/combos.js`, replacing the old light-string reflex; easy 20 % / normal 50 % / hard 85 %, never off-stage). **Why:** frame-perfect light › light › heavy was a true combo for nobody (the victim was free 9–14 frames at full composure, pushed out of reach below half). **Tuning:** the first cut put Tim at 41.4 % (seed 1337), then with CPU combos Adrian at 58.2 % and Richy at 42.6 % (seed 2024) — Adrian Toothbrush Jab dmg 5 → 4.5 and Pivot Table kbScale 11.5 → 11, Richy Short Squeeze kbScale 10.5 → 11. **Test changes, called out:** tests/practice.test.mjs's drop-gap window is now 3–7 f (the gap counts from the end of the escape lock); tests/ai.test.mjs's air-dash test sums seeds 7–9 for its "the CPU does dash on the ground" guard (one seeded match went 3000 frames without one after the tuning) — what both check is unchanged. **Soft spots:** Ben tops both seeds (54.8 %); the routes are sim-proven frame-perfect — a human pass should say whether the timings feel learnable.

**v3 balance pass 8 — party events (2026-09-28, superseded) — all five gates PASS on two independent seeds at N = 30.**

| Fighter | seed 1337 | seed 2024 |
|---|---|---|
| Ben | 52.1 % | 45.7 % |
| Tim | 48.8 % | 48.1 % |
| Adrian | 56.7 % | 56.9 % |
| Richy | 46.9 % | 50.0 % |
| Nick | 46.4 % | 54.0 % |
| Abi | 51.0 % | 47.9 % |
| Mike | 46.0 % | 49.5 % |
| Seelye | 52.1 % | 47.9 % |
| **camp (≤ 55)** | 15.7 % | 16.4 % |
| **stall (≤ 45)** | 0.8 % | 1.1 % |
| **engagement flags (< 2 %)** | 0.48 % | 0.18 % |
| **recovery dishonest (< 10 %)** | 0.72 % | 0.79 % |

Spread 45.7–56.9 %. Avg match 6082 / 6069 f (~101 s); 6 / 2 capped, 0 stuck. **What changed (Tim's brief):** four new events — **The Wave**, **Spin Class**, **Fire Drill** (the v2 names, rebuilt) and the **Ginger Shot** (DESIGN.md "Stage hazards" 7–10) — join the rotation (~1 in 3 rolls on seed 1337: wave 637, spin 693, fire drill 495, ginger 1043 of 6321). The CPU plays them (boards before the crest, jumps the drop, goes to the muster point, drinks the shot). **Engine change, called out (Tim's sign-off is the brief itself — "extinguisher foam makes the floor slick"):** a `slick` status sets the fighter's ground friction to `PHYS.SLICK_FRICTION` (0.955, vs RUN_FRICTION 0.76) while it lasts; only Fire Drill applies it. The first cut left Adrian at 58.8 % on seed 1337 (gate 1 fail) — Pivot Table kbScale 12 → 11.5 — which then put Nick at 58.3 % on seed 2024; Fund Structure kbScale 12 → 11.5 (undoing pass 5's raise). A shorter toothbrush puddle (240 → 180f) was tried first and moved nothing; it was reverted. **Soft spots:** Adrian is top on both seeds again (56.7 / 56.9 %) — the next data pass should start with him.

**v3 balance pass 7 — roster requests (2026-09-28, superseded) — all five gates PASS on two independent seeds at N = 30.**

| Fighter | seed 1337 | seed 2024 |
|---|---|---|
| Ben | 49.8 % | 53.6 % |
| Tim | 49.5 % | 50.5 % |
| Adrian | 54.8 % | 53.3 % |
| Richy | 48.6 % | 46.1 % |
| Nick | 51.2 % | 51.0 % |
| Abi | 46.9 % | 44.5 % |
| Mike | 51.2 % | 51.1 % |
| Seelye | 48.1 % | 50.0 % |
| **camp (≤ 55)** | 19.2 % | 16.2 % |
| **stall (≤ 45)** | 0.4 % | 0.4 % |
| **engagement flags (< 2 %)** | 0.12 % | 0.24 % |
| **recovery dishonest (< 10 %)** | 0.74 % | 0.72 % |

Spread 44.5–54.8 %. Avg match 6026 / 6051 f (~100 s); 1 / 4 capped, 0 stuck. **What changed (Tim's brief — his explicit sign-off for the two new move kinds):** Ben's memo is a water polo ball (**Skip Shot**, same numbers); Richy's candles are watches (**Daytona** = the Bull, **Submariner** = the Bear — same numbers, same shared lock); Adrian's s2 is **Toothbrush Toss**, a lob that leaves his Nero spill where it lands (replaces the placed puddle); Abi's s2 is **Hollibobs** (new kind `holiday`, replaces House Rosé); Tim's super is **Ask Claude** (new kind `assist`, replaces Run Flow). Tuning to recentre: Toothbrush Toss started at dmg 6 / kb 5 / kbScale 5 / cooldown 360 and put Adrian at 58.6 % on seed 2024 → 5 / 4.5 / 4 / 420; Abi fell to 42.7 % with a 420f Hollibobs cooldown → 360. **Defect fix, called out:** a fighter grabbed by Mike stayed in the `grabbed` state for good if Mike was hit out of the grab (repro: tests/kits.test.mjs "a grab broken by a hit releases the victim" — fails without the fix, passes with it); the victim now releases itself when its grabber no longer holds it. **Test change, called out:** tests/ai.test.mjs's loiter check compared the CPU's voluntary off-stage time on one seed and failed after these kit changes on noise (one seed moved it across the line both ways); it now sums seeds 11–18 (2725 vs 1520 frames, stall profile vs normal) — the claim it checks is unchanged. **Soft spots:** Abi sits lowest on both seeds (44.5–46.9 %) — Hollibobs is a readable dodge, which a human may well find stronger than the bot does; Adrian is top on both seeds.

**v3 balance pass 6 — hit-confirm cancels (2026-09-28, superseded) — all five gates PASS on two independent seeds at N = 30.**

| Fighter | seed 1337 | seed 2024 |
|---|---|---|
| Ben | 51.2 % | 56.1 % |
| Tim | 52.9 % | 46.3 % |
| Adrian | 45.5 % | 46.7 % |
| Richy | 52.1 % | 45.8 % |
| Nick | 47.6 % | 50.0 % |
| Abi | 50.5 % | 51.2 % |
| Mike | 51.2 % | 54.6 % |
| Seelye | 49.0 % | 49.3 % |
| **camp (≤ 55)** | 18.6 % | 16.8 % |
| **stall (≤ 45)** | 1.1 % | 1.1 % |
| **engagement flags (< 2 %)** | 0.54 % | 0.3 % |
| **recovery dishonest (< 10 %)** | 0.69 % | 0.69 % |

Spread 45.5–56.1 %. Avg match 5934 / 5999 f (~99 s); 4 / 5 capped, 0 stuck. **What changed:** hit-confirm cancels (above). Unadjusted they lifted the fastest lights — Tim 57.6 %, Abi 55.5–56.2 % — so Tim's Quick Sync recovery 10 → 11f (it keeps the fastest startup) and Abi's Double-Booked kbScale 12.5 → 12. The CPU's first cut also strung *aerial* follow-ups, which chased launched targets off-stage: the normal profile's voluntary off-stage time rose from 1634 to 2195 frames over 8 seeded matches (tests/ai.test.mjs's loiter check failed on its seed) — CPU strings are now ground-only (1864 frames; the stall profile still loiters far more). With the AI settled Tim read 59.3 % on seed 2024, so Hard Deadline went back to kbScale 12 (pass 4 had raised it to 12.5). **Soft spots:** Tim moved 13 points on a 0.5 kbScale change between runs — he sits on a knife-edge in the sim and needs a human read, not more numbers.

**v3 balance pass 5 — attacks in motion (2026-09-28, superseded) — all five gates PASS on two independent seeds at N = 30** (same methodology).

| Fighter | seed 1337 | seed 2024 |
|---|---|---|
| Ben | 48.3 % | 51.9 % |
| Tim | 51.4 % | 51.4 % |
| Adrian | 45.0 % | 50.5 % |
| Richy | 52.4 % | 49.9 % |
| Nick | 52.7 % | 44.8 % |
| Abi | 53.6 % | 54.8 % |
| Mike | 46.9 % | 48.7 % |
| Seelye | 49.6 % | 48.1 % |
| **camp (≤ 55)** | 18.7 % | 19.3 % |
| **stall (≤ 45)** | 1.0 % | 0.8 % |
| **engagement flags (< 2 %)** | 0.18 % | 0.24 % |
| **recovery dishonest (< 10 %)** | 0.67 % | 0.59 % |

Spread 44.8–54.8 % (pass 4: 46.2–53.0 %). Avg match 5893 / 5882 f (98 s, down ~17 s); 3 / 3 capped (pass 4: 18 / 29), 0 stuck. Every non-band gate moved a long way the right way: fights stay engaged because both players now close distance while swinging. **What changed:** the attacks-in-motion rules above. The first cut (steps with no opponent stop) failed two gates — Adrian 60–67 %, Mike 31–36 %, engagement 2.2–3.4 % — and an ablation (carry-only / step-only / box-only) put it on the step: a 3-frame poke with a 26 px step on the fastest runner out-ranged everything, and steps ran through close targets. The opponent stop fixed engagement; light steps were cut to 8/18/6. Then, to recentre the band: Ben Wingspan startup 16 → 14 and Corner Office 18 → 17 (the slow long-reach bully suffered most from opponents who now close while swinging); Nick Fund Structure kbScale 11.5 → 12; Richy Short Squeeze startup 12 → 11; Mike weight 1.12 → 1.10; Abi's parry `carry: 0`. **Known soft spots:** Abi sits at the top of the band on both seeds (53.6 / 54.8 %) and Nick swings 8 points between seeds — a human pass on the new motion should come before more numbers.

**v3 balance pass 4 — event rethink (2026-09-25, superseded) — all five gates PASS on two independent seeds at N = 30** (same methodology; the director now receives the stage id, so stage-bound events roll only where they belong).

| Fighter | seed 1337 | seed 2024 |
|---|---|---|
| Ben | 50.0 % | 50.6 % |
| Tim | 50.0 % | 53.0 % |
| Adrian | 51.2 % | 51.4 % |
| Richy | 46.8 % | 51.5 % |
| Nick | 49.0 % | 46.4 % |
| Abi | 52.1 % | 51.1 % |
| Mike | 52.4 % | 46.2 % |
| Seelye | 48.5 % | 49.8 % |
| **camp (≤ 55)** | 29.5 % | 27.7 % |
| **stall (≤ 45)** | 2.7 % | 2.5 % |
| **engagement flags (< 2 %)** | 1.19 % | 1.85 % |
| **recovery dishonest (< 10 %)** | 0.92 % | 0.89 % |

Spread 46.2–53.0 % (pass 3: 45.6–54.6 %). Avg match 6909 / 7004 f (115–117 s, up ~5 s: the new events give meter, never gauge, where the old wave, bikes and fire drill drained composure); 18 / 29 capped, 0 stuck; Palace (widest slab, no centre platform) carries most of the caps. **What changed:** the v2-era events (Urgent Underwriting's freeze-and-mash, The Wave, Spin Class, Fire Drill) were replaced by Deal Deadline, Investment Committee, Site Visit, Sprinkler Test (office/pub) and Crosswind / Train Approaching (rooftop/tube); Berlin stays (DESIGN.md "Stage hazards"). The first cut failed gate 4 on one seed (2.62 % flagged, 41 capped) — the scaffold decks sat over the lips and doubled as recovery ledges, and a 7 s vote on Palace's open slab held both fighters at centre stage. Decks moved inside the lips (9 s), the vote cut to 5.5 s, and on stages without a centre perch the IC room now moves between the mirrored side platforms. Tim, who sat at the floor afterwards (41.7–42.5 %), got Hard Deadline kbScale 12 → 12.5. **Known soft spots:** engagement flags run close to the 2 % gate on seed 2024 (1.85 %) — Palace is the stage to watch; a human pass should say whether the events read and feel fair before any retune.

**v3 balance pass 3 — kit rethink (2026-09-25, superseded) — all five gates PASS on two independent seeds at N = 30** (`node src/dev/sim.js 30 1337` / `… 2024`, same methodology as pass 2).

| Fighter | seed 1337 | seed 2024 |
|---|---|---|
| Ben | 54.5 % | 48.8 % |
| Tim | 45.6 % | 47.1 % |
| Adrian | 51.8 % | 54.6 % |
| Richy | 46.7 % | 49.9 % |
| Nick | 47.6 % | 48.1 % |
| Abi | 52.1 % | 47.6 % |
| Mike | 50.1 % | 49.8 % |
| Seelye | 51.5 % | 54.0 % |
| **camp (≤ 55)** | 30.4 % | 28.3 % |
| **stall (≤ 45)** | 3.0 % | 2.7 % |
| **engagement flags (< 2 %)** | 0.89 % | 0.95 % |
| **recovery dishonest (< 10 %)** | 0.76 % | 0.84 % |

Spread 45.6–54.6 % (pass 2: 44.4–55.0 %). Avg match 6658 / 6696 f (111–112 s); 14 / 13 capped, 0 stuck. Matrix, seed 1337 (row beats column, /30): Ben v Tim 18 · Adrian 21 · Richy 19 · Nick 17 · Abi 17 · Mike 15 · Seelye 13 — Tim v Ben 16 · Adrian 12.5 · Richy 17 · Nick 17 · Abi 10 · Mike 12 · Seelye 16 — Adrian v Ben 12 · Tim 17 · Richy 12 · Nick 21 · Abi 17 · Mike 17 · Seelye 19 — Richy v Ben 14 · Tim 13 · Adrian 18 · Nick 14 · Abi 17 · Mike 19 · Seelye 13 — Nick v Ben 16 · Tim 20 · Adrian 10 · Richy 22 · Abi 13 · Mike 9 · Seelye 17 — Abi v Ben 13 · Tim 14 · Adrian 20 · Richy 17 · Nick 17 · Mike 14 · Seelye 16 — Mike v Ben 11 · Tim 17 · Adrian 14 · Richy 15 · Nick 20 · Abi 13 · Seelye 14 — Seelye v Ben 19 · Tim 20 · Adrian 12 · Richy 20 · Nick 11 · Abi 15 · Mike 17.5. **Known soft spots:** Tim sits lowest on both seeds (45–47 %) — retiring the reversed-controls e-mail cost him the CPU stumble it caused, and Scheduled Send sets up rather than kills; Seelye leads seed 2024 (54 %, 26/30 over Abi); Nick loses ~2:1 to Adrian. A human pass should confirm the new verbs read before any numbers-only fix.

**What pass 3 changed and why** (`docs/PROPOSAL-kits.md` is the signed-off plan; final numbers below differ from it where the sim said so):

- *Hardcoded → data (no sign-off needed, called out):* the `columns` behaviour reads offsets / delay / step / kbAngle / colour / slot / onTarget from the move (defaults = Richy's super); the parry riposte reads `counter` from the parry move (defaults = the old Declined numbers).
- *Defect fix:* the parry riposte was flagged unparryable and so whiffed against airborne attackers — Calendar Block did nothing to jump-ins. Repro in `tests/kits.test.mjs`; the riposte is now a normal hit.
- *Approved engine items (Tim's sign-off on the proposal):* I KNOW YOUR GUY (move kind `borrow`: s2 becomes a copy of the opponent's s1 for 600f, +2 startup, cooldown capped at 150f, supers never copied), Happy Accident (`cfg.tripHit`: a whiffed-move self-stagger fires one 6-dmg 5/5 @75 hitbox at 70 px; the 30f stagger is unchanged), Declined silence (90f), aimable grabs (`aimable`: hold back at the release throws behind), air parry.
- *New kits (data):* Ben My Office. Now. (dmg 7, 5/6 @150 — a pull; cooldown 380, speed 3.2), Corner Office side signature (range 100, 18f startup, recover 28), Chair Surf recovery (travel 110, lift 8) · Tim Scheduled Send (one strike under the target, 34f delay, 10 dmg 6/11 @70, cooldown 220), Zulu Time cooldown 600 → 480, gauge 100 → 104, run 5.4 → 5.7, Escalation recovery 8 dmg / kbScale 10 · Adrian Overshoot recovery (travel 140, lift 7, whiff-stagger), Facedown whiff-stagger, Table Flip kbScale 12 → 11 · Nick Priority Boarding recovery (lift 12, 8 i-frames), Fund Structure kbScale 11 → 11.5, Card Fan kbScale 11 → 12 · Abi gauge 96 → 100, RSVP recovery slows 60f · Mike Scaffold Rise lift 9 + armor [1, 10], Site Drop armor [4, 14] landLag 24, weight 1.15 → 1.12 · Seelye Enforcement super (shout, 12 dmg 8/14 @40, range 90, 24f startup, +8 on a lien — 20 total), Drawdown dmg 9 → 8, Term Sheet Rise applies lien, gauge 110 → 106.
- *Tuning path:* the first cut (proposal numbers) failed gate 1 — Ben 61 % (the pull fed Wingspan / Corner Office: 61 % hit rate), Tim 39 %, Adrian 61 % (relative: his own changes barely register). Four rounds of the adjustments above brought everyone inside the band; each approved engine item was then added one commit at a time with both seeds re-run (all passed; Nick needed the borrow cooldown cap and the two kbScale nudges after losing Lifetime Platinum's haste/+3 damage).
- *AI:* `columns` counts as a ranged special; the CPU aims an aimable throw at the nearer edge and fires a borrowed special the way its owner's archetype would.

**v3 balance pass 2 — Phase 3b (2026-09-25, superseded) — all five gates PASS on two independent seeds at N = 30** (`node src/dev/sim.js 30 1337` / `… 2024`, 1680 matches + 840 camp + 840 stall each, five selectable stages, n = 420 games per fighter, 95 % CI ≈ ±5).

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
