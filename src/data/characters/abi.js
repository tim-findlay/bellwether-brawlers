import { aerials } from './_shared.js';

export default {
  id: 'abi', name: 'ABI', title: 'THE GATEKEEPER', archetype: 'Defensive counter-puncher',
  tagline: 'Runs the office. Declines your meeting.',
  win: 'Right, that’s enough. Wine’s on you.',
  tip: 'Pressure through Last Orders — one hit cancels the regen. Bait the parry: it does nothing to projectiles or grabs. When she goes on her hollibobs, watch the marker and move off it before it locks.',
  passive: { name: 'Counter-puncher', desc: 'Bait the parry with a projectile or a grab — it does nothing to either.' },   // shown in the move list (render only)
  body: { suit: '#a83a2e', trim: '#f3ead8', skin: '#edd3b6', hair: { color: '#e6c977', style: 'long' }, trousers: '#f1ece2', height: 0.93, extras: [] },   // brick-red blazer, cream blouse, white trousers
  stats: { gauge: 104, runMax: 5.6, jumpImpulse: 16, fallMax: 12, weight: 1.0 },
  light: { name: 'Reschedule', dmg: 5, kb: 4.5, kbScale: 5, kbAngle: 40, range: 56, startup: 4, active: 3, recover: 10 },
  heavy: { name: 'Double-Booked', dmg: 10, kb: 7, kbScale: 12.5, kbAngle: 35, range: 62, startup: 10, active: 3, recover: 18 },
  aerials: aerials({ n: 'Wristband Whirl', s: 'Tote Swing', u: 'Confetti Pop', d: 'Baggage Drop' }, { n: { range: 70, dmg: 6 }, s: { kb: 6.5, kbScale: 12 }, d: { dmg: 8, kbScale: 10 } }),
  s1: { name: 'Calendar Block', desc: 'A parry (even in the air): a parried hit is DECLINED! (12 dmg) and locks your specials. Projectiles and grabs beat it.', kind: 'parry', air: true, carry: 0, stance: 20, recover: 25, cooldown: 300, counter: { dmg: 12, kb: 7, kbScale: 6, kbAngle: 50, meter: 10, name: 'Declined', callout: 'DECLINED!', applyStatus: { name: 'silence', dur: 90 } } },
  s2: { name: 'Hollibobs', desc: 'She vanishes on holiday while a beach umbrella follows you, then lands on it (11 dmg + slow). Move when it turns red.', kind: 'holiday', air: true, away: 72, lockAt: 26, dropFrom: 240, startup: 12, active: 2, recover: 4, cooldown: 360,   // Out of Office, then Home Time on the mark
    landing: { name: 'Home Time', kind: 'aerial', dmg: 11, kb: 6, kbScale: 9, kbAngle: 70, range: 96, startup: 1, active: 60, recover: 8, landLag: 18, dive: 20, applyStatus: { name: 'slow', dur: 120 } } },
  super: { name: 'Pub O’Clock', desc: 'LAST ORDERS! Shoves you, locks your specials for 3.5 s and she heals for 5 s — any hit on her cancels the heal.', kind: 'bell', silence: 210, regen: 300, startup: 20, recover: 18, aiRange: [0, 400] },
  kit: { names: { sLight: 'Reschedule (side)', dLight: 'Decline', sSig: 'Overbooked', dSig: 'Bumped Up', recovery: 'RSVP', groundPound: 'Hard No' },
    recovery: { applyStatus: { name: 'slow', dur: 60 } } },
  ai: { style: 'counter', stopAt: 76 },
};
