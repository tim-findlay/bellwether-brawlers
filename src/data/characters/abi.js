import { aerials } from './_shared.js';

export default {
  id: 'abi', name: 'ABI', title: 'THE GATEKEEPER', archetype: 'Defensive counter-puncher',
  tagline: 'Runs the office. Declines your meeting.',
  win: 'Right, that’s enough. Wine’s on you.',
  tip: 'Pressure through Last Orders — one hit cancels the regen. Bait the parry: it does nothing to projectiles or grabs.',
  body: { suit: '#8e244d', trim: '#f0d98a', skin: '#edd3b6', hair: { color: '#e6c977', style: 'bob' }, height: 0.92, extras: [] },
  stats: { gauge: 96, runMax: 5.6, jumpImpulse: 15.5, fallMax: 13, weight: 1.0 },
  light: { name: 'Reschedule', dmg: 5, kb: 4.5, kbScale: 5, kbAngle: 40, range: 56, startup: 4, active: 3, recover: 10 },
  heavy: { name: 'Double-Booked', dmg: 10, kb: 7, kbScale: 12, kbAngle: 35, range: 62, startup: 10, active: 3, recover: 18 },
  aerials: aerials({ n: 'Wristband Whirl', s: 'Tote Swing', u: 'Confetti Pop', d: 'Baggage Drop' }, { n: { range: 70, dmg: 6 }, s: { kb: 6.5, kbScale: 11 }, d: { dmg: 8, kbScale: 10 } }),
  s1: { name: 'Calendar Block', kind: 'parry', stance: 20, recover: 25, cooldown: 300 },
  s2: { name: 'House Rosé', kind: 'lob', air: true, dmg: 7, kb: 5, kbScale: 6, kbAngle: 45, speed: 3.4, vy: -6.4, grav: 0.32, w: 16, h: 16, shape: 'glass', color: '#b04a6e', cooldown: 280, applyStatus: { name: 'slow', dur: 120 }, startup: 12, active: 2, recover: 16 },
  super: { name: 'Pub O’Clock', kind: 'bell', silence: 210, regen: 300, startup: 20, recover: 18, aiRange: [0, 400] },
  ai: { style: 'counter', stopAt: 76 },
};
