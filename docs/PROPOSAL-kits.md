# Kit rethink — proposal for sign-off (2026-09-25)

Status: **approved by Tim ("go") and implemented 2026-09-25**; all four decisions taken as yes and all five [ENGINE] items built. The final numbers differ from the ones below where the sim said so; DESIGN.md (roster) and BALANCE.md (pass 3) are canonical. Deltas: Nick's borrow lasts 10 s, caps the borrowed cooldown at 150f and builds meter; Enforcement is 12 dmg (+8 lien), range 90; Scheduled Send is 10 dmg on a 34f delay; Ben's Corner Office is range 100 at 18f; Mike ended at weight 1.12 with lift 9. Implementing the air parry also exposed a defect (the parry riposte whiffed against airborne attackers), fixed separately.

Original proposal text follows. Tim's note: "fully challenge and potentially rethink the abilities of each character, they are a bit stale / dated."
Every change is tagged:

- **[DATA]** — character-file values or kit overrides using move kinds and fields the engine already honours (`travel`, `lift`, `dive`, `armor`, `applyStatus`, `zoneOnLand`, `whiffStagger`, `iframes`, `kbAngle` past 90 for pulls, per-fighter `hooks`). No sign-off needed, but every batch re-runs `node src/dev/sim.js 30 1337` and `… 2024` against the five BALANCE.md gates.
- **[DATA→]** — moves a hard-coded engine value into data (for example the `columns` offsets and the parry counter numbers). The change policy allows this without asking; it is called out and re-simmed.
- **[ENGINE]** — a new move kind, status effect or combat rule. **Needs Tim's sign-off first.**

## Why the kits feel stale (diagnosis)

