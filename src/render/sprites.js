// Sprite sheets: manifest-driven loader + cell animator. Pure canvas, no
// engine imports. `loadSprites` resolves every sheet, missing files -> null
// (drop-in rule: adding assets/sprites/<id>/<anim>.png later Just Works).
// Strips and grids both work: columns come from the image width / cell.
// `drawSprite` draws one cell bottom-centre anchored at world (x, y), mirrored
// for facing -1, with smoothing off for the pixel look.

const TIMEOUT_MS = 4000;

// Map id -> { anims: { [name]: { img, frames, fps, loop, cols, cell } } }
export async function loadSprites(manifest, onProgress) {
  const out = new Map();
  const jobs = [];
  for (const [id, def] of Object.entries(manifest)) {
    const sheet = { anims: {} };
    out.set(id, sheet);
    for (const [name, a] of Object.entries(def.anims)) {
      jobs.push({ id, name, sheet, def, a });
    }
  }
  let done = 0;
  await Promise.all(jobs.map(async (j) => {
    const img = await loadImage(`assets/sprites/${j.id}/${j.name}.png`);
    const cell = j.a.cell || j.def.cell || 64;
    // the image is the truth for its layout: a 512x64 strip is 8 columns, a
    // 256x192 grid is 4 — and never point at cells the sheet doesn't have
    const cols = j.a.cols || (img ? Math.max(1, Math.floor(img.width / cell)) : Math.ceil(Math.sqrt(j.a.frames)));
    const rows = img ? Math.max(1, Math.floor(img.height / cell)) : Infinity;
    j.sheet.anims[j.name] = {
      img,
      frames: Math.max(1, Math.min(j.a.frames, cols * rows)),
      fps: j.a.fps,
      loop: !!j.a.loop,
      cols,
      cell,
    };
    done++;
    if (onProgress) onProgress(done / jobs.length, `${j.id}/${j.name}`);
  }));
  // a sheet with no images at all reads as "absent" so callers can fall back
  for (const [id, sheet] of out) {
    sheet.ok = Object.values(sheet.anims).some(a => a.img);
    if (!sheet.ok) out.set(id, null);
  }
  return out;
}

export function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), TIMEOUT_MS);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = src;
  });
}

// Which cell to show `t` logic frames (60 Hz) into an anim. Pure.
export function frameFor(anim, t) {
  if (!anim || !anim.frames) return 0;
  const fi = Math.floor(Math.max(0, t) * anim.fps / 60);
  return anim.loop ? fi % anim.frames : Math.min(anim.frames - 1, fi);
}

// Does this sheet have a drawable anim of that name?
export function hasAnim(sheet, name) {
  return !!sheet?.anims?.[name]?.img;
}

// Scratch canvas for tinted cells (hurt flash etc.) — one per page is plenty.
let scratch = null;
function scratchFor(cell) {
  if (!scratch) { scratch = document.createElement('canvas'); scratch.ctx = scratch.getContext('2d'); }
  if (scratch.width !== cell || scratch.height !== cell) { scratch.width = scratch.height = cell; }
  return scratch;
}

// opts: { alpha, tint, tintAlpha, rot, squashX, squashY }
export function drawSprite(ctx, sheet, animName, frameIndex, x, y, facing, scale, opts = {}) {
  const a = sheet?.anims?.[animName];
  if (!a?.img) return false;
  const fi = Math.max(0, Math.min(a.frames - 1, frameIndex | 0));
  const sx = (fi % a.cols) * a.cell, sy = Math.floor(fi / a.cols) * a.cell;
  let src = a.img;
  if (opts.tint) {
    const sc = scratchFor(a.cell), g = sc.ctx;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, a.cell, a.cell);
    g.drawImage(a.img, sx, sy, a.cell, a.cell, 0, 0, a.cell, a.cell);
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = opts.tintAlpha ?? 0.85;
    g.fillStyle = opts.tint;
    g.fillRect(0, 0, a.cell, a.cell);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    src = sc;
  }
  ctx.save();
  ctx.translate(x, y);
  if (opts.rot) ctx.rotate(opts.rot);
  ctx.scale((facing < 0 ? -1 : 1) * scale * (opts.squashX ?? 1), scale * (opts.squashY ?? 1));
  ctx.imageSmoothingEnabled = false;
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  if (src === a.img) ctx.drawImage(src, sx, sy, a.cell, a.cell, -a.cell / 2, -a.cell, a.cell, a.cell);
  else ctx.drawImage(src, 0, 0, a.cell, a.cell, -a.cell / 2, -a.cell, a.cell, a.cell);
  ctx.restore();
  return true;
}
