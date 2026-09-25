import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GamepadInput, P1MAP, PAD_BUTTONS } from '../src/engine/input.js';

const pad = (buttons = {}, axes = [0, 0]) => ({
  connected: true, axes,
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: !!buttons[i], value: buttons[i] ? 1 : 0 })),
});

test('standard mapping: stick, face buttons, bumpers, triggers and start map onto P1 key codes', () => {
  const on = GamepadInput.codesFor(pad({ [PAD_BUTTONS.jump]: 1, [PAD_BUTTONS.light]: 1, [PAD_BUTTONS.s1]: 1, [PAD_BUTTONS.dodgeR]: 1, [PAD_BUTTONS.start]: 1 }, [0.9, 0]), P1MAP);
  assert.deepEqual([...on].sort(), [P1MAP.right, P1MAP.up, P1MAP.light, P1MAP.s1, P1MAP.dodge, 'Enter'].sort());
});

test('dead zone: a resting stick presses nothing; the d-pad works without the stick', () => {
  assert.equal(GamepadInput.codesFor(pad({}, [0.2, -0.3]), P1MAP).size, 0);
  const on = GamepadInput.codesFor(pad({ [PAD_BUTTONS.down]: 1, [PAD_BUTTONS.left]: 1 }), P1MAP);
  assert.deepEqual([...on].sort(), [P1MAP.down, P1MAP.left].sort());
});

test('poll: key-down edges land in pending once, holds persist, releases clear held', () => {
  const input = { pending: new Set(), held: {} };
  const g = new GamepadInput(input);
  const pads = [pad({ [PAD_BUTTONS.light]: 1 })];
  Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true, writable: true });
  g.poll(); assert.ok(input.pending.has(P1MAP.light)); assert.equal(input.held[P1MAP.light], true);
  input.pending.clear(); g.poll(); assert.equal(input.pending.size, 0, 'no repeat edge while held');
  pads[0] = pad({}); g.poll(); assert.equal(input.held[P1MAP.light], false);
  Object.defineProperty(globalThis, 'navigator', { value: undefined, configurable: true, writable: true });
});
