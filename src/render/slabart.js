// The arena piece, drawn as tall as its wall (render only). A slab's collision
// depth `h` is the wall you can slide down (engine/wall.js); the Higgsfield
// piece's straight side is usually shorter than that. So the piece is split
// where its straight side ends and a band of rows just above that line is
// repeated until the drawn wall reaches `h` — the taper then hangs below it.
// Found from the image's alpha at first use and cached; a missing piece still
// falls back to the procedural slab (stage.js). Geometry never changes.

const BAND = 24;                  // source rows repeated to lengthen the wall
const EDGE = 14;                  // world px: a row whose sides sit this close to the collision edge is "wall"
const cache = new WeakMap();      // img -> Map(key -> canvas)

// where the piece's straight side is: { from, end } in source rows
function wallEnd(img, scale) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const a = g.getImageData(0, 0, img.width, img.height).data, W = img.width, thr = EDGE / scale;
  // the longest run of straight rows that starts in the top half (rounded corners and cornices come first)
  let best = { from: 0, end: 0 }, from = -1;
  for (let y = 0; y <= img.height; y++) {
    let wall = false;
    if (y < img.height) {
      let l = -1, r = -1;
      for (let x = 0; x < W; x++) if (a[(y * W + x) * 4 + 3] > 0) { l = x; break; }
      if (l >= 0) { for (let x = W - 1; x >= 0; x--) if (a[(y * W + x) * 4 + 3] > 0) { r = x; break; } wall = l <= thr && W - 1 - r <= thr; }
    }
    if (wall && from < 0) from = y;
    if (!wall && from >= 0) { if (from < img.height / 2 && y - from > best.end - best.from) best = { from, end: y }; from = -1; }
  }
  return best;
}

// the piece with its wall stretched to `depth` world px below the top edge
export function tallSlab(img, w, depth, inset) {
  let m = cache.get(img); if (!m) { m = new Map(); cache.set(img, m); }
  const key = `${w}|${depth}`;
  if (m.has(key)) return m.get(key);
  let out = img;
  try {
    const scale = w / img.width, run = wallEnd(img, scale), end = run.end;
    const need = Math.ceil((depth + inset) / scale) - end;          // extra source rows
    if (end - run.from >= 8 && need > 0) {
      const band = Math.min(BAND, end - run.from), from = end - band;
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height + need;
      const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      g.drawImage(img, 0, 0, img.width, end, 0, 0, img.width, end);                        // top + straight wall
      for (let y = end; y < end + need; y += band) {
        const rows = Math.min(band, end + need - y);
        g.drawImage(img, 0, from, img.width, rows, 0, y, img.width, rows);                 // the wall, repeated
      }
      g.drawImage(img, 0, end, img.width, img.height - end, 0, end + need, img.width, img.height - end);   // the taper
      out = c;
    }
  } catch { out = img; }                                             // (a tainted canvas can't be read: draw it as it is)
  m.set(key, out);
  return out;
}
