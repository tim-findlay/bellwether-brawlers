import { aerials } from './_shared.js';

export default {
  id: 'tim', name: 'TIM', title: 'THE OPERATOR', archetype: 'Tempo all-rounder',
  tagline: 'Suit on, prompt loaded, Zulu time.',
  win: 'Already automated the rematch. Sorry.',
  tip: 'No recovery special — his jumps are honest. Edge-guard him hard, and step off the marker when he schedules a send. When he asks Claude, hit the helper once and it logs off.',
  passive: { name: 'No recovery special', desc: 'His jumps are honest — knock him off stage and guard the edge.' },   // shown in the move list (render only)
  body: { suit: '#2b3a55', trim: '#c9a227', skin: '#e8c39a', hair: { color: '#b08d57', style: 'side' }, height: 1.0, extras: ['tie', 'watch'] },
  stats: { gauge: 104, runMax: 5.7, jumpImpulse: 15, fallMax: 14, weight: 1.0 },
  light: { name: 'Quick Sync', dmg: 4, kb: 4.5, kbScale: 5, kbAngle: 40, range: 60, startup: 4, active: 3, recover: 11 },
  heavy: { name: 'Hard Deadline', dmg: 10, kb: 7, kbScale: 12, kbAngle: 35, range: 70, startup: 12, active: 4, recover: 18 },
  aerials: aerials({ n: 'Sync Spin', s: 'Satchel Swing', u: 'The Drop', d: 'Deadline Drop' }, { u: { dmg: 6, kbScale: 8 } }),
  s1: { name: 'Scheduled Send', desc: 'Marks the floor under you; a strike lands there about half a second later (10 dmg). Keep moving.', kind: 'columns', air: true, offsets: [0], delay: 34, onTarget: true, slot: 'special', dmg: 10, kb: 6, kbScale: 11, kbAngle: 70, color: '#27425f', cooldown: 220, startup: 12, recover: 16 },   // one marked strike where they stood, 40f later
  s2: { name: 'Zulu Time', desc: 'Rewinds Scheduled Send\'s cooldown and makes his next hit do +2.', kind: 'buff', startup: 14, recover: 18, cooldown: 480, resetCooldowns: ['s1'], flavor: 'COOLDOWNS REWOUND', apply: [{ name: 'nextHit', dur: 600, data: { amount: 2 } }] },
  super: { name: 'Ask Claude', desc: 'Summons Claude to fight beside him for ~4.5 s: it runs in, jab-jab-pushes, repeats. One hit sends it home.', kind: 'assist', helper: 'CLAUDE', dur: 270, speed: 6.5, jump: 15, rest: 22, startup: 14, recover: 20, aiRange: [0, 700] },   // a second fighter for ~4.5 s: jab, jab, push; any hit sends it home
  kit: { names: { sLight: 'Follow-Up', dLight: 'Footnote', sSig: 'Hard Push', dSig: 'Deadline Lift', recovery: 'Escalation', groundPound: 'Hard Stop' },
    recovery: { dmg: 8, kbScale: 10 } },                                    // no recovery special, so the recovery hits hard
  ai: { style: 'allround', stopAt: 80 },
};
