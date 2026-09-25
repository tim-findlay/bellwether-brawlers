// Manifest-driven asset loaders with graceful fallback.
//  - headshots: assets/headshots/<id>.png -> win-screen / in-world variants
//  - stage art: assets/stages/<id>.png    -> 480x270 pixel backdrop (v3 world)
//  - sprites:   assets/sprites/<id>/<anim>.png via render/sprites.js
// Dropping a file into the repo makes it Just Work — the manifest is the
// id list, and missing/failed files fall back to the drawn versions.

import { loadSprites } from '../render/sprites.js';
export { loadSprites };

const TIMEOUT_MS = 4000;

// Map stageId -> Image | null. A backdrop is a 480x270 pixel painting drawn
// x4 with nearest-neighbour behind the slab (see render/stage.js).
// A second drop-in per stage, `<id>-slab.png`, is the arena piece: the main
// slab drawn as one designed object (a floating chunk of the scene, walkable
// top edge at the top of the image), keyed as `${id}-slab` in the same map.
export async function loadStageArt(stageIds, onProgress) {
  const art = new Map();
  let done = 0;
  await Promise.all(stageIds.map(async (id) => {
    const [img, slab] = await Promise.all([loadImage(`assets/stages/${id}.png`), loadImage(`assets/stages/${id}-slab.png`)]);
    art.set(id, img); art.set(`${id}-slab`, slab);
    done++;
    if (onProgress) onProgress(done / stageIds.length, id);
  }));
  return art;
}

export async function loadHeadshots(ids, onProgress) {
  const heads = new Map();
  let done = 0;
  await Promise.all(ids.map(async (id) => {
    const img = await loadImage(`assets/headshots/${id}.png`);
    heads.set(id, img ? makeHeads(img) : null);
    done++;
    if (onProgress) onProgress(done / ids.length, id);
  }));
  return heads;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), TIMEOUT_MS);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = src;
  });
}

// Pre-render the two circular variants used everywhere:
//  - fight: small head used on the in-world fighter body (world-buffer px,
//    pixelation comes from the 2x world upscale)
//  - card: win-screen portrait, lightly pixelated at full res
function makeHeads(img) {
  return {
    fight: circleCrop(img, 22, 1),
    card: pixelCircle(img, 96, 48, 3),
    raw: img,
    ok: true,
  };
}

function circleCrop(img, size, outline) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = true;
  x.beginPath();
  x.arc(size / 2, size / 2, size / 2 - outline, 0, Math.PI * 2);
  x.clip();
  x.drawImage(img, 0, 0, size, size);
  x.restore?.();
  // ink outline ring
  const o = c.getContext('2d');
  o.beginPath();
  o.arc(size / 2, size / 2, size / 2 - outline, 0, Math.PI * 2);
  o.lineWidth = outline * 2;
  o.strokeStyle = '#2b2620';
  o.stroke();
  return c;
}

// Draw small then upscale with smoothing off => light pixelation.
function pixelCircle(img, size, lowRes, outline) {
  const lo = document.createElement('canvas');
  lo.width = lo.height = lowRes;
  const lx = lo.getContext('2d');
  lx.imageSmoothingEnabled = true;
  lx.drawImage(img, 0, 0, lowRes, lowRes);

  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.save();
  x.beginPath();
  x.arc(size / 2, size / 2, size / 2 - outline, 0, Math.PI * 2);
  x.clip();
  x.drawImage(lo, 0, 0, size, size);
  x.restore();
  x.beginPath();
  x.arc(size / 2, size / 2, size / 2 - outline, 0, Math.PI * 2);
  x.lineWidth = outline;
  x.strokeStyle = '#2b2620';
  x.stroke();
  return c;
}
