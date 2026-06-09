// Stages as data: palette + parallax layers composed from tiny pixel helpers.
// A layer = { depth, draw(ctx, t, ox) } where ox is the parallax offset.
// Adding a stage = adding an object here and (if selectable) it appears in
// the stage select automatically.

import { GROUND_Y } from '../engine/fighter.js';

const W = 480;

// ---- tiny pixel helpers ----------------------------------------------------

function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); }

function windowsGrid(ctx, x, y, cols, rows, cw, ch, gap, on, off, litChance, seed) {
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const lit = ((seed + i * 7 + j * 13) % 17) / 17 < litChance;
      rect(ctx, x + i * (cw + gap), y + j * (ch + gap), cw, ch, lit ? on : off);
    }
  }
}

function skyline(ctx, baseY, color, seed, ox) {
  for (let i = 0; i < 14; i++) {
    const bw = 26 + ((seed + i * 31) % 22);
    const bh = 28 + ((seed + i * 53) % 52);
    const bx = ((i * 38 + seed * 3) % (W + 60)) - 30 + ox;
    rect(ctx, bx, baseY - bh, bw, bh, color);
  }
}

function ground(ctx, top, fill, line, tile) {
  rect(ctx, 0, top, W, 270 - top, fill);
  rect(ctx, 0, top, W, 2, line);
  if (tile) for (let x = 8; x < W; x += 34) rect(ctx, x, top + 12, 16, 1, tile);
}

// ---- stages ------------------------------------------------------------------

