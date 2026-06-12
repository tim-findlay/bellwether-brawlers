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
