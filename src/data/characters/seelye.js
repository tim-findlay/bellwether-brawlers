import { aerials } from './_shared.js';

export default {
  id: 'seelye', name: 'SEELYE', title: 'THE PITMASTER', archetype: 'Setplay collector',
  tagline: 'Debt side. New dad. Low and slow.',
  win: 'Closed the deal AND the smoker. Big day.',
  tip: 'Dodge the lobs, fight him before the zones stack, and don’t let the lien resolve.',
  body: { suit: '#3f5a3c', trim: '#f3ead8', skin: '#e8c39a', hair: { color: '#4a3b2a', style: 'side' }, trousers: '#3a3d45', height: 1.04, extras: ['sweater'] },   // forest-green quarter-zip over a white button-down, charcoal trousers
  stats: { gauge: 110, runMax: 5.0, jumpImpulse: 14.5, fallMax: 15, weight: 1.05 },
  light: { name: 'Term Sheet', dmg: 5, kb: 5, kbScale: 5, kbAngle: 40, range: 60, startup: 5, active: 3, recover: 8 },
  heavy: { name: 'Leverage', dmg: 11, kb: 7, kbScale: 11, kbAngle: 35, range: 66, startup: 12, active: 4, recover: 15, applyStatus: { name: 'lien', dur: 480 } },
  aerials: aerials({ n: 'Tongs Out', s: 'Fresh One', u: 'Smoke Ring', d: 'Brisket Drop' }, { s: { applyStatus: { name: 'slow', dur: 60 }, callout: 'STINKED!' } }),
  s1: { name: 'Brisket Bomb', kind: 'lob', air: true, dmg: 9, kb: 5, kbScale: 4, kbAngle: 50, speed: 4.6, vy: -6.8, grav: 0.34, w: 20, h: 16, shape: 'bomb', color: '#6b4226', cooldown: 280, zoneOnLand: { type: 'ember', w: 128, life: 260, ownerImmune: true, burn: 2 }, startup: 13, active: 2, recover: 17 },
  s2: { name: 'Dad Reflexes', kind: 'catch', stance: 30, recover: 20, cooldown: 240 },
  super: { name: 'Low & Slow', kind: 'zoneSuper', dur: 300, startup: 18, recover: 22, burn: 2, aiRange: [0, 960] },
  kit: { names: { sLight: 'Redline', dLight: 'Fine Print', sSig: 'Hostile Bid', dSig: 'Uplift', recovery: 'Term Sheet Rise', groundPound: 'Closing Drop' } },
  ai: { style: 'trap', pref: 220, stopAt: 76 },
  hooks: {
    // LIEN: Seelye's next special on a marked opponent collects +4.
    preHit(f, def, dmg, slot, move) {
      if (slot === 'special' && def.hasStatus('lien')) {
        def.clearStatus('lien');
        f.world.fx.text(def.x, def.y - 140, 'LIEN COLLECTED!', '#c9a227');
        return dmg + 4;
      }
      return dmg;
    },
  },
};
