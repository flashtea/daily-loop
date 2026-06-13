---
description: Research, curate, and publish today's Daily Loop edition
---

Produce today's **Daily Loop** edition, following the routine in `CLAUDE.md` exactly.

1. Use today's date (UTC) as the edition id, e.g. `2026-06-13`. If an edition for
   today already exists, refresh it rather than duplicating.
2. Research all four beats with web search — **AI for Software Development**,
   **AI Research & Models**, **Dev Tools & Releases**, **Bitcoin**. Prefer the
   **last 24 hours**; never older than ~48h. Lead with what actually *broke*.
3. **Source quality is non-negotiable.** Prefer primary sources and reputable
   outlets; pass the content-farm/listicle domains listed in `CLAUDE.md` to
   `blocked_domains` and verify the real source. Drop anything you can only find
   on an SEO farm.
4. Curate to **2–5 items per section**. Flag the single biggest story with
   `"lead": true`. Bitcoin charts are auto-injected — don't add chart data.
5. Write `editions/<today>.json`.
6. Run `node build.mjs`.
7. Commit (`edition: <today>`) and push to `main`.
8. Report the final headline list (section → headlines) so the run is auditable.
