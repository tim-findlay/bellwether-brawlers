// Keyboard input keyed by PHYSICAL position (KeyboardEvent.code) so layouts
// like QWERTZ/AZERTY keep working. Logic-frame edge detection + press buffer.

import { PHYS } from '../data/physics.js';

export const P1MAP = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', light: 'KeyF', heavy: 'KeyG', s1: 'KeyH', s2: 'KeyJ', super: 'Space', dodge: 'KeyV' };
export const P2MAP = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', light: 'KeyK', heavy: 'KeyL', s1: 'Semicolon', s2: 'Quote', super: 'Enter', dodge: 'Slash' };

export const CONFIRM_CODES = ['KeyF', 'KeyK', 'Enter'];
export const BACK_CODE = 'Escape';

const PREVENT = new Set([...Object.values(P1MAP), ...Object.values(P2MAP), 'Escape']);

export const BUFFER_FRAMES = PHYS.INPUT_BUFFER;

export class Input {
  constructor() {
    this.held = {};
    this.pending = new Set();
    this.pressedNow = new Set();
    this.pressFrame = {};
    this.prevPressFrame = {};
    this.consumed = {};
    this.frame = 0;
    this.lock = 0;              // screen-transition lockout frames
  }

  attach(target = window) {
    this.pads = new GamepadInput(this);
    target.addEventListener('keydown', (e) => {
      if (PREVENT.has(e.code)) e.preventDefault();
      if (!this.held[e.code]) this.pending.add(e.code);
      this.held[e.code] = true;
    });
    target.addEventListener('keyup', (e) => { this.held[e.code] = false; });
    target.addEventListener('blur', () => { this.held = {}; });
  }

  // Call exactly once per logic tick before reading input.
  beginFrame() {
    this.frame++;
    this.pads?.poll();
    if (this.lock > 0) {
      this.lock--;
      this.pending.clear();
      this.pressedNow = new Set();
      return;
    }
    this.pressedNow = this.pending;
    this.pending = new Set();
    for (const k of this.pressedNow) { this.prevPressFrame[k] = this.pressFrame[k]; this.pressFrame[k] = this.frame; }
  }

  // Screen transitions: drop everything pending and ignore input briefly so a
  // buffered super press can never confirm a menu or skip the results screen.
  lockout(frames = 20) {
    this.lock = frames;
    this.pending.clear();
    this.pressedNow = new Set();
    this.pressFrame = {};
    this.prevPressFrame = {};
    this.consumed = {};
  }

  keyHeld(code) { return !!this.held[code]; }
  keyPressed(code) { return this.pressedNow.has(code); }
  confirmPressed() { return CONFIRM_CODES.some(c => this.keyPressed(c)); }
  backPressed() { return this.keyPressed(BACK_CODE); }

  buffered(code, win = BUFFER_FRAMES) {
    const pf = this.pressFrame[code];
    if (pf === undefined) return false;
    if (this.frame - pf > win) return false;
    return this.consumed[code] !== pf;
  }

  consume(code) {
    const pf = this.pressFrame[code];
    if (pf !== undefined) this.consumed[code] = pf;
  }

  doubleTapped(code, win = 12) {
    if (!this.pressedNow.has(code)) return false;
    const prev = this.prevPressFrame[code];
    return prev !== undefined && this.frame - prev <= win;
  }
}

// A player's view over Input + a key map. `reversed` flips left/right
// (Tim's Prompt Injection) — block/jump/buttons are unaffected.
export class PlayerController {
  constructor(input, map) {
    this.input = input;
    this.map = map;
    this.reversed = false;
    this.isCPU = false;
  }
  held(action) {
    let a = action;
    if (this.reversed && (a === 'left' || a === 'right')) a = a === 'left' ? 'right' : 'left';
    return this.input.keyHeld(this.map[a]);
  }
  buffered(action) { return this.input.buffered(this.map[action]); }
  consume(action) { this.input.consume(this.map[action]); }
  pressed(action) { return this.input.keyPressed(this.map[action]); }
  update() {}
  // v3: one MovementBody intent per logic tick (see buildIntent below).
  intent() { return buildIntent(this, this.input, this.map); }
}

