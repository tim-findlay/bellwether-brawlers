// Render side of the roster-pass specials (src/engine/specials.js):
// Abi's Hollibobs landing mark, and Tim's summoned helper (Claude). Sprite
// sheet 'claude' (idle / run / attack) when loaded, else a drawn stand-in in
// the same terracotta. Render only; reads world state, writes nothing.

import { drawSprite, frameFor, hasAnim } from './sprites.js';
import { markSurface } from '../engine/specials.js';
import { INK, PAPER, BRICK } from './palette.js';

const ORANGE = '#d97757', ORANGE_D = '#b5573a', CREAM = '#f3e3cf';

// While Abi is away: a beach-umbrella shadow on the mark, pulsing; it turns
// brick and stops moving when it locks (the dodge cue), and a suitcase
// silhouette grows in the sky over it for the last beats.
export function drawHolidayMark(c, f, world, t) {
  const st = f.statuses?.get?.('holiday');
  if (!st) return;
  const d = st.data, s = markSurface(world, d);
  const x = Math.round(d.x), y = s.y, locked = d.locked, pulse = (t >> 3) & 1;
  const w = locked ? 84 : 64 + pulse * 6;
  c.globalAlpha = 0.35; c.fillStyle = INK; c.fillRect(x - w / 2, y - 4, w, 6); c.globalAlpha = 1;
  // umbrella on a pole
  const col = locked ? BRICK : '#e8c547';
  const top = y - 128;                                             // canopy clears a standing fighter's head
  c.fillStyle = INK; c.fillRect(x - 1, top, 3, 126);
  c.fillStyle = INK; c.fillRect(x - 30, top - 12, 60, 14);
  for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? PAPER : col; c.fillRect(x - 28 + i * 9.5, top - 10, 9, 10); }
  c.fillStyle = INK; c.fillRect(x - 16, top - 18, 32, 6);
  if (locked) {                                                    // the drop is coming: a suitcase over the mark
    const k = 1 - st.dur / (d.move.lockAt ?? 26), sy = y - 260 + k * 60, sw = 16 + k * 18;
    c.fillStyle = INK; c.fillRect(x - sw / 2 - 2, sy - 2, sw + 4, sw * 0.7 + 4);
    c.fillStyle = '#8a5a3a'; c.fillRect(x - sw / 2, sy, sw, sw * 0.7);
    c.fillStyle = PAPER; c.fillRect(x - 3, sy - 5, 6, 4);
  }
}

export function drawAssists(c, world, sheet, t) {
  for (const a of world.assists ?? []) {
    const fade = a.state === 'in' ? Math.min(1, a.st / 14) : a.life - a.t < 20 ? (a.life - a.t) / 20 : 1;
    c.globalAlpha = 0.22; c.fillStyle = INK; c.fillRect(Math.round(a.x - 18), Math.round(a.y - 2), 36, 4);
    c.globalAlpha = fade;
    let anim = 'idle', frame = 0;
    if (a.state === 'chase') { anim = 'run'; frame = frameFor(sheet?.anims?.run, a.st); }
    else if (a.state === 'combo') { anim = 'attack'; frame = Math.min(5, Math.floor(a.st / 8)); }
    else frame = frameFor(sheet?.anims?.idle, a.t);
    if (sheet && hasAnim(sheet, anim)) drawSprite(c, sheet, anim, frame, a.x, a.y, a.facing, 1.5 * (sheet.scale ?? 1), {});
    else standIn(c, a, t);
    c.globalAlpha = 1;
    // name tag, so the room knows who just joined the fight
    c.fillStyle = INK; c.fillRect(Math.round(a.x - 28), Math.round(a.y - 116), 56, 14);
    c.fillStyle = ORANGE; c.fillRect(Math.round(a.x - 27), Math.round(a.y - 115), 54, 12);
    c.fillStyle = PAPER; c.font = "700 10px 'Silkscreen', monospace"; c.textAlign = 'center';
    c.fillText(a.name, Math.round(a.x), Math.round(a.y - 105));
  }
}

// Drawn stand-in: a terracotta chibi (big round head, suit, tie) in pixel blocks.
function standIn(c, a, t) {
  const x = Math.round(a.x), y = Math.round(a.y), f = a.facing, step = a.state === 'chase' ? ((t >> 2) & 1) * 4 : 0;
  const R = (px, py, w, h, col) => { c.fillStyle = col; c.fillRect(x + (f > 0 ? px : -px - w), y + py, w, h); };
  R(-10, -22, 8, 22 - step, INK); R(2, -22, 8, 22 - (4 - step), INK);          // legs
  R(-9, -21, 6, 19 - step, ORANGE_D); R(3, -21, 6, 19 - (4 - step), ORANGE_D);
  R(-16, -58, 32, 38, INK); R(-14, -56, 28, 34, ORANGE);                       // jacket
  R(-4, -56, 8, 18, CREAM); R(-2, -52, 4, 14, ORANGE_D);                       // shirt + tie
  const reach = a.state === 'combo' && a.st > 4 ? 14 : 0;
  R(14, -52, 10 + reach, 8, INK); R(15, -51, 8 + reach, 6, ORANGE);            // arm
  R(-20, -96, 40, 40, INK); R(-18, -94, 36, 36, ORANGE);                       // head
  R(4, -80, 4, 4, INK); R(-4, -80, 4, 4, INK); R(-2, -70, 8, 2, INK);          // face
  R(-14, -92, 10, 6, '#e9a27f');                                               // highlight
}
