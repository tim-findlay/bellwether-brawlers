import { aerials } from './_shared.js';

export default {
  id: 'mike', name: 'MIKE', title: 'THE SITE MANAGER', archetype: 'Armored grappler tank',
  tagline: 'Construction MD. Don’t test him.',
  win: 'Job’s done. United are top, an’ all.',
  tip: 'Worst recovery in the game by design — knock him off and guard the edge. Jump the grab wind-up.',
  body: { suit: '#33302e', trim: '#e8a33d', skin: '#e0b490', hair: { color: '#5a4030', style: 'side' }, height: 0.98, build: 'broad', extras: ['hivis', 'hardhat'] },   // fit and stocky, no belly (art only; weight is a stat)
  stats: { gauge: 102, runMax: 4.4, jumpImpulse: 14, fallMax: 16, weight: 1.14 },
  light: { name: 'Hard Hat', dmg: 5, kb: 5, kbScale: 6, kbAngle: 40, range: 60, startup: 6, active: 3, recover: 12 },
  heavy: { name: 'Wrecking Swing', dmg: 10, kb: 7, kbScale: 11.5, kbAngle: 35, range: 72, startup: 14, active: 4, recover: 22, armor: [7, 13] },
  aerials: aerials({ n: 'Site Sweep', s: 'Girder Swing', u: 'Header', d: 'Demolition Drop' }, { u: { dmg: 7, kbScale: 8 }, d: { dmg: 9, kb: 7, kbScale: 10, startup: 14, landLag: 18, armor: [4, 14] } }),
  s1: { name: 'Scaffold Slam', kind: 'grab', dmg: 14, kb: 8, kbScale: 11, kbAngle: 45, range: 68, startup: 16, recover: 24, cooldown: 380, unparryable: true },
  s2: { name: 'Demolition Day', kind: 'shockwave', dmg: 8, kb: 7, kbScale: 8, kbAngle: 70, radius: 150, startup: 18, recover: 24, cooldown: 360 },
  super: { name: 'Wrecking Ball', kind: 'hazardSuper', dmg: 20, kb: 9, kbScale: 15, startup: 20, recover: 24, aiRange: [120, 960] },
  kit: { names: { sLight: 'Toolbox', dLight: 'Trip Wire', sSig: 'Wrecking Charge', dSig: 'Crane Lift', recovery: 'Scaffold Rise', groundPound: 'Site Drop' },
    recovery: { lift: 9, armor: [1, 10] },                                  // the worst climb in the game, but it can't be swatted
    groundPound: { armor: [4, 14], landLag: 24 } },
  ai: { style: 'grappler', stopAt: 60 },
};
