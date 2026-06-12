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
