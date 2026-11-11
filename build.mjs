#!/usr/bin/env node
// Daily Loop — static site builder.
// Reads every editions/*.json and renders the site into docs/. Zero dependencies; run with: node build.mjs

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { buildEpub } from "./kindle.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const EDITIONS_DIR = join(ROOT, "editions");
const OUT_DIR = join(ROOT, "docs");

const SITE_TITLE = "Daily Loop";
const SITE_TAGLINE = "World · AI · Software · Money";
const JS_SWITCH = `document.addEventListener("click", (e) => document.querySelectorAll("details.switch[open]").forEach((d) => d.contains(e.target) || (d.open = false)));
document.addEventListener("keydown", (e) => e.key === "Escape" && document.querySelectorAll("details.switch[open]").forEach((d) => (d.open = false)));`;
const CUSTOM_DOMAIN = "paper.flashtea.dev"; // DNS: CNAME paper → flashtea.github.io, not proxied

// ---------- helpers ----------

const escapeHtml = (s = "") =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const longDate = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

const shortDate = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

const mediumDate = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const pad3 = (n) => String(n).padStart(3, "0");

// ---------- load ----------

function loadEditions() {
  let files;
  try {
    files = readdirSync(EDITIONS_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    files = [];
  }
  const editions = files.map((f) => {
    const data = JSON.parse(readFileSync(join(EDITIONS_DIR, f), "utf8"));
    data.date = data.date || f.replace(/\.json$/, "");
    return data;
  });
  editions.sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
  return editions;
}

// ---------- shared page chrome ----------

function masthead({ base, activeNav, band }) {
  const nav = [
    { href: `${base}index.html`, label: "Today", key: "today" },
    { href: `${base}archive.html`, label: "Archive", key: "archive" },
  ]
    .map((n) => `<a href="${n.href}"${n.key === activeNav ? ' aria-current="page"' : ""}>${escapeHtml(n.label)}</a>`)
    .join("");
  return `<header class="top">
    <div class="wrap">
      <div class="brand"><a href="https://flashtea.dev/">flashtea</a><span class="sep">/</span><details class="switch"><summary>paper</summary><nav class="menu" aria-label="flashtea pages"><a href="https://today.flashtea.dev/">today<small>morning page</small></a><a href="https://monitor.flashtea.dev/">ops<small>apps and server</small></a><a href="https://monitor.flashtea.dev/map.html">map<small>how the box works</small></a><a href="https://db.flashtea.dev/">db<small>databases, pgweb</small></a><a href="https://paper.flashtea.dev/" aria-current="page">paper<small>Daily Loop</small></a><a class="pub" href="https://flashtea.dev/">flashtea.dev<small>public site</small></a></nav></details></div>
      <nav aria-label="Main">${nav}</nav>
    </div>
  </header>
  <section class="band">
    <div class="wrap">${band}</div>
  </section>`;
}

const RECENT_IN_FOOTER = 10;

function footer({ base, editions, currentDate }) {
  const recent = editions.slice(0, RECENT_IN_FOOTER);
  const more = editions.length - recent.length;
  return `<footer>
    <div class="wrap">
      <div class="arch-row">
        <p class="arch-label">Recent editions</p>
        <nav class="archive">${archiveStrip(recent, currentDate, base)}${
          more > 0
            ? `<a class="chip all" href="${base}archive.html">All ${editions.length} editions →</a>`
            : ""
        }</nav>
      </div>
      <p class="colophon"><span>Curated by Claude · built ${new Date()
        .toISOString()
        .slice(0, 16)
        .replace("T", " ")} UTC</span><a href="https://flashtea.dev">flashtea.dev</a></p>
    </div>
  </footer>`;
}

function shell({ title, description, base, bodyClass, head, main, foot }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description || SITE_TAGLINE)}" />
  <meta name="theme-color" content="#17181a" />
  <link rel="icon" href="${base}favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Condensed:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:ital,wght@0,400;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap" />
  <link rel="stylesheet" href="${base}style.css?v=${STYLE_HASH}" />
