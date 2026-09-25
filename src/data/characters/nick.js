import { aerials } from './_shared.js';

export default {
  id: 'nick', name: 'NICK', title: 'THE CONCIERGE', archetype: 'Teleport glass cannon',
  tagline: 'Knows a guy. Knows YOUR guy.',
  win: 'I’ll get you upgraded next time. Maybe.',
  tip: '85 composure means everything launches him early — and the teleport arrival is a written invitation.',
  body: { suit: '#2c3e5f', trim: '#e8e4da', skin: '#e8c39a', hair: { color: '#23201c', style: 'quiff' }, height: 1.0, extras: ['sneakers'] },
  stats: { gauge: 100, runMax: 6.2, jumpImpulse: 16, fallMax: 12, weight: 0.97 },
  light: { name: 'Name Drop', dmg: 5, kb: 4.5, kbScale: 5, kbAngle: 40, range: 56, startup: 3, active: 2, recover: 6 },
  heavy: { name: 'Fund Structure', dmg: 10, kb: 6.5, kbScale: 11, kbAngle: 35, range: 64, startup: 12, active: 3, recover: 16 },
  aerials: aerials({ n: 'Velvet Rope', s: 'Card Fan', u: 'Upgrade', d: 'Check-Out' }, { s: { startup: 6, kb: 5.5, kbScale: 11 } }),
  s1: { name: 'Status Match', kind: 'teleport', air: true, behind: 56, startup: 12, recover: 14, iframes: 18, cooldown: 270 },
  s2: { name: 'Points Redemption', kind: 'fan', dmg: 4, kb: 4, kbScale: 3, kbAngle: 40, speed: 5.4, w: 16, h: 12, shape: 'card', color: '#b9a16b', cooldown: 260, startup: 10, active: 2, recover: 16 },
  super: { name: 'Lifetime Platinum', kind: 'buff', startup: 16, recover: 12, flavor: 'LOUNGE ACCESS', apply: [{ name: 'haste', dur: 240 }, { name: 'dmgUp', dur: 240, data: { amount: 3 } }, { name: 'noMeter', dur: 240 }], aiRange: [0, 960] },
  kit: { names: { sLight: 'Queue Jump', dLight: 'Room Service', sSig: 'Cash Out', dSig: 'Upgrade Fee', recovery: 'Priority Boarding', groundPound: 'Checkout Slam' } },
  ai: { style: 'rush', stopAt: 68 },
};
