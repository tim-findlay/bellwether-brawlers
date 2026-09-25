// Sprite sheets are keyed out of a magenta background (Higgsfield strips), and
// the key bleeds into the ink outline as a pink fringe unless tools/art/despill.py
// runs. The sheets are PNG-8, so the check needs no decoder: no visible palette
// entry may read as magenta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { SPRITES } from '../src/data/sprites.js';

function palette(buf) {
  let off = 8, plte = null, trns = null;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'PLTE') plte = data;
    if (type === 'tRNS') trns = data;
    off += 12 + len;
  }
  if (!plte) return null;
  const out = [];
  for (let i = 0; i < plte.length / 3; i++) out.push({ r: plte[i * 3], g: plte[i * 3 + 1], b: plte[i * 3 + 2], a: trns && i < trns.length ? trns[i] : 255 });
  return out;
}
// the same measure despill.py uses: how far min(r, b) sits above green
const magenta = (c) => Math.min(c.r, c.b) - c.g;

test('every sprite sheet is PNG-8 with no magenta-tinted visible colours (no key fringe)', () => {
  let sheets = 0;
  for (const id of Object.keys(SPRITES)) {
    const dir = `assets/sprites/${id}`;
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter(n => n.endsWith('.png'))) {
      const pal = palette(readFileSync(`${dir}/${f}`));
      assert.ok(pal, `${id}/${f} is palette PNG`);
      const bad = pal.filter(c => c.a > 0 && magenta(c) > 28);
      assert.deepEqual(bad, [], `${id}/${f}: magenta fringe colours — run tools/art/despill.py`);
      sheets++;
    }
  }
  assert.ok(sheets >= 32, `checked ${sheets} sheets`);
});
