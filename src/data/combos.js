// The combo blueprint (DESIGN.md "Combos"): the universal routes every fighter
// carries, the way every Brawlhalla weapon has its bread-and-butter strings.
// Each route is a list of steps; the hits must land as a TRUE combo (no gap
// longer than PHYS.POST_STUN_LOCK) on a standing dummy while its composure is
// inside `window` (emptiness 0 = full, 1 = empty; launches grow as it empties,
// so every route has a range where it works). tests/combos.test.mjs runs every
// route for every fighter; `node src/dev/combos.js` prints the matrix — a new
// fighter ships when it passes. The practice arena lists them as trials.
//
// Steps: nLight sLight dLight · nHeavy sHeavy dHeavy · nAir sAir uAir dAir (hits)
//        jump · chase (movement, no hit). "s" = toward the opponent.

export const ROUTES = [
  { id: 'jab', name: 'Jab String', steps: ['nLight', 'sLight'], window: [0, 0.6],
    how: 'Light, then toward + Light the moment it connects.' },
  { id: 'confirm', name: 'Confirm', steps: ['nLight', 'sHeavy'], window: [0, 0.6],
    how: 'Light, then toward + Heavy: a signature off a jab. The kill route late on.' },
  { id: 'popup', name: 'Pop-Up', steps: ['dLight', 'jump', 'nAir'], window: [0, 0.4],
    how: 'Down + Light pops them up — jump after it and Light in the air.' },
  { id: 'chase', name: 'Chase', steps: ['sLight', 'chase', 'sAir'], window: [0, 0.4],
    how: 'Toward + Light, Dodge to chase them, toward + Light in the air.' },
  { id: 'jumpin', name: 'Jump-In', steps: ['nAir', 'nLight'], window: [0, 0.6], air: true,
    how: 'Jump at them, Light on the way down, then Light again as you land.' },
];

// step -> the move it throws, from an expanded kit
export function moveFor(cfg, step) {
  const L = cfg.lights || {}, S = cfg.sigs || {}, A = cfg.aerials || {};
  return {
    nLight: L.n, sLight: L.s, dLight: L.d, nHeavy: S.n, sHeavy: S.s, dHeavy: S.d,
    nAir: A.n, sAir: A.s, uAir: A.u, dAir: A.d,
  }[step] || null;
}
export const HIT_STEPS = (r) => r.steps.filter(s => s !== 'jump' && s !== 'chase');
