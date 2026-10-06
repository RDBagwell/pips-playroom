# Math Garden level data

Every level lives in [`levels.json`](levels.json). Run `npm test` after
editing: the tests check the file, generate hundreds of questions for every
level, and name any problem in plain words.

| Field | Required | What it does |
|---|---|---|
| `id`, `name`, `focus` | yes | Order, the kid-friendly name, and what it practises (for grown-ups). |
| `skills` | yes | One or more question types (below). A level with several mixes them. |
| `trueFalse` | yes | The share of "Is this right?" (✔ / ✘) questions, 0 to 1. Half of them are true. |
| `choices` | yes | 3 or 4 answers for "pick the answer" questions. |
| `goal` | no | Questions to get right to finish (default 8). |
| `pictures` | no | `always`, `help` (a "Show me" button) or `none` (only after a wrong tap). |
| `object` | no | What to count: `apple`, `shell`, `star`, `flower`, `bee` or `leaf`. |
| `emoji`, `color`, `about` | no | The stepping stone, and a sentence for grown-ups. |

## Skills

| `skill` | Settings | Example |
|---|---|---|
| `count` | `max` (3–20) | How many apples? |
| `add` | `max`, optional `min` (the total) | 4 + 3 = ? |
| `sub` | `max`, optional `min` (the first number) | 7 − 3 = ? |
| `doubles` | `max` (the total) | 5 + 5 = ? |
| `bonds` | `total` | 7 + ? = 10 |
| `tens` | `max` (a multiple of 10, up to 100) | 20 + 30 = ? |
| `times` | `tables` (e.g. `[2, 5, 10]`), optional `upTo` | 5 × 4 = ? |

Wrong answers are chosen to be believable mistakes (one off, the operation
swapped, a times-table neighbour) and always stay between 0 and the level's
biggest answer.
