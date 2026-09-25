import { aerials } from './_shared.js';

export default {
  id: 'ben', name: 'BEN', title: 'THE BIG BOSS', archetype: 'Long-range bully',
  tagline: 'Tall. Surfs. 12th Man.',
  win: "My door's always open. Yours, less so.",
  tip: 'Get inside his reach — everything Ben does up close is slow. His recovery is one straight lunge: wait for it.',
  body: { suit: '#2a3f5c', trim: '#a93c2c', skin: '#e8c39a', hair: { color: '#7a5b3a', style: 'side' }, height: 1.14, extras: ['tie'] },
  stats: { gauge: 110, runMax: 4.8, jumpImpulse: 14.5, fallMax: 15, weight: 1.06 },
  light: { name: 'Pistachio Flick', dmg: 5, kb: 5.5, kbScale: 5, kbAngle: 40, range: 74, startup: 5, active: 3, recover: 10 },
  heavy: { name: 'Wingspan', dmg: 11, kb: 7.5, kbScale: 13, kbAngle: 35, range: 92, startup: 16, active: 4, recover: 20 },
  aerials: aerials({ n: 'Air Clearance', s: 'Long Reach', u: 'Pistachio Pop', d: 'L-Plate Drop' }, { s: { range: 90, kb: 7, kbScale: 12, startup: 9 } }),
  s1: { name: 'Hawk Toss', kind: 'lob', air: true, dmg: 9, kb: 6, kbScale: 6, kbAngle: 45, speed: 4.4, vy: -6, grav: 0.28, w: 20, h: 14, shape: 'football', color: '#8b5e34', cooldown: 300, startup: 13, active: 2, recover: 18 },
  s2: { name: 'Off the Lip', kind: 'lunge', air: true, dmg: 8, kb: 7, kbScale: 9, kbAngle: 60, travel: 130, range: 50, startup: 10, active: 8, recover: 24, cooldown: 280 },
  super: { name: 'Twelfth Man', kind: 'shout', dmg: 18, kb: 9, kbScale: 16, kbAngle: 35, range: 92, startup: 30, active: 6, recover: 26, unparryable: true, aiRange: [60, 180] },
  kit: { names: { sLight: 'Corner Office', dLight: 'Low Bar', sSig: 'Boardroom Charge', dSig: 'Bottom Line', recovery: 'Chair Surf', groundPound: 'Big Boss Drop' } },
  ai: { style: 'allround', stopAt: 84 },
};
