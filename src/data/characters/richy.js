import { aerials } from './_shared.js';

export default {
  id: 'richy', name: 'RICHY', title: 'THE MARKET', archetype: 'Rolex zoner',
  tagline: 'Kiwi VP. Long the market, short your patience.',
  win: 'Called it. Should’ve bought the dip, mate.',
  tip: 'DODGE the gold Daytona, JUMP the Submariner skimming the floor — then walk in during the lock. When the viewfinder locks on you, dodge or get out of frame.',
  passive: { name: 'Diversified Portfolio', desc: 'Landing the two watches alternately builds +1 damage per switch, up to +3. They share one cooldown.' },   // shown in the move list (render only)
  body: { suit: '#474b52', trim: '#c9a227', skin: '#caa17a', hair: { color: '#1f1a16', style: 'beard' }, height: 1.0, extras: ['sweater', 'watch'] },
  stats: { gauge: 107, runMax: 5.5, jumpImpulse: 16, fallMax: 12, weight: 1.05 },
  light: { name: 'Bid', dmg: 5, kb: 5, kbScale: 5, kbAngle: 40, range: 60, startup: 4, active: 3, recover: 8 },
  heavy: { name: 'Short Squeeze', dmg: 10, kb: 6.5, kbScale: 11.5, kbAngle: 150, range: 68, startup: 11, active: 4, recover: 17 },   // drags closer (angle past 90 = toward Richy)
  aerials: aerials({ n: 'Portfolio Spin', s: 'Macro Slap', u: 'Uptick', d: 'Crash Out' }, { s: { kb: 7, kbScale: 12 } }),
  s1: { name: 'Daytona', desc: 'A thrown gold watch that flies forward, rising slightly (works in the air). DODGE it.', kind: 'projectile', air: true, dmg: 8, kb: 7, kbScale: 6, kbAngle: 40, speed: 5, vy: -1.2, w: 18, h: 52, height: 60, shape: 'rolex', color: '#c9a227', dial: '#3f5a40', cooldown: 90, sharedLock: 40, tag: 'bull', startup: 11, active: 2, recover: 14 },
  s2: { name: 'Submariner', desc: 'A steel watch that skims along the floor. JUMP it.', kind: 'groundProjectile', dmg: 8, kb: 6, kbScale: 6, kbAngle: 45, speed: 4.2, w: 18, h: 28, shape: 'sub', color: '#9aa4ab', dial: '#c4452e', cooldown: 100, sharedLock: 40, tag: 'bear', startup: 12, active: 2, recover: 15 },
  super: { name: 'Gone Viral', desc: 'Lines you up on his camera phone: the viewfinder follows you, locks, then SNAP — you\'re the meme (18 dmg). Dodge the snap, or get out of frame once it locks.', kind: 'meme', dmg: 18, kb: 9, kbScale: 15, kbAngle: 80, track: 44, snap: 64, frameW: 150, frameH: 170, startup: 16, recover: 24, aiRange: [0, 900] },   // tracks 44f, locked 20f (readable), one frame of hitbox
  kit: { names: { sLight: 'Ask', dLight: 'Floor Price', sSig: 'Margin Call', dSig: 'Breakout', recovery: 'Rally', groundPound: 'Crash' } },
  ai: { style: 'zoner', pref: 260, stopAt: 88 },
  hooks: {
    // Diversified Portfolio: alternating watches that land build +1 gauge
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
