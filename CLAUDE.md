# Daily Loop — operating instructions

This repo is a personal daily newspaper. **You (Claude) are the loop.** When the
user runs you and asks for "today's edition" (or just "run the loop"), do the
research yourself with web search, write the curated stories as a JSON edition,
rebuild the site, and commit. GitHub Pages serves `docs/`.

## The routine (run this each time)

1. **Figure out today's date** and use it as the edition id, e.g. `2026-06-13`.
   If an edition for today already exists, refresh it rather than duplicating.

2. **Research each beat** with web search. Strongly prefer news from the
   **last 24 hours**, and never older than ~48 hours. Lead with what actually
   *broke* (a shutdown, a launch, a ruling, a big move) — not "X exists" explainer
   pieces. Beats (these are the section titles, in this order):
   - `AI for Software Development` — coding agents, copilots, IDE/tooling AI, AI
     in the SDLC, notable launches from Anthropic/OpenAI/Google/etc. that matter
     to developers.
   - `AI Research & Models` — new model releases, capability/benchmark news,
     notable papers, safety/policy items worth knowing.
   - `Dev Tools & Releases` — language/framework/runtime releases, major library
     versions, GitHub/infra/devex news, trending OSS.
   - `Bitcoin` — price-moving news, protocol/L2 developments, regulation, ETFs,
     mining, notable on-chain events. Bitcoin-focused; not general altcoin noise.

3. **Curate hard. This is the whole point.** Keep **2–5 items per section** —
   fewer, sharper, genuinely-fresh items beat a padded list.
   - **Source quality is non-negotiable.** Prefer the **primary source** (the
     company's own blog/statement, the regulator's filing, the project's release
     notes) and reputable outlets (Reuters, Bloomberg, CNBC, the FT, The Verge,
     Ars Technica, TechCrunch, CoinDesk, The Defiant, official `*.gov` / `*.org`).
     **Hard-block SEO farms, AI-generated roundups, listicles and "top N in 2026"
     pages** — e.g. marktechpost, llm-stats, wavespeed, startuphub, buildfastwithai,
     devflokers, aiapps, coingabbar, bitcoinfoundation, moneymagpie, and Medium
     posts. Pass these to `blocked_domains` in your searches and verify the real
     source before citing. If the only source is a content farm, drop the item.
   - **Lead story:** flag the single most important item of the day with
     `"lead": true`. The builder renders it as the front-page hero. Put it in
     whichever section it belongs to; pick the genuinely biggest story.
   - Deduplicate: one item per story, link the best source. Distinct *angles* on
     a major story (the event vs. its consequences) are fine as separate items.
   - Each item: a clear `headline`, a neutral 1–2 sentence `summary`, the
     `source` name, the `url`, and optionally a one-line `why` (why it matters).
   - Never fabricate. If a beat is genuinely quiet, fewer items is fine — say so
     in `intro` if needed. Only include things you actually found via search.
   - **Bitcoin** gets live short-term and long-term price charts automatically
     (injected by `build.mjs`); you don't add chart data to the JSON.

4. **Write the edition** to `editions/<date>.json` (schema below).

5. **Rebuild:** `node build.mjs` (no dependencies; regenerates all of `docs/`).

6. **Preview (optional but encouraged):** `node preview.mjs` renders the page to
   `preview/*.png` at desktop and mobile widths so you can eyeball the layout
   before pushing. Needs `npm install` + `npx playwright install chromium` once;
   set `PLAYWRIGHT_BROWSERS_PATH` if the browser lives outside the default cache.
   The live Bitcoin charts won't render here (no network) — that's expected.

7. **Commit & push** on the working branch:
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
          "lead": true,
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
it has zero worthwhile items). `intro`, `why`, and `lead` are optional — set
`"lead": true` on exactly one item (the day's biggest story) to feature it as the
hero. Everything else is required. `build.mjs` handles all HTML/CSS, the lead
hero, and the Bitcoin charts — never hand-edit files in `docs/`.

## Style / scope notes

- Voice: neutral, concise, factual. No hype, no emoji in copy.
- The visual design lives entirely in `build.mjs` (`STYLE` constant). To restyle,
  edit it there and re-run — don't touch generated `docs/` files. The layout is
  deterministic but content-adaptive: desktop sections size their column count to
  the number of stories, and a lone story (e.g. when its section's other item is
  the page lead) renders as a full-width feature so rows don't sit half-empty.
- The stylesheet link is cache-busted with a content hash, so style changes show
  up immediately on GitHub Pages without a manual refresh.
- Keep editions; they form the archive automatically (newest = front page).
