// The roster. One fighter per file; adding a fighter = a new file + an import
// here (+ optional assets/headshots/<id>.png and assets/sprites/<id>/*.png).
import { expandKit } from './_shared.js';
import ben from './ben.js';
import tim from './tim.js';
import adrian from './adrian.js';
import richy from './richy.js';
import nick from './nick.js';
import abi from './abi.js';
import mike from './mike.js';
import seelye from './seelye.js';

export const CHARACTERS = [ben, tim, adrian, richy, nick, abi, mike, seelye].map(expandKit);
export const ROSTER_IDS = CHARACTERS.map(c => c.id);
export const byId = (id) => CHARACTERS.find(c => c.id === id);
