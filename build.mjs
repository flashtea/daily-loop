#!/usr/bin/env node
// Daily Loop — static site builder.
// Reads every editions/*.json and renders the site into docs/.
// Zero dependencies; run with: node build.mjs

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const EDITIONS_DIR = join(ROOT, "editions");
const OUT_DIR = join(ROOT, "docs");

const SITE_TITLE = "Daily Loop";
const SITE_TAGLINE = "AI, software, and bitcoin — curated, no noise.";

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
    year: "numeric",
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
  // newest first
  editions.sort((a, b) => (a.date < b.date ? 1 : -1));
  return editions;
}

// ---------- render ----------

function renderItem(item) {
  const host = hostOf(item.url);
  const source = item.source || host;
  const sourceTag = item.url
    ? `<a class="src" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(
        source,
      )} ↗</a>`
    : `<span class="src">${escapeHtml(source)}</span>`;
  const why = item.why
    ? `<p class="why"><span>Why it matters</span> ${escapeHtml(item.why)}</p>`
    : "";
  const headline = item.url
    ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(
        item.headline,
      )}</a>`
    : escapeHtml(item.headline);
  return `<article class="card">
        <h3>${headline}</h3>
        <p class="summary">${escapeHtml(item.summary || "")}</p>
        ${why}
        <div class="meta">${sourceTag}</div>
      </article>`;
}

function renderSection(section) {
  const items = (section.items || []).map(renderItem).join("\n");
  if (!items.trim()) return "";
  return `<section class="beat">
      <h2>${escapeHtml(section.title)}</h2>
      <div class="grid">
${items}
      </div>
    </section>`;
}

function renderArchiveStrip(editions, currentDate) {
  const links = editions
    .map((e) => {
      const href = e.date === editions[0].date ? "index.html" : `${e.date}.html`;
      const cls = e.date === currentDate ? "chip current" : "chip";
      return `<a class="${cls}" href="${href}">${escapeHtml(shortDate(e.date))}</a>`;
    })
    .join("\n");
  return `<nav class="archive" aria-label="Past editions">${links}</nav>`;
}

function renderPage(edition, editions, isIndex) {
  const sections = (edition.sections || []).map(renderSection).join("\n");
  const intro = edition.intro
    ? `<p class="intro">${escapeHtml(edition.intro)}</p>`
    : "";
  const itemCount = (edition.sections || []).reduce(
    (n, s) => n + (s.items || []).length,
    0,
  );
  const title = isIndex
    ? SITE_TITLE
    : `${SITE_TITLE} — ${shortDate(edition.date)}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(SITE_TAGLINE)}" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header class="masthead">
    <div class="wrap">
      <a class="brand" href="index.html">
        <span class="logo">◍</span>
        <span class="name">${SITE_TITLE}</span>
      </a>
      <p class="tagline">${escapeHtml(SITE_TAGLINE)}</p>
      <p class="dateline">${escapeHtml(longDate(edition.date))} · ${itemCount} stories</p>
      ${intro}
      ${renderArchiveStrip(editions, edition.date)}
    </div>
  </header>

  <main class="wrap">
${sections}
  </main>

  <footer class="wrap">
    <p>Built ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · curated by Claude, rendered by <code>build.mjs</code>.</p>
    <p>${renderArchiveStrip(editions, edition.date)}</p>
  </footer>
</body>
</html>
`;
}

const STYLE = `:root {
  --bg: #f7f7f5;
  --surface: #ffffff;
  --text: #1a1a1a;
  --muted: #6b6b6b;
  --line: #e6e6e2;
  --accent: #2f6fed;
  --accent-soft: #eaf0fe;
  --radius: 14px;
  --maxw: 1100px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f1115;
    --surface: #171a21;
    --text: #e8e8ea;
    --muted: #9aa0ac;
    --line: #262a33;
    --accent: #6c9bff;
    --accent-soft: #1a2235;
  }
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 20px; }

.masthead { border-bottom: 1px solid var(--line); padding: 36px 0 22px; }
.brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; color: var(--text); }
.brand .logo { color: var(--accent); font-size: 26px; line-height: 1; }
.brand .name { font-weight: 700; font-size: 26px; letter-spacing: -0.02em; }
.tagline { margin: 6px 0 0; color: var(--muted); font-size: 14px; }
.dateline { margin: 14px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
.intro { margin: 12px 0 0; font-size: 17px; max-width: 70ch; }

.archive { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
.chip {
  font-size: 12px; text-decoration: none; color: var(--muted);
  border: 1px solid var(--line); border-radius: 999px; padding: 4px 11px;
  background: var(--surface); white-space: nowrap; transition: all .15s ease;
}
.chip:hover { color: var(--text); border-color: var(--accent); }
.chip.current { background: var(--accent); color: #fff; border-color: var(--accent); }

main { padding: 8px 0 10px; }
.beat { margin: 38px 0; }
.beat > h2 {
  font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--accent); margin: 0 0 16px; padding-bottom: 8px;
  border-bottom: 1px solid var(--line);
}
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }

.card {
  background: var(--surface); border: 1px solid var(--line);
  border-radius: var(--radius); padding: 18px 18px 16px;
  display: flex; flex-direction: column; transition: border-color .15s ease, transform .15s ease;
}
.card:hover { border-color: var(--accent); transform: translateY(-2px); }
.card h3 { margin: 0 0 8px; font-size: 18px; line-height: 1.3; letter-spacing: -0.01em; }
.card h3 a { color: var(--text); text-decoration: none; }
.card h3 a:hover { color: var(--accent); }
.summary { margin: 0 0 12px; color: var(--text); font-size: 15px; }
.why {
  margin: 0 0 12px; font-size: 13.5px; color: var(--muted);
  background: var(--accent-soft); border-radius: 10px; padding: 9px 11px;
}
.why span { font-weight: 600; color: var(--accent); margin-right: 4px; }
.meta { margin-top: auto; }
.src { font-size: 12.5px; color: var(--muted); text-decoration: none; }
.src:hover { color: var(--accent); }

footer { border-top: 1px solid var(--line); margin-top: 40px; padding: 24px 0 60px; color: var(--muted); font-size: 13px; }
footer code { background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: 1px 5px; }
footer .archive { margin-top: 10px; }

@media (max-width: 520px) {
  .grid { grid-template-columns: 1fr; }
  .brand .name { font-size: 22px; }
}
`;

// ---------- main ----------

function build() {
  const editions = loadEditions();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "style.css"), STYLE);
  writeFileSync(join(OUT_DIR, ".nojekyll"), "");

  if (editions.length === 0) {
    writeFileSync(
      join(OUT_DIR, "index.html"),
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${SITE_TITLE}</title><link rel="stylesheet" href="style.css"></head><body><header class="masthead"><div class="wrap"><span class="brand"><span class="logo">◍</span><span class="name">${SITE_TITLE}</span></span><p class="tagline">No editions yet. Run the daily loop to publish one.</p></div></header></body></html>`,
    );
    console.log("No editions found — wrote placeholder index.");
    return;
  }

  // Latest -> index.html, every edition -> <date>.html
  writeFileSync(
    join(OUT_DIR, "index.html"),
    renderPage(editions[0], editions, true),
  );
  for (const e of editions) {
    writeFileSync(join(OUT_DIR, `${e.date}.html`), renderPage(e, editions, false));
  }

  console.log(
    `Built ${editions.length} edition(s). Latest: ${editions[0].date} → docs/index.html`,
  );
}

build();
