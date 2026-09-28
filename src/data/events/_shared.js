// Shared bits for the stage events (src/data/events.js and src/data/events/*):
// palette, geometry helpers and the art lookup. Pure; no engine imports.

export const PAPER = '#f2e9d8', INK = '#2b2620', BRICK = '#c4452e', NAVY = '#27425f', BRASS = '#c9a227', GREEN = '#3f5a40';

export const onSlab = (f, slab) => f.state === 'normal' && f.grounded && Math.abs(f.y - slab.y) < 3 && f.x >= slab.x && f.x <= slab.x + slab.w;
export const bothOnSlab = ({ world, slab }) => world.fighters.every(f => onSlab(f, slab));
export const midX = (slab) => slab.x + slab.w / 2;
export const standingOn = (f, s) => f.grounded && !f.chair && Math.abs(f.y - s.y) < 4 && f.x >= s.x - 6 && f.x <= s.x + s.w + 6;
export const art = (ctx, name) => ctx.director?.art?.get?.(name) ?? null;
// the highest platform near the middle of the stage (the natural "high ground"), else the slab
export function centrePerch(stage, slab) {
  const mid = midX(slab);
  const near = stage.platforms.filter(p => Math.abs(p.x + p.w / 2 - mid) < slab.w * 0.2);
  return near.sort((a, b) => a.y - b.y)[0] || slab;
}
export function room(data, i, slab) {
  const s = data.rooms[i];
  data.s = s; data.w = Math.min(s.w, 170); data.x = s === slab ? midX(slab) : s.x + s.w / 2;
}
export const pips = (c, x, y, n, of, col) => { for (let i = 0; i < of; i++) { c.fillStyle = INK; c.fillRect(x + i * 18 - 1, y - 1, 14, 14); c.fillStyle = i < n ? col : PAPER; c.fillRect(x + i * 18, y, 12, 12); } };
