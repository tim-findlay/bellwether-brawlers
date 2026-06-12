// Boot + fixed-timestep loop + screen router for Bellwether Battlers.

import { Input } from './engine/input.js';
import { Audio } from './engine/audio.js';
import { FX } from './engine/effects.js';
import { Renderer } from './render/draw.js';
import { loadHeadshots } from './engine/assets.js';
import { ROSTER_IDS } from './data/characters.js';
import { makeTitle } from './screens/title.js';
import { makeMenu } from './screens/menu.js';
import { makeSelect } from './screens/select.js';
import { makeFight } from './screens/fight.js';
import { makeResults } from './screens/results.js';

const DT = 1000 / 60;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function boot() {
  const canvas = document.getElementById('game');
  const bootEl = document.getElementById('boot');
  const bootBar = document.getElementById('bootbar');
  const bootMsg = document.getElementById('bootmsg');

  const input = new Input();
  input.attach(window);
  const audio = new Audio();
  const fx = new FX(audio);
  const renderer = new Renderer(canvas);

  bootMsg.textContent = 'WARMING UP THE PRINTERS…';
  try {
    await Promise.all([
      document.fonts.load("700 64px 'Pixelify Sans'"),
      document.fonts.load("700 18px 'Silkscreen'"),
      document.fonts.load("600 17px 'Barlow Condensed'"),
    ]);
  } catch (e) { /* system fallbacks are fine */ }

  bootMsg.textContent = 'COLLECTING HEADSHOTS…';
  const heads = await loadHeadshots(ROSTER_IDS, (p) => { bootBar.style.width = `${(p * 100) | 0}%`; });

  const G = {
    canvas, input, audio, fx, renderer, heads,
    rng: mulberry32(Date.now() & 0xffffffff),
    settings: loadJSON('bb.settings', { events: true, difficulty: 'normal', sfx: true }),
    scores: loadJSON('bb.scores', {}),
    saveSettings() { saveJSON('bb.settings', G.settings); },
    saveScores() { saveJSON('bb.scores', G.scores); },
    screens: {},
    screen: null,
    go(name, p) {
      input.lockout(20);                    // transition rule: no buffered press leaks through
      G.screen = G.screens[name];
      G.screen.enter(p);
    },
  };
  audio.setEnabled(G.settings.sfx);

  window.__G = G;                         // dev: inspectable from the drive harness
  G.screens.title = makeTitle(G);
  G.screens.menu = makeMenu(G);
  G.screens.select = makeSelect(G);
  G.screens.fight = makeFight(G);
  G.screens.results = makeResults(G);

  bootEl.classList.add('done');

  // dev flags — never active in normal play
  const qp = new URLSearchParams(location.search);
  G.devEvent = qp.get('event') || null;             // ?event=<id> forces an event next roll
  const simN = qp.get('sim');
  if (simN) {
    const { runSim } = await import('./dev/sim.js');
    runSim(parseInt(simN, 10) || 10, G);
    return;
  }

  const gb = qp.get('graybox');                       // null = absent, '' = flat playground
  if (gb !== null && gb !== '') {
    const { makeVersus } = await import('./screens/versus.js');
    G.screens.versus = makeVersus(G);
  } else if (gb !== null) {
    const { makeGraybox } = await import('./dev/graybox.js');
    G.screens.graybox = makeGraybox(G);
  }

  G.go(gb === null ? 'title' : (gb === '' ? 'graybox' : 'versus'), gb ? { stageId: gb } : undefined);

  let last = performance.now();
  let acc = 0;
  function loop(now) {
    const elapsed = Math.min(100, now - last);
    last = now;
    acc += elapsed * fx.timeScale();
    let steps = 0;
    while (acc >= DT && steps < 5) {
      input.beginFrame();
      G.screen.update();
      fx.update();
      acc -= DT;
      steps++;
    }
    G.screen.draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

function loadJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ? { ...fallback, ...v } : { ...fallback };
  } catch (e) { return { ...fallback }; }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ }
}

boot();
