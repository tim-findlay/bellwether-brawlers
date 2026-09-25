import { aerials } from './_shared.js';

export default {
  id: 'richy', name: 'RICHY', title: 'THE MARKET', archetype: 'Dual-candle zoner',
  tagline: 'Kiwi VP. Long the market, short your patience.',
  win: 'Called it. Should’ve bought the dip, mate.',
  tip: 'DODGE the green candle, JUMP the red one — then walk in during the lock. Off stage, the market closes.',
  body: { suit: '#474b52', trim: '#c9a227', skin: '#caa17a', hair: { color: '#1f1a16', style: 'beard' }, height: 1.0, extras: ['sweater', 'watch'] },
  stats: { gauge: 104, runMax: 5.4, jumpImpulse: 15, fallMax: 14, weight: 1.05 },
  light: { name: 'Bid', dmg: 5, kb: 5, kbScale: 5, kbAngle: 40, range: 60, startup: 4, active: 3, recover: 8 },
  heavy: { name: 'Short Squeeze', dmg: 10, kb: 6.5, kbScale: 10.5, kbAngle: 150, range: 68, startup: 12, active: 4, recover: 17 },   // drags closer (angle past 90 = toward Richy)
  aerials: aerials({ n: 'Portfolio Spin', s: 'Macro Slap', u: 'Uptick', d: 'Crash Out' }, { s: { kb: 7, kbScale: 12 } }),
  s1: { name: 'Bull Run', kind: 'projectile', air: true, dmg: 8, kb: 7, kbScale: 6, kbAngle: 40, speed: 5, vy: -1.2, w: 18, h: 52, height: 60, shape: 'candle', color: '#3f5a40', cooldown: 90, sharedLock: 40, tag: 'bull', startup: 11, active: 2, recover: 14 },
  s2: { name: 'Bear Raid', kind: 'groundProjectile', dmg: 8, kb: 6, kbScale: 6, kbAngle: 45, speed: 4.2, w: 18, h: 28, shape: 'candle', color: '#c4452e', cooldown: 100, sharedLock: 40, tag: 'bear', startup: 12, active: 2, recover: 15 },
  super: { name: 'Rate Hikes', kind: 'columns', dmg: 9, kb: 8, kbScale: 15, startup: 18, recover: 30, aiRange: [160, 480] },
  kit: { names: { sLight: 'Ask', dLight: 'Floor Price', sSig: 'Margin Call', dSig: 'Breakout', recovery: 'Rally', groundPound: 'Crash' } },
  ai: { style: 'zoner', pref: 260, stopAt: 88 },
  hooks: {
    // Diversified Portfolio: alternating candles that land build +1 gauge
    // damage per alternation, cap +3. Whiffs reset nothing, earn nothing.
    preHit(f, def, dmg, slot, move) {
      if (move?.tag && f.custom.lastLanded && f.custom.lastLanded !== move.tag) {
        const bonus = Math.min(3, (f.custom.altStreak || 0) + 1);
        f.world.fx.text(f.x, f.y - 140, `DIVERSIFIED +${bonus}`, '#c9a227');
        return dmg + bonus;
      }
      return dmg;
    },
    onProjectileResolved(f, p, outcome) {
      if (!p.tag) return;
      if (outcome === 'hit') {
        f.custom.altStreak = f.custom.lastLanded && f.custom.lastLanded !== p.tag ? Math.min(3, (f.custom.altStreak || 0) + 1) : 0;
        f.custom.lastLanded = p.tag;
      }
    },
  },
};
