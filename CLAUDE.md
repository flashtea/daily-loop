# Daily Loop — operating instructions

This repo is a personal daily newspaper **plus two daily study tracks**. **You
(Claude) are the loop.** When the user runs you and asks for "today's edition"
(or just "run the loop"), do three things: research and curate the day's news,
write the next lesson in each study track, rebuild the site, and commit. GitHub
Pages serves `docs/`.

Repo layout:

```
editions/<date>.json            the curated news for a day
lessons/mental-models/NNN-slug.json   one mental-model lesson per day
lessons/history/NNN-slug.json         one history chapter per day
curriculum/mental-models.md     the ordered syllabus for the mental-models track
curriculum/history.md           the ordered syllabus for the history track
build.mjs                       renders everything into docs/ (zero deps)
```

## The routine (run this each time)

1. **Figure out today's date** and use it as the edition id, e.g. `2026-06-13`.
   If an edition for today already exists, refresh it rather than duplicating.

2. **Read the last three editions first** (`editions/`, newest three). Anything
   they already covered is off the table unless there is a genuinely new
   development; in that case write the new development and set
   `"follow_up": "<date of the earlier item>"` so the builder links the arc.
   Restating yesterday's story with a fresh headline is the most common failure
   mode of this loop — check deliberately.

3. **Research each beat** with web search. **Run at least three distinct
   searches per beat** (different angles, different source types) before
   concluding a beat is quiet; a two-minute run across five beats is
   under-searched, not a quiet day. Strongly prefer news from the
   **last 24 hours**, and never older than ~48 hours. Lead with what actually
   *broke* (a shutdown, a launch, a ruling, a big move) — not "X exists" explainer
   pieces. Beats (these are the section titles, in this order):
   - `AI for Software Development` — bleeding-edge coding agents and dev tooling:
     Claude Code, Codex/OpenAI's coding tools, Cursor, Devin/Cognition, Gemini CLI,
     and similar agentic/frontier tools, plus notable launches from
     Anthropic/OpenAI/Google/etc. that matter to developers. **De-prioritize
     GitHub Copilot** — treat it as a legacy/incumbent product and skip its
     routine weekly-release and "model X now available in Copilot" changelog
     items; only include Copilot news if it's a genuinely major shift (e.g. a
     new product line, a pricing overhaul, a landmark acquisition), not routine
     model-availability churn.
   - `AI Research & Models` — new model releases, capability/benchmark news,
     notable papers, safety/policy items worth knowing.
   - `Dev Tools & Releases` — language/framework/runtime releases, major library
     versions, GitHub/infra/devex news, trending OSS. **A release qualifies only
     if it changes what a developer can do** (a new capability, a breaking
     change, a major version) — not point releases, changelog entries, or
     "v2.1.x adds a flag". **Vulnerabilities are not this beat.** Include a
     CVE only if it is actively exploited *and* sits in tooling most developers
     run daily (npm, Git, Docker, a top-5 language runtime, GitHub itself);
     everything else from BleepingComputer, The Hacker News, and CISA KEV
     notices is out.
   - `Macroeconomics` — what moved the big picture: central-bank decisions and
     signals (Fed, ECB, BoJ, BoE, PBoC), inflation and jobs prints, GDP, rates
     and bond-market moves, currencies, energy and commodity shocks, fiscal and
     trade policy, sovereign-debt and banking stress. Primary sources first:
     the central bank's own statement, the statistics office release (BLS, BEA,
     Eurostat, ONS), the Treasury/ministry. Then Bloomberg, CNBC, the FT, the
     WSJ, Reuters (note: reuters.com, ft.com, wsj.com and apnews.com block the
     search tool, so cite them via the primary source or CNBC/Bloomberg). Skip
     daily market-noise recaps unless the move itself is the story.
   - `Bitcoin` — protocol and L2 developments, mining, regulation and legal
     rulings, ETF and treasury-company moves with real size, notable on-chain
     events, hacks that matter. Bitcoin-focused; not general altcoin noise.
     **No routine price items.** The live charts already show the price; "BTC
     slides toward $84K", "holds near", "stalls below" are noise and must not
     appear. A price move is a story only if it is exceptional (roughly a 7%+
     day, a new all-time high, a liquidation cascade) or caused by a specific
     Bitcoin event, and then the cause is the headline. Analyst price targets
     are not stories either.

4. **Curate hard. This is the whole point.** Keep **2–5 items per section** —
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
   - **Cite the primary source whenever one exists.** If an outlet is reporting
     on a release, a filing, or a data print, link the release, the filing, or
     the data print, and name that as `source`. Secondary aggregators and
     market-recap sites — Yahoo Finance, FXStreet, Investing.com, Blockhead,
     The Decoder, SiliconANGLE, TechTimes, Bitcoin.com News, BankInfoSecurity
     and similar — are not acceptable as the cited source; find what they are
     citing or drop the item.
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
   - **Ahead.** Scheduled events are high value and zero noise. Where a beat
     has dated upcoming events worth knowing — a central-bank decision, a CPI or
     jobs release, a court date, a developer conference or announced launch, a
     protocol activation — list them in the section's `ahead` array (1–4
     entries, dates verified, within roughly the next six weeks). The builder
     renders them as a one-line "Ahead" strip under the section. Macroeconomics
     should almost always have one; AI and Bitcoin often will.

5. **Write the edition** to `editions/<date>.json` (schema below).

