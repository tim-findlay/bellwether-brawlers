import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, STAGE_IDS_V3, geometryOf } from '../src/data/stages.js';

const G = STAGE_IDS_V3.map(id => [id, geometryOf(id)]);

test('all four v3 stages expose geometry', () => {
  assert.deepEqual(STAGE_IDS_V3, ['office', 'palace', 'pub', 'berlin']);
  for (const [id, g] of G) {
    assert.ok(g, `${id} has geometry`);
    for (const k of ['slabs', 'platforms', 'spawns', 'respawn', 'cameraBounds', 'blast'])
      assert.ok(g[k], `${id}.${k}`);
  }
});

test('spawns stand on a slab top, inside the blast rect', () => {
  for (const [id, g] of G) {
    assert.equal(g.spawns.length, 2, `${id} has two spawns`);
    for (const s of g.spawns) {
      const on = g.slabs.some(sl => s.y === sl.y && s.x > sl.x && s.x < sl.x + sl.w);
      assert.ok(on, `${id} spawn (${s.x},${s.y}) on a slab top`);
      assert.ok(s.x > g.blast.left && s.x < g.blast.right, `${id} spawn inside blast x`);
    }
  }
});

test('platform counts match the approved layouts', () => {
  const counts = { office: 3, palace: 2, pub: 3, berlin: 1 };
  for (const [id, g] of G) assert.equal(g.platforms.length, counts[id], id);
});

test('every platform is reachable under the frozen jump arcs', () => {
  // a surface within 190px below (jump -> double-jump) must exist under each platform
  for (const [id, g] of G) for (const p of g.platforms) {
    const supports = [...g.slabs.map(s => ({ x: s.x, w: s.w, y: s.y })), ...g.platforms]
      .filter(s => s !== p && s.y > p.y && s.y - p.y <= 190 &&
                   s.x < p.x + p.w && s.x + s.w > p.x);
    assert.ok(supports.length > 0, `${id} platform at (${p.x},${p.y}) reachable`);
  }
});

test('geometry nests: surfaces inside blast inside cameraBounds', () => {
  for (const [id, g] of G) {
    const b = g.blast, cb = g.cameraBounds;
    for (const s of [...g.slabs, ...g.platforms.map(p => ({ ...p, h: 0 }))]) {
      assert.ok(s.x > b.left && s.x + s.w < b.right, `${id} surface inside blast x`);
      assert.ok(s.y > b.top && s.y + (s.h ?? 0) < b.bottom, `${id} surface inside blast y`);
    }
    assert.ok(b.left >= cb.x + 20 && b.right <= cb.x + cb.w - 20, `${id} blast x inside camera bounds`);
    assert.ok(b.top >= cb.y + 20 && b.bottom <= cb.y + cb.h - 20, `${id} blast y inside camera bounds`);
  }
});

test('respawn point hovers over a slab, above its top', () => {
  for (const [id, g] of G) {
    const over = g.slabs.some(sl => g.respawn.x > sl.x && g.respawn.x < sl.x + sl.w && g.respawn.y < sl.y);
    assert.ok(over, `${id} respawn over a slab`);
  }
});

test('berlin stays event-only; the other three are selectable', () => {
  for (const st of STAGES) {
    if (st.id === 'berlin') assert.equal(st.selectable, false);
    if (['office', 'palace', 'pub'].includes(st.id)) assert.equal(st.selectable, true);
  }
});
