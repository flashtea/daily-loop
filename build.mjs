#!/usr/bin/env node
// Daily Loop — static site builder.
// Reads every editions/*.json and renders the site into docs/.
// Zero dependencies; run with: node build.mjs

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = dirname(fileURLToPath(import.meta.url));
const EDITIONS_DIR = join(ROOT, "editions");
const OUT_DIR = join(ROOT, "docs");

const SITE_TITLE = "Daily Loop";
const SITE_TAGLINE = "AI · Software · Bitcoin — curated, no noise";

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
  new Date(`${iso}T12:00:00Z`)
    .toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    })
    .toUpperCase();

const shortDate = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

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

// ---------- render pieces ----------

function sourceTag(item) {
  const source = item.source || hostOf(item.url);
  if (!source) return "";
  return item.url
    ? `<a class="src" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(source)}</a>`
    : `<span class="src">${escapeHtml(source)}</span>`;
}

function whyBlock(item) {
  return item.why
    ? `<p class="why"><span>Why it matters —</span> ${escapeHtml(item.why)}</p>`
    : "";
}

function headlineLink(item, cls) {
  const text = escapeHtml(item.headline);
  return item.url
    ? `<a class="${cls}" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${text}</a>`
    : `<span class="${cls}">${text}</span>`;
}

function renderHero(item, kicker) {
  return `<section class="lead">
      <p class="kicker">${escapeHtml(kicker)}</p>
      <h2 class="lead-hed">${headlineLink(item, "hed-a")}</h2>
      <p class="lead-dek">${escapeHtml(item.summary || "")}</p>
      ${whyBlock(item)}
      <p class="byline">${sourceTag(item)}</p>
    </section>`;
}

function renderStory(item) {
  return `<article class="story">
        <h3 class="hed">${headlineLink(item, "hed-a")}</h3>
        <p class="dek">${escapeHtml(item.summary || "")}</p>
        ${whyBlock(item)}
        <p class="byline">${sourceTag(item)}</p>
      </article>`;
}

// Live BTC charts (TradingView mini widgets — render client-side in the browser).
function bitcoinCharts() {
  const widget = (range, label) =>
    `<figure class="chart">
        <figcaption>${label}</figcaption>
        <div class="tradingview-widget-container">
          <div class="tradingview-widget-container__widget"></div>
          <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js" async>
          {"symbol":"BITSTAMP:BTCUSD","width":"100%","height":"240","locale":"en","dateRange":"${range}","colorTheme":"light","isTransparent":true,"autosize":false,"trendLineColor":"#c0151d","underLineColor":"rgba(192,21,29,0.08)"}
          </script>
        </div>
      </figure>`;
  return `<div class="charts">
      ${widget("1M", "Short term · last 30 days")}
      ${widget("ALL", "Long term · all time")}
    </div>`;
}

function renderSection(section, lead) {
  const items = (section.items || [])
    .filter((it) => it !== lead)
    .map(renderStory)
    .join("\n");
  const charts = /bitcoin/i.test(section.title) ? bitcoinCharts() : "";
  if (!items.trim() && !charts) return "";
  return `<section class="beat">
      <h2 class="beat-label">${escapeHtml(section.title)}</h2>
      ${charts}
      <div class="columns">
${items}
      </div>
    </section>`;
}

function archiveStrip(editions, currentDate) {
  return editions
    .map((e) => {
      const href = e.date === editions[0].date ? "index.html" : `${e.date}.html`;
      const cls = e.date === currentDate ? "chip current" : "chip";
      return `<a class="${cls}" href="${href}">${escapeHtml(shortDate(e.date))}</a>`;
    })
    .join("");
}

