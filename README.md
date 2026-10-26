# Daily Loop

A personal daily newspaper for **world events · AI · software development ·
money (macro and bitcoin)** — curated, no ads, no spam. Every edition is also
an EPUB for Kindle. Hosted on GitHub Pages.

The paper used to carry a daily lesson from two study tracks, mental models and
the history of civilization. Those are paused and archived in `study/`; see
`study/README.md`.

It's a Claude "loop": you trigger Claude, Claude researches the day's news with
web search, curates it down to what matters, writes it as structured data, and
rebuilds a clean static site. No API keys, no cron, no servers.

## How it works

```
editions/<date>.json          ← the curated stories for a day (Claude writes these)
build.mjs                     ← dependency-free renderer (you/Claude run it)
docs/                         ← generated static site (GitHub Pages serves this)
CLAUDE.md                     ← the standing instructions Claude follows each run
study/                        ← the paused study tracks, kept for later
```

The renderer turns every `editions/*.json` into:
- `docs/index.html` — the latest edition (front page)
- `docs/<date>.html` — one page per past edition, plus `docs/archive.html`
- `docs/kindle/<date>.epub` — the latest edition as an EPUB
- `docs/style.css` — clean, modern styling

## Run a new edition

Open this repo with Claude Code (CLI, app, or web) and say:

> Run today's daily loop.

Claude follows `CLAUDE.md`: searches the web, curates, writes
`editions/<today>.json`, runs `node build.mjs`, commits, and pushes.

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
