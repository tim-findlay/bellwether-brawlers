// The roster. Everything about a fighter lives in one object here.
// Distances/speeds are in world-buffer px (480x270); frames at 60Hz.
// Adding a fighter: add an object + optionally assets/headshots/<id>.png.

export const CHARACTERS = [
  {
    id: 'ben',
    name: 'BEN',
    title: 'THE BIG BOSS',
    archetype: 'Long-range bully',
    tagline: 'Tall. Surfs. 12th Man.',
    win: "My door's always open. Yours, less so.",
    tip: 'Get inside his reach — everything Ben does up close is slow.',
    body: { suit: '#2a3f5c', trim: '#a93c2c', skin: '#e8c39a', hair: { color: '#7a5b3a', style: 'side' }, height: 1.14, extras: ['tie'] },
    stats: { hp: 110, speed: 1.39, jump: 5.3, weight: 1.25 },
    light: { name: 'Pistachio Flick', dmg: 5, kb: 1.6, range: 37, startup: 5, active: 3, recover: 10 },
    heavy: { name: 'Wingspan', dmg: 12, kb: 3.4, range: 46, startup: 16, active: 4, recover: 20 },
    s1: { name: 'Hawk Toss', kind: 'lob', dmg: 9, kb: 2.5, speed: 2.2, vy: -3.0, grav: 0.14, w: 10, h: 7, shape: 'football', color: '#8b5e34', cooldown: 300, startup: 13, active: 2, recover: 18 },
    s2: { name: 'Off the Lip', kind: 'lunge', dmg: 8, kb: 3, launcher: true, travel: 55, range: 24, startup: 10, active: 6, recover: 24, cooldown: 280 },
    super: { name: 'Twelfth Man', kind: 'shout', dmg: 18, kb: 6, range: 46, startup: 30, active: 6, recover: 26, unblockable: true, aiRange: [30, 90] },
    ai: { style: 'allround', stopAt: 42 },
  },
  {
    id: 'tim',
    name: 'TIM',
    title: 'THE OPERATOR',
    archetype: 'Tempo all-rounder',
    tagline: 'Suit on, prompt loaded, Zulu time.',
    win: 'Already automated the rematch. Sorry.',
    tip: 'No armor, no parry — dodge the cursed e-mail and take your turn.',
    body: { suit: '#2b3a55', trim: '#c9a227', skin: '#e8c39a', hair: { color: '#b08d57', style: 'side' }, height: 1.0, extras: ['tie', 'watch'] },
    stats: { hp: 100, speed: 1.54, jump: 5.6, weight: 1.0 },
    light: { name: 'Quick Sync', dmg: 4, kb: 1.5, range: 30, startup: 4, active: 3, recover: 10 },
    heavy: { name: 'Hard Deadline', dmg: 10, kb: 3, range: 35, startup: 11, active: 4, recover: 19 },
    s1: { name: 'Prompt Injection', kind: 'projectile', dmg: 7, kb: 2, speed: 1.5, w: 12, h: 9, shape: 'email', color: '#ddd5c2', cooldown: 280, applyStatus: { name: 'reversed', dur: 72 }, startup: 12, active: 2, recover: 16 },
    s2: { name: 'Zulu Time', kind: 'buff', startup: 14, recover: 18, cooldown: 600, resetCooldowns: ['s1'], flavor: 'COOLDOWNS REWOUND', apply: [{ name: 'nextHit', dur: 600, data: { amount: 2 } }] },
    super: { name: 'AGI Moment', kind: 'dashCombo', dmg: 22, kb: 4, range: 24, travel: 95, startup: 12, active: 6, recover: 30, iframes: 12, launcher: true, aiRange: [50, 140] },
    ai: { style: 'allround', stopAt: 40 },
  },
  {
    id: 'adrian',
    name: 'ADRIAN',
    title: 'THE WALKING HAZARD',
    archetype: 'Chaos rushdown',
    tagline: 'Analytical. Clumsy. Needs a toothbrush.',
    win: 'Wait — did I win? Abi, toothbrush?',
    tip: 'Bait the Clumsy Charge — when he trips, make him pay.',
    body: { suit: '#3a4a63', trim: '#caa46a', skin: '#e8c39a', hair: { color: '#c2a36b', style: 'beard' }, height: 1.0, extras: [] },
    stats: { hp: 86, speed: 1.68, jump: 5.9, weight: 0.95 },
    light: { name: 'Toothbrush Jab', dmg: 4, kb: 1.4, range: 28, startup: 3, active: 3, recover: 14 },
    heavy: { name: 'Pivot Table', dmg: 9, kb: 2.8, range: 32, startup: 10, active: 4, recover: 16, bothSides: true },
    s1: { name: 'Clumsy Charge', kind: 'lunge', dmg: 11, kb: 3.2, travel: 75, range: 24, startup: 8, active: 8, recover: 18, cooldown: 380, whiffTrip: true },
    s2: { name: 'Coffee Spill', kind: 'zone', startup: 12, recover: 16, cooldown: 380, zone: { type: 'coffee', w: 46, life: 260, ahead: 55, ownerImmune: true } },
    super: { name: 'Full Audit', kind: 'flurry', dmg: 4, totalDmg: 20, maxHits: 5, rehit: 6, kb: 1.5, range: 26, travel: 70, startup: 8, active: 30, recover: 20, endTrip: true, aiRange: [30, 110] },
    ai: { style: 'rush', stopAt: 36 },
  },
  {
    id: 'richy',
    name: 'RICHY',
    title: 'THE MARKET',
    archetype: 'Dual-projectile zoner',
    tagline: 'Kiwi VP. Long the market, short your patience.',
    win: 'Called it. Should’ve bought the dip, mate.',
    tip: 'BLOCK the green candle, JUMP the red one — then walk in during the lock.',
    body: { suit: '#474b52', trim: '#c9a227', skin: '#caa17a', hair: { color: '#1f1a16', style: 'beard' }, height: 1.0, extras: ['sweater', 'watch'] },
    stats: { hp: 96, speed: 1.49, jump: 5.6, weight: 1.0 },
    light: { name: 'Bid', dmg: 5, kb: 1.5, range: 30, startup: 4, active: 3, recover: 9 },
    heavy: { name: 'Short Squeeze', dmg: 10, kb: -2.2, range: 34, startup: 11, active: 4, recover: 17 },
    s1: { name: 'Bull Run', kind: 'projectile', dmg: 9, kb: 3, launcher: true, speed: 2.4, vy: -0.55, w: 9, h: 26, height: 30, shape: 'candle', color: '#3f5a40', cooldown: 130, sharedLock: 45, tag: 'bull', startup: 11, active: 2, recover: 14 },
    s2: { name: 'Bear Raid', kind: 'groundProjectile', dmg: 8, kb: 2.5, launcher: true, speed: 2.0, w: 9, h: 14, shape: 'candle', color: '#c4452e', cooldown: 150, sharedLock: 45, tag: 'bear', startup: 12, active: 2, recover: 15 },
    super: { name: 'To The Moon', kind: 'columns', dmg: 9, startup: 18, recover: 30, aiRange: [80, 240] },
    ai: { style: 'zoner', pref: 130, stopAt: 44 },
    hooks: {
      // Diversified Portfolio: alternating candles that actually land (hit or
      // blocked) build +1 dmg per alternation, cap +3. Whiffs reset nothing,
      // earn nothing.
      preHit(f, def, dmg, slot, move) {
        if (move?.tag && f.custom.lastLanded && f.custom.lastLanded !== move.tag) {
          const bonus = Math.min(3, (f.custom.altStreak || 0) + 1);
          f.world.fx.text(f.x, f.y - 78, `DIVERSIFIED +${bonus}`, '#c9a227');
          return dmg + bonus;
        }
        return dmg;
      },
      onProjectileResolved(f, p, outcome) {
        if (!p.tag) return;
        if (outcome === 'hit' || outcome === 'blocked') {
          f.custom.altStreak = f.custom.lastLanded && f.custom.lastLanded !== p.tag
            ? Math.min(3, (f.custom.altStreak || 0) + 1) : 0;
          f.custom.lastLanded = p.tag;
        }
      },
    },
  },
  {
    id: 'nick',
    name: 'NICK',
    title: 'THE CONCIERGE',
    archetype: 'Teleport glass cannon',
    tagline: 'Knows a guy. Knows YOUR guy.',
    win: 'I’ll get you upgraded next time. Maybe.',
    tip: 'Two good reads end him — punish the fixed teleport arrival.',
    body: { suit: '#2c3e5f', trim: '#e8e4da', skin: '#e8c39a', hair: { color: '#23201c', style: 'quiff' }, height: 1.0, extras: ['sneakers'] },
    stats: { hp: 85, speed: 1.87, jump: 6.2, weight: 0.85 },
    light: { name: 'Name Drop', dmg: 5, kb: 1.4, range: 28, startup: 3, active: 2, recover: 6 },
    heavy: { name: 'Fund Structure', dmg: 10, kb: 2.8, range: 32, startup: 9, active: 3, recover: 15 },
    s1: { name: 'Status Match', kind: 'teleport', behind: 26, startup: 12, recover: 14, iframes: 18, cooldown: 270 },
    s2: { name: 'Points Redemption', kind: 'fan', dmg: 4, kb: 1.2, speed: 2.6, w: 8, h: 6, shape: 'card', color: '#b9a16b', cooldown: 260, chipOnce: true, startup: 10, active: 2, recover: 16 },
    super: { name: 'Lifetime Platinum', kind: 'buff', startup: 16, recover: 12, flavor: 'LOUNGE ACCESS', apply: [{ name: 'haste', dur: 240 }, { name: 'dmgUp', dur: 240, data: { amount: 3 } }, { name: 'noMeter', dur: 240 }], aiRange: [0, 480] },
    ai: { style: 'rush', stopAt: 34 },
  },
  {
    id: 'abi',
    name: 'ABI',
    title: 'THE GATEKEEPER',
    archetype: 'Counter-puncher',
    tagline: 'Runs the office. Declines your meeting.',
    win: 'Right, that’s enough. Wine’s on you.',
    tip: 'Make her whiff the parry, then punish — she has no fullscreen threat.',
    body: { suit: '#8e244d', trim: '#f0d98a', skin: '#edd3b6', hair: { color: '#e6c977', style: 'bob' }, height: 0.92, extras: [] },
    stats: { hp: 90, speed: 1.63, jump: 5.9, weight: 0.9 },
    light: { name: 'Reschedule', dmg: 4, kb: 1.4, range: 28, startup: 4, active: 3, recover: 10 },
    heavy: { name: 'Double-Booked', dmg: 9, kb: 2.6, range: 31, startup: 8, active: 3, recover: 19 },
    s1: { name: 'Calendar Block', kind: 'parry', stance: 20, recover: 25, cooldown: 300 },
    s2: { name: 'House Rosé', kind: 'lob', dmg: 7, kb: 2, speed: 1.7, vy: -3.2, grav: 0.16, w: 8, h: 8, shape: 'glass', color: '#b04a6e', cooldown: 280, applyStatus: { name: 'slow', dur: 120 }, startup: 12, active: 2, recover: 16 },
    super: { name: 'Pub O’Clock', kind: 'bell', silence: 210, regen: 300, startup: 20, recover: 18, aiRange: [0, 200] },
    ai: { style: 'counter', stopAt: 38 },
  },
  {
    id: 'mike',
    name: 'MIKE',
    title: 'THE SITE MANAGER',
    archetype: 'Armored grappler',
    tagline: 'Construction MD. Don’t test him.',
    win: 'Job’s done. United are top, an’ all.',
    tip: 'Jump the grab wind-up and never let him corner you.',
    body: { suit: '#33302e', trim: '#e8a33d', skin: '#e0b490', hair: { color: '#8a8378', style: 'grey' }, height: 1.06, extras: ['hivis', 'hardhat'] },
    stats: { hp: 110, speed: 1.2, jump: 5.1, weight: 1.45 },
    light: { name: 'Hard Hat', dmg: 6, kb: 1.8, range: 30, startup: 6, active: 3, recover: 12 },
    heavy: { name: 'Wrecking Swing', dmg: 10, kb: 3.6, range: 36, startup: 14, active: 4, recover: 22, armor: [7, 13] },
    s1: { name: 'Scaffold Slam', kind: 'grab', dmg: 14, range: 30, startup: 16, recover: 24, cooldown: 380, unblockable: true },
    s2: { name: 'Demolition Day', kind: 'shockwave', dmg: 8, kb: 3.5, radius: 70, startup: 18, recover: 24, cooldown: 360 },
    super: { name: 'Wrecking Ball', kind: 'hazardSuper', dmg: 20, startup: 20, recover: 24, aiRange: [60, 480] },
    ai: { style: 'grappler', stopAt: 30 },
  },
  {
    id: 'seelye',
    name: 'SEELYE',
    title: 'THE PITMASTER',
    archetype: 'Setplay / debt collector',
    tagline: 'Debt side. New dad. Low and slow.',
    win: 'Closed the deal AND the smoker. Big day.',
    tip: 'Dodge the lobs and rush him — his fast threats are short-ranged.',
    body: { suit: '#5b4a3a', trim: '#c46a2a', skin: '#e8c39a', hair: { color: '#4a3b2a', style: 'cap' }, height: 1.04, extras: ['apron'] },
    stats: { hp: 110, speed: 1.5, jump: 5.3, weight: 1.15 },
    light: { name: 'Term Sheet', dmg: 6, kb: 1.6, range: 30, startup: 5, active: 3, recover: 8 },
    heavy: { name: 'Leverage', dmg: 13, kb: 3, range: 33, startup: 12, active: 4, recover: 15, applyStatus: { name: 'lien', dur: 480 } },
    s1: { name: 'Brisket Bomb', kind: 'lob', dmg: 9, kb: 2, speed: 2.3, vy: -3.4, grav: 0.17, w: 10, h: 8, shape: 'bomb', color: '#6b4226', cooldown: 280, zoneOnLand: { type: 'ember', w: 64, life: 260, ownerImmune: true, burn: 2 }, startup: 13, active: 2, recover: 17 },
    s2: { name: 'Dad Reflexes', kind: 'catch', stance: 30, recover: 20, cooldown: 240 },
    super: { name: 'Low & Slow', kind: 'zoneSuper', dur: 300, startup: 18, recover: 22, burn: 2, aiRange: [0, 480] },
    ai: { style: 'trap', pref: 110, stopAt: 38 },
    hooks: {
      // LIEN: Seelye's next special on a marked opponent collects +4.
      preHit(f, def, dmg, slot, move) {
        if (slot === 'special' && def.hasStatus('lien')) {
          def.clearStatus('lien');
          f.world.fx.text(def.x, def.y - 78, 'LIEN COLLECTED!', '#c9a227');
          return dmg + 4;
        }
        return dmg;
      },
    },
  },
];

export const ROSTER_IDS = CHARACTERS.map(c => c.id);
export const byId = (id) => CHARACTERS.find(c => c.id === id);
