# Number Quest level data

All of Number Quest's levels live in [`levels.json`](levels.json). Run
`npm test` after editing: the tests check the file and name any problem in
plain words.

```json
{
  "version": 1,
  "levels": [
    {
      "id": 1,
      "name": "Ladybug Meadow",
      "emoji": "🐞",
      "color": "#FF7A6B",
      "focus": "Numbers 1 to 5, with dot pictures",
      "about": "One sentence for grown-ups.",
      "min": 1,
      "max": 5,
      "rounds": 3,
      "dots": true,
      "hintAfter": 2
    }
  ]
}
```

| Field | Required | What it does |
|---|---|---|
| `id` | yes | Whole number, unique. Levels are played in `id` order; finishing one opens the next. |
| `name` | yes | The kid-friendly name on the level map. |
| `focus` | yes | What the level practises, shown to grown-ups. |
| `min`, `max` | yes | Pip's number is somewhere from `min` to `max` (at least 3 numbers, `max` up to 1000). |
| `rounds` | yes | How many numbers to find to finish the level (1–10). |
| `dots` | no | Show a dot picture with each number (only up to 10: a row of five, or a ten-frame). |
| `pad` | no | Use the number pad. Needed above 30 numbers, where tiles would be too small to tap. |
| `hintAfter` | no | Offer Pip's hint after this many guesses (default 3). Never required. |
| `emoji`, `color`, `about` | no | The stepping stone's picture and colour, and a sentence for grown-ups. |

## Stars

Each number found earns stars against the fewest guesses that always find it
(start in the middle and halve: 3 for 1–5, 4 for 1–10, 5 for 1–20 and 1–30,
6 for 1–50, 7 for 1–100):

- ★★★ within one guess of that
- ★★ up to about twice that
- ★ found it (always)

The level's stars are the average of its rounds. Guesses outside the range
or of numbers already ruled out are not counted.
