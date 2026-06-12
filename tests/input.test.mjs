import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Input, P1MAP, P2MAP } from '../src/engine/input.js';

// drive key events without a DOM
const press = (inp, code) => { if (!inp.held[code]) inp.pending.add(code); inp.held[code] = true; };
const release = (inp, code) => { inp.held[code] = false; };

test('both maps bind dodge (V and Slash per DESIGN.md controls)', () => {
  assert.equal(P1MAP.dodge, 'KeyV');
  assert.equal(P2MAP.dodge, 'Slash');
});

test('doubleTapped fires on two presses inside the window, not on one, not on slow taps', () => {
  const inp = new Input();
  press(inp, 'KeyD'); inp.beginFrame();
  assert.equal(inp.doubleTapped('KeyD', 12), false);        // first tap
  release(inp, 'KeyD');
  for (let i = 0; i < 5; i++) inp.beginFrame();             // 5 frames later
  press(inp, 'KeyD'); inp.beginFrame();
  assert.equal(inp.doubleTapped('KeyD', 12), true);         // second tap inside window
  release(inp, 'KeyD');
  for (let i = 0; i < 20; i++) inp.beginFrame();            // way past the window
  press(inp, 'KeyD'); inp.beginFrame();
  assert.equal(inp.doubleTapped('KeyD', 12), false);
});

test('lockout clears double-tap history', () => {
  const inp = new Input();
  press(inp, 'KeyD'); inp.beginFrame(); release(inp, 'KeyD');
  inp.lockout(20);
  for (let i = 0; i < 21; i++) inp.beginFrame();
  press(inp, 'KeyD'); inp.beginFrame();
  assert.equal(inp.doubleTapped('KeyD', 30), false);
});
