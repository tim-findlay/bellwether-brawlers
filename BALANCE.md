# BALANCE.md — Bellwether Battlers

## Philosophy

1. **Soft archetype wheel.** Zoning (Richy, Ben) pressures slow tanks (Mike, Seelye); rushdown (Adrian, Nick) gets past projectiles; tanks and counter-punchers (Mike, Abi) punish reckless rushdown. *Soft*: a knowledgeable player can win any matchup — the wheel sets difficulty, not destiny.
2. **Telegraph tax.** Damage and effect strength are priced by how visible the move is. Anything ≥ 12 dmg or with a status/unblockable property gets ≥ 18f of readable startup, a sound cue, or a fixed arrival point.
3. **Counterplay is a hard requirement.** Every special and super in DESIGN.md ships with a written counter. If we can't write the counter, the move doesn't ship.
4. **Statuses are short and visible.** No status exceeds 5s; all are iconed with a duration bar. Nothing stacks with itself.
5. **Events never decide matches.** Event damage is capped at ~6% of average HP; rewards are small; everything is dodgeable or symmetric; nothing fires in the final 5 seconds.

## Numbers doctrine

- HP band: 85 (Nick) – 125 (Mike). Speed band: 2.5 – 3.9 (inverse-correlated with HP/weight).
- A full successful super ≈ 18–22 dmg (≤ 25% of an average bar). Command grab 14. No single interaction above 25 dmg.
- Meter: ~2 average exchanges to a full bar; supers should appear roughly once per round, not once per match.
- Chip: 15% through block (min 1), so turtling loses slowly but surely.

## Sim methodology

`index.html?sim=N` (dev flag, also `npm`-free console call `runSim(N)`): headless fast-forward CPU-vs-CPU, Normal AI, events ON, all 28 pairings × N matches each way across all three stages, seeded RNG. Reports a win-rate matrix + per-character aggregate.

**Ship gate: every fighter's aggregate win rate within 42–58%.** Outliers get number tuning (damage/cooldown/HP first; mechanics only as a last resort), then re-sim.

## Current results

*(populated by the harness before ship — see README for how to run it)*

| Fighter | Aggregate win rate |
|---------|--------------------|
| TBD     | TBD                |
