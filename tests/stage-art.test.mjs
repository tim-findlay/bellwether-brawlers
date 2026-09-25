// Stage-art drop-ins: the far backdrop (<id>.png) and the arena piece
// (<id>-slab.png) both load by manifest and fall back cleanly when missing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadStageArt } from '../src/engine/assets.js';
import { drawStageWorld } from '../src/render/stage.js';
import { stageById, geometryOf, STAGE_IDS_V3 } from '../src/data/stages.js';

// Minimal Image stub: files in `present` load, everything else errors.
function stubImages(present) {
  const requested = [];
  globalThis.Image = class {
    constructor() { this.width = 512; this.height = 130; }
    set src(v) {
      this._src = v; requested.push(v);
      queueMicrotask(() => (present.has(v) ? this.onload?.() : this.onerror?.()));
    }
    get src() { return this._src; }
  };
  return requested;
}

// A canvas context that accepts every call and records drawImage sources.
function recordingCtx() {
  const drawn = [];
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k === 'drawImage') return (img) => drawn.push(img);
      if (k in t) return t[k];
      return () => ({ addColorStop() {} });
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  return { ctx, drawn };
}

test('loadStageArt keys the arena piece as <id>-slab and requests both files', async () => {
  const requested = stubImages(new Set(['assets/stages/office.png', 'assets/stages/office-slab.png']));
  const art = await loadStageArt(['office', 'pub']);
  assert.ok(requested.includes('assets/stages/office-slab.png'));
  assert.ok(requested.includes('assets/stages/pub-slab.png'));
  assert.ok(art.get('office'), 'office backdrop loaded');
  assert.ok(art.get('office-slab'), 'office arena piece loaded');
  assert.ok(art.has('pub-slab'), 'missing piece still has a key');
  assert.equal(art.get('pub-slab'), null, 'missing piece falls back to null');
});

test('every v3 stage draws with and without an arena piece, without throwing', () => {
  const backdrop = { width: 480, height: 270 }, piece = { width: 512, height: 130 };
  for (const id of STAGE_IDS_V3) {
    const stage = stageById(id), geo = geometryOf(id);
    const withArt = recordingCtx();
    drawStageWorld(withArt.ctx, stage, geo, null, 0, { art: backdrop, slabArt: piece });
    assert.ok(withArt.drawn.includes(piece), `${id}: arena piece drawn`);
    const without = recordingCtx();
    drawStageWorld(without.ctx, stage, geo, null, 0, { art: backdrop, slabArt: null });
    assert.ok(!without.drawn.includes(piece), `${id}: procedural slab used when the piece is missing`);
  }
});
