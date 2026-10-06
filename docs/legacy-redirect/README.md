# Moving the old Reading Game URL to Pip's Playroom

`https://rdbagwell.github.io/Reading_Game/` still serves the old Reading Game.
These two files replace it with a page that sends visitors (and home-screen
shortcuts) to `https://rdbagwell.github.io/pips-playroom/`:

- `index.html`: an instant redirect (`<meta http-equiv="refresh">`), with a
  visible "Reading Game has moved to Pip's Playroom" link for browsers that
  don't follow it. `noindex` keeps search engines from listing the old page,
  and `rel="canonical"` points them at the new one.
- `404.html`: the same page, so old deep links redirect too.

No JavaScript, nothing loaded from anywhere, and a CSP of `default-src 'none'`.

**Readers' progress is safe.** Both sites are on `rdbagwell.github.io`, so
they share browser storage. The playroom imports the old `reading-game`
record the first time it opens on a device (and leaves the old record as it
was). Children don't lose anything by following the redirect.

## Apply it (about 5 minutes)

Do this after Pip's Playroom is live at <https://rdbagwell.github.io/pips-playroom/>.

```sh
git clone https://github.com/RDBagwell/Reading_Game.git
cd Reading_Game
git checkout master   # the default branch the Pages workflow deploys from

# Keep the rebuilt game's code in history; the live site becomes the redirect.
mkdir -p _redirect
curl -fsSL https://raw.githubusercontent.com/RDBagwell/pips-playroom/main/docs/legacy-redirect/index.html -o _redirect/index.html
cp _redirect/index.html _redirect/404.html
```

Then make the Pages workflow deploy only the redirect. In
`.github/workflows/pages.yml`, replace the "Collect the static site" step's
`run:` block with:

```yaml
        run: |
          mkdir _site
          cp _redirect/index.html _redirect/404.html _site/
          touch _site/.nojekyll
```

(The `_site/` folder name is ignored by git in that repo, which is why the
redirect lives in `_redirect/`.) Commit and push:

```sh
git add _redirect .github/workflows/pages.yml
git commit -m "chore: redirect to Pip's Playroom"
git push origin master
```

Check: open <https://rdbagwell.github.io/Reading_Game/> and
<https://rdbagwell.github.io/Reading_Game/anything>. Both should land on
Pip's Playroom.

If you'd rather not keep the workflow, delete it and set **Settings → Pages →
Source** to "Deploy from a branch" with a branch that holds just these two files.

## The other original games

Each 2020 game keeps its code and history, gets a `v1-original` tag, a
README line pointing to the playroom, and is then archived (read-only). For
each of `Speak_Number_Guessing_Game`, `Math_Sprint_Game` and `Typing_Game`
(all on `master`):

```sh
REPO=Math_Sprint_Game     # then Typing_Game, then Speak_Number_Guessing_Game
git clone https://github.com/RDBagwell/$REPO.git && cd $REPO
git tag -a v1-original -m "The original 2020 version, before Pip's Playroom"
git push origin v1-original
printf '\n> **This game now lives on in [Pip’s Playroom](https://rdbagwell.github.io/pips-playroom/)**, rebuilt for young children. This repository is the original 2020 version, kept as it was (tag `v1-original`).\n' >> README.md
git add README.md && git commit -m "docs: point to Pip's Playroom" && git push origin master
cd ..
```

(`Speak_Number_Guessing_Game` has no README yet; the `printf` creates one.)

Expected tag targets, checked in this session: `Math_Sprint_Game` at
`40f2d768`, `Typing_Game` at `17db8fff`, `Speak_Number_Guessing_Game` at
`bbcbda9a`. The tag goes on the commit *before* the README line, so
`v1-original` is exactly the 2020 code.

Then archive each one: **Settings → General → Danger Zone → Archive this
repository**. Or with the GitHub CLI:

```sh
gh repo archive RDBagwell/Math_Sprint_Game --yes
gh repo archive RDBagwell/Typing_Game --yes
gh repo archive RDBagwell/Speak_Number_Guessing_Game --yes
```

Archive `Reading_Game` too if you like, *after* the redirect is deployed:
archived repositories keep serving their Pages site.

Pip's Playroom also needs its own `v1-original` tag (the Reading Game's
original, carried over), which this session could not push:

```sh
cd Reading_Game
git push https://github.com/RDBagwell/pips-playroom.git refs/tags/v1-original
```
