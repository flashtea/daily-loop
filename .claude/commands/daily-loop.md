---
description: Research, curate, and publish today's Daily Loop edition plus the day's two lessons
---

Produce today's **Daily Loop** edition by following `CLAUDE.md` exactly. It is
the complete editorial policy: who the reader is, the three tests every news
item must pass, the five beats and what is out of scope for each, how to write
an item, how to write the two daily lessons, and the routine.

In short:

1. Today's date (UTC) is the edition id; refresh rather than duplicate.
2. Read the newest three editions so nothing is repeated without a new
   development.
3. Research all five beats (three or more searches each): World, AI for
   Software Development, AI Research & Models, Dev Tools & Releases, Money
   (macro and Bitcoin together). Apply the three tests (it happened, it matters to
   this reader, it lasts). 0–4 items per section; zero is fine. Mandatory
   one-sentence `why`. Primary sources. `ahead` entries for verified upcoming
   events. Exactly one `lead`.
4. Write the next lesson in each study track per the syllabus
   (`curriculum/*.md`), extending a syllabus first if fewer than 30 entries
   remain.
5. `node fetch-btc.mjs` (tolerates failure), then `node build.mjs`.
6. Commit as `edition: <today>` and push to `main`.
7. Report the section-by-section headline list and the two lesson titles.