function renderPage(edition, editions, isIndex) {
  // Pick the lead: first item flagged { "lead": true }, else first item overall.
  let lead = null;
  let kicker = "";
  for (const s of edition.sections || []) {
    for (const it of s.items || []) {
      if (it.lead) {
        lead = it;
        kicker = s.title;
        break;
      }
    }
    if (lead) break;
  }
  if (!lead && (edition.sections || [])[0]?.items?.[0]) {
    lead = edition.sections[0].items[0];
    kicker = edition.sections[0].title;
  }

  const itemCount = (edition.sections || []).reduce(
    (n, s) => n + (s.items || []).length,
    0,
  );
  const hero = lead ? renderHero(lead, kicker) : "";
  const sections = (edition.sections || [])
    .map((s) => renderSection(s, lead))
    .join("\n");
  const standfirst = edition.intro
    ? `<p class="standfirst">${escapeHtml(edition.intro)}</p>`
    : "";
  const title = isIndex ? SITE_TITLE : `${SITE_TITLE} — ${shortDate(edition.date)}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(SITE_TAGLINE)}" />
  <link rel="icon" href="favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="style.css?v=${STYLE_HASH}" />
</head>
<body>
  <header class="masthead">
    <div class="wrap">
      <div class="hairline"></div>
      <a class="nameplate" href="index.html">${SITE_TITLE}</a>
      <p class="tagline">${escapeHtml(SITE_TAGLINE)}</p>
      <div class="dateline">
        <span>${escapeHtml(longDate(edition.date))}</span>
        <span>No. ${editions.length} · ${itemCount} stories</span>
      </div>
      <div class="rule"></div>
      ${standfirst}
    </div>
  </header>

  <main class="wrap">
    ${hero}
${sections}
  </main>

  <footer>
    <div class="wrap">
      <div class="rule"></div>
      <p class="arch-label">Past editions</p>
      <nav class="archive">${archiveStrip(editions, edition.date)}</nav>
      <p class="colophon">Curated by Claude · rendered by <code>build.mjs</code> · built ${new Date()
        .toISOString()
        .slice(0, 16)
        .replace("T", " ")} UTC</p>
    </div>
  </footer>
</body>
</html>
`;
}

const STYLE = `:root {
  --bg: #faf9f6;
  --ink: #16181d;
  --muted: #5c5f66;
  --faint: #8a8d94;
  --line: #d9d8d1;
  --line-strong: #16181d;
  --accent: #c0151d;
  --maxw: 1180px;
  --serif: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif;
  --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--sans);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; }
.wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 24px; }
.rule { height: 3px; background: var(--line-strong); margin: 14px 0; }
.hairline { height: 1px; background: var(--line); }

/* Masthead */
.masthead { padding-top: 18px; }
.nameplate {
  display: block; text-align: center; text-decoration: none;
  font-family: var(--serif); font-weight: 700;
  font-size: clamp(40px, 9vw, 84px); line-height: 1; letter-spacing: -0.02em;
  margin: 14px 0 8px;
}
.tagline {
  text-align: center; margin: 0; color: var(--muted);
  font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase;
}
.dateline {
  display: flex; justify-content: space-between; gap: 12px;
  margin-top: 16px; padding-top: 10px; border-top: 1px solid var(--line);
  font-size: 11.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
}
.standfirst {
  font-family: var(--serif); font-size: clamp(18px, 2.4vw, 23px);
  line-height: 1.4; margin: 4px auto 0; max-width: 60ch; text-align: center; color: #2a2c31;
}

/* Lead story */
.lead {
  padding: 28px 0 26px; text-align: center;
  border-top: 4px double var(--line-strong); border-bottom: 4px double var(--line-strong);
}
.kicker {
  margin: 0 0 12px; color: var(--accent);
  font-size: 12px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
}
.lead-hed {
  font-family: var(--serif); font-weight: 700;
  font-size: clamp(26px, 4.6vw, 50px); line-height: 1.05; letter-spacing: -0.015em;
  margin: 0 auto; max-width: 20ch;
}
.lead-hed .hed-a { text-decoration: none; }
.lead-hed .hed-a:hover { text-decoration: underline; text-decoration-thickness: 2px; }
.lead-dek {
  font-family: var(--serif); font-size: clamp(16px, 1.9vw, 21px); line-height: 1.45;
  margin: 14px auto 0; max-width: 58ch; color: #2a2c31;
}

/* Sections */
.beat { padding: 28px 0; border-bottom: 1px solid var(--line); }
.beat-label {
  font-family: var(--sans); font-weight: 700; font-size: 13px;
  letter-spacing: 0.18em; text-transform: uppercase; text-align: center;
  margin: 0 0 20px; padding-bottom: 12px; border-bottom: 2px solid var(--line-strong);
}
.columns { columns: 4 250px; column-gap: 34px; column-rule: 1px solid var(--line); }

.story {
  break-inside: avoid; -webkit-column-break-inside: avoid;
  padding-top: 15px; margin-bottom: 24px; border-top: 1px solid var(--line);
}
.story:first-child { padding-top: 0; border-top: 0; }
.hed { font-family: var(--serif); font-weight: 700; font-size: 19px; line-height: 1.18; margin: 0 0 8px; }
.hed .hed-a { text-decoration: none; }
.hed .hed-a:hover { color: var(--accent); }
.dek {
  margin: 0 0 10px; font-size: 14.5px; color: #2c2f35;
  text-align: justify; hyphens: auto; -webkit-hyphens: auto;
}
.why {
  margin: 0 0 10px; font-size: 13px; line-height: 1.5; color: var(--muted);
  border-left: 2px solid var(--accent); padding-left: 11px;
}
.why span { color: var(--accent); font-weight: 700; }
.byline { margin: 0; }
.src {
  font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
  color: var(--faint); text-decoration: none;
}
.src:hover { color: var(--accent); }
.src::after { content: " ↗"; }

/* Bitcoin charts */
.charts { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 4px 0 26px; }
.chart { margin: 0; border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; background: #fff; }
.chart figcaption {
  font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--muted); margin-bottom: 8px; font-weight: 600;
}

/* Footer */
footer { padding: 30px 0 70px; }
.arch-label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin: 0 0 10px; }
.archive { display: flex; flex-wrap: wrap; gap: 7px; }
.chip {
  font-size: 12px; text-decoration: none; color: var(--muted);
  border: 1px solid var(--line); border-radius: 4px; padding: 4px 10px; background: #fff;
}
.chip:hover { border-color: var(--accent); color: var(--accent); }
.chip.current { background: var(--ink); color: #fff; border-color: var(--ink); }
.colophon { margin: 18px 0 0; font-size: 12px; color: var(--faint); }
.colophon code { font-family: ui-monospace, Menlo, Consolas, monospace; background: #efeee9; padding: 1px 5px; border-radius: 4px; }

/* Desktop: lead becomes a full-width, left-aligned banner — wider and shorter. */
@media (min-width: 721px) {
  .lead { text-align: left; padding: 26px 0 22px; }
  .lead-hed { font-size: clamp(32px, 3.6vw, 42px); line-height: 1.07; max-width: none; margin: 0; }
  .lead-dek {
    text-align: left; max-width: 64ch; margin: 12px 0 0;
    font-size: clamp(17px, 1.5vw, 19px);
  }
  .kicker { margin-bottom: 10px; }
}

@media (max-width: 720px) {
  .dateline { font-size: 10px; }
  .charts { grid-template-columns: 1fr; }
  .columns { column-rule: none; }
  .lead { padding: 22px 0 20px; }
  .lead-hed { font-size: clamp(23px, 6.4vw, 30px); max-width: none; }
  .lead-dek { font-size: 16px; margin-top: 12px; }
  .dek { text-align: left; }
}
`;

