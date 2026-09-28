// Keyboard input keyed by PHYSICAL position (KeyboardEvent.code) so layouts
// like QWERTZ/AZERTY keep working. Logic-frame edge detection + press buffer.

import { PHYS } from '../data/physics.js';

export const P1MAP = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', light: 'KeyF', heavy: 'KeyG', s1: 'KeyH', s2: 'KeyJ', super: 'Space', dodge: 'KeyV', start: 'Pad1Start',
  pad: { up: 'Pad1Cross', aimUp: 'Pad1Up', light: 'Pad1Square', heavy: 'Pad1Circle', s1: 'Pad1R1', s2: 'Pad1L1', super: 'Pad1Triangle', dodge: 'Pad1Dodge' } };
export const P2MAP = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', light: 'KeyK', heavy: 'KeyL', s1: 'Semicolon', s2: 'Quote', super: 'Enter', dodge: 'Slash', start: 'Pad2Start',
  pad: { up: 'Pad2Cross', aimUp: 'Pad2Up', light: 'Pad2Square', heavy: 'Pad2Circle', s1: 'Pad2R1', s2: 'Pad2L1', super: 'Pad2Triangle', dodge: 'Pad2Dodge' } };

// Menus: Enter / F / K, a pad's ✕ (Cross — Brawlhalla's select) or Start. Back: Esc, a pad's ○ (Circle) or Create.
export const CONFIRM_CODES = ['KeyF', 'KeyK', 'Enter', 'Pad1Start', 'Pad2Start', 'Pad1Cross', 'Pad2Cross'];
export const PAD_BACK_CODES = ['Pad1Circle', 'Pad2Circle'];
export const START_CODES = ['Pad1Start', 'Pad2Start'];   // virtual: a pad's Start (confirm / pause) — never a fighter key
export const BACK_CODE = 'Escape';

const PREVENT = new Set([...Object.values(P1MAP), ...Object.values(P2MAP), 'Escape'].filter(v => typeof v === 'string'));

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
  backPressed() { return this.keyPressed(BACK_CODE) || PAD_BACK_CODES.some(c => this.keyPressed(c)); }   // menus (○ backs out)
  pausePressed() { return this.keyPressed(BACK_CODE) || this.startPressed(); }   // in a fight: Esc, Create or Start — never ○, that's heavy
  startPressed() { return START_CODES.some(c => this.keyPressed(c)); }
  anyPressed() { return this.pressedNow.size > 0; }   // any key or pad button this tick (attract mode)

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
// (the `reversed` status — unused by the roster since the 2026-09 kit rethink) —
// block/jump/buttons are unaffected.
export class PlayerController {
  constructor(input, map) {
    this.input = input;
    this.map = map;
    this.reversed = false;
    this.isCPU = false;
  }
  // an action's codes: its key, plus its pad button (map.pad) when it has one.
  // 'up' splits on a pad (Brawlhalla): ✕ jumps (presses), the stick's up aims (holds).
  codes(action) { const p = this.map.pad?.[action]; return p ? [this.map[action], p] : [this.map[action]]; }
  held(action) {
    let a = action;
    if (this.reversed && (a === 'left' || a === 'right')) a = a === 'left' ? 'right' : 'left';
    const cs = a === 'up' ? [this.map.up, this.map.pad?.aimUp].filter(Boolean) : this.codes(a);
    return cs.some(c => this.input.keyHeld(c));
  }
  buffered(action, win) { return this.codes(action).some(c => this.input.buffered(c, win)); }
  consume(action) { for (const c of this.codes(action)) this.input.consume(c); }
  pressed(action) { return this.codes(action).some(c => this.input.keyPressed(c)); }
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
    jump: ctl.buffered ? ctl.buffered('up', PHYS.INPUT_BUFFER) : input.buffered(map.up, PHYS.INPUT_BUFFER),
    dodge: ctl.buffered ? ctl.buffered('dodge', PHYS.INPUT_BUFFER) : input.buffered(map.dodge, PHYS.INPUT_BUFFER),
    dashLeft: input.doubleTapped(map.left, PHYS.DASH_TAP_WINDOW),
    dashRight: input.doubleTapped(map.right, PHYS.DASH_TAP_WINDOW),
  };
}

// ---- gamepads ---------------------------------------------------------------------
// Standard-mapping pads (PlayStation / Xbox / most USB pads), Brawlhalla's default
// layout. The stick / d-pad press the player's direction KEYS (so menus navigate
// and up still jumps, as in Brawlhalla); the buttons press per-seat pad codes
// (map.pad) that PlayerController reads alongside the keys — so ✕ can be jump in
// a fight and select in a menu, and ○ heavy in a fight and back in a menu.
//   ✕ Cross jump / select · □ Square light · ○ Circle heavy / back · △ Triangle super
//   R1 special 1 · L1 special 2 · L2 / R2 dodge (+ direction on the ground = dash)
//   Options (Start) confirm / pause · Create (Back) = Esc
// Pad 0 is P1, pad 1 P2. Polled once per logic tick (the Gamepad API is state-based).
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
    const P = map.pad || map;
    if (pressed(PAD_BUTTONS.up) || ay < -DEAD) on.add(P.aimUp || map.up);      // stick / d-pad up: aims (and menu up) — never jumps; ✕ does
    if (pressed(PAD_BUTTONS.jump)) on.add(P.up);
    if (pressed(PAD_BUTTONS.light)) on.add(P.light);
    if (pressed(PAD_BUTTONS.heavy)) on.add(P.heavy);
    if (pressed(PAD_BUTTONS.s1)) on.add(P.s1);
    if (pressed(PAD_BUTTONS.s2)) on.add(P.s2);
    if (pressed(PAD_BUTTONS.super)) on.add(P.super);
    if (pressed(PAD_BUTTONS.dodgeL) || pressed(PAD_BUTTONS.dodgeR)) on.add(P.dodge);
    if (pressed(PAD_BUTTONS.start)) on.add(map.start);
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
