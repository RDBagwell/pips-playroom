// The games in the playroom, in hub order, and their level data, for tests
// that load the whole app. One place to update when a game is added.
import { readFileSync } from 'node:fs';

export const GAME_IDS = ['reading', 'number-quest', 'math-garden'];

export const DATA = Object.fromEntries(GAME_IDS.map((id) => [
  `./data/${id}/levels.json`,
  JSON.parse(readFileSync(`${process.cwd()}/data/${id}/levels.json`, 'utf8')),
]));

export const DATA_URLS = Object.keys(DATA);

/** A fetch that serves only the playroom's own level data, and logs every request. */
export function fakeFetch(requests = []) {
  return async (url) => {
    requests.push(String(url));
    return { ok: url in DATA, status: url in DATA ? 200 : 404, json: async () => DATA[url] };
  };
}
