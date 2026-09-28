import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GamepadInput, P1MAP, P2MAP, PAD_BUTTONS, Input, PlayerController, CONFIRM_CODES } from '../src/engine/input.js';

const pad = (buttons = {}, axes = [0, 0]) => ({
  connected: true, axes,
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: !!buttons[i], value: buttons[i] ? 1 : 0 })),
});

test('Brawlhalla layout: the stick presses the direction keys, the buttons press the seat\'s pad codes', () => {
  const on = GamepadInput.codesFor(pad({ [PAD_BUTTONS.jump]: 1, [PAD_BUTTONS.light]: 1, [PAD_BUTTONS.s1]: 1, [PAD_BUTTONS.dodgeR]: 1, [PAD_BUTTONS.start]: 1 }, [0.9, 0]), P1MAP);
  assert.deepEqual([...on].sort(), [P1MAP.right, P1MAP.pad.up, P1MAP.pad.light, P1MAP.pad.s1, P1MAP.pad.dodge, P1MAP.start].sort());
  assert.ok(GamepadInput.codesFor(pad({}, [0, -0.9]), P1MAP).has(P1MAP.up), 'stick up still jumps (and navigates up)');
});

test('menus: ✕ selects (without moving the cursor), ○ backs out; in a fight ○ is heavy and never pauses', () => {
  const inp = new Input();
  const press = (code) => { inp.pending.add(code); inp.held[code] = true; inp.beginFrame(); };
  press('Pad1Cross');
  assert.ok(inp.confirmPressed() && CONFIRM_CODES.includes('Pad1Cross'));
  assert.ok(!inp.keyPressed(P1MAP.up), '✕ is not "up" — the menu cursor stays put');
  inp.held = {}; press('Pad2Circle');
  assert.ok(inp.backPressed(), '○ backs out of menus');
  assert.ok(!inp.pausePressed(), '○ never pauses a fight');
  const ctl = new PlayerController(inp, P2MAP);
  assert.ok(ctl.held('heavy') && ctl.buffered('heavy'), 'P2 reads ○ as heavy');
  inp.held = {}; press('Pad1Cross');
  assert.ok(new PlayerController(inp, P1MAP).intent().jump, 'P1 reads ✕ as jump');
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
  g.poll(); assert.ok(input.pending.has(P1MAP.pad.light)); assert.equal(input.held[P1MAP.pad.light], true);
  input.pending.clear(); g.poll(); assert.equal(input.pending.size, 0, 'no repeat edge while held');
  pads[0] = pad({}); g.poll(); assert.equal(input.held[P1MAP.pad.light], false);
  Object.defineProperty(globalThis, 'navigator', { value: undefined, configurable: true, writable: true });
});

test("regression: a pad's Start never presses a fighter key (pad 0 Start used to send Enter = P2's super)", async () => {
  const { P2MAP, CONFIRM_CODES } = await import('../src/engine/input.js');
  const fighterKeys = new Set([...Object.entries(P1MAP), ...Object.entries(P2MAP)].filter(([a]) => a !== 'start').map(([, c]) => c));
  const on0 = GamepadInput.codesFor(pad({ [PAD_BUTTONS.start]: 1 }), P1MAP);
  const on1 = GamepadInput.codesFor(pad({ [PAD_BUTTONS.start]: 1 }), P2MAP);
  for (const c of [...on0, ...on1]) assert.ok(!fighterKeys.has(c), `Start sends ${c}, a fighter key`);
  assert.equal(on0.size, 1); assert.equal(on1.size, 1);
  assert.notDeepEqual([...on0], [...on1], 'each seat has its own Start');
  for (const c of [...on0, ...on1]) assert.ok(CONFIRM_CODES.includes(c), 'Start still confirms menus');
});
