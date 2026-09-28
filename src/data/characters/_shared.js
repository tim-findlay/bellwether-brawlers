// Shared helpers for the per-fighter data files. Numbers: world px at zoom 1,
// frames at 60 Hz. BALANCE.md bands: lights kb 4–6/scale 4–6 · nair/uair same ·
// side-airs kb 5–7.5/scale 8–13 · spikes kb 5–7/scale 8–10 @ 270±15 · heavies
// kb 6–8/scale 10–13 · specials kb 5–9/scale 6–13 · damage supers kb 8–10/14–18.
//
// Brawlhalla-style kit (Phase 3b): every button reads the held direction.
//   ground Light  + n/s/d  -> lights.n / lights.s / lights.d   (fast, chainable)
//   ground Heavy  + n/s/d  -> sigs.n / sigs.s / sigs.d         (signatures: the kill moves)
//   air Light     + n/s/u/d-> aerials.n / .s / .u / .d          (nair / sair / uair / dair-spike)
//   air Heavy     + any    -> recovery  (rising attack, once per airtime)
//   air Heavy     + down   -> groundPound (diving spike, heavy landing lag)
// A character file declares `light`, `heavy` and `aerials` as before and the
// variants are DERIVED by expandKit() below; any field of any variant can be
// overridden in `kit: { lights: { s: {...} }, sigs: {...}, recovery: {...}, groundPound: {...} }`.

import { PHYS } from '../physics.js';

// The four aerials every fighter carries (Light + held direction in the air).
// Overrides let a fighter tune any field; names come from DESIGN.md.
export function aerials({ n, s, u, d }, tune = {}) {
  return {
    n: { name: n, kind: 'aerial', dmg: 5, kb: 5, kbScale: 5, kbAngle: 50, range: 62, startup: 6, active: 4, recover: 12, landLag: 8, ...tune.n },
    s: { name: s, kind: 'aerial', dmg: 7, kb: 6, kbScale: 10, kbAngle: 30, range: 70, startup: 8, active: 4, recover: 14, landLag: 10, ...tune.s },
    u: { name: u, kind: 'aerial', dmg: 5, kb: 5, kbScale: 6, kbAngle: 85, range: 60, startup: 6, active: 4, recover: 12, landLag: 8, ...tune.u },
    d: { name: d, kind: 'aerial', dmg: 6, kb: 6, kbScale: 9, kbAngle: 270, range: 56, startup: 9, active: 4, recover: 16, landLag: 14, spike: true, ...tune.d },
  };
}

const r1 = (v) => Math.round(v * 10) / 10;

