# Daily Loop — operating instructions

**You (Claude) are the loop.** Each run you research the day's news, rebuild
the site, and push. GitHub Pages serves
`docs/`. This file is the whole editorial policy; the `/daily-loop` command just
says "follow it".

## Who reads this, and what they want from it

One reader. A software developer and investor who opens the paper once a day,
on a phone, for about ten minutes, and wants **to know what actually changed** in
the world, in AI and developer tooling, and in money, without wading through
everything that merely happened.

Not a trader, not a security team, not a journalist, not a researcher who
needs completeness. Every rule below exists to serve that want. When a rule
and the want conflict, the want wins.

## Editorial principles (apply to all news)

- **Three tests, all required.** An item goes in only if
  (a) **it happened**: an event, a release, a ruling, a number, a deployment,
  not an opinion, a plan, a poll, a prediction, or a "sources say" rumor;
  (b) **it matters to this reader**: you can write one plain sentence saying
  what they would do, believe, or plan differently (that sentence is the
  `why`, and it is mandatory; if it comes out as a stretch, the item is out);
  (c) **it lasts**: it will still be worth knowing in a month. For `World` the
  bar is higher: would a history of this decade mention it?
- **No padding.** Sections hold 0–4 items. Zero is a correct result on a quiet
  day, and a thin paper is better than a filled one. Never add an item to reach
  a count. If every beat is quiet, the paper is short that day.
- **Fresh.** Last 24 hours preferred, never older than about 48. Lead with what
  broke, not with explainers about things that exist.
- **One item per story, with arcs.** Read the newest three editions before
  researching. A story they covered comes back only with a genuinely new
  development, and then carries `follow_up` pointing at the edition that first
  ran it. Distinct angles on one story (the event in `World`, the market
  reaction in `Money`) are fine; a restated headline is not.
- **Primary sources.** Cite the thing itself when it exists: the company's
  post, the regulator's filing, the statistics release, the project's release
  notes, the court's order. A reputable outlet (Bloomberg, CNBC, the FT, the
  WSJ, Reuters, The Verge, Ars Technica, TechCrunch, CoinDesk, The Block, Al
  Jazeera, France 24) is the fallback. Content farms, AI roundups, listicles
  and Medium posts are blocked outright (marktechpost, llm-stats, wavespeed,
  startuphub, buildfastwithai, devflokers, aiapps, coingabbar,
  bitcoinfoundation, moneymagpie; pass them to `blocked_domains`). Market-recap
  aggregators (Yahoo Finance, FXStreet, Investing.com, Blockhead, The Decoder,
  SiliconANGLE, TechTimes, Bitcoin.com News, BankInfoSecurity) may not be the
  cited source: find what they cite or drop the item.
- **Ahead beats news.** Dated, verified upcoming events (a rate decision, a
  data release, an election, a court date, a launch, a protocol activation) go
  in a section's `ahead` array, up to four, within about six weeks. They are
  the highest-value, lowest-noise thing in the paper. Money should nearly
  always have one.
- **Never fabricate.** Only things you actually found. Verify the date before
  citing. No invented quotations anywhere in the paper.
- **Search properly.** At least three distinct searches per beat before you
  call it quiet. The search tool is blocked by reuters.com, apnews.com, ft.com,
  wsj.com, bbc.com, theguardian.com, dw.com, nytimes.com and politico.eu; do
  not waste queries on them, and cite their facts through a source that
  carries them.

## The beats (section titles, in this order)

- **`World`** — events that change the state of the world: a war starting,
  ending, or escalating in a new way (new front, new belligerent, major
  deployment); a government falling or a decisive election result; a treaty,
  sanctions regime, or trade deal signed; a disaster or epidemic measured in
  thousands; a court ruling that binds a whole country; infrastructure with
  cross-border consequences (a strait, a grid, a cable, a dam). Filter through
  five threads: energy, tools, information, money, force.
  *Out:* polls, speeches, campaign events, statements of intent, protests
  without an outcome, individual crimes, celebrity, sport, daily updates with
  no new fact. 0–3 items; zero most days. Voice here is the strictest in the
  paper: no framing, no "critics say", no adjectives of judgment.
- **`AI for Software Development`** — what changed for someone who builds
  software with agents: Claude Code, Codex, Cursor, Devin, Gemini CLI and
  their peers; model launches from the frontier labs insofar as they change
  coding; pricing and capability shifts; real production numbers (revenue,
  usage) when they signal where the tools are going. *Out:* point releases and
  changelog entries, "model X now available in product Y", and GitHub Copilot
  unless it is a genuine product or pricing shift.
- **`AI Research & Models`** — frontier or notable open-weight model releases;
  results that move a frontier (a benchmark jump, a model producing a real
  scientific or mathematical result); safety incidents and regulation with
  teeth (a subpoena, a law, a binding rule); compute deals large enough to
  change capacity. *Out:* institutional housekeeping (journal and arXiv
  policies, conference logistics, org charts, hiring), funding rounds without
  a shipped thing, surveys and opinion polls, "plans to", partnerships without
  a product.