// NOTE: `ctl.reversed` swaps held left/right but NOT the dash double-taps
// below (raw key codes). Whether a reversed player's dash should reverse is
// an open Phase-3 combat decision — Tim's call. Do not "fix" silently.
// Adapter: one MovementBody intent per logic tick from a PlayerController.
// Promoted from the Phase-1 graybox; the versus/fight screens share it.
export function buildIntent(ctl, input, map) {
  return {
    left: ctl.held('left'), right: ctl.held('right'), down: ctl.held('down'),
    downTapped: ctl.pressed('down'),
    jump: input.buffered(map.up, PHYS.INPUT_BUFFER),
    dodge: input.buffered(map.dodge, PHYS.INPUT_BUFFER),
    dashLeft: input.doubleTapped(map.left, PHYS.DASH_TAP_WINDOW),
    dashRight: input.doubleTapped(map.right, PHYS.DASH_TAP_WINDOW),
  };
}

// ---- gamepads ---------------------------------------------------------------------
// Standard-mapping pads (Xbox / PlayStation / most USB pads) drive the SAME key
// codes as the keyboard: pad 0 presses P1's keys, pad 1 presses P2's keys, so
// menus, the fight and the dev harnesses need no other changes. Polled once
// per logic tick (Gamepad API is state-based, not event-based).
//   stick / d-pad -> left right up down · A/Cross jump · X/Square light ·
//   B/Circle heavy · RB special 1 · LB special 2 · Y/Triangle super ·
//   RT/LT dodge · Start = Enter (confirm / pause) · Back/Select = Escape
export const PAD_BUTTONS = { jump: 0, heavy: 1, light: 2, super: 3, s2: 4, s1: 5, dodgeL: 6, dodgeR: 7, back: 8, start: 9, up: 12, down: 13, left: 14, right: 15 };
const PAD_MAPS = [P1MAP, P2MAP];
const DEAD = 0.5;

export class GamepadInput {
  constructor(input) { this.input = input; this.prev = [new Set(), new Set()]; }
  // Which virtual key codes a pad holds right now (its player's map).
  static codesFor(pad, map) {
    const on = new Set();
    const B = pad.buttons || [], A = pad.axes || [];
    const pressed = (i) => !!B[i] && (B[i].pressed || B[i].value > DEAD);
    const ax = A[0] ?? 0, ay = A[1] ?? 0;
    if (pressed(PAD_BUTTONS.left) || ax < -DEAD) on.add(map.left);
    if (pressed(PAD_BUTTONS.right) || ax > DEAD) on.add(map.right);
    if (pressed(PAD_BUTTONS.down) || ay > DEAD) on.add(map.down);
    if (pressed(PAD_BUTTONS.up) || ay < -DEAD || pressed(PAD_BUTTONS.jump)) on.add(map.up);
    if (pressed(PAD_BUTTONS.light)) on.add(map.light);
    if (pressed(PAD_BUTTONS.heavy)) on.add(map.heavy);
    if (pressed(PAD_BUTTONS.s1)) on.add(map.s1);
    if (pressed(PAD_BUTTONS.s2)) on.add(map.s2);
    if (pressed(PAD_BUTTONS.super)) on.add(map.super);
    if (pressed(PAD_BUTTONS.dodgeL) || pressed(PAD_BUTTONS.dodgeR)) on.add(map.dodge);
    if (pressed(PAD_BUTTONS.start)) on.add('Enter');
    if (pressed(PAD_BUTTONS.back)) on.add('Escape');
    return on;
  }
  poll() {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : null;
    if (!pads) return;
    let seat = 0;
    for (const pad of pads) {
      if (!pad || !pad.connected || seat > 1) continue;
      const now = GamepadInput.codesFor(pad, PAD_MAPS[seat]), was = this.prev[seat];
      for (const code of now) if (!was.has(code)) this.input.pending.add(code);   // key-down edge
      for (const code of now) this.input.held[code] = true;
      for (const code of was) if (!now.has(code)) this.input.held[code] = false;  // key-up
      this.prev[seat] = now;
      seat++;
    }
  }
}
