// Every game in the playroom, in the order they appear on the hub.
// To add a game: make a folder in games/ that exports a game definition
// (see core/registry.js for the shape), then add one registerGame() call here.

import { registerGame } from '../core/registry.js';
import { reading } from './reading/game.js';
import { numberQuest } from './number-quest/game.js';
import { mathGarden } from './math-garden/game.js';
import { typing } from './typing/game.js';

registerGame(reading);
registerGame(numberQuest);
registerGame(mathGarden);
registerGame(typing);