6. **Write today's lesson in each study track** (see "The study tracks" below).
   Two files: `lessons/mental-models/NNN-slug.json` and
   `lessons/history/NNN-slug.json`, both dated today. If today's lessons already
   exist, leave them alone unless asked to revise.

7. **Rebuild:** `node build.mjs` (no dependencies; regenerates all of `docs/`).

8. **Preview (optional but encouraged):** `node preview.mjs` renders the page to
   `preview/*.png` at desktop and mobile widths so you can eyeball the layout
   before pushing. Needs `npm install` + `npx playwright install chromium` once;
   set `PLAYWRIGHT_BROWSERS_PATH` if the browser lives outside the default cache.
   The live Bitcoin charts won't render here (no network) — that's expected.

9. **Commit & push** on the working branch:
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
          "why": "Optional: one line on why a dev/investor should care.",
          "follow_up": "2026-06-11"
        }
      ],
      "ahead": [
        { "date": "2026-06-24", "what": "FOMC rate decision", "url": "https://optional.example" }
      ]
    }
  ]
}
```

Section `title` values should match the five beats above (omit a section only if
it has zero worthwhile items). `intro`, `why`, `lead`, `follow_up` and `ahead`
are optional — set `"lead": true` on exactly one item (the day's biggest story)
to feature it as the hero; set `follow_up` to the date of the edition that first
carried the story when an item is a new development in an ongoing one; use
`ahead` for verified scheduled events. Everything else is required. `build.mjs` handles all HTML/CSS, the lead
hero, and the Bitcoin charts — never hand-edit files in `docs/`.

## The study tracks

Two parallel "books", delivered one piece per day, that the reader can also
browse as a catalogue later. The goal is to get a little wiser every day. These
are **not news**: write them from your own knowledge, in order, following the
syllabus. Web search is optional (use it only to verify a date, figure, or
quotation you are unsure of). Never invent quotations; if you can't verify a
quote's wording, paraphrase and say so.

- **Mental Models** (`lessons/mental-models/`, syllabus
  `curriculum/mental-models.md`) — Charlie Munger's latticework: one model per
  day across thinking tools, the psychology of misjudgment, mathematics,
  physics, biology, economics, systems, engineering, and decision-making. Each
  lesson should explain the model, show it in at least two unrelated domains,
  name its failure modes, and connect it to models already covered.
- **History of Civilization** (`lessons/history/`, syllabus
  `curriculum/history.md`) — from the first tools to the present, in order.
  Inspired by Durant's *Story of Civilization* (scope, not length) and the
  Saylor/Breedlove series (the money-and-energy lens). Strong focus on
  **technology and fundamentals**: how a thing worked and what it changed
  about energy, tools, information, money, or force. Names are secondary; when
  a person really was the hinge, name them and put them in `names` so they
  stick. Connect each chapter to the one before and set up the next.

**Picking the next lesson.** Count the files in the track's directory; the next
lesson is entry N+1 in the syllabus. Keep its number and title (you may sharpen
the title). File name: `NNN-slug.json` (zero-padded to 3 digits, lowercase
kebab-case slug). **When fewer than 30 syllabus entries remain unwritten,
append a new part** to the curriculum file in the same style before writing
the day's lesson, so the track never runs dry.

**Length and voice.** 600–1000 words of body. Plain, concrete, neutral; short
paragraphs; `## ` subheads every few paragraphs; no hype, no emoji. Write for
an intelligent generalist reading on a phone over coffee. End with 3–5
takeaways the reader should keep. Optionally close the body with a one-line
pointer to tomorrow's topic.

### Lesson JSON schema

```json
{
  "track": "mental-models",
  "n": 12,
  "date": "2026-10-14",
  "title": "Inversion",
  "subtitle": "Invert, always invert",
  "part": "Part I — Tools for thinking",
  "summary": "Two or three sentences: the idea in a nutshell. Shown on the front page and in the catalogue.",
  "body": [
    "A paragraph. Strings are paragraphs.",
    "## A subhead starts with two hashes",
    "- A string starting with a dash\n- is a bullet list",
    "> A string starting with > is a quotation.",
    "Inline **bold** and *italic* are supported; nothing else."
  ],
  "takeaways": ["3–5 one-sentence points to keep."],
  "names": [{ "name": "Carl Jacobi", "note": "Optional. Who they were and why they matter here." }],
  "reading": [{ "title": "Poor Charlie's Almanack", "by": "Peter Kaufman (ed.)", "url": "optional" }]
}
```

`track`, `n`, `date`, `title`, `part`, `summary`, `body`, and `takeaways` are
required; the rest are optional. `part` must match the `## ` heading of the
syllabus part the entry sits in. The builder puts the day's two lessons in a
"Lessons of the day" band on that day's edition page, gives each lesson its own
page under `docs/<track>/`, and maintains a catalogue at
`docs/<track>/index.html` grouped by part, with a progress bar against the
syllabus and the next five upcoming titles.

## Style / scope notes

- Voice: neutral, concise, factual. No hype, no emoji in copy.
- The visual design lives entirely in `build.mjs` (`STYLE` constant). To restyle,
  edit it there and re-run — don't touch generated `docs/` files. The layout is
  deterministic but content-adaptive: desktop sections size their column count to
  the number of stories, and a lone story (e.g. when its section's other item is
  the page lead) renders as a full-width feature so rows don't sit half-empty.
- The stylesheet link is cache-busted with a content hash, so style changes show
  up immediately on GitHub Pages without a manual refresh.
- Keep editions and lessons; they form the archive and the catalogues
  automatically (newest edition = front page).
