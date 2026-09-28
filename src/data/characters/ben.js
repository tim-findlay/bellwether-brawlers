import { aerials } from './_shared.js';

export default {
  id: 'ben', name: 'BEN', title: 'THE BIG BOSS', archetype: 'Long-range bully',
  tagline: 'Tall. Surfs. 12th Man.',
  win: "My door's always open. Yours, less so.",
  tip: 'Get inside his reach — everything Ben does up close is slow. Jump the water polo ball or it drags you in. When he yells COME ON FULHAM, jump the crowd. His recoveries are long straight lines: wait for them.',
  passive: { name: 'Wingspan', desc: 'The longest reach in the game — but everything up close is slow. Get inside.' },   // shown in the move list (render only)
  body: { suit: '#2a3f5c', trim: '#a93c2c', skin: '#e8c39a', hair: { color: '#7a5b3a', style: 'side' }, height: 1.14, extras: ['tie'] },
  stats: { gauge: 102, runMax: 5.3, jumpImpulse: 16, fallMax: 12, weight: 1.06 },
  light: { name: 'Pistachio Flick', dmg: 5, kb: 5.5, kbScale: 5, kbAngle: 40, range: 68, startup: 5, active: 3, recover: 10 },
  heavy: { name: 'Wingspan', dmg: 11, kb: 7.5, kbScale: 12.5, kbAngle: 35, range: 92, startup: 14, active: 4, recover: 20 },
  aerials: aerials({ n: 'Air Clearance', s: 'Long Reach', u: 'Pistachio Pop', d: 'L-Plate Drop' }, { s: { range: 90, kb: 7, kbScale: 12, startup: 9 } }),
  s1: { name: 'Skip Shot', desc: 'A slow water polo ball (works in the air) that drags whoever it hits TOWARD Ben. Jump it.', kind: 'projectile', air: true, dmg: 7, kb: 5, kbScale: 6, kbAngle: 150, speed: 3.2, w: 22, h: 22, shape: 'polo', color: '#e8c547', cooldown: 380, startup: 14, active: 2, recover: 18 },   // a water polo ball that drags the target TOWARD Ben (angle past 90)
  s2: { name: 'Off the Lip', desc: 'Off the Lip: a chair-surf lunge across the gap — works in the air, so it\'s also his recovery.', kind: 'lunge', air: true, dmg: 8, kb: 7, kbScale: 9, kbAngle: 60, travel: 130, range: 50, startup: 10, active: 8, recover: 24, cooldown: 280 },
  super: { name: 'Come On Fulham!', desc: 'A crowd of Fulham players stampedes across the stage from behind him and flattens anyone on the floor (14 dmg). Jump over them.', kind: 'stampede', dmg: 14, kb: 9, kbScale: 16, kbAngle: 45, crowd: 5, speed: 12, startup: 24, recover: 26, aiRange: [0, 960] },   // a floor-level hazard across the whole slab; jump it
  kit: { names: { sLight: 'Boardroom Charge', dLight: 'Low Bar', sSig: 'Corner Office', dSig: 'Bottom Line', recovery: 'Chair Surf', groundPound: 'Big Boss Drop' },
    sigs: { s: { range: 100, step: 40, startup: 17, recover: 28 } },   // the longest ground reach in the game, and the slowest
    recovery: { travel: 110, lift: 8 } },                                   // Chair Surf: a long, flat, readable diagonal
  ai: { style: 'allround', stopAt: 84 },
};
