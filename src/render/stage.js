// World-space stage art for the v3 renderer. The sky is painted in screen
// space (drawSky) before the camera transform; everything else here draws in
// world px under camera.apply(). The backdrop is a 480x270 pixel painting
// scaled x4 behind the floating slab with a parallax lag — a drop-in PNG
// (assets/stages/<id>.png) when one exists, else the stage's procedural v2
// `layers` re-rendered into a transparent buffer each frame. Slabs and soft
// platforms are chunky ink-outlined blocks styled per `stage.art`.

import { drawStageLayers } from '../data/stages.js';
import { INK, PAPER, BRASS, GREEN, shade } from './palette.js';

const BUF_W = 480, BUF_H = 270, BUF_SCALE = 4;
const BUF_GROUND = 232;           // v2 art-space ground line of the buffer
const GROUND_DROP = 40;           // world px: buffer ground line sits this far under the slab top
const HORIZON = 206;              // buffer y where the v2 scenes touch their floor (gates, facades, desks)

let buf = null;
function backdropBuffer() {
  if (!buf) {
    buf = document.createElement('canvas');
    buf.width = BUF_W; buf.height = BUF_H;
    buf.ctx = buf.getContext('2d');
  }
  return buf;
}

// Screen-space sky gradient (call with the identity transform set).
export function drawSky(ctx, stage, viewW = 960, viewH = 540) {
  const sky = stage?.sky || [PAPER, PAPER];
  const g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, sky[0]);
  g.addColorStop(1, sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);
}

const DEPTH_WASH = 0.18;          // backdrop haze over the (already hazy) far layer; 0.34 read as fog
const SLAB_ART_SCALE = 2;         // arena piece px -> world px (sprites are 1.5, backdrop 4)
const SLAB_ART_INSET = 6;         // world px the piece's top edge sits below the collision top

// opts: { art: Image|null (drop-in backdrop), slabArt: Image|null (arena piece), debug: bool }
export function drawStageWorld(ctx, stage, geometry, camera, t, opts = {}) {
  if (!stage || !geometry) return;
  const art = stage.art || {};
  const slab = geometry.slabs?.[0];
  const b = geometry.cameraBounds || { x: 0, y: 0, w: 1920, h: 1080 };
  const cx = slab ? slab.x + slab.w / 2 : b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const par = art.parallax ?? 0.3;
  const camX = camera?.x ?? cx, camY = camera?.y ?? cy;
  // the backdrop lags the camera: it slides (1 - par) of the way with it
  const ox = Math.round((camX - cx) * (1 - par));
  const oy = Math.round((camY - cy) * (1 - par));
  const groundY = (slab ? slab.y + GROUND_DROP : cy) + oy;
  const bx = Math.round(cx - (BUF_W * BUF_SCALE) / 2 + ox);
  const by = Math.round(groundY - BUF_GROUND * BUF_SCALE);

  // distant floor band under the backdrop, from the scene's horizon line down
  // (daylight, flat, no horizon glow); the backdrop's props stand on it
  const far = art.far || shade(stage.groundFill || '#888888', 40);
  const horizonY = by + HORIZON * BUF_SCALE;
  ctx.fillStyle = far;
  ctx.fillRect(bx - 2000, horizonY, BUF_W * BUF_SCALE + 4000, b.h + 2000);
  ctx.fillStyle = shade(far, -12);
  ctx.fillRect(bx - 2000, horizonY, BUF_W * BUF_SCALE + 4000, 6);
  ctx.fillStyle = shade(far, -6);                          // a second, nearer floor line
  ctx.fillRect(bx - 2000, groundY, BUF_W * BUF_SCALE + 4000, 4);

  ctx.imageSmoothingEnabled = false;
  if (opts.art) {
    ctx.drawImage(opts.art, bx, by, BUF_W * BUF_SCALE, BUF_H * BUF_SCALE);
  } else if (stage.layers) {
    const bb = backdropBuffer();
    bb.ctx.clearRect(0, 0, BUF_W, BUF_H);
    drawStageLayers(bb.ctx, stage, t, (camX - cx) / BUF_SCALE * 0.35);
    ctx.drawImage(bb, bx, by, BUF_W * BUF_SCALE, BUF_H * BUF_SCALE);
  }
  // atmospheric perspective: a flat wash of the sky colour over everything
  // behind the arena (no gradient glow — one tone, like distance haze on paper)
  ctx.fillStyle = (stage.sky || [PAPER])[1] || PAPER;
  ctx.globalAlpha = art.wash ?? DEPTH_WASH;
  ctx.fillRect(bx - 2000, by - 2000, BUF_W * BUF_SCALE + 4000, b.h + 6000);
  ctx.globalAlpha = 1;

  for (const s of geometry.slabs || []) {
    if (opts.slabArt) drawSlabArt(ctx, s, opts.slabArt);
    else drawSlab(ctx, s, stage);
  }
  (geometry.platforms || []).forEach((p, i) => {
    const style = art.platforms?.[i] || 'shelf';
    PLATFORM_STYLES[style]?.(ctx, p, stage, geometry, t) || PLATFORM_STYLES.shelf(ctx, p, stage, geometry, t);
  });

  if (opts.debug) drawBlastHints(ctx, geometry, camera);
}