1. **Six of every fighter's thirteen buttons are clones.** `expandKit()` derives the side and down lights, side and down signatures, recovery and ground pound with the *same shapes* for all eight; only the names differ. In Brawlhalla the signatures and recovery are where a character lives. This is the biggest lever, and it is all [DATA] through `kit` overrides.
2. **Specials overlap.** There are three lobs (Ben's Hawk Toss, Abi's House Rosé, Seelye's Brisket Bomb), two lunges (Ben, Adrian), two self-buffs (Tim's s2, Nick's super) and two counter-stances (Abi, Seelye).
3. **The jokes have dated.**
   - "Prompt Injection" and "AGI Moment" are 2023 AI discourse.
   - "To The Moon", "Pump" and "Meme Slap" are 2021 crypto and meme-stock.
   - Seelye's BBQ kit is one Tim already said he isn't ("not a BBQ guy"; it "stays for now").
4. **One feel-bad status.** Reversed controls, from Tim's e-mail, is the most-disliked status in the genre: it punishes the victim's hands rather than their decisions.
5. **Half the supers are "place a thing and wait".** Columns, smoke, the wrecking ball and Last Orders are low on drama. Two are passive (Nick's buff, Seelye's smoke).

## The idea: one verb per fighter

Each kit revolves around one mechanic that nobody else has.

| Fighter | Verb | Today | Proposed hook |
|---|---|---|---|
| Ben | **Controls space** | lob + lunge | a ranged **pull** plus the game's longest signature |
| Tim | **Steals tempo** | reverse-controls e-mail | a **scheduled strike** plus the cooldown rewind |
| Adrian | **Gambles** | clumsiness only taxes him | a **trip that can hit** (a happy accident) |
| Richy | **Alternates** | candles plus Diversified Portfolio | keep; update the names |
| Nick | **Steals kit** | passive buff super | **"I Know Your Guy"**: borrow the opponent's special |
| Abi | **Denies** | parry + lob + Last Orders | a parry that **declines** (silences) |
| Mike | **Absorbs and throws** | armor + grab | an **aimable throw** plus armored climbing |
| Seelye | **Marks and collects** | lien → BBQ setplay | **lien → Enforcement** super; debt and new-dad re-skin |

---

## Per fighter

### BEN — long-range bully
- **Cut Hawk Toss** (the third lob). **New s1 "My Office. Now."** [DATA]: a slow straight projectile that drags the target toward Ben (`kind: 'projectile'`, dmg 7, kb 6, kbScale 6, `kbAngle: 150`; the same drag trick as Richy's Short Squeeze), cooldown 320, startup 14. This is the bully verb: he decides where the fight happens.
  - *Counter:* it is slow and straight. Jump it, or dodge through it and punish the recovery.
- **Side signature "Corner Office"** [DATA]: range 110, startup 16, travel 40. The longest ground reach in the game, and the slowest.
- **Recovery "Chair Surf"** [DATA]: travel 110, lift 8. A long, flat, readable diagonal: his surf.
- Keep Off the Lip, Twelfth Man, Pistachio Flick and L-Plate Drop.

### TIM — tempo all-rounder
- **Cut the `reversed` status from the roster** (the engine support stays, unused).
- **s1 "Scheduled Send"** [DATA→]: one marked strike under the opponent's position that lands 40 frames later (dmg 9, kb 6, kbScale 8, angle 80), cooldown 280.
  - This reuses the `columns` behaviour once its hard-coded offsets, delay and colour become move data (Richy's super keeps today's values as defaults).
  - It meets the telegraph rule through its marked arrival point.
  - *Counter:* move off the marker; it punishes standing still.
- **Super "Run Flow"** [DATA]: rename AGI Moment; same dash-combo. The automation joke is about what Tim actually does.
- **Recovery "Escalation"** [DATA]: dmg 8, kbScale 10. He has no recovery special, so his recovery hits hard instead.
- Keep Zulu Time (it now rewinds Scheduled Send), The Drop and the satchel.

### ADRIAN — chaos rushdown
- **"Happy Accident"** [ENGINE]: when a whiffed Clumsy Charge or Faceplant trips him, the landing emits one small hitbox (dmg 6, kb 5, kbScale 5, angle 75). His tax becomes a gamble. The 30-frame self-stagger is unchanged, so the punish window survives.
  - *Counter:* stay out of arm's reach of the fall, then punish.
- **Recovery "Overshoot"** [DATA]: travel 140, lift 7, `whiffStagger: true`. It goes the furthest sideways, the lowest, and lands in a heap if it whiffs.
- **Ground pound "Facedown"** [DATA]: `whiffStagger: true`, the same as Faceplant.
- Keep Nero Spill, Pivot Table, Full Audit and Toothbrush Jab. "Analytical, clumsy, Nero" still reads well.

### RICHY — dual-candle zoner
- **Keep the mechanic.** "Dodge the Bull, jump the Bear", the shared lock and Diversified Portfolio are the best-designed system in the roster.
- **Names only** [DATA]:
  - To The Moon → **"Rate Hikes"** (three rising columns, and rates are what move real estate).
  - Meme Slap → **"Macro Slap"** (he is the Excel macro artisan).
  - Pump → **"Uptick"**.
  - Keep Bull Run, Bear Raid, Short Squeeze and Portfolio Spin.
- No numbers change. He sits at 46–51 %.

### NICK — teleport glass cannon
- **Super "I Know Your Guy"** [ENGINE, the headline item]: for 8 seconds, Nick's s2 becomes a copy of the opponent's s1, with its own cooldown (for example, he throws Richy's Bull, drags with Ben's pull, or grabs with Mike's slam). It builds no meter while active, the same rule as Lifetime Platinum.
  - Needs a small copy-move rule: copied moves use Nick's frames +2 startup, and copied supers are never allowed.
  - *Counter:* your own special's counter still applies, and the banner says exactly what he borrowed.
- *Fallback if not approved:* keep Lifetime Platinum as it is.
- **Recovery "Priority Boarding"** [DATA]: lift 12, iframes 8. Floaty and high, the lightest body.
- Keep Status Match, Points Redemption and Name Drop.

### ABI — defensive counter-puncher
- **Parry counter into data** [DATA→]: the parry-success hit ("Declined", 12 dmg, 7/6) is hard-coded in `combat.js`. Move it into Abi's s1 as `counter: {…}`.
- **"Declined" silences** [ENGINE]: a successful Calendar Block also applies `silence` for 90 frames. It is her verb (she declines your meeting), and it links to Last Orders.
- **Air Calendar Block** [ENGINE/feel]: try `air: true` on the parry. If the stance does not hold in the air, it is a small engine change.
- **Recovery "RSVP"** [DATA]: `applyStatus: slow 60` on hit.
- **House Rosé stays the lob**, and she now owns it (Ben's is cut; Seelye's lob exists to leave ground, not to slow).
- Keep Pub O'Clock (the most distinctive super in the game).

### MIKE — armored grappler tank
- **Aimable Scaffold Slam** [ENGINE]: holding back throws behind, toward the other edge. The grappler's real decision is which edge to throw toward.
  - *Counter:* the slam is still unparryable-grounded; jump the wind-up.
- **Recovery "Scaffold Rise"** [DATA]: lift 8 (the worst in the game, as the doctrine requires) but `armor: [1, 10]`. The climb can't be swatted, only ledge-guarded.
- **Ground pound "Site Drop"** [DATA]: `armor: [4, 14]`, landLag 24, matching Demolition Drop.
- **Numbers** [DATA]: he sits at the ceiling (54–55 %). Try weight 1.15 → 1.12 first.
- Keep Demolition Day, Wrecking Ball, the Header and Berlin.

### SEELYE — setplay collector, "debt side, new dad"
- **Re-theme BBQ → debt finance and new dad** [DATA]:
  - Title **"THE LENDER"** (was The Pitmaster).
  - Brisket Bomb → **"Drawdown"**: same lob and burning-ground zone. The zone gets a paperwork look, a small render tweak.
  - Aerials: Tongs Out → **"Burp Cloth"**, Smoke Ring → **"Night Feed"**, Brisket Drop → **"Hard Maturity"**. Keep **Fresh One** (the diaper) and **Dad Reflexes**.
- **Super "Enforcement"** replaces Low & Slow [DATA]:
  - A grounded cone (`kind: 'shout'`), dmg 14, startup 24 with its own sound, *parryable* (unlike Ben's roar).
  - His existing `preHit` hook collects an active **lien** for +8 (22 total, under the 25 cap), calls out "LIEN ENFORCED!", and clears the lien.
  - The collector finally has a payoff: mark with Leverage, then collect.
  - *Counter:* it telegraphs; jump or dodge it, and play around the lien timer.
- **Recovery "Term Sheet Rise"** [DATA]: `applyStatus: lien 480` on hit.
- **Balance note:** he has been at the floor (44 % on one seed). Enforcement is the intended fix; re-sim before any numbers.

---

## Cross-cutting

- **Derived moves get identity** [DATA]: the recovery and ground-pound overrides above. Every other derived move stays derived, so `expandKit()` keeps doing its job.
- **Duplicates resolved:**
  - One lob that slows (Abi) and one that leaves ground (Seelye).
  - One lunge recovery (Ben) and one lunge that trips (Adrian).
  - One cooldown buff (Tim).
  - One parry (Abi) and one catch (Seelye).
- **BALANCE.md housekeeping** [docs]: the Numbers doctrine bands are stale against pass 2. They list a weight band of 0.9–1.08, but Mike is 1.15, and "Nick 85 gauge", but he is 100. Fix these alongside the pass.

## Order of work

1. **Pass A, all [DATA] and [DATA→]:**
   - renames and re-themes;
   - Ben's pull and Corner Office;
   - Scheduled Send (with `columns` parameters moved into data);
   - Enforcement;
   - the recovery and ground-pound overrides;
   - Mike's weight;
   - the parry counter moved into data.

   Then run both sim seeds and all five gates, and update DESIGN.md and BALANCE.md in the same commits.
2. **Pass B, the [ENGINE] items Tim approves, one commit each, re-simmed:** I Know Your Guy, Happy Accident, Declined silence, the aimable Scaffold Slam, and the air parry.
3. **Art:** only Seelye's paperwork zone and Scheduled Send's marker are new visuals. No sheet regeneration is needed.

## Decisions for Tim

1. Seelye: drop the BBQ theme for debt and new dad, and become "The Lender"?
2. Richy: swap the crypto names for Rate Hikes, Macro Slap and Uptick?
3. Which [ENGINE] items get approved: I Know Your Guy, Happy Accident, Declined silence, aimable throw, air parry?
4. Tim's e-mail: agree to retire reversed controls?
