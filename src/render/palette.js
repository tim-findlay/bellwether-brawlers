// The paper-and-ink palette + tiny colour helpers shared by the renderers.
// Not neon: warm paper, ink outlines, daylight — no glows, no bloom.

export const PAPER = '#f2e9d8';
export const INK = '#2b2620';
export const BRICK = '#c4452e';
export const NAVY = '#27425f';
export const BRASS = '#c9a227';
export const GREEN = '#3f5a40';

// Lighten (+) / darken (-) a #rrggbb by `amt` per channel, clamped.
export function shade(hex, amt) {
  if (typeof hex !== 'string' || hex[0] !== '#' || hex.length !== 7) return hex;
  const n = parseInt(hex.slice(1), 16);
  const cl = (v) => Math.max(0, Math.min(255, v));
  const r = cl((n >> 16) + amt), g = cl(((n >> 8) & 255) + amt), b = cl((n & 255) + amt);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Snap to the 2-px pixel grid the world art is drawn on.
export const px2 = (v) => Math.round(v / 2) * 2;
