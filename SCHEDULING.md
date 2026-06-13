# Scheduling the Daily Loop

Goal: publish a fresh edition automatically **every day at 06:00 Europe/Vienna**.

## Recommended: a cloud Routine

Routines run on Anthropic-managed infrastructure — no machine on, no open
session, persistent across restarts (a fresh clone of this repo each run, which
is all the loop needs). Docs: https://code.claude.com/docs/en/routines

**One-time setup, in your own Claude Code (CLI or app), with this repo open:**

Either run the scheduler command:

```
/schedule
```

…then configure:
- **Frequency:** daily
- **Time:** 06:00, timezone **Europe/Vienna**
- **Prompt/command to run:** `/daily-loop`

…or just ask Claude in natural language:

```
Create a routine that runs /daily-loop every day at 06:00 Europe/Vienna time.
```

Cron equivalent: `0 6 * * *` (timezone Europe/Vienna). Tie it to the
**Europe/Vienna** timezone, not UTC, so it stays 6am across the CET↔CEST
daylight-saving switch. To dodge the scheduler's top-of-hour jitter, use
`3 6 * * *` (06:03) instead.

Routines run autonomously (no permission prompts), so the 06:00 run will
`git push` the new edition to `main` on its own and GitHub Pages updates.

## Why not `/loop` or session cron

`/loop` and `CronCreate` are **session-scoped**: they only fire while a Claude
Code session is running and idle, clear when you start a new conversation, and
expire after 7 days. Fine for "keep refreshing while I work," wrong for an
unattended 6am job. (Quick manual refresh while working: `/loop 24h /daily-loop`.)

## Alternatives

- **Desktop scheduled task** — runs locally at 06:00; your machine must be on.
  https://code.claude.com/docs/en/desktop-scheduled-tasks
- **GitHub Actions cron** — truly unattended, but GitHub cron is **UTC-only and
  ignores DST** (6am Vienna = 04:00 UTC in summer, 05:00 UTC in winter), and the
  workflow needs a Claude credential (API key/OAuth) in repo secrets — the
  API-key path we deliberately avoided.
