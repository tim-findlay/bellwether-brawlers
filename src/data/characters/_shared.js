// Shared helpers for the per-fighter data files. Numbers: world px at zoom 1,
// frames at 60 Hz. BALANCE.md bands: lights kb 4–6/scale 4–6 · nair/uair same ·
// side-airs kb 5–7/scale 8–12 · spikes kb 5–7/scale 8–10 @ 270±15 · heavies
// kb 6–8/scale 10–14 · specials kb 5–9/scale 6–12 · damage supers kb 8–10/14–18.

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