</head>
<body class="${bodyClass || ""}">
  ${head}

  <main class="wrap">
${main}
  </main>

  ${foot}
  <script>
${JS_SWITCH}
  </script>
</body>
</html>
`;
}

// ---------- news pieces ----------

function sourceTag(item) {
  const source = item.source || hostOf(item.url);
  if (!source) return "";
  return item.url
    ? `<a class="src" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(source)}</a>`
    : `<span class="src">${escapeHtml(source)}</span>`;
}

function whyBlock(item) {
  return item.why
    ? `<p class="why"><span>why it matters</span>${escapeHtml(item.why)}</p>`
    : "";
}

// Items that continue an earlier story carry follow_up: "<date>" and get a
// small marker linking back to that edition.
function followUpTag(item, editions) {
  if (!item.follow_up) return "";
  const prev = editions.find((e) => e.date === item.follow_up);
  const label = `Follow-up · since ${escapeHtml(shortDate(item.follow_up))}`;
  if (!prev) return `<span class="followup">${label}</span>`;
  const href = prev.date === editions[0].date ? "index.html" : `${prev.date}.html`;
  return `<a class="followup" href="${href}">${label}</a>`;
}

function headlineLink(item, cls) {
  const text = escapeHtml(item.headline);
  return item.url
    ? `<a class="${cls}" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${text}</a>`
    : `<span class="${cls}">${text}</span>`;
}

function renderStory(item, editions, featured = false) {
  return `<article class="${featured ? "story featured" : "story"}">
        <h3 class="hed">${headlineLink(item, "hed-a")}</h3>
        <p class="dek">${escapeHtml(item.summary || "")}</p>
        ${whyBlock(item)}
        <p class="byline">${sourceTag(item)}${followUpTag(item, editions)}</p>
      </article>`;
}

// Scheduled events worth knowing about: section.ahead = [{ date, what, url? }].
function aheadLine(section) {
  const ahead = (section.ahead || []).filter((a) => a && a.what);
  if (!ahead.length) return "";
  const parts = ahead
    .slice()
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))
    .map((a) => {
      const when = a.date ? escapeHtml(/^\d{4}-\d{2}-\d{2}$/.test(a.date) ? shortDate(a.date) : a.date) : "";
      const what = a.url
        ? `<a href="${escapeHtml(a.url)}" target="_blank" rel="noopener">${escapeHtml(a.what)}</a>`
        : escapeHtml(a.what);
      return `<li><span class="when">${when}</span><span>${what}</span></li>`;
    })
    .join("");
  return `<div class="ahead"><h3>Ahead</h3><ul>${parts}</ul></div>`;
}

function renderSection(section, lead, editions) {
  const all = section.items || [];
  const hasLead = all.includes(lead);
  // The lead story runs full-width at the top of its own section; the rest
  // flow in columns beneath it.
  const visible = all.filter((it) => it !== lead);
  // A section without stories is left out entirely, Ahead list included.
  if (!all.length) return "";
  const items = visible.map((it) => renderStory(it, editions)).join("\n");
  const ahead = aheadLine(section);
  // Only the lead (already shown in the band) and nothing else: no empty row.
  if (!items.trim() && !ahead) return "";
  const n = visible.length + (hasLead ? 1 : 0);
  return `<section class="beat">
      <h2 class="label">${escapeHtml(section.title)}<span>${n} ${n === 1 ? "story" : "stories"}${hasLead ? ", lead above" : ""}</span></h2>
      <div class="beat-body${ahead ? "" : " solo"}">
        ${items.trim() ? `<div class="stories">\n${items}\n        </div>` : "<div></div>"}
        ${ahead}
      </div>
    </section>`;
}

function archiveStrip(editions, currentDate, base = "") {
  return editions
    .map((e) => {
      const href = e.date === editions[0].date ? `${base}index.html` : `${base}${e.date}.html`;
      const cls = e.date === currentDate ? "chip current" : "chip";
      return `<a class="${cls}" href="${href}">${escapeHtml(shortDate(e.date))}</a>`;
    })
    .join("");
}

// ---------- archive page ----------

function leadOf(edition) {
  for (const s of edition.sections || []) {
    for (const it of s.items || []) if (it.lead) return it;
  }
  return (edition.sections || [])[0]?.items?.[0] || null;
}

function renderArchive(editions) {
  const months = new Map();
  for (const e of editions) {
    const key = e.date.slice(0, 7);
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(e);
  }
  const monthLabel = (ym) =>
    new Date(`${ym}-15T12:00:00Z`).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  const groups = [...months.entries()]
    .map(
      ([ym, es]) => `<section class="beat">
        <h2 class="label">${escapeHtml(monthLabel(ym))}<span>${es.length} editions</span></h2>
        <ol class="cat-list">
