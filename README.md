# Daily Loop

A personal daily newspaper for **world events · AI · software development ·
money (macro and bitcoin)** — curated, no ads, no spam — plus one lesson a day,
alternating between two study tracks: **mental models** (Munger's latticework)
and the **history of civilization** (technology-first, Durant in scope but not
in length). Each track is browsable as a catalogue, every edition is also an
EPUB for Kindle, and lessons are narrated into a podcast feed. Hosted on GitHub
Pages.

It's a Claude "loop": you trigger Claude, Claude researches the day's news with
web search, curates it down to what matters, writes it as structured data, and
rebuilds a clean static site. No API keys, no cron, no servers.

## How it works

```
editions/<date>.json          ← the curated stories for a day (Claude writes these)
lessons/mental-models/*.json  ← one mental-model lesson per day
lessons/history/*.json        ← one history chapter per day
curriculum/*.md               ← the ordered syllabus each track follows
build.mjs                     ← dependency-free renderer (you/Claude run it)
docs/                         ← generated static site (GitHub Pages serves this)
CLAUDE.md                     ← the standing instructions Claude follows each run
```

The renderer turns every `editions/*.json` and `lessons/*/*.json` into:
- `docs/index.html` — the latest edition (front page), with the day's two lessons
- `docs/<date>.html` — one page per past edition (the archive)
- `docs/mental-models/` and `docs/history/` — one page per lesson plus a
  catalogue (`index.html`) grouped by discipline/era, with progress against the
  syllabus and the next titles coming up
- `docs/style.css` — clean, modern styling

## Run a new edition

Open this repo with Claude Code (CLI, app, or web) and say:

> Run today's daily loop.

Claude follows `CLAUDE.md`: searches the web, curates, writes
`editions/<today>.json`, writes the next lesson in each study track, runs
`node build.mjs`, commits, and pushes.

To rebuild the site from existing editions without new research:

```sh
node build.mjs
```

## One-time setup: enable GitHub Pages

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: your default branch, folder **`/docs`**
3. Save. Your paper goes live at
   `https://<user>.github.io/daily-loop/` within a minute or two.

## Automating it later (optional)

If you ever want it hands-off, run the trigger on a schedule (cron, a calendar
reminder, or the Claude `/loop` skill). The repo itself stays the same — the loop
is just "run Claude on this repo and ask for today's edition."