export const STAGES = [
  {
    id: 'office',
    name: 'THE OFFICE',
    blurb: 'Open plan. Closed fists.',
    selectable: true,
    sky: ['#c4d3e2', '#e6ecf0'],
    groundFill: '#4a5a58', groundLine: '#394644', groundTile: '#556763',
    layers: [
      { depth: 0.2, draw(ctx, t, ox) {                       // window-wall + pale skyline
        skyline(ctx, 190, '#a9bccd', 11, ox);
        skyline(ctx, 205, '#94a9bd', 47, ox * 1.3);
        for (let x = 0; x < W; x += 96) rect(ctx, x + ox * 0.5, 0, 3, GROUND_Y - 26, '#8fa3b5'); // mullions
        rect(ctx, 0, 0, W, 4, '#8fa3b5');
      }},
      { depth: 0.55, draw(ctx, t, ox) {                      // glass meeting rooms + plants
        rect(ctx, 30 + ox, 150, 110, 56, '#aebfd1');
        rect(ctx, 30 + ox, 150, 110, 3, '#5b7185');
        rect(ctx, 30 + ox, 150, 3, 56, '#5b7185');
        rect(ctx, 137 + ox, 150, 3, 56, '#5b7185');
        rect(ctx, 84 + ox, 150, 3, 56, '#5b7185');
        rect(ctx, 350 + ox, 146, 96, 60, '#aebfd1');
        rect(ctx, 350 + ox, 146, 96, 3, '#5b7185');
        rect(ctx, 350 + ox, 146, 3, 60, '#5b7185');
        rect(ctx, 443 + ox, 146, 3, 60, '#5b7185');
        rect(ctx, 366 + ox, 168, 64, 26, '#f7f4ea');        // whiteboard
        rect(ctx, 372 + ox, 174, 30, 2, '#c4452e');
        rect(ctx, 372 + ox, 180, 44, 2, '#27425f');
        // plant
        rect(ctx, 160 + ox, 188, 10, 18, '#7a5b3a');
        rect(ctx, 156 + ox, 172, 18, 18, '#3f5a40');
        rect(ctx, 160 + ox, 166, 10, 10, '#4d6e4e');
      }},
      { depth: 0.85, draw(ctx, t, ox) {                      // desk islands with monitors
        for (const dx of [10, 396]) {
          rect(ctx, dx + ox, 212, 74, 6, '#7a6a52');
          rect(ctx, dx + 6 + ox, 218, 5, 14, '#5d5040');
          rect(ctx, dx + 62 + ox, 218, 5, 14, '#5d5040');
          rect(ctx, dx + 12 + ox, 196, 22, 16, '#33424f');   // monitor
          rect(ctx, dx + 14 + ox, 198, 18, 11, '#9db8d9');
          rect(ctx, dx + 44 + ox, 202, 12, 10, '#33424f');   // small monitor
          rect(ctx, dx + 40 + ox, 206, 3, 3, '#e8d44f');     // post-it
          rect(ctx, dx + 58 + ox, 204, 3, 3, '#e88aa0');
        }
      }},
    ],
  },
  {
    id: 'palace',
    name: 'PALACE FORECOURT',
    blurb: 'Mind the guard. He won’t mind you.',
    selectable: true,
    sky: ['#9db8d9', '#dde7ef'],
    groundFill: '#c9bda1', groundLine: '#a89a7c', groundTile: '#b6a988',
    layers: [
      { depth: 0.15, draw(ctx, t, ox) {                      // facade + flag
        rect(ctx, 40 + ox, 96, 400, 110, '#d9cba8');
        rect(ctx, 40 + ox, 96, 400, 6, '#bfae87');
        windowsGrid(ctx, 56 + ox, 116, 12, 3, 18, 14, 14, '#8a7a55', '#b3a785', 0.25, 5);
        rect(ctx, 226 + ox, 76, 28, 30, '#cfc09a');          // central pediment
        rect(ctx, 238 + ox, 40, 3, 38, '#8a7a55');           // flag pole
        const wave = Math.sin(t * 0.05) * 2;
        rect(ctx, 241 + ox, 42 + wave, 16, 9, '#b3402e');    // flag
        // clouds
        rect(ctx, ((t * 0.08) % (W + 80)) - 60 + ox, 30, 44, 8, '#f2f4f6');
        rect(ctx, ((t * 0.05 + 200) % (W + 80)) - 60 + ox, 56, 60, 9, '#eef1f4');
      }},
      { depth: 0.5, draw(ctx, t, ox) {                       // gates + the guard
        for (let x = 0; x < W; x += 18) {
          rect(ctx, x + ox, 150, 3, 56, '#2b2620');
          rect(ctx, x - 1 + ox, 147, 5, 5, '#c9a227');       // gold finial
        }
        rect(ctx, 0, 202, W, 5, '#2b2620');
        rect(ctx, 0, 148, W, 4, '#2b2620');
        // the guard: red coat, bearskin, unbothered (blinks every ~3s)
        const gx = 388 + ox;
        rect(ctx, gx, 168, 12, 38, '#b3402e');
        rect(ctx, gx + 1, 196, 4, 12, '#2b2620');
        rect(ctx, gx + 7, 196, 4, 12, '#2b2620');
        rect(ctx, gx + 2, 158, 8, 12, '#e8c39a');            // face
        rect(ctx, gx, 146, 12, 14, '#1c1814');               // bearskin
        const blink = (t % 190) < 6;
        rect(ctx, gx + 3, 162, 2, blink ? 1 : 2, '#1a1a1a');
        rect(ctx, gx + 7, 162, 2, blink ? 1 : 2, '#1a1a1a');
        rect(ctx, gx + 3, 174, 6, 2, '#c9a227');             // buttons
      }},
      { depth: 0.85, draw(ctx, t, ox) {                      // bollards + chain
        for (const bx of [30, 120, 360, 446]) {
          rect(ctx, bx + ox, 214, 8, 16, '#7d7464');
          rect(ctx, bx - 1 + ox, 212, 10, 4, '#665e50');
        }
      }},
    ],
  },
  {
    id: 'pub',
    name: 'THE BELLWETHER ARMS',
    blurb: 'Last orders, first blood.',
    selectable: true,
    sky: ['#d99a5b', '#f0d9b0'],
    groundFill: '#6e655c', groundLine: '#574f47', groundTile: '#7d746a',
    layers: [
      { depth: 0.15, draw(ctx, t, ox) {                      // terraced street at dusk
        skyline(ctx, 186, '#8c6650', 23, ox);
        for (let i = 0; i < 6; i++) rect(ctx, 30 + i * 80 + ox, 120 - (i % 3) * 8, 6, 14, '#6e4f3e'); // chimneys
        rect(ctx, 0, 60, W, 1, '#e8b985');
      }},
      { depth: 0.5, draw(ctx, t, ox) {                       // the pub itself
        rect(ctx, 120 + ox, 118, 240, 88, '#7a4a3a');
        rect(ctx, 120 + ox, 118, 240, 5, '#5d382c');
        rect(ctx, 132 + ox, 134, 60, 34, '#3a2e24');         // window L
        rect(ctx, 135 + ox, 137, 54, 28, '#e8b14f');         // warm light (flat, diegetic)
        rect(ctx, 160 + ox, 137, 3, 28, '#3a2e24');
        rect(ctx, 286 + ox, 134, 60, 34, '#3a2e24');         // window R
        rect(ctx, 289 + ox, 137, 54, 28, '#e3a843');
        rect(ctx, 314 + ox, 137, 3, 28, '#3a2e24');
        rect(ctx, 222 + ox, 140, 36, 66, '#3f5a40');         // door
        rect(ctx, 250 + ox, 170, 4, 4, '#c9a227');
        rect(ctx, 128 + ox, 122, 224, 10, '#3f5a40');        // fascia
        // chalkboard
        rect(ctx, 200 + ox, 182, 18, 24, '#2b2620');
        rect(ctx, 203 + ox, 188, 12, 2, '#f2e9d8');
        rect(ctx, 203 + ox, 193, 9, 2, '#f2e9d8');
        // string lights (flat dots)
        for (let i = 0; i < 12; i++) {
          const lx = 126 + i * 19 + ox;
          const ly = 130 + Math.sin(i * 1.2) * 3;
          rect(ctx, lx, ly, 2, 2, i % 2 ? '#e8b14f' : '#d9925b');
        }
      }},
      { depth: 0.8, draw(ctx, t, ox) {                       // swinging hanging sign
        const sx = 96 + ox;
        rect(ctx, sx, 128, 26, 4, '#3a2e24');                // bracket
        const swing = Math.sin(t * 0.035) * 3;
        rect(ctx, sx + 18 + swing, 132, 2, 8, '#3a2e24');
        rect(ctx, sx + 8 + swing * 1.6, 140, 24, 20, '#3f5a40');
        rect(ctx, sx + 10 + swing * 1.6, 142, 20, 16, '#2e4530');
        rect(ctx, sx + 14 + swing * 1.6, 146, 12, 8, '#f0d98a'); // little bellwether
      }},
    ],
  },
  {
    id: 'berlin',
    name: 'BERLIN',
    blurb: 'Mike’s home turf.',
    selectable: false,                                       // event-only — never in the menu
    sky: ['#2a3550', '#4a5878'],
    groundFill: '#3a4255', groundLine: '#2c3344', groundTile: '#475068',
    layers: [
      { depth: 0.15, draw(ctx, t, ox) {                      // skyline + TV tower
        skyline(ctx, 196, '#222b42', 31, ox);
        rect(ctx, 392 + ox, 60, 4, 140, '#222b42');          // tower shaft
        ctx.fillStyle = '#222b42';
        ctx.beginPath(); ctx.arc(394 + ox, 78, 11, 0, Math.PI * 2); ctx.fill();
        rect(ctx, 388 + ox, 74, 12, 2, '#39476b');
        rect(ctx, 392 + ox, 50, 2, 12, '#222b42');
        // stars
        for (let i = 0; i < 16; i++) rect(ctx, (i * 67 + 13) % W + ox * 0.3, (i * 29) % 50 + 6, 1, 1, '#aab4cf');
      }},
      { depth: 0.5, draw(ctx, t, ox) {                       // Brandenburg Gate
        const gx = 140 + ox;
        rect(ctx, gx, 120, 200, 14, '#c8b89a');              // entablature
        rect(ctx, gx + 6, 108, 188, 12, '#b5a386');
        rect(ctx, gx + 76, 92, 48, 16, '#c8b89a');           // quadriga base
        rect(ctx, gx + 88, 80, 24, 12, '#8f8066');
        for (let i = 0; i < 6; i++) rect(ctx, gx + 10 + i * 33, 134, 14, 72, '#c8b89a'); // columns
        rect(ctx, gx, 204, 200, 4, '#b5a386');
      }},
      { depth: 0.8, draw(ctx, t, ox) {                       // U-Bahn sign
        rect(ctx, 60 + ox, 168, 26, 22, '#27425f');
        ctx.fillStyle = '#f2e9d8';
        ctx.font = '14px monospace';
        ctx.fillText('U', 68 + ox, 185);
        rect(ctx, 70 + ox, 190, 4, 40, '#3a4255');
      }},
    ],
  },
];

export const stageById = (id) => STAGES.find(s => s.id === id);
export const SELECTABLE_STAGES = STAGES.filter(s => s.selectable);

// Shared stage background painter used by the renderer.
export function drawStage(ctx, stage, t, parallaxX) {
  const g = ctx.createLinearGradient(0, 0, 0, 270);
  g.addColorStop(0, stage.sky[0]);
  g.addColorStop(1, stage.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 270);
  for (const layer of stage.layers) {
    layer.draw(ctx, t, -parallaxX * layer.depth);
  }
  ground(ctx, GROUND_Y, stage.groundFill, stage.groundLine, stage.groundTile);
}
