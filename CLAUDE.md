# Daily Loop — operating instructions

**You (Claude) are the loop.** Each run you research the day's news, rebuild
the site, and push. GitHub Pages serves
`docs/`. This file is the whole editorial policy; the `/daily-loop` command just
says "follow it".

## Who reads this, and what they want from it

One reader. A software developer and investor in Austria who opens the paper once a day,
on a phone, for about ten minutes, and wants **to know what actually changed**
for them: in AI and the tools they build with, in money (US and euro-area macro,
Bitcoin), and in the rare world event that reaches them, without wading
through everything that merely happened.

Not a trader, not a security team, not a journalist, not a researcher who
needs completeness. Every rule below exists to serve that want. When a rule
and the want conflict, the want wins.

**The reader's own words, from an interview (Nov 2026), are the tiebreaker:**
- Global media makes it look as if something dramatic happens every day, but
  most of it does not affect an individual at all. However important it is to
  those affected, for this reader it is noise. World news gets in only if it
  reaches them, or if it truly changes the world (a cure for cancer).
- "Only the big ones, no noise" applies to every beat: CVEs, open-weight
  models, safety and regulation, Bitcoin, the calendar.
- Tools that matter are the state of the art, mostly Claude Code / Anthropic
  and OpenAI. Copilot and other tools they do not use are noise.
- No model retirements or deprecation notices.
- Macro means the Fed / US and the euro area. Australia, China's rate plumbing,
  single-country ratings outlooks: out.
- A running story is covered once, then only on a decisive turn.
- A paper with one to three items on a quiet day is correct.

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
- **Ahead, every day, only the big dates.** The edition's top-level `ahead`
  array is one list shown at the bottom of every paper, whatever the news.
  Up to six dated, verified events within about six weeks that pass the "only
  the big ones" bar: Fed and ECB decisions, US CPI and jobs, euro-area flash
  inflation, US presidential and midterm elections, decisive EU votes, big
  Bitcoin dates, launches or deadlines from Anthropic or OpenAI that change
  what the reader can do, and Austrian dates that change their life or money.
  No conferences, no model retirements, no other countries' central banks.
  Carry the list forward from the previous edition, drop past dates, verify
  new ones. Do not use per-section `ahead`. **A section with no stories is
  left out entirely.**
- **Never fabricate.** Only things you actually found. Verify the date before
  citing. No invented quotations anywhere in the paper.
- **Search properly.** At least three distinct searches per beat before you
  call it quiet. The search tool is blocked by reuters.com, apnews.com, ft.com,
  wsj.com, bbc.com, theguardian.com, dw.com, nytimes.com and politico.eu; do
  not waste queries on them, and cite their facts through a source that
  carries them.

## The beats (section titles, in this order)

- **`World`** — only what reaches this reader or truly changes the world. The
  test: does it plausibly change their money, prices, energy bills, travel,
  tools, rights or safety, or would every history of the century record it (a
  war between major powers, a cure for cancer, a pandemic that reaches Europe,
  the US presidency changing hands, US–China export controls, an EU law that
  binds them)? A regional war, a coup, a court fight or an election in another
  country fails unless it hits oil, markets or Europe directly, and then it
  usually belongs in `Money` through its effect. Zero items is the normal day.
  Voice: no framing, no
  "critics say", no adjectives of judgment.
- **`AI`** — one section for everything AI. *In:* what changes for someone
  building software with state-of-the-art agents (Claude Code and Anthropic,
  Codex and OpenAI first; Cursor or Gemini CLI only for a genuine shift):
  launches, pricing and limit changes, capability jumps, real production
  numbers. Frontier model launches from the top labs. Open-weight releases only
  when they reach the frontier. Safety and regulation only when big and binding
  (a law, a ruling, a filing like a lab saying it has hit its own risk
  threshold). Compute deals only when they change who can build what.
  *Out:* Copilot and tools the reader does not use, point releases, changelog
  items, betas of small API features, "model X now in product Y", model
  retirements and deprecations, institutional housekeeping, funding rounds,
  surveys, "plans to", partnerships without a product. 
- **`Dev Tools`** — only the big ones. *In:* a security crisis on the day it
  breaks: an actively exploited vulnerability or supply-chain compromise in
  something a large share of developers run (a top language runtime like the
  big PHP one, npm, PyPI, Git, Docker, GitHub, a major editor or agent). Major
  versions of top languages and runtimes that change what developers can do.
  GitHub changes that break workflows. *Out:* the steady stream of CVEs,
  point releases, conferences, brownouts and small GitHub changelog items.
  Most days this section is absent.
- **`Money`** — the Fed and US data, the ECB and euro-area data, and Bitcoin.
  *In:* Fed and ECB decisions and explicit signals; US and euro-area CPI, jobs
  and GDP when they change the expected path; a genuine shock in energy, the
  dollar, the euro or US/euro-area sovereign debt; US or EU fiscal and trade
  policy with teeth; banking stress in the US or Europe. Bitcoin, big ones
  only: an all-time high, a crash or liquidation cascade (with the cause as
  the headline), protocol changes and soft-fork activations that matter, US/EU
  regulation and rulings, ETF flows or treasury-company moves of real size
  (Strategy, index-inclusion decisions). *Out:* other central banks (RBA, BoC,
  PBoC plumbing; BoJ and BoE only if they move global markets), ratings
  outlooks for single countries, daily recaps, analyst forecasts, altcoins,
  exchange incidents after their first day unless decisive. 
- **`Austria`** — a small section, usually empty: only what changes the
  reader's life or money in Austria (a tax or pension change, a law that
  applies to them, a government falling, an election result, energy prices or
  a regulation they will feel). *Out:* party politics, polls, scandals,
  regional news. 

The builder adds one chart every day, inside `Money` when it has stories and otherwise as its own block at the bottom: Bitcoin weekly close against its 200-week moving average, log scale, last eight years, drawn from `data/btc-weekly.json`. Do not add chart data to the edition.

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
      "title": "AI",
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
      ]
    }
  ],
  "ahead": [
    { "date": "2026-06-24", "what": "FOMC rate decision", "url": "https://optional.example" }
  ]
}
```

Section `title` values match the five beats above (older editions use the earlier titles; leave them); omit a section that has no
items (the builder drops it anyway). `lead`, `follow_up` and `ahead` are optional;
everything else is required. `build.mjs` handles all HTML, the featured lead,
the Ahead list, follow-up markers and the Bitcoin chart (an inline SVG,
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

- The visual design lives entirely in the `STYLE` constant in `build.mjs`: the
  flashtea.dev look (IBM Plex, graphite and tea amber, light only). Restyle
  there and rebuild. The lead story fills the dark band at the top; each section
  has its label on the left and its stories in a grid that fills the row; the
  paper-wide "Ahead" list and the Bitcoin chart (when Money is absent) close
  the page.
- The stylesheet link is cache-busted with a content hash.
- Keep every edition; they form the archive.
