# Level data

All the words in the game live in [`levels.json`](levels.json). It's plain JSON,
so you can edit it in any text editor. Run `npm test` afterwards: the tests
check the file and name any problem in plain words.

## Format

```json
{
  "version": 1,
  "levels": [
    {
      "id": 1,
      "name": "Cat Camp",
      "emoji": "🐱",
      "color": "#FFB84D",
      "focus": "Short a words",
      "about": "Three-letter words with the short “a” sound, like c-a-t.",
      "cards": 3,
      "distractors": "different-start",
      "goal": 8,
      "words": ["cat", "hat", "bat", "..."]
    }
  ]
}
```

| Field | Required | What it does |
|---|---|---|
| `id` | yes | Whole number, unique. Levels are played in `id` order, and finishing one unlocks the next. |
| `name` | yes | The kid-friendly name shown on the level map. |
| `focus` | yes | What the level practises, shown to grown-ups ("Silent e"). |
| `emoji` | no | The picture on the level's stepping stone. |
| `color` | no | The stepping stone's color (hex). |
| `about` | no | One sentence for grown-ups on the "How to play" page. |
| `cards` | yes | How many choices to show: `3`, `4`, `6` or `9`. |
| `distractors` | yes | How the wrong choices are picked (see below). |
| `goal` | no | Correct answers needed to finish the level. Defaults to `8`. |
| `words` | yes | 15–30 words. Lowercase letters only, except `"I"`. No duplicates. |

### Distractor modes

The wrong choices matter as much as the target word:

- **`different-start`**: every card starts with a different letter, so the child
  can find the word from its first sound. Best for the first levels.
- **`rhyme`**: wrong choices come from the same word family (*cat* with *hat,
  bat, mat*), so the child has to read the first letter.
- **`look-alike`**: wrong choices share the first letter or most of the spelling
  (*ship / shop / chip*), so the child has to read the whole word.
- **`mixed`**: about half look-alikes and half other words from the level.

Wrong choices always come from the same level, best fit first. Words from
earlier levels are only used if a level has too few words to fill the cards.

## Rules the tests check

- Every word is lowercase letters (`"I"` is the only capital).
- 15–30 words per level, no duplicates within a level.
- No two words anywhere in the game sound the same (*to/two*, *see/sea*): the
  child only *hears* the target, so a homophone on screen would be unfair. The
  list of known homophones is in `js/distractors.js`.
- No words that can be said two ways (*read*, *live*, *wind*).
- Every word in every level can be shown with a full set of wrong choices, and
  most wrong choices fit the level's mode.

## Adding a level

1. Copy the last level in `levels.json` and give it the next `id`.
2. Change the `name`, `focus`, `words` and settings.
3. Run `npm test`. If it complains about a homophone, remove one of the pair.
4. Open the game. The new stepping stone appears at the end of the map.

Keep the words common and kid-appropriate. Remember that the browser's voice
reads each word aloud, so avoid words it might pronounce oddly.