// Fill in the directional variants from the base light / heavy / aerials.
// Names: kit.names = { sLight, dLight, sSig, dSig, recovery, groundPound }.
export function expandKit(cfg) {
  const L = cfg.light, H = cfg.heavy, A = cfg.aerials, K = cfg.kit || {}, N = K.names || {};
  const lights = {
    n: { step: 8, ...L },                      // every ground move steps into the hit (`step`, eased; see PHYS attacks in motion)
    // side light: a longer step-in poke that sends sideways — the string starter
    s: { ...L, name: N.sLight || `${L.name} (side)`, dmg: L.dmg + 1, kb: r1(L.kb * 1.1), kbScale: L.kbScale + 1, kbAngle: 28,
         range: Math.round(L.range * 1.2), step: 18, startup: L.startup + 2, recover: L.recover + 3, ...K.lights?.s },
    // down light: a low sweep that pops them up — the combo starter into aerials
    // (the Pop-Up starter: a fixed-force pop to head height, whatever their composure)
    d: { ...L, name: N.dLight || `${L.name} (low)`, kbAngle: 82, kb: LAUNCHER_KB, range: Math.round(L.range * 0.9), low: true, step: 6,
         startup: L.startup + 1, recover: L.recover + 2, ...K.lights?.d },
  };
  const sigs = {
    n: { step: 18, ...H },
    // side signature: the heavy with a lunge — reach at the cost of commitment
    s: { ...H, name: N.sSig || `${H.name} (side)`, kbAngle: Math.min(H.kbAngle, 32), step: 56, startup: H.startup + 2, recover: H.recover + 4,
         range: Math.round(H.range * 0.95), ...K.sigs?.s },
    // down signature: a low launcher that sends UP — sets up the air chase, kills off the top late
    d: { ...H, name: N.dSig || `${H.name} (low)`, kbAngle: 78, dmg: H.dmg - 1, kb: r1(H.kb * 0.95), kbScale: r1(H.kbScale * 0.9), low: true,
         range: Math.round(H.range * 0.85), step: 12, startup: Math.max(9, H.startup - 2), recover: H.recover + 2, ...K.sigs?.d },
  };
  // recovery: air heavy — a rising strike that also carries the body up (once per airtime)
  const recovery = { name: N.recovery || `${A.u.name} Rise`, kind: 'aerial', dmg: 7, kb: 6, kbScale: 9, kbAngle: 80, range: 64,
    startup: 8, active: 6, recover: 14, landLag: 14, lift: 11, ...K.recovery };
  // ground pound: air heavy + down — a diving spike, the heaviest landing lag in the kit
  const groundPound = { name: N.groundPound || `${A.d.name} Pound`, kind: 'aerial', dmg: 9, kb: 7, kbScale: 10, kbAngle: 270, range: 60,
    startup: 10, active: 30, recover: 12, landLag: 20, dive: 15, spike: true, ...K.groundPound };
  const kit = { ...cfg, lights, sigs, recovery, groundPound, aerials: { ...A } };
  if (K.lights?.d?.kb === undefined) lights.d.kb = LAUNCHER_KB + Math.max(0, (kit.aerials.n.startup || 6) - 6);   // slower nAir: pop them higher
  comboStuns(kit, K.stun || {});
  return kit;
}

// ---- the combo blueprint (DESIGN.md "Combos", src/data/combos.js) -------------------
// A starter's FIXED stun is derived from the fighter's own frame data so its
// universal route links: long enough to cancel (or chase) and land the next
// move, plus a small margin for the step between them. A new fighter gets
// working combos for free; `kit.stun = { nLight, sLight, dLight, nAir }` adds
// frames per starter when the lab (node src/dev/combos.js) says a route drops.
// Enders (sAir, signatures) carry no fixed stun: their launch is their stun.
const cancelAt = (m) => (m.active || 0) + Math.ceil((m.recover || 0) * PHYS.HIT_CANCEL_FRAC) + 1;   // hit -> first cancel frame
export const COMBO_MARGIN = 3;
export const STARTER_KB_SCALE = 1.5;   // Brawlhalla's split: starters are (almost) fixed force, enders carry the scaling
export const LAUNCHER_KB = 11;          // dLight's fixed pop (launch ≈ kb × KB_BASE_MULT): to head height; +1 per frame of nAir startup past 6
function comboStuns(k, add) {
  const L = k.lights, A = k.aerials, S = k.sigs, lock = PHYS.POST_STUN_LOCK, M = COMBO_MARGIN;
  const set = (m, frames, extra = 0) => {
    if (m.stun === undefined) m.stun = Math.max(12, Math.round(frames - lock + M + extra));
    if (m.starterScale === undefined) m.kbScale = Math.min(m.kbScale ?? 0, STARTER_KB_SCALE);   // fixed force: the same shove at any composure
  };
  set(L.n, cancelAt(L.n) + S.s.startup, add.nLight);                                          // Confirm: nLight > sHeavy
  set(L.s, (L.s.active || 0) + 1 + PHYS.CHASE_CANCEL_FROM + 4 + A.s.startup, add.sLight);     // Chase:   sLight > chase > sAir
  set(L.d, cancelAt(L.d) + 3 + A.n.startup, add.dLight);                                      // Pop-Up:  dLight > jump > nAir
  set(A.n = { ...A.n }, (A.n.landLag || 8) + L.n.startup + 6, add.nAir);                       // Jump-In: nAir > land > nLight
}
