# Type with Pip level data

Levels live in [`levels.json`](levels.json). Run `npm test` after editing.

| Field | Required | What it does |
|---|---|---|
| `id`, `name` | yes | Order and the kid-friendly name. |
| `kind` | yes | `letters`, `words` or `sentences`. |
| `letters` | for `letters` | The letters to find, e.g. `"asdfjkl"` (the home row). |
| `words` | for `words` | Its own word list (at least 5)... |
| `fromReading` | ...or this | Reading Game level ids whose words to use, e.g. `[2, 3]`. |
| `sentences` | for `sentences` | Short sentences: lowercase letters, `I`, spaces, `.` and `,`. |
| `canHide` | no | `true` lets the grown-ups' "Listen and spell" setting hide the word. |
| `goal` | no | How many to type to finish (default 8). |
| `focus`, `about`, `emoji`, `color` | no | For grown-ups and the map. Word levels that use `fromReading` fill these in. |

## Words from the Reading Game

Levels with `fromReading` use the Reading Game's word lists from
[`../reading/levels.json`](../reading/levels.json) directly, in the Reading
Game's order, so the two games always practise the same words. Change a word
there and Type with Pip follows. The tests check that every Reading Game level
is used once, in order, and that no word list is copied here.