// Short content hash of the CSS, appended to the stylesheet URL so browsers and
// the GitHub Pages CDN fetch the new file whenever the styles change.
const STYLE_HASH = createHash("sha1").update(STYLE).digest("hex").slice(0, 8);

// Favicon — a "loop" target mark in the masthead red on dark ink. Crisp at any size.
const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#16181d"/>
  <circle cx="32" cy="32" r="17" fill="none" stroke="#c0151d" stroke-width="6"/>
  <circle cx="32" cy="32" r="6" fill="#faf9f6"/>
</svg>
`;

// ---------- main ----------

function build() {
  const editions = loadEditions();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "style.css"), STYLE);
  writeFileSync(join(OUT_DIR, "favicon.svg"), FAVICON);
  writeFileSync(join(OUT_DIR, ".nojekyll"), "");

  if (editions.length === 0) {
    writeFileSync(
      join(OUT_DIR, "index.html"),
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${SITE_TITLE}</title><link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="style.css"></head><body><header class="masthead"><div class="wrap"><span class="nameplate">${SITE_TITLE}</span><p class="tagline">No editions yet — run the daily loop.</p></div></header></body></html>`,
    );
    console.log("No editions found — wrote placeholder index.");
    return;
  }

  writeFileSync(join(OUT_DIR, "index.html"), renderPage(editions[0], editions, true));
  for (const e of editions) {
    writeFileSync(join(OUT_DIR, `${e.date}.html`), renderPage(e, editions, false));
  }
  console.log(
    `Built ${editions.length} edition(s). Latest: ${editions[0].date} → docs/index.html`,
  );
}

build();