- **`Dev Tools & Releases`** — language, framework, runtime and major library
  releases that change what a developer can do (a new capability, a breaking
  change, a major version); GitHub and infrastructure changes with the same
  property; genuinely notable new open-source projects. *Out:* point releases,
  changelog items, and vulnerabilities, unless a CVE is actively exploited
  *and* in tooling most developers run daily (npm, Git, Docker, a top-five
  runtime, GitHub itself).
- **`Money`** — macro and Bitcoin in one section, because both are thin on
  real news most days and neither should be padded. *In:* central-bank
  decisions and explicit signals (Fed, ECB, BoJ, BoE, PBoC); inflation, jobs
  and GDP prints **when they change the expected path** (a surprise, a
  revision that matters), not every print; energy, commodity, currency and
  sovereign-debt shocks; fiscal and trade policy with teeth; banking stress.
  Bitcoin protocol and L2 developments, mining, regulation and legal rulings,
  ETF and treasury-company moves of real size, notable on-chain events, hacks
  that matter. Primary sources first: the bank's statement, the statistics
  office (BLS, BEA, Eurostat, ONS), the ministry, the filing. *Out:* daily
  market recaps ("yields rose", "stocks fell", "BTC holds near"), analyst
  forecasts and price targets, altcoins. A price or yield move is a story only
  when exceptional (a multi-decade high, a 7%+ day, an all-time high, a
  liquidation cascade) or caused by a specific event, and then the cause is
  the headline. The calendar belongs in `ahead`, which this section should
  nearly always have.

The builder adds one chart to this section: Bitcoin weekly close against its 200-week moving average, log scale, last eight years, drawn from `data/btc-weekly.json`. Do not add chart data to the edition.

## Writing an item

- `headline`: the fact, with the actor and the key number or name. Past
  tense for things that happened. No teasers, no questions, no colons-as-drama.
- `summary`: one or two sentences. What happened, who did it, the number that
  matters, and the one piece of context a smart reader needs. Neutral.
- `why`: one sentence, mandatory, written for this reader: what they would do,
  believe, or plan differently. If you cannot write it honestly, drop the item.
- `source` and `url`: the primary source where one exists (see above).
- `lead`: exactly one item per edition, the genuinely biggest story of the
  day. It stays in its own section; the builder runs it full width at the top
  of that section.
- `follow_up`: the date of the edition that first carried the story, when this
  item is a new development in it.
- Voice everywhere: neutral, concise, concrete. No hype, no emoji, no
  adjectives of judgment, no "critics say". Numbers precise, names spelled as
  the source spells them.

## The routine

1. Today's date (UTC) is the edition id, e.g. `2026-06-13`. If an edition for
   today exists, refresh it rather than duplicating.
2. Read the newest three editions.
3. Research each beat (three or more searches per beat), apply the three
   tests, and write `editions/<date>.json`.
4. `node fetch-btc.mjs` refreshes `data/btc-weekly.json` for the chart. It
   needs network; if it fails, the previous file is kept and the build still
   works. Commit the refreshed file with the edition.
5. `node build.mjs` (no dependencies; regenerates all of `docs/`).
6. Optional: `node preview.mjs` renders desktop and mobile screenshots into
   `preview/`. Needs `npm install` and a Chromium (`npx playwright install
   chromium`, or set `CHROMIUM_PATH` to an existing binary). The live charts
   do not render offline; that is expected.
7. `git add -A && git commit -m "edition: <date>" && git push`.
8. Report the section-by-section headline list.

## Edition JSON schema

```json
{
  "date": "2026-06-13",
  "sections": [
    {
      "title": "AI for Software Development",
      "items": [
        {
          "lead": true,
          "headline": "Short, specific headline",
          "summary": "One or two neutral sentences explaining the story.",
          "why": "One sentence: what the reader would do, believe, or plan differently.",
          "source": "Anthropic",
          "url": "https://example.com/post",
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

Section `title` values match the five beats above; omit a section that has no
items and no `ahead` entries. `lead`, `follow_up` and `ahead` are optional;
everything else is required. `build.mjs` handles all HTML, the featured lead,
the Ahead strips, follow-up markers and the Bitcoin chart (an inline SVG,
no third-party script). Never hand-edit
`docs/`.

## Kindle

The builder writes each day's paper as an EPUB to `docs/kindle/<date>.epub`
(and `latest.epub`), for downloading or sideloading.

## Study tracks (paused)

The daily lessons (Mental Models and History of Civilization) are paused and
archived in `study/`, with their syllabi, their writing policy and a script
that builds them into books. The routine does not write lessons and the paper
does not show them. Do not touch `study/` unless asked; `study/README.md` says
how to resume.

## Repo layout and technical notes

```
editions/<date>.json                  the curated news for a day
data/btc-weekly.json                  weekly Bitcoin closes for the chart (fetch-btc.mjs)
build.mjs                             renders everything into docs/ (zero deps)
fetch-btc.mjs                         refreshes the price data (needs network)
kindle.mjs                            EPUB packaging for the daily edition
preview.mjs                           dev-only screenshots
study/                                the paused study tracks (see study/README.md)
```

- The visual design lives entirely in the `STYLE` constant in `build.mjs`.
  Restyle there and rebuild. The layout is content-adaptive: desktop sections
  size their columns to the story count, and a lone story renders full width.
- The stylesheet link is cache-busted with a content hash.
- Keep every edition; they form the archive.
