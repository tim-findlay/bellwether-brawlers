// ?tune — live feel panel (dev only, dynamically imported by main.js). Sliders
// write straight into the shared PHYS object, so the next fixed-timestep tick
// plays with the new number; nothing here touches gameplay code. "Copy" gives
// the changed lines ready to paste into src/data/physics.js — numbers that
// ship still go through the BALANCE.md sim gates. ` (backquote) hides it.
// Values persist per browser (localStorage) so a reload keeps your tuning.

import { PHYS } from '../data/physics.js';

const KNOBS = [
  ['Attacks in motion', [
    ['ATTACK_SLIDE', 0.7, 0.99, 0.01, 'slide friction, stick neutral'],
    ['ATTACK_SLIDE_HOLD', 0.7, 0.99, 0.01, 'slide friction, holding forward'],
    ['ATTACK_CARRY_CAP', 0, 2, 0.05, 'entry speed cap (× run)'],
    ['STEP_SCALE', 0, 2, 0.05, 'every step-in × this'],
    ['BODY_GAP', 0, 80, 1, 'step stops this far from them'],
    ['MELEE_H', 48, 110, 2, 'forward hitbox height'],
    ['MELEE_REACH', 0.8, 1.5, 0.05, 'forward hitbox reach (× range)'],
    ['HIT_CANCEL_FRAC', 0, 1, 0.05, 'light on hit: cancel after this much recovery'],
  ]],
  ['Movement', [
    ['RUN_ACCEL', 0.3, 2, 0.05, 'run acceleration'],
    ['RUN_FRICTION', 0.5, 0.95, 0.01, 'ground friction'],
    ['TURN_ACCEL_MULT', 1, 4, 0.1, 'skid-turn bite'],
    ['AIR_ACCEL', 0.2, 1.2, 0.05, 'air control'],
    ['GRAV', 0.4, 1.4, 0.05, 'gravity'],
    ['DASH_SPEED_FACTOR', 1, 3, 0.1, 'dash speed (× run)'],
  ]],
  ['Hits', [
    ['KB_BASE_MULT', 0.4, 1.4, 0.05, 'knockback base'],
    ['KB_SCALE_MULT', 1, 3, 0.1, 'knockback growth with emptiness'],
    ['HITSTUN_PER_KB', 0.8, 2.5, 0.1, 'hitstun per knockback'],
  ]],
];

const KEY = 'bb.tune.v1';
const DEFAULTS = Object.fromEntries(KNOBS.flatMap(([, ks]) => ks.map(([k]) => [k, PHYS[k]])).filter(([, v]) => v !== undefined));

export function mountTune() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { saved = {}; }
  for (const [k, v] of Object.entries(saved)) if (k in DEFAULTS && Number.isFinite(v)) PHYS[k] = v;

  const el = document.createElement('div');
  el.id = 'tune';
  el.innerHTML = `<style>
    #tune{position:fixed;top:8px;right:8px;width:300px;max-height:calc(100vh - 16px);overflow:auto;z-index:50;
      background:#f2e9d8;color:#2b2620;border:3px solid #2b2620;box-shadow:4px 4px 0 #2b2620;font:13px 'Barlow Condensed',sans-serif;padding:8px 10px}
    #tune h3{font:700 14px 'Silkscreen',monospace;margin:8px 0 2px;letter-spacing:.05em}
    #tune h2{font:700 15px 'Silkscreen',monospace;display:flex;justify-content:space-between}
    #tune label{display:grid;grid-template-columns:1fr 54px;gap:0 6px;margin:4px 0}
    #tune label small{grid-column:1/3;color:#6b6152}
    #tune input[type=range]{grid-column:1/2;width:100%;accent-color:#27425f}
    #tune output{text-align:right;font-weight:700}
    #tune output.chg{color:#c4452e}
    #tune button{font:700 12px 'Silkscreen',monospace;background:#2b2620;color:#f2e9d8;border:0;padding:5px 8px;margin:8px 6px 0 0;cursor:pointer}
    #tune textarea{width:100%;height:84px;margin-top:6px;font:12px monospace;background:#fffaf0;border:2px solid #2b2620}
  </style><h2><span>TUNE</span><span style="font-size:11px">\` hides</span></h2>`;
  const outs = {};
  for (const [group, knobs] of KNOBS) {
    const h = document.createElement('h3'); h.textContent = group; el.appendChild(h);
    for (const [k, min, max, step, hint] of knobs) {
      if (!(k in DEFAULTS)) continue;
      const lab = document.createElement('label');
      lab.innerHTML = `<span>${k}</span><output></output><input type="range" min="${min}" max="${max}" step="${step}"><small>${hint} · default ${DEFAULTS[k]}</small>`;
      const inp = lab.querySelector('input'), out = lab.querySelector('output');
      inp.value = PHYS[k];
      const show = () => { out.textContent = String(PHYS[k]); out.classList.toggle('chg', PHYS[k] !== DEFAULTS[k]); };
      inp.addEventListener('input', () => { PHYS[k] = Number(inp.value); show(); save(); });
      inp.addEventListener('change', () => inp.blur());          // hand the arrow keys back to P2
      outs[k] = { inp, show };
      show();
      el.appendChild(lab);
    }
  }
  const ta = document.createElement('textarea'); ta.readOnly = true;
  const copy = document.createElement('button'); copy.textContent = 'COPY CHANGES';
  const reset = document.createElement('button'); reset.textContent = 'RESET';
  const changed = () => Object.keys(DEFAULTS).filter(k => PHYS[k] !== DEFAULTS[k]).map(k => `  ${k}: ${PHYS[k]},`).join('\n') || '// no changes';
  copy.onclick = () => { ta.value = changed(); ta.select(); navigator.clipboard?.writeText(ta.value).catch(() => {}); copy.blur(); };
  reset.onclick = () => { for (const k of Object.keys(DEFAULTS)) { PHYS[k] = DEFAULTS[k]; outs[k].inp.value = DEFAULTS[k]; outs[k].show(); } save(); ta.value = ''; reset.blur(); };
  el.append(copy, reset, ta);
  document.body.appendChild(el);
  addEventListener('keydown', (e) => { if (e.code === 'Backquote') el.style.display = el.style.display === 'none' ? '' : 'none'; });

  function save() {
    const diff = Object.fromEntries(Object.keys(DEFAULTS).filter(k => PHYS[k] !== DEFAULTS[k]).map(k => [k, PHYS[k]]));
    try { localStorage.setItem(KEY, JSON.stringify(diff)); } catch { /* private window: tuning just won't persist */ }
  }
}