// ---- slabs ------------------------------------------------------------------

// The arena piece: one designed object whose walkable top edge is the top of
// the image. Stretched to the slab width (the collision rect), it hangs as far
// below as the art goes; the geometry never changes with the art.
function drawSlabArt(ctx, s, img) {
  const w = s.w + 2 * SLAB_ART_INSET;
  const h = Math.round(img.height * (w / img.width));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, Math.round(s.x - SLAB_ART_INSET), Math.round(s.y - SLAB_ART_INSET), w, h);
}

function drawSlab(ctx, s, stage) {
  const fill = stage.groundFill || '#6e655c', line = stage.groundLine || shade(fill, -20), tile = stage.groundTile || shade(fill, 12);
  // floating-island skirt below the block
  ctx.fillStyle = shade(fill, -44);
  ctx.beginPath();
  ctx.moveTo(s.x + 10, s.y + s.h); ctx.lineTo(s.x + s.w - 10, s.y + s.h);
  ctx.lineTo(s.x + s.w - 48, s.y + s.h + 22); ctx.lineTo(s.x + 48, s.y + s.h + 22);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
  // body
  ctx.fillStyle = fill;
  ctx.fillRect(s.x, s.y, s.w, s.h);
  ctx.fillStyle = shade(fill, -26);                       // underside band
  ctx.fillRect(s.x, s.y + s.h - 14, s.w, 14);
  ctx.fillStyle = shade(fill, -14);                       // side bevels
  ctx.fillRect(s.x, s.y, 8, s.h); ctx.fillRect(s.x + s.w - 8, s.y, 8, s.h);
  ctx.fillStyle = shade(fill, 16);                        // top surface strip
  ctx.fillRect(s.x, s.y, s.w, 10);
  ctx.fillStyle = line;
  ctx.fillRect(s.x, s.y + 10, s.w, 4);
  ctx.fillStyle = tile;                                   // tile ticks (v2 ground x2)
  for (let x = s.x + 16; x < s.x + s.w - 32; x += 68) ctx.fillRect(x, s.y + 24, 32, 2);
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.strokeRect(s.x + 1.5, s.y + 1.5, s.w - 3, s.h - 3);
}

// ---- soft platforms (p.y = surface top) ------------------------------------

function outline(ctx, x, y, w, h) {
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
}

