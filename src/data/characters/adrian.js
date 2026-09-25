import { aerials } from './_shared.js';

export default {
  id: 'adrian', name: 'ADRIAN', title: 'THE WALKING HAZARD', archetype: 'Chaos rushdown',
  tagline: 'Analytical. Clumsy. Needs a toothbrush.',
  win: 'Wait — did I win? Abi, toothbrush?',
  tip: 'Whiff-bait everything — when he staggers, make him pay. His own kit fights him.',
  body: { suit: '#3a4a63', trim: '#caa46a', skin: '#e8c39a', hair: { color: '#c2a36b', style: 'beard' }, height: 1.0, extras: [] },
  stats: { gauge: 94, runMax: 5.8, jumpImpulse: 15.5, fallMax: 13.5, weight: 0.97 },
  light: { name: 'Toothbrush Jab', dmg: 5, kb: 4.5, kbScale: 4, kbAngle: 40, range: 56, startup: 3, active: 3, recover: 10 },
  heavy: { name: 'Pivot Table', dmg: 10, kb: 7, kbScale: 12, kbAngle: 40, range: 64, startup: 11, active: 4, recover: 16, bothSides: true },
  aerials: aerials({ n: 'Panic Flail', s: 'Overreach', u: 'Up-and-Over', d: 'Faceplant' }, { n: { range: 72 }, s: { kb: 6.5, kbScale: 11 }, d: { whiffStagger: true } }),
  s1: { name: 'Clumsy Charge', kind: 'lunge', air: true, dmg: 11, kb: 8, kbScale: 11, kbAngle: 35, travel: 170, range: 50, startup: 8, active: 8, recover: 18, cooldown: 380, whiffTrip: true },
  s2: { name: 'Nero Spill', kind: 'zone', startup: 12, recover: 16, cooldown: 380, zone: { type: 'coffee', w: 92, life: 260, ahead: 110, ownerImmune: true } },
  super: { name: 'Full Audit', kind: 'flurry', dmg: 4, totalDmg: 20, maxHits: 5, rehit: 6, kb: 3, kbScale: 4, kbAngle: 50, range: 54, travel: 150, startup: 8, active: 30, recover: 20, endTrip: true, aiRange: [60, 220] },
  kit: { names: { sLight: 'Elbow Room', dLight: 'Trip Hazard', sSig: 'Table Flip', dSig: 'Pivot Up', recovery: 'Overshoot', groundPound: 'Facedown' },
    sigs: { s: { kbScale: 11 } },
    recovery: { travel: 140, lift: 7, whiffStagger: true },                 // Overshoot: furthest sideways, lowest, lands in a heap on a whiff
    groundPound: { whiffStagger: true } },
  ai: { style: 'rush', stopAt: 72 },
};
