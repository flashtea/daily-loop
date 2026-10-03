---
description: Research, curate, and publish today's Daily Loop edition plus the day's two lessons
---

Produce today's **Daily Loop** edition, following the routine in `CLAUDE.md` exactly.

1. Use today's date (UTC) as the edition id, e.g. `2026-06-13`. If an edition for
   today already exists, refresh it rather than duplicating.
2. Read the newest three files in `editions/` first. Do not repeat a story they
   covered unless there is a new development; then set `follow_up` to the date
   that first carried it.
3. Research all six beats with web search — **World**, **AI for Software
   Development**, **AI Research & Models**, **Dev Tools & Releases**,
   **Macroeconomics**, **Bitcoin** — with **at least three distinct searches
   per beat**. World uses a history bar (would a future history chapter
   mention it?); zero items is the normal outcome. Prefer the
   **last 24 hours**; never older than ~48h. Lead with what actually *broke*.
   No routine Bitcoin price items (the charts cover price); no CVE items unless
   actively exploited in tooling most developers run; releases need a real
   capability change.
4. **Source quality is non-negotiable.** Cite the primary source whenever one
   exists; pass the content-farm/listicle domains listed in `CLAUDE.md` to
   `blocked_domains` and verify the real source. Drop anything you can only find
   on an SEO farm or a market-recap aggregator.
5. Curate to **2–5 items per section**. Flag the single biggest story with
   `"lead": true`. Add verified upcoming events to each section's `ahead`
   array where there are any (Macroeconomics nearly always). Bitcoin charts are
   auto-injected — don't add chart data.
6. Write `editions/<today>.json`.
7. Write the day's two lessons, following the "study tracks" section of
   `CLAUDE.md`: the next unwritten entry of `curriculum/mental-models.md` into
   `lessons/mental-models/NNN-slug.json`, and the next unwritten entry of
   `curriculum/history.md` into `lessons/history/NNN-slug.json`, both dated
   today. If fewer than 30 syllabus entries remain in a track, extend that
   curriculum first. Skip a track only if its lesson for today already exists.
8. Run `node build.mjs`.
9. Commit (`edition: <today>`) and push to `main`.
10. Report the final headline list (section → headlines) and the two lesson
   titles so the run is auditable.