const PLATFORM_STYLES = {
  shelf(ctx, p) {                                         // office wall shelf
    ctx.fillStyle = '#8a7048'; ctx.fillRect(p.x, p.y, p.w, 12);
    ctx.fillStyle = '#a3865a'; ctx.fillRect(p.x, p.y, p.w, 4);
    outline(ctx, p.x, p.y, p.w, 12);
    ctx.fillStyle = INK;
    for (const bx of [p.x + 16, p.x + p.w - 20]) {         // L-brackets
      ctx.fillRect(bx, p.y + 12, 4, 18); ctx.fillRect(bx, p.y + 26, 14, 4);
    }
  },
  tray(ctx, p) {                                          // hanging cable tray
    ctx.fillStyle = INK;
    ctx.fillRect(p.x + 12, p.y - 70, 4, 70); ctx.fillRect(p.x + p.w - 16, p.y - 70, 4, 70);
    ctx.fillStyle = '#7d8790'; ctx.fillRect(p.x, p.y, p.w, 12);
    ctx.fillStyle = '#5c656d';
    for (let x = p.x + 10; x < p.x + p.w - 10; x += 24) ctx.fillRect(x, p.y + 4, 8, 4);
    outline(ctx, p.x, p.y, p.w, 12);
    ctx.fillStyle = '#c4452e'; ctx.fillRect(p.x + 4, p.y + 12, p.w - 8, 3);   // a red cable
  },
  rail(ctx, p) {                                          // palace gate rail
    ctx.fillStyle = INK; ctx.fillRect(p.x, p.y, p.w, 8);
    for (let x = p.x + 6; x < p.x + p.w - 4; x += 28) {
      ctx.fillStyle = INK; ctx.fillRect(x, p.y + 8, 4, 26);
      ctx.fillStyle = BRASS; ctx.fillRect(x - 1, p.y - 6, 6, 6);
    }
    ctx.fillStyle = INK; ctx.fillRect(p.x, p.y + 32, p.w, 5);
  },
  awning(ctx, p) {                                        // pub canopy
    ctx.fillStyle = PAPER; ctx.fillRect(p.x, p.y, p.w, 14);
    ctx.fillStyle = GREEN;
    for (let x = p.x; x < p.x + p.w; x += 40) ctx.fillRect(x, p.y, Math.min(20, p.x + p.w - x), 14);
    ctx.fillStyle = INK; ctx.fillRect(p.x - 4, p.y - 4, p.w + 8, 4);     // rail
    outline(ctx, p.x, p.y, p.w, 14);
    for (let x = p.x + 8; x < p.x + p.w; x += 16) {                       // scallops
      ctx.fillStyle = ((x - p.x - 8) / 16) % 2 ? PAPER : GREEN;
      ctx.beginPath(); ctx.arc(x, p.y + 14, 8, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    }
  },
  sign(ctx, p, stage, geo, t) {                           // the hanging pub sign
    const sway = Math.sin(t * 0.03) * 2;                  // backdrop art only — collision is static
    ctx.fillStyle = INK;
    ctx.fillRect(p.x - 8, p.y - 76, p.w + 16, 6);          // bracket bar
    ctx.fillRect(p.x + 12 + sway, p.y - 70, 3, 70); ctx.fillRect(p.x + p.w - 15 + sway, p.y - 70, 3, 70);
    ctx.fillStyle = GREEN; ctx.fillRect(p.x, p.y, p.w, 40);
    ctx.fillStyle = '#2e4530'; ctx.fillRect(p.x + 6, p.y + 6, p.w - 12, 28);
    ctx.fillStyle = '#f0d98a'; ctx.fillRect(p.x + p.w / 2 - 12, p.y + 12, 24, 16);   // little bellwether
    ctx.fillStyle = INK; ctx.fillRect(p.x + p.w / 2 - 6, p.y + 16, 4, 4); ctx.fillRect(p.x + p.w / 2 + 2, p.y + 16, 4, 4);
    outline(ctx, p.x, p.y, p.w, 40);
  },
  bench(ctx, p) {                                         // low wooden bench
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i % 2 ? '#7a6240' : '#8a7048';
      ctx.fillRect(p.x, p.y + i * 8, p.w, 6);
      outline(ctx, p.x, p.y + i * 8, p.w, 6);
    }
    ctx.fillStyle = '#4a3b2a';
    for (const lx of [p.x + 14, p.x + p.w - 24]) { ctx.fillRect(lx, p.y + 22, 10, 28); outline(ctx, lx, p.y + 22, 10, 28); }
  },
  roof(ctx, p, stage, geo) {                              // Brandenburg gate roof + backdrop columns
    const slab = geo.slabs?.[0];
    const bottom = slab ? slab.y : p.y + 160;
    const n = 5, span = (p.w - 24) / (n - 1);
    for (let i = 0; i < n; i++) {                         // columns: backdrop, no collision
      const x = Math.round(p.x + i * span);
      ctx.fillStyle = '#c8b89a'; ctx.fillRect(x, p.y + 30, 24, bottom - p.y - 30);
      ctx.fillStyle = '#b5a386'; ctx.fillRect(x + 6, p.y + 30, 3, bottom - p.y - 30); ctx.fillRect(x + 15, p.y + 30, 3, bottom - p.y - 30);
      ctx.fillStyle = '#c8b89a'; ctx.fillRect(x - 4, p.y + 30, 32, 8);
      outline(ctx, x, p.y + 30, 24, bottom - p.y - 30);
    }
    ctx.fillStyle = '#c8b89a'; ctx.fillRect(p.x, p.y, p.w, 22);
    ctx.fillStyle = '#b5a386'; ctx.fillRect(p.x, p.y + 22, p.w, 8);
    ctx.fillStyle = '#8f8066';
    for (let x = p.x + 8; x < p.x + p.w - 8; x += 16) ctx.fillRect(x, p.y + 16, 6, 6);   // dentils
    outline(ctx, p.x, p.y, p.w, 30);
  },
};

// ---- dev hints (the ?art harness only) ---------------------------------------

function drawBlastHints(ctx, geo, camera) {
  const z = geo.blast, cb = geo.cameraBounds;
  const lw = 3 / (camera?.zoom || 1);
  ctx.save();
  ctx.setLineDash([12, 8]); ctx.lineWidth = lw;
  if (z) { ctx.strokeStyle = '#c4452e'; ctx.strokeRect(z.left, z.top, z.right - z.left, z.bottom - z.top); }
  if (cb) { ctx.strokeStyle = 'rgba(39,66,95,0.6)'; ctx.strokeRect(cb.x, cb.y, cb.w, cb.h); }
  ctx.setLineDash([]);
  if (geo.respawn) {                                        // chair hover point
    ctx.strokeStyle = BRASS;
    ctx.strokeRect(geo.respawn.x - 8, geo.respawn.y - 8, 16, 16);
  }
  ctx.restore();
}
