# Daily Loop — operating instructions

This repo is a personal daily newspaper. **You (Claude) are the loop.** When the
user runs you and asks for "today's edition" (or just "run the loop"), do the
research yourself with web search, write the curated stories as a JSON edition,
rebuild the site, and commit. GitHub Pages serves `docs/`.

## The routine (run this each time)

1. **Figure out today's date** and use it as the edition id, e.g. `2026-06-13`.
   If an edition for today already exists, refresh it rather than duplicating.

2. **Research each beat** with web search. Aim for news from the **last ~48
   hours**. Beats (these are the section titles, in this order):
   - `AI for Software Development` — coding agents, copilots, IDE/tooling AI, AI
     in the SDLC, notable launches from Anthropic/OpenAI/Google/etc. that matter
     to developers.
   - `AI Research & Models` — new model releases, capability/benchmark news,
     notable papers, safety/policy items worth knowing.
   - `Dev Tools & Releases` — language/framework/runtime releases, major library
     versions, GitHub/infra/devex news, trending OSS.
   - `Bitcoin` — price-moving news, protocol/L2 developments, regulation, ETFs,
     mining, notable on-chain events. Bitcoin-focused; not general altcoin noise.

3. **Curate hard. This is the whole point.** Keep **3–6 items per section**.
   - Drop ads, sponsored posts, SEO listicles, engagement-bait, and unsourced
     rumors. Prefer primary sources and reputable outlets.
   - Deduplicate: one item per story, link the best source.
   - Each item: a clear `headline`, a neutral 1–2 sentence `summary`, the
     `source` name, the `url`, and optionally a one-line `why` (why it matters).
   - Never fabricate. If a beat is genuinely quiet, fewer items is fine — say so
     in `intro` if needed. Only include things you actually found via search.

4. **Write the edition** to `editions/<date>.json` (schema below).

5. **Rebuild:** `node build.mjs` (no dependencies; regenerates all of `docs/`).

6. **Commit & push** on the working branch:
   `git add -A && git commit -m "edition: <date>" && git push`

## Edition JSON schema

```json
{
  "date": "2026-06-13",
  "intro": "One-line editor's note for the day (optional).",
  "sections": [
    {
      "title": "AI for Software Development",
      "items": [
        {
          "headline": "Short, specific headline",
          "summary": "One or two neutral sentences explaining the story.",
          "source": "TechCrunch",
          "url": "https://example.com/article",
          "why": "Optional: one line on why a dev/investor should care."
        }
      ]
    }
  ]
}
```

Section `title` values should match the four beats above (omit a section only if
it has zero worthwhile items). `intro`, `why` are optional; everything else
required. `build.mjs` handles all HTML/CSS — never hand-edit files in `docs/`.

## Style / scope notes

- Voice: neutral, concise, factual. No hype, no emoji in copy.
- The visual design lives entirely in `build.mjs` (`STYLE` constant). To restyle,
  edit it there and re-run — don't touch generated `docs/` files.
- Keep editions; they form the archive automatically (newest = front page).
