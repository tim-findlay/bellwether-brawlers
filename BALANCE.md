# BALANCE.md — Bellwether Battlers

*Canonical for numbers and rules where DESIGN.md and this file could drift.*

## Philosophy

1. **Soft archetype wheel.** Zoning (Richy, Ben) pressures slow tanks (Mike, Seelye); rushdown (Adrian, Nick) gets past projectiles; tanks and counter-punchers (Mike, Abi) punish reckless rushdown. *Soft*: difficulty, not destiny — every cast member has a written answer into every other (e.g. Mike's Demolition Day clanks projectiles; Seelye's Dad Reflexes eats them).
2. **Telegraph rule (canonical, OR-form).** Any move dealing ≥ 12 dmg or carrying a status/unblockable property needs **at least one** of: ≥ 18f readable startup, a distinct sound cue, or a fixed/marked arrival point. Scaffold Slam: 16f wind-up + "UNBLOCKABLE!" flash + sound. Wrecking Swing: 14f + armor flash. Status Match: wind-up shimmer + fixed arrival.
3. **Counterplay is a hard requirement.** Every special and super ships with a written counter in DESIGN.md. No counter, no ship.
4. **Statuses are short, visible, and worded.** Max 3.5s. Word callouts above the head plus duration bars. Reversal ends early when its owner converts (one stolen turn). Nothing self-stacks.
5. **Events never decide matches.** Per-event swing ≤ ~6 HP equivalent; rewards small; everything dodgeable or symmetric; nothing in the final 5s; stagger penalties are never comboable (brief invulnerability on recovery).
6. **No stall packages.** Timeout goes to **% of max HP**, chip counts per move instance (min 1 per move, not per hit), Abi's regen cancels on any damage taken, runaway supers build no meter. Turtling and running both pay worse than fighting.

## Numbers doctrine

- HP band: 85 (Nick) – 125 (Mike). Speed band: 2.5 – 3.9, inverse-correlated with HP/weight.
- A full super ≈ 18–22 dmg (≤ 25% of an average bar). Command grab 14. **No single interaction above 25 dmg** — multi-part supers enforce this structurally (TO THE MOON: only the first connecting column hits).
- **Meter:** gain = 80% damage dealt + 50% damage taken; cost 100; **persists across rounds, resets each match**. A winning round (~100 dealt / ~60 taken) ≈ one full bar — first supers typically appear in round 2, roughly once a round thereafter.
- **Chip:** 15% of the move's total damage, applied once per move instance, min 1.
- **Wake-up:** knockdown (40f) + get-up (12f) fully invulnerable; grabs/unblockables whiff vs non-actionable opponents.

## Sim methodology

`index.html?sim=N` (dev flag; `sim.js` is dynamically imported, never loaded in normal play): headless fast-forward CPU-vs-CPU, Normal AI, events ON, all 28 pairings × N matches each way across the three stages, seeded RNG. Reports a win-rate matrix + per-character aggregates.

**Ship gates:**
1. Every fighter's aggregate win rate within **42–58%**.
2. **Stall-bot sanity check:** a runaway/turtle AI profile must not outperform the standard profile by more than noise — if stalling sims better than fighting, the anti-stall rules above have a hole.

CPU sims are blind to human-feel issues (mash events, control reversal, frustration). Those are governed by the doctrine rules above, not the win-rate gate; first human playtest should specifically poke: Urgent Underwriting in 2P, reversal feel, Abi/Nick stall attempts.

## Current results

*(populated by the harness before ship — see README for how to run it)*

| Fighter | Aggregate win rate |
|---------|--------------------|
| TBD     | TBD                |
