// Sound pass: the data the synth engine plays must be complete and well-formed
// (a typo'd sound name is silent, not an error, so it has to be caught here).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SFX } from '../src/data/sfx.js';
import { SONGS, INSTRUMENTS, chordNotes, songFor } from '../src/data/music.js';
import { STAGE_IDS_V3 } from '../src/data/stages.js';

const walk = (d) => readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });

test('every sound the code plays has a recipe', () => {
  const names = new Set();
  for (const f of walk('src')) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/audio\??\.play\(\s*'([a-zA-Z]+)'/g)) names.add(m[1]);
    for (const m of src.matchAll(/sound:\s*'([a-zA-Z]+)'/g)) names.add(m[1]);
    for (const m of src.matchAll(/'(hitHeavy|hitLight|lunge|swingHeavy|swingLight|jump|airJump)'/g)) names.add(m[1]);
  }
  const missing = [...names].filter(n => !SFX[n]);
  assert.deepEqual(missing, [], `no recipe for: ${missing.join(', ')}`);
});

test('every recipe layer is a known voice kind with a duration', () => {
  for (const [name, r] of Object.entries(SFX)) {
    assert.ok(r.layers.length > 0, name);
    for (const L of r.layers) {
      assert.ok(['osc', 'noise', 'fm'].includes(L.kind), `${name}: kind ${L.kind}`);
      assert.ok(L.dur > 0 && L.dur <= 1.5, `${name}: dur ${L.dur}`);
      assert.ok((L.vol ?? 0.1) > 0 && (L.vol ?? 0.1) <= 0.6, `${name}: vol ${L.vol}`);
    }
  }
});

test('every stage has a song; songs use real instruments, 16-step bars and spellable chords', () => {
  for (const id of STAGE_IDS_V3) assert.equal(songFor('fight', { stageId: id }), id, `stage ${id} has its own song`);
  assert.equal(songFor('fight', { stageId: 'berlin' }), 'berlin');
  assert.equal(songFor('fight', { stageId: 'pub', p1: 'tim', p2: 'seelye' }), 'boombap', 'Seelye in the match: boom-bap');
  assert.equal(songFor('results'), 'victory');
  assert.equal(songFor('title'), 'menu');
  for (const [id, s] of Object.entries(SONGS)) {
    assert.ok(s.bpm >= 60 && s.bpm <= 160, `${id} bpm`);
    for (const c of s.chords) { const n = chordNotes(c, 4); assert.ok(n.length >= 3 && n.every(Number.isFinite), `${id}: chord ${c}`); }
    for (const tr of s.tracks) {
      assert.ok(INSTRUMENTS[tr.inst], `${id}: instrument ${tr.inst}`);
      for (const p of [].concat(tr.pattern)) assert.match(p, /^[.x c13578-]{16}$/, `${id}/${tr.inst}: pattern "${p}"`);
    }
  }
});

test('chord spelling is in tune', () => {
  const [a, cs, e] = chordNotes('A', 4);
  assert.ok(Math.abs(a - 440) < 1e-6 && Math.abs(cs - 554.365) < 0.01 && Math.abs(e - 659.255) < 0.01);
  const [eb] = chordNotes('Ebmaj7', 3);
  assert.ok(Math.abs(eb - 155.563) < 0.01);
});
