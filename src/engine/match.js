// MatchState — v3 stocks/ring-out/respawn rules. Pure logic: no rendering,
// no input classes; consumes per-player intent objects like MovementBody.
// Invulnerability rule (DESIGN): you are untouchable while riding the chair;
// release (acting, or the hard cap) ends it. Phase-3 combat must treat
// `player.respawn != null` as invulnerable.

import { MovementBody } from './movement.js';

export const STOCKS = 3;
export const CHAIR_DESCENT = 60;   // frames: bounds-top -> respawn hover point
export const RESPAWN_CAP = 180;    // forced release (3 s)

const ACTS = (it) => it.left || it.right || it.down || it.jump || it.dodge;

export class MatchState {
  constructor(stage, statsPair) {
    this.stage = stage;
    this.players = statsPair.map((stats, i) => ({
      stats,
      body: new MovementBody(stats, stage.spawns[i]),
      stocks: STOCKS,
      respawn: null,             // { t, x, y, y0 } while riding the chair
    }));
    this.over = false;
    this.winner = -1;
    this.events = [];            // drained by the screen: 'ko' | 'gameover'
  }

  update(intents) {
    if (this.over) return;
    this.players.forEach((p, i) => {
      if (p.respawn) { this._chair(p, intents[i]); return; }
      p.body.update(intents[i], this.stage);
      if (p.body.out) this._ko(p, i);
    });
  }

  _ko(p, i) {
    p.stocks--;
    if (p.stocks <= 0) {
      this.over = true;
      this.winner = 1 - i;
      this.events.push({ type: 'gameover', winner: this.winner });
      return;
    }
    this.events.push({ type: 'ko', player: i });
    const y0 = this.stage.cameraBounds.y + 40;
    p.respawn = { t: 0, x: this.stage.respawn.x, y: y0, y0 };
  }

  _chair(p, intent) {
    const r = p.respawn;
    r.t++;
    const k = Math.min(1, r.t / CHAIR_DESCENT);
    r.y = r.y0 + (this.stage.respawn.y - r.y0) * k;
    const release = (r.t >= CHAIR_DESCENT && ACTS(intent)) || r.t >= RESPAWN_CAP;
    if (release) {
      p.body = new MovementBody(p.stats, { x: r.x, y: r.y });
      p.respawn = null;
    }
  }
}