${es
  .map((e) => {
    const href = e.date === editions[0].date ? "index.html" : `${e.date}.html`;
    const lead = leadOf(e);
    const count = (e.sections || []).reduce((n, s) => n + (s.items || []).length, 0);
    return `          <li class="cat-row">
            <span class="cat-n">${escapeHtml(shortDate(e.date))}</span>
            <div class="cat-main">
              <a class="cat-title" href="${href}">${escapeHtml(lead?.headline || "Edition")}</a>
              ${e.intro ? `<p class="cat-dek">${escapeHtml(e.intro)}</p>` : ""}
            </div>
            <span class="cat-date">${count} ${count === 1 ? "story" : "stories"}</span>
          </li>`;
  })
  .join("\n")}
        </ol>
      </section>`,
    )
    .join("\n");

  const main = groups;

  return shell({
    title: `Archive · ${SITE_TITLE}`,
    description: "Every Daily Loop edition.",
    base: "",
    bodyClass: "page-archive",
    head: masthead({
      base: "",
      activeNav: "archive",
      band: `<p class="meta">Every edition since the first</p><h1 class="solo">Archive</h1><p class="dek">${editions.length} editions, newest first, each listed by its lead story.</p>`,
    }),
    main,
    foot: footer({ base: "", editions, currentDate: null }),
  });
}

// ---------- edition page ----------

function leadBand(edition, lead, editions, itemCount) {
  const no = editions.length - editions.findIndex((e) => e.date === edition.date);
  const section = (edition.sections || []).find((s) => (s.items || []).includes(lead));
  const meta = `<p class="meta">No. ${no} · ${escapeHtml(longDate(edition.date))} · ${itemCount} ${itemCount === 1 ? "story" : "stories"}</p>`;
  if (!lead) return meta;
  return `${meta}
      <div class="lead">
        <div>
          ${section ? `<p class="kicker">${escapeHtml(section.title)}</p>` : ""}
          <h1>${headlineLink(lead, "hed-a")}</h1>
        </div>
        <div>
          <p class="dek">${escapeHtml(lead.summary || "")}</p>
          ${whyBlock(lead)}
          <p class="byline">${sourceTag(lead)}${followUpTag(lead, editions)}</p>
        </div>
      </div>`;
}

function renderPage(edition, editions, isIndex) {
  // Pick the lead: first item flagged { "lead": true }, else first item overall.
  const lead = leadOf(edition);

  const itemCount = (edition.sections || []).reduce(
    (n, s) => n + (s.items || []).length,
    0,
  );

  let sections = (edition.sections || [])
    .map((s) => renderSection(s, lead, editions))
    .join("\n");
  // The paper-wide Ahead list: edition.ahead, shown every day at the bottom.
  const bigAhead = aheadLine({ ahead: edition.ahead });
  if (bigAhead) {
    const n = edition.ahead.filter((x) => x && x.what).length;
    sections += `
    <section class="beat">
      <h2 class="label">Ahead<span>${n} ${n === 1 ? "date" : "dates"}</span></h2>
      <div class="beat-body solo">
        ${bigAhead.replace("<h3>Ahead</h3>", "")}
      </div>
    </section>`;
  }
  const title = isIndex ? SITE_TITLE : `${SITE_TITLE} — ${shortDate(edition.date)}`;

  return shell({
    title,
    base: "",
    bodyClass: "page-edition",
    head: masthead({
      base: "",
      activeNav: isIndex ? "today" : "",
      band: leadBand(edition, lead, editions, itemCount),
    }),
    main: sections,
    foot: footer({ base: "", editions, currentDate: edition.date }),
  });
}

const STYLE = `/* Daily Loop in the flashtea.dev look (flashtea-infra/site/style.css): graphite on paper, tea amber as the
   one colour, IBM Plex, light only. The band at the top stays dark in both themes and carries the lead story; below it each
   section has a mono label rail on the left and its stories in a ruled grid. */
