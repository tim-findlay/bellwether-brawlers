import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Camera } from '../src/engine/camera.js';

export const BOUNDS = { x: 0, y: 0, w: 1920, h: 1080 };
export const cam = (opts = {}) => new Camera(960, 540, BOUNDS, opts);

test('a single target frames at max zoom, centered on it', () => {
  const c = cam();
  const t = c.target([{ x: 700, y: 500 }]);
  assert.equal(t.x, 700);
  assert.equal(t.y, 500);
  assert.equal(t.zoom, c.maxZoom);
});

test('two distant targets zoom out to fit both plus padding', () => {
  const c = cam({ pad: 150 });
  const t = c.target([{ x: 200, y: 500 }, { x: 1400, y: 500 }]);
  assert.equal(t.x, 800);
  // needed width = 1200 + 2*150 = 1500 -> zoom = 960/1500 = 0.64
  assert.ok(Math.abs(t.zoom - 960 / 1500) < 1e-9);
});

test('zoom never drops below minZoom (bounds-fit) or above maxZoom', () => {
  const c = cam();
  const far = c.target([{ x: 0, y: 0 }, { x: 1920, y: 1080 }]);
  assert.equal(far.zoom, c.minZoom);
  const near = c.target([{ x: 960, y: 540 }, { x: 961, y: 541 }]);
  assert.equal(near.zoom, c.maxZoom);
});

test('minZoom defaults to exactly bounds-fit', () => {
  const c = cam();
  // 960/1920 = 0.5, 540/1080 = 0.5 -> minZoom 0.5
  assert.equal(c.minZoom, 0.5);
});

test('update eases toward the target and converges', () => {
  const c = cam();
  const pts = [{ x: 700, y: 400 }];
  c.update(pts);
  assert.notEqual(c.x, 700);                              // one step is partial
  for (let i = 0; i < 300; i++) c.update(pts);
  assert.ok(Math.abs(c.x - 700) < 1);                     // converged
  assert.ok(Math.abs(c.zoom - c.maxZoom) < 0.01);
});

test('the view never shows outside cameraBounds', () => {
  const c = cam();
  for (let i = 0; i < 300; i++) c.update([{ x: 10, y: 10 }]);   // corner target
  const halfW = c.viewW / 2 / c.zoom, halfH = c.viewH / 2 / c.zoom;
  assert.ok(c.x - halfW >= BOUNDS.x - 1e-9, 'left edge clamped');
  assert.ok(c.y - halfH >= BOUNDS.y - 1e-9, 'top edge clamped');
});

test('worldToScreen round-trips with the current transform', () => {
  const c = cam();
  for (let i = 0; i < 50; i++) c.update([{ x: 600, y: 700 }]);
  const s = c.worldToScreen(600, 700);
  assert.ok(s.x >= 0 && s.x <= 960 && s.y >= 0 && s.y <= 540, 'target on screen');
  const w = c.screenToWorld(s.x, s.y);
  assert.ok(Math.abs(w.x - 600) < 1e-6 && Math.abs(w.y - 700) < 1e-6);
});

test('apply sets the canvas transform with shake composed as an offset', () => {
  const c = cam();
  const calls = [];
  const ctx = { setTransform: (...a) => calls.push(a) };
  c.apply(ctx, 7, -3);
  const [zx, , , zy, tx, ty] = calls[0];
  assert.equal(zx, c.zoom); assert.equal(zy, c.zoom);
  assert.equal(tx, c.viewW / 2 - c.x * c.zoom + 7);
  assert.equal(ty, c.viewH / 2 - c.y * c.zoom - 3);
});

test('an empty target list leaves the camera where it is (no NaN poisoning)', () => {
  const c = cam();
  for (let i = 0; i < 30; i++) c.update([{ x: 700, y: 400 }]);
  const { x, y, zoom } = c;
  c.update([]);
  assert.ok(Number.isFinite(c.x) && Number.isFinite(c.y));
  assert.equal(c.x, x); assert.equal(c.y, y); assert.equal(c.zoom, zoom);
});
