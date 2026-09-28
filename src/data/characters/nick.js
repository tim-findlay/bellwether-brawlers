import { aerials } from './_shared.js';

export default {
  id: 'nick', name: 'NICK', title: 'THE CONCIERGE', archetype: 'Teleport glass cannon',
  tagline: 'Knows a guy. Knows YOUR guy.',
  win: 'I’ll get you upgraded next time. Maybe.',
  tip: 'The lightest fighter — everything launches him early. The teleport arrival is a written invitation, and when he swipes the Amex, step off the gold marks.',
  passive: { name: 'Lightest fighter', desc: 'The fastest runner and the lightest — the easiest to launch sideways.' },   // shown in the move list (render only)
  body: { suit: '#2c3e5f', trim: '#e8e4da', skin: '#e8c39a', hair: { color: '#23201c', style: 'quiff' }, height: 1.0, extras: ['sneakers'] },
  stats: { gauge: 96, runMax: 5.85, jumpImpulse: 16, fallMax: 12, weight: 0.97 },
  light: { name: 'Name Drop', dmg: 5, kb: 4.5, kbScale: 5, kbAngle: 40, range: 56, startup: 3, active: 2, recover: 6 },
  heavy: { name: 'Fund Structure', dmg: 10, kb: 6.5, kbScale: 11.5, kbAngle: 35, range: 64, startup: 12, active: 3, recover: 16 },
  aerials: aerials({ n: 'Velvet Rope', s: 'Card Fan', u: 'Upgrade', d: 'Check-Out' }, { s: { startup: 6, kb: 5.5, kbScale: 12 } }),
  s1: { name: 'Status Match', desc: 'Teleports behind you if you\'re within reach (works in the air); from further out it\'s only a short blink toward you. The arrival spot is fixed: punish it.', kind: 'teleport', air: true, behind: 56, range: 200, startup: 12, recover: 14, iframes: 6, cooldown: 270 },   // range cap: off-stage it's a blink, not a free trip home
  s2: { name: 'Points Redemption', desc: 'A fan of cards thrown forward.', kind: 'fan', dmg: 4, kb: 4, kbScale: 3, kbAngle: 40, speed: 5.4, w: 16, h: 12, shape: 'card', color: '#b9a16b', cooldown: 260, startup: 10, active: 2, recover: 16 },
  super: { name: 'Membership Rewards', desc: 'Swipes the Amex: gold points rain down on five marked spots around you, one after another (12 dmg). Step off the marks — only one can land.', kind: 'columns', look: 'points', offsets: [-160, -80, 0, 80, 160], delay: 30, step: 8, onTarget: true, dmg: 12, kb: 8, kbScale: 15, kbAngle: 80, h: 300, w: 44, color: '#c9a227', callout: '+50,000 POINTS', startup: 16, recover: 22, aiRange: [0, 700] },   // a points shower: five marks swept in turn, one hit max
  kit: { names: { sLight: 'Queue Jump', dLight: 'Room Service', sSig: 'Cash Out', dSig: 'Upgrade Fee', recovery: 'Priority Boarding', groundPound: 'Checkout Slam' },
    recovery: { lift: 12, iframes: 8 } },                                       // Priority Boarding: floaty and high
  ai: { style: 'rush', stopAt: 68 },
};