:root {
  --paper: #f6f6f3; --surface: #ffffff; --ink: #17181a; --ink-2: #44474a; --muted: #63686d; --rule: #dcdbd4;
  --accent: #9a560b;
  --band-bg: #17181a; --band-ink: #f0efe9; --band-muted: #a3a49d; --band-rule: #2f302c; --band-accent: #e9a445;
  --maxw: 1180px;
  --display: "IBM Plex Sans Condensed", "Arial Narrow", sans-serif;
  --body: "IBM Plex Sans", -apple-system, "Segoe UI", system-ui, sans-serif;
  --serif: "IBM Plex Serif", Georgia, serif;
  --mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  color-scheme: light;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; background: var(--paper); }
body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.6 var(--body); -webkit-font-smoothing: antialiased; }
a { color: inherit; }
a:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 2px; }
.wrap { max-width: var(--maxw); margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }

/* header */
.top { border-bottom: 1px solid var(--rule); }
.top .wrap { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-block: 14px; }
/* page switcher, the same on today, ops and paper: "flashtea / <page>", the page name opens the list */
.brand { display: flex; align-items: center; gap: 7px; font-weight: 600; white-space: nowrap; }
.brand > a { text-decoration: none; }
.brand .sep { color: var(--muted); font-weight: 400; }
.switch { position: relative; }
.switch summary { list-style: none; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; color: var(--muted); font-weight: 400; }
.switch summary::-webkit-details-marker { display: none; }
.switch summary::after { content: ""; width: 5px; height: 5px; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform: translateY(-2px) rotate(45deg); }
.switch[open] summary::after { transform: translateY(1px) rotate(-135deg); }
.switch summary:hover, .switch[open] summary { color: var(--ink); }
.menu { position: absolute; left: -12px; top: calc(100% + 10px); z-index: 30; min-width: 230px; padding: 4px 0; background: var(--panel, var(--surface, #fff)); border: 1px solid var(--rule); border-radius: 3px; box-shadow: 0 8px 24px rgba(23, 24, 26, .08); font-size: 14px; font-weight: 400; letter-spacing: 0; }
.menu a { display: flex; justify-content: space-between; align-items: baseline; gap: 18px; padding: 7px 12px; color: var(--ink); text-decoration: none; }
.menu a:hover { background: var(--paper); }
.menu a[aria-current="page"] { font-weight: 600; box-shadow: inset 2px 0 var(--accent); }
.menu a.pub { border-top: 1px solid var(--rule); margin-top: 4px; padding-top: 9px; }
.menu small { font: 12px var(--mono); color: var(--muted); }
.brand { font-size: 17px; letter-spacing: -.01em; }
.top .wrap > nav { display: flex; gap: 22px; font-size: 14.5px; }
.top .wrap > nav a { text-decoration: none; color: var(--ink-2); padding-block: 4px; border-bottom: 1px solid transparent; }
.top .wrap > nav a:hover { color: var(--ink); border-color: var(--rule); }
.top .wrap > nav a[aria-current="page"] { color: var(--ink); border-color: var(--accent); }

/* band: the lead story */
.band { background: var(--band-bg); color: var(--band-ink); }
.band .wrap { padding-block: 34px 40px; }
.band .meta { margin: 0 0 22px; font: 12.5px var(--mono); color: var(--band-muted); }
.lead { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 48px; align-items: start; }
.band .kicker { margin: 0 0 10px; font: 12.5px var(--mono); color: var(--band-accent); }
.band h1 { font-family: var(--display); font-weight: 600; font-size: clamp(26px, 3.2vw, 38px); line-height: 1.12; letter-spacing: -.01em; margin: 0; text-wrap: balance; }
.band h1.solo { font-size: clamp(32px, 4.4vw, 50px); }
.band h1 a { text-decoration: none; }
.band h1 a:hover { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }
.band .dek { font-family: var(--serif); font-size: 16.5px; line-height: 1.6; color: var(--band-ink); margin: 2px 0 0; }
.band .meta + .solo + .dek { color: var(--band-muted); font-family: var(--body); margin-top: 12px; }
.band .why { color: var(--band-muted); }
.band .why span { color: var(--band-accent); }
.band .byline .src { color: var(--band-accent); }
.band .byline .followup { color: var(--band-muted); }

/* sections */
.beat { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 32px; padding-block: 30px; border-top: 1px solid var(--rule); }
main > .beat:first-child { border-top: 0; }
.label { margin: 0; padding-top: 2px; font: 400 13px/1.6 var(--mono); color: var(--ink); }
.label span { display: block; color: var(--muted); margin-top: 2px; }
.beat-body { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 0 40px; align-items: start; }
.beat-body.solo { grid-template-columns: minmax(0, 1fr); }
.stories { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px 36px; }
.story { padding: 0; }
.hed { font-family: var(--display); font-weight: 600; font-size: 20px; line-height: 1.22; letter-spacing: -.005em; margin: 0 0 8px; text-wrap: pretty; }
.hed-a { text-decoration: none; }
a.hed-a:hover { color: var(--accent); }
.dek { font-family: var(--serif); font-size: 15.5px; line-height: 1.6; color: var(--ink-2); margin: 0 0 10px; }
.why { font-size: 14px; line-height: 1.5; color: var(--muted); margin: 14px 0 10px; }
.why span { display: block; font: 12px var(--mono); color: var(--accent); margin-bottom: 2px; }
.byline { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 0; font: 12px var(--mono); }
.src { color: var(--accent); text-decoration: none; }
a.src:hover { text-decoration: underline; }
.followup { color: var(--muted); text-decoration: none; }
a.followup:hover { color: var(--ink); }

/* ahead: dated events, as a ruled list */
.ahead h3 { font: 400 12.5px var(--mono); color: var(--muted); margin: 0; padding: 2px 0 6px; }
.ahead ul { list-style: none; margin: 0; padding: 0; }
.ahead li { display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 12px; padding: 7px 0; border-top: 1px solid var(--rule); font-size: 14px; line-height: 1.5; color: var(--ink-2); }
.ahead li:first-child { border-top: 0; }
.ahead .when { font: 12.5px/1.9 var(--mono); color: var(--ink); font-variant-numeric: tabular-nums; }
.ahead a { text-underline-offset: 3px; }

/* archive */
.cat-list { list-style: none; margin: 0; padding: 0; }
.cat-row { display: grid; grid-template-columns: 70px minmax(0, 1fr) auto; gap: 18px; align-items: baseline; padding: 14px 0; border-top: 1px solid var(--rule); }
.cat-row:first-child { padding-top: 0; border-top: 0; }
.cat-n, .cat-date { font: 12.5px var(--mono); color: var(--muted); font-variant-numeric: tabular-nums; }
.cat-title { font-family: var(--display); font-weight: 600; font-size: 19px; line-height: 1.25; text-decoration: none; }
.cat-title:hover { color: var(--accent); }
.cat-dek { margin: 4px 0 0; font-size: 14.5px; color: var(--ink-2); }

/* footer */
footer { border-top: 1px solid var(--rule); margin-top: 8px; }
.arch-row { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 32px; padding-block: 22px 8px; }
.arch-label { margin: 0; font: 13px var(--mono); }
.archive { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font: 12.5px var(--mono); color: var(--ink-2); text-decoration: none; padding: 3px 9px; border: 1px solid var(--rule); border-radius: 2px; font-variant-numeric: tabular-nums; }
.chip:hover { border-color: var(--accent); color: var(--ink); }
.chip.current { background: var(--ink); border-color: var(--ink); color: var(--paper); }
.chip.all { border-color: transparent; color: var(--accent); }
.colophon { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 20px; margin: 0; padding-block: 18px 40px; font: 12.5px var(--mono); color: var(--muted); }
.colophon a { text-decoration: none; } .colophon a:hover { color: var(--accent); }

@media (max-width: 860px) {
  .lead { grid-template-columns: minmax(0, 1fr); gap: 18px; }
  .beat-body { grid-template-columns: minmax(0, 1fr); gap: 26px; }
  .beat, .arch-row { grid-template-columns: minmax(0, 1fr); gap: 4px; padding-block: 24px; }
  .label { padding-top: 0; }
  .label span { display: inline; margin-left: 8px; }
}
@media (max-width: 520px) {
  .band .wrap { padding-block: 26px 30px; }
  .stories { grid-template-columns: minmax(0, 1fr); }
  .cat-row { grid-template-columns: 56px minmax(0, 1fr); }
  .cat-date { display: none; }
}
`;

// Short content hash of the CSS, appended to the stylesheet URL so browsers and
// the GitHub Pages CDN fetch the new file whenever the styles change.
const STYLE_HASH = createHash("sha1").update(STYLE).digest("hex").slice(0, 8);

// Favicon: an amber "d" on graphite, the same family as flashtea.dev's "f".
const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="4" fill="#17181a"/>
  <text x="16" y="23.5" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-weight="700" font-size="22" fill="#e9a445">d</text>
</svg>
`;

// ---------- main ----------

function build() {
  const editions = loadEditions();

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "style.css"), STYLE);
  writeFileSync(join(OUT_DIR, "favicon.svg"), FAVICON);
  writeFileSync(join(OUT_DIR, ".nojekyll"), "");
  writeFileSync(join(OUT_DIR, "CNAME"), `${CUSTOM_DOMAIN}\n`); // GitHub Pages serves the paper here

  if (editions.length === 0) {
    writeFileSync(
      join(OUT_DIR, "index.html"),
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${SITE_TITLE}</title><link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="style.css"></head><body><header class="top"><div class="wrap"><span class="brand">${SITE_TITLE}</span></div></header><main class="wrap"><p>No editions yet — run the daily loop.</p></main></body></html>`,
    );
    console.log("No editions found — wrote placeholder index.");
    return;
  }

  writeFileSync(
    join(OUT_DIR, "index.html"),
    renderPage(editions[0], editions, true),
  );
  for (const e of editions) {
    writeFileSync(
      join(OUT_DIR, `${e.date}.html`),
      renderPage(e, editions, false),
    );
  }
  writeFileSync(join(OUT_DIR, "archive.html"), renderArchive(editions));

  // Kindle edition of the latest paper (docs/kindle/<date>.epub + latest.epub).
  const latest = editions[0];
  const epub = buildEpub({
    edition: latest,
    outDir: join(OUT_DIR, "kindle"),
    helpers: { escapeHtml, mediumDate },
  });
  console.log(`Kindle edition: docs/kindle/${latest.date}.epub (${epub.chapters} chapters, ${Math.round(epub.bytes / 1024)} KB)`);
  console.log(`Built ${editions.length} edition(s). Latest: ${editions[0].date} → docs/index.html`);
}

build();
