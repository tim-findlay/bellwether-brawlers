import { aerials } from './_shared.js';

export default {
  id: 'tim', name: 'TIM', title: 'THE OPERATOR', archetype: 'Tempo all-rounder',
  tagline: 'Suit on, prompt loaded, Zulu time.',
  win: 'Already automated the rematch. Sorry.',
  tip: 'No recovery special — his jumps are honest. Edge-guard him hard and dodge the cursed e-mail.',
  body: { suit: '#2b3a55', trim: '#c9a227', skin: '#e8c39a', hair: { color: '#b08d57', style: 'side' }, height: 1.0, extras: ['tie', 'watch'] },
  stats: { gauge: 100, runMax: 5.4, jumpImpulse: 15, fallMax: 14, weight: 1.0 },
  light: { name: 'Quick Sync', dmg: 4, kb: 4.5, kbScale: 5, kbAngle: 40, range: 60, startup: 4, active: 3, recover: 10 },
  heavy: { name: 'Hard Deadline', dmg: 10, kb: 7, kbScale: 11, kbAngle: 35, range: 70, startup: 12, active: 4, recover: 18 },
  aerials: aerials({ n: 'Sync Spin', s: 'Satchel Swing', u: 'The Drop', d: 'Deadline Drop' }, { u: { dmg: 6, kbScale: 8 } }),
  s1: { name: 'Prompt Injection', kind: 'projectile', air: true, dmg: 7, kb: 5, kbScale: 6, kbAngle: 40, speed: 3.2, w: 24, h: 18, shape: 'email', color: '#ddd5c2', cooldown: 280, applyStatus: { name: 'reversed', dur: 72 }, startup: 12, active: 2, recover: 16 },
  s2: { name: 'Zulu Time', kind: 'buff', startup: 14, recover: 18, cooldown: 600, resetCooldowns: ['s1'], flavor: 'COOLDOWNS REWOUND', apply: [{ name: 'nextHit', dur: 600, data: { amount: 2 } }] },
  super: { name: 'AGI Moment', kind: 'dashCombo', dmg: 22, kb: 9, kbScale: 15, kbAngle: 40, range: 50, travel: 200, startup: 12, active: 6, recover: 30, iframes: 12, aiRange: [80, 280] },
  ai: { style: 'allround', stopAt: 80 },
};
