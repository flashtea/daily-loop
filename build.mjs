#!/usr/bin/env node
// Daily Loop — static site builder.
// Reads every editions/*.json and lessons/<track>/*.json and renders the site
// into docs/. Zero dependencies; run with: node build.mjs

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = dirname(fileURLToPath(import.meta.url));
const EDITIONS_DIR = join(ROOT, "editions");
const LESSONS_DIR = join(ROOT, "lessons");
const CURRICULUM_DIR = join(ROOT, "curriculum");
const OUT_DIR = join(ROOT, "docs");

const SITE_TITLE = "Daily Loop";
const SITE_TAGLINE = "AI · Software · Macro · Bitcoin — plus a daily lesson";

// The two study tracks. Each has its own lessons/<slug>/ directory of daily
// lesson files, a curriculum/<slug>.md syllabus, and a catalogue page at
// docs/<slug>/index.html.
const TRACKS = [
  {
    slug: "mental-models",
    label: "Mental Models",
    shortLabel: "Models",
    kicker: "Mental model of the day",
    unit: "lesson",
    groupLabel: "Discipline",
    blurb:
      "A latticework of the big ideas from the big disciplines, built one model per day in the spirit of Charlie Munger. Read in order or dip in by discipline.",
  },
  {
    slug: "history",
    label: "History of Civilization",
    shortLabel: "History",
    kicker: "History, one chapter a day",
    unit: "chapter",
    groupLabel: "Era",
    blurb:
      "From the first stone tools to the present, told through five threads: energy, tools, information, money, and force. Less detail than Durant, more technology than a textbook.",
  },
];

// ---------- helpers ----------

const escapeHtml = (s = "") =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// Minimal inline markup for lesson text: **bold** and *italic* only.
const inline = (s = "") =>
  escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");

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

// Parse curriculum/<slug>.md: "## Part ..." headings and "N. **Title** — scope" lines.
function loadCurriculum(track) {
  let text;
  try {
    text = readFileSync(join(CURRICULUM_DIR, `${track.slug}.md`), "utf8");
  } catch {
    return [];
  }
  const entries = [];
  let part = "";
  for (const line of text.split("\n")) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      part = h[1];
      continue;
    }
    const m = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*\s+—\s+(.+?)\s*$/);
    if (m) entries.push({ n: Number(m[1]), title: m[2], scope: m[3], part });
  }
  return entries;
}

function loadLessons(track) {
  const dir = join(LESSONS_DIR, track.slug);
  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    files = [];
  }
  const curriculum = loadCurriculum(track);
  const lessons = files.map((f) => {
    const data = JSON.parse(readFileSync(join(dir, f), "utf8"));
    const slug = f.replace(/\.json$/, "");
    data.slug = slug;
    data.href = `${slug}.html`;
    data.n = Number(data.n ?? parseInt(slug, 10));
    if (!data.part) data.part = curriculum.find((c) => c.n === data.n)?.part || "";
    return data;
  });
  lessons.sort((a, b) => a.n - b.n);
  return { lessons, curriculum };
}

// ---------- shared page chrome ----------

function masthead({ base, dateline, standfirst, activeNav }) {
  const nav = [
    { href: `${base}index.html`, label: "Today", key: "today" },
    ...TRACKS.map((t) => ({
      href: `${base}${t.slug}/index.html`,
      label: t.label,
      short: t.shortLabel,
      key: t.slug,
    })),
    { href: `${base}archive.html`, label: "Archive", key: "archive" },
  ]
    .map(
      (n) =>
        `<a class="${n.key === activeNav ? "nav-a current" : "nav-a"}" href="${n.href}">${
          n.short
            ? `<span class="full">${escapeHtml(n.label)}</span><span class="short">${escapeHtml(n.short)}</span>`
            : escapeHtml(n.label)
        }</a>`,
    )
    .join("");
  return `<header class="masthead">
    <div class="wrap">
      <div class="hairline"></div>
      <a class="nameplate" href="${base}index.html">${SITE_TITLE}</a>
      <p class="tagline">${escapeHtml(SITE_TAGLINE)}</p>
      <nav class="nav">${nav}</nav>
      <div class="dateline">${dateline}</div>
      <div class="rule"></div>
      ${standfirst || ""}
    </div>
  </header>`;
}

const RECENT_IN_FOOTER = 10;

function footer({ base, editions, currentDate }) {
  const recent = editions.slice(0, RECENT_IN_FOOTER);
  const more = editions.length - recent.length;
  return `<footer>
    <div class="wrap">
      <div class="rule"></div>
      <div class="arch-row">
        <p class="arch-label">Recent editions</p>
        <nav class="archive">${archiveStrip(recent, currentDate, base)}${
          more > 0
            ? `<a class="chip all" href="${base}archive.html">All ${editions.length} editions →</a>`
            : ""
        }</nav>
      </div>
      <p class="colophon">Curated by Claude · rendered by <code>build.mjs</code> · built ${new Date()
        .toISOString()
        .slice(0, 16)
        .replace("T", " ")} UTC</p>
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
  <link rel="icon" href="${base}favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="${base}style.css?v=${STYLE_HASH}" />
</head>
<body class="${bodyClass || ""}">
  ${head}

  <main class="wrap">
${main}
  </main>

  ${foot}
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
    ? `<p class="why"><span>Why it matters —</span> ${escapeHtml(item.why)}</p>`
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

function renderHero(item, kicker, editions) {
  return `<section class="lead">
      <p class="kicker">${escapeHtml(kicker)}</p>
      <h2 class="lead-hed">${headlineLink(item, "hed-a")}</h2>
      <p class="lead-dek">${escapeHtml(item.summary || "")}</p>
      ${whyBlock(item)}
      <p class="byline">${sourceTag(item)}${followUpTag(item, editions)}</p>
    </section>`;
}

function renderStory(item, editions) {
  return `<article class="story">
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
      const when = a.date ? `<b>${escapeHtml(/^\d{4}-\d{2}-\d{2}$/.test(a.date) ? shortDate(a.date) : a.date)}</b> ` : "";
      const what = a.url
        ? `<a href="${escapeHtml(a.url)}" target="_blank" rel="noopener">${escapeHtml(a.what)}</a>`
        : escapeHtml(a.what);
      return `<span class="ahead-item">${when}${what}</span>`;
    })
    .join("");
  return `<p class="ahead"><span class="ahead-label">Ahead</span>${parts}</p>`;
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

function renderSection(section, lead, editions) {
  const visible = (section.items || []).filter((it) => it !== lead);
  const items = visible.map((it) => renderStory(it, editions)).join("\n");
  const charts = /bitcoin/i.test(section.title) ? bitcoinCharts() : "";
  const ahead = aheadLine(section);
  if (!items.trim() && !charts && !ahead) return "";
  // Match the column count to the number of stories so short sections fill the
  // row instead of leaving empty column tracks (capped at 4 for readability).
  const cols = Math.min(Math.max(visible.length, 1), 4);
  const cls = cols === 1 ? "columns single" : "columns";
  return `<section class="beat">
      <h2 class="beat-label">${escapeHtml(section.title)}</h2>
      ${charts}
      <div class="${cls}" style="column-count:${cols}">
${items}
      </div>
      ${ahead}
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

// ---------- lesson pieces ----------

function trackOf(slug) {
  return TRACKS.find((t) => t.slug === slug);
}

function lessonKicker(track, lesson) {
  const unit = track.unit === "chapter" ? "Chapter" : "No.";
  const part = lesson.part ? ` · ${lesson.part.replace(/^Part\s+[IVXLC]+\s+—\s+/, "")}` : "";
  return `${track.label} · ${unit} ${lesson.n}${part}`;
}

// The band on an edition page pointing to that day's lesson from each track.
// Deliberately compact: title and subtitle only, the lesson page has the rest.
function renderLessonCard(track, lesson) {
  const href = `${track.slug}/${lesson.href}`;
  return `<a class="lesson-card" href="${href}">
        <span class="kicker">${escapeHtml(lessonKicker(track, lesson))}</span>
        <span class="lesson-card-hed">${escapeHtml(lesson.title)}</span>
        ${lesson.subtitle ? `<span class="lesson-card-sub">${inline(lesson.subtitle)}</span>` : ""}
        <span class="more">Read the ${track.unit}</span>
      </a>`;
}

function renderLessonBand(dayLessons) {
  if (!dayLessons.length) return "";
  return `<section class="study">
      <h2 class="beat-label">Lessons of the day</h2>
      <div class="study-grid cols-${dayLessons.length}">
${dayLessons.map(({ track, lesson }) => renderLessonCard(track, lesson)).join("\n")}
      </div>
    </section>`;
}

// Body paragraphs: "## " = subhead, "- " lines = list, "> " = quote, else paragraph.
function renderBody(body = []) {
  return body
    .map((raw) => {
      const s = String(raw).trim();
      if (!s) return "";
      if (s.startsWith("## ")) return `<h2>${inline(s.slice(3))}</h2>`;
      if (s.startsWith("### ")) return `<h3>${inline(s.slice(4))}</h3>`;
      if (s.startsWith("> ")) return `<blockquote><p>${inline(s.slice(2))}</p></blockquote>`;
      if (s.startsWith("- ")) {
        const items = s
          .split("\n")
          .map((l) => l.replace(/^-\s+/, "").trim())
          .filter(Boolean)
          .map((l) => `<li>${inline(l)}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${inline(s)}</p>`;
    })
    .join("\n");
}

function renderLessonPage(track, lesson, prev, next, editions) {
  const base = "../";
  const takeaways = (lesson.takeaways || []).map((t) => `<li>${inline(t)}</li>`).join("");
  const names = (lesson.names || [])
    .map(
      (p) =>
        `<li><strong>${escapeHtml(p.name)}</strong>${p.note ? ` — ${inline(p.note)}` : ""}</li>`,
    )
    .join("");
  const reading = (lesson.reading || [])
    .map((r) => {
      const t = r.url
        ? `<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener">${escapeHtml(r.title)}</a>`
        : `<em>${escapeHtml(r.title)}</em>`;
      return `<li>${t}${r.by ? `, ${escapeHtml(r.by)}` : ""}</li>`;
    })
    .join("");
  const editionHref = editions.find((e) => e.date === lesson.date)
    ? lesson.date === editions[0]?.date
      ? `${base}index.html`
      : `${base}${lesson.date}.html`
    : null;

  const unitCap = track.unit === "chapter" ? "Chapter" : "Lesson";
  const navLink = (l, cls, label) =>
    l
      ? `<a class="pager-a ${cls}" href="${l.href}"><span class="pager-label">${label}</span><span class="pager-title">${escapeHtml(l.title)}</span></a>`
      : `<span class="pager-a ${cls} empty"></span>`;

  const main = `<article class="lesson">
      <header class="lesson-head">
        <p class="kicker">${escapeHtml(lessonKicker(track, lesson))}</p>
        <h1 class="lesson-title">${escapeHtml(lesson.title)}</h1>
        ${lesson.subtitle ? `<p class="lesson-sub">${inline(lesson.subtitle)}</p>` : ""}
        <p class="lesson-meta">${escapeHtml(mediumDate(lesson.date))}${
          editionHref ? ` · <a href="${editionHref}">that day's edition</a>` : ""
        } · <a href="index.html">all ${escapeHtml(track.label.toLowerCase())}</a></p>
      </header>
      ${lesson.summary ? `<p class="lesson-summary">${inline(lesson.summary)}</p>` : ""}
      <div class="lesson-body">
${renderBody(lesson.body)}
      </div>
      ${
        takeaways
          ? `<aside class="box keep"><h2>Keep</h2><ul>${takeaways}</ul></aside>`
          : ""
      }
      ${names ? `<aside class="box names"><h2>Names worth knowing</h2><ul>${names}</ul></aside>` : ""}
      ${reading ? `<aside class="box reading"><h2>Further reading</h2><ul>${reading}</ul></aside>` : ""}
      <nav class="pager">
        ${navLink(prev, "prev", `← Previous ${track.unit}`)}
        ${navLink(next, "next", `Next ${track.unit} →`)}
      </nav>
    </article>`;

  return shell({
    title: `${lesson.title} — ${track.label} · ${SITE_TITLE}`,
    description: lesson.summary,
    base,
    bodyClass: "page-lesson",
    head: masthead({
      base,
      activeNav: track.slug,
      dateline: `<span>${escapeHtml(track.label)}</span><span>${unitCap} ${lesson.n}</span>`,
    }),
    main,
    foot: footer({ base, editions, currentDate: lesson.date }),
  });
}

function renderCatalogue(track, lessons, curriculum, editions) {
  const base = "../";
  const total = curriculum.length ? Math.max(curriculum.length, lessons.length) : lessons.length;
  const written = lessons.length;
  const pct = total ? Math.round((written / total) * 100) : 0;
  const latest = lessons[lessons.length - 1];

  // Group written lessons by part, preserving first-seen order.
  const groups = new Map();
  for (const l of lessons) {
    const key = l.part || "Lessons";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(l);
  }
  const unitCap = track.unit === "chapter" ? "Ch." : "No.";
  const groupsHtml = [...groups.entries()]
    .map(
      ([part, ls]) => `<section class="cat-group">
        <h2 class="cat-part">${escapeHtml(part)}</h2>
        <ol class="cat-list">
${ls
  .map(
    (l) => `          <li class="cat-row">
            <span class="cat-n">${unitCap} ${l.n}</span>
            <div class="cat-main">
              <a class="cat-title" href="${l.href}">${escapeHtml(l.title)}</a>
              ${l.subtitle ? `<span class="cat-sub">${inline(l.subtitle)}</span>` : ""}
              <p class="cat-dek">${inline(l.summary || "")}</p>
            </div>
            <span class="cat-date">${escapeHtml(shortDate(l.date))}</span>
          </li>`,
  )
  .join("\n")}
        </ol>
      </section>`,
    )
    .join("\n");

  const upcoming = curriculum.filter((c) => c.n > (latest?.n || 0)).slice(0, 5);
  const upcomingHtml = upcoming.length
    ? `<section class="cat-group upcoming">
        <h2 class="cat-part">Coming up</h2>
        <ol class="cat-list">
${upcoming
  .map(
    (c) => `          <li class="cat-row">
            <span class="cat-n">${unitCap} ${c.n}</span>
            <div class="cat-main"><span class="cat-title plain">${escapeHtml(c.title)}</span><p class="cat-dek">${inline(c.scope)}</p></div>
            <span class="cat-date"></span>
          </li>`,
  )
  .join("\n")}
        </ol>
      </section>`
    : "";

  const main = `<section class="cat-head">
      <p class="kicker">${escapeHtml(track.kicker)}</p>
      <h1 class="cat-title-big">${escapeHtml(track.label)}</h1>
      <p class="cat-blurb">${escapeHtml(track.blurb)}</p>
      <div class="progress" role="img" aria-label="${written} of ${total} written">
        <div class="progress-bar" style="width:${pct}%"></div>
      </div>
      <p class="progress-label">${written} of ${total} ${track.unit}s written${
        latest ? ` · latest: <a href="${latest.href}">${escapeHtml(latest.title)}</a>` : ""
      }</p>
    </section>
${written ? groupsHtml : `<p class="empty-note">No ${track.unit}s yet. The next daily loop writes the first one.</p>`}
${upcomingHtml}`;

  return shell({
    title: `${track.label} · ${SITE_TITLE}`,
    description: track.blurb,
    base,
    bodyClass: "page-catalogue",
    head: masthead({
      base,
      activeNav: track.slug,
      dateline: `<span>${escapeHtml(track.label)}</span><span>${written} ${track.unit}${written === 1 ? "" : "s"}</span>`,
    }),
    main,
    foot: footer({ base, editions, currentDate: null }),
  });
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
      ([ym, es]) => `<section class="cat-group">
        <h2 class="cat-part">${escapeHtml(monthLabel(ym))}</h2>
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
            <span class="cat-date">${count} stories</span>
          </li>`;
  })
  .join("\n")}
        </ol>
      </section>`,
    )
    .join("\n");

  const main = `<section class="cat-head">
      <p class="kicker">Every edition since the first</p>
      <h1 class="cat-title-big">Archive</h1>
      <p class="cat-blurb">${editions.length} editions, newest first, each listed by its lead story.</p>
    </section>
${groups}`;

  return shell({
    title: `Archive · ${SITE_TITLE}`,
    description: "Every Daily Loop edition.",
    base: "",
    bodyClass: "page-archive",
    head: masthead({
      base: "",
      activeNav: "archive",
      dateline: `<span>Archive</span><span>${editions.length} editions</span>`,
    }),
    main,
    foot: footer({ base: "", editions, currentDate: null }),
  });
}

// ---------- edition page ----------

function renderPage(edition, editions, isIndex, lessonsByTrack) {
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
  const dayLessons = TRACKS.flatMap((track) => {
    const lesson = (lessonsByTrack[track.slug]?.lessons || []).find(
      (l) => l.date === edition.date,
    );
    return lesson ? [{ track, lesson }] : [];
  });

  const hero = lead ? renderHero(lead, kicker, editions) : "";
  const sections = (edition.sections || [])
    .map((s) => renderSection(s, lead, editions))
    .join("\n");
  const standfirst = edition.intro
    ? `<p class="standfirst">${escapeHtml(edition.intro)}</p>`
    : "";
  const title = isIndex ? SITE_TITLE : `${SITE_TITLE} — ${shortDate(edition.date)}`;
  const counts = [`${itemCount} stories`];
  if (dayLessons.length) counts.push(`${dayLessons.length} lesson${dayLessons.length === 1 ? "" : "s"}`);

  return shell({
    title,
    base: "",
    bodyClass: "page-edition",
    head: masthead({
      base: "",
      activeNav: isIndex ? "today" : "",
      dateline: `<span>${escapeHtml(longDate(edition.date))}</span><span>No. ${editions.length} · ${counts.join(" · ")}</span>`,
      standfirst,
    }),
    main: `    ${hero}
${renderLessonBand(dayLessons)}
${sections}`,
    foot: footer({ base: "", editions, currentDate: edition.date }),
  });
}

const STYLE = `:root {
  --bg: #faf9f6;
  --ink: #16181d;
  --muted: #5c5f66;
  --faint: #8a8d94;
  --line: #d9d8d1;
  --line-strong: #16181d;
  --accent: #c0151d;
  --study: #1f4e79;
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
  margin: 14px 0 18px;
}
.tagline {
  text-align: center; margin: 0; color: var(--muted);
  font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase;
}
.nav {
  display: flex; justify-content: center; flex-wrap: wrap; gap: 4px 26px;
  margin-top: 14px;
}
.nav-a {
  text-decoration: none; color: var(--muted);
  font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  padding: 4px 0; border-bottom: 2px solid transparent;
}
.nav-a:hover { color: var(--ink); }
.nav-a.current { color: var(--ink); border-bottom-color: var(--accent); }
.nav-a .short { display: none; }
.dateline {
  display: flex; justify-content: space-between; gap: 12px;
  margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--line);
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
.columns { column-count: 4; column-gap: 34px; column-rule: 1px solid var(--line); }
.columns.single { column-count: 1; }

.story {
  break-inside: avoid; -webkit-column-break-inside: avoid;
  padding-top: 18px; margin-bottom: 30px; border-top: 1px solid var(--line);
}
.story:first-child { padding-top: 0; border-top: 0; }
.story:last-child { margin-bottom: 0; }
.hed { font-family: var(--serif); font-weight: 700; font-size: 19px; line-height: 1.18; margin: 0 0 10px; }
.hed .hed-a { text-decoration: none; }
.hed .hed-a:hover { color: var(--accent); }
.dek {
  margin: 0 0 12px; font-size: 14.5px; color: #2c2f35;
  text-align: justify; hyphens: auto; -webkit-hyphens: auto;
}
.why {
  margin: 16px 0 14px; font-size: 13px; line-height: 1.6; color: var(--muted);
  border-left: 2px solid var(--accent); padding: 3px 0 3px 13px;
}
.why span { color: var(--accent); font-weight: 700; display: inline-block; margin-bottom: 1px; }
.byline { margin: 0; }
.src {
  font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
  color: var(--faint); text-decoration: none;
}
.src:hover { color: var(--accent); }
.src::after { content: " ↗"; }
.followup {
  margin-left: 12px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
  color: var(--study); text-decoration: none;
}
.followup:hover { text-decoration: underline; }
.ahead {
  margin: 22px 0 0; padding-top: 12px; border-top: 1px dashed var(--line);
  font-size: 13px; color: var(--muted); display: flex; flex-wrap: wrap; gap: 6px 22px; align-items: baseline;
}
.ahead-label { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink); }
.ahead-item b { color: var(--ink); font-weight: 700; }
.ahead-item a { color: inherit; }

/* Bitcoin charts */
.charts { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 4px 0 26px; }
.chart { margin: 0; border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; background: #fff; }
.chart figcaption {
  font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--muted); margin-bottom: 8px; font-weight: 600;
}

/* Lessons of the day (edition page band) */
.study { padding: 20px 0; border-bottom: 1px solid var(--line); }
.study .beat-label { border-bottom-color: var(--study); margin-bottom: 16px; }
.study-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.study-grid.cols-1 { grid-template-columns: 1fr; }
.lesson-card {
  display: flex; flex-direction: column; gap: 4px; text-decoration: none;
  background: #fff; border: 1px solid var(--line); border-left: 3px solid var(--study);
  border-radius: 8px; padding: 14px 18px 12px;
}
.lesson-card .kicker { color: var(--study); margin-bottom: 2px; font-size: 11px; }
.lesson-card-hed { font-family: var(--serif); font-weight: 700; font-size: 22px; line-height: 1.12; }
.lesson-card:hover .lesson-card-hed { color: var(--study); }
.lesson-card-sub { font-family: var(--serif); font-style: italic; font-size: 15px; color: var(--muted); }
.more {
  margin-top: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  text-decoration: none; color: var(--study);
}
.more::after { content: " \u2192"; }

/* Lesson page */
.lesson { max-width: 72ch; margin: 0 auto; padding: 26px 0 10px; }
.lesson-head { text-align: center; padding-bottom: 22px; border-bottom: 4px double var(--line-strong); }
.lesson-head .kicker { color: var(--study); }
.lesson-title {
  font-family: var(--serif); font-weight: 700; letter-spacing: -0.015em;
  font-size: clamp(30px, 5vw, 46px); line-height: 1.05; margin: 0;
}
.lesson-sub { font-family: var(--serif); font-style: italic; font-size: clamp(17px, 2vw, 21px); color: var(--muted); margin: 12px 0 0; }
.lesson-meta { margin: 14px 0 0; font-size: 11.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.lesson-meta a { color: var(--muted); }
.lesson-summary {
  font-family: var(--serif); font-size: clamp(17px, 2vw, 20px); line-height: 1.5; color: #2a2c31;
  margin: 24px 0 8px; padding-left: 16px; border-left: 3px solid var(--study);
}
.lesson-body { font-family: var(--serif); font-size: 18px; line-height: 1.65; color: #1d1f24; }
.lesson-body p { margin: 0 0 1.1em; text-align: justify; hyphens: auto; -webkit-hyphens: auto; }
.lesson-body h2 {
  font-family: var(--sans); font-size: 13px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ink); margin: 2em 0 0.8em; padding-top: 0.8em; border-top: 1px solid var(--line);
}
.lesson-body h3 { font-size: 20px; margin: 1.6em 0 0.5em; }
.lesson-body blockquote { margin: 1.2em 0; padding: 0 0 0 18px; border-left: 3px solid var(--line-strong); color: var(--muted); font-style: italic; }
.lesson-body ul { padding-left: 1.3em; margin: 0 0 1.1em; }
.lesson-body li { margin: 0.3em 0; }
.box { margin: 28px 0 0; padding: 18px 22px; background: #fff; border: 1px solid var(--line); border-radius: 10px; }
.box h2 { margin: 0 0 10px; font-size: 12px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--study); }
.box ul { margin: 0; padding-left: 1.2em; font-size: 15px; line-height: 1.55; color: #2c2f35; }
.box li { margin: 6px 0; }
.box.keep { border-top: 3px solid var(--study); }
.pager { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 34px 0 20px; padding-top: 18px; border-top: 1px solid var(--line); }
.pager-a { text-decoration: none; display: flex; flex-direction: column; gap: 4px; }
.pager-a.next { text-align: right; }
.pager-label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.pager-title { font-family: var(--serif); font-weight: 700; font-size: 17px; line-height: 1.2; }
.pager-a:hover .pager-title { color: var(--study); }

/* Catalogue page */
.cat-head { text-align: center; padding: 26px 0 22px; border-bottom: 4px double var(--line-strong); }
.cat-head .kicker { color: var(--study); }
.cat-title-big { font-family: var(--serif); font-weight: 700; letter-spacing: -0.015em; font-size: clamp(32px, 5vw, 50px); line-height: 1.05; margin: 0; }
.cat-blurb { font-family: var(--serif); font-size: clamp(16px, 2vw, 19px); color: #2a2c31; max-width: 62ch; margin: 14px auto 0; line-height: 1.45; }
.progress { height: 6px; background: #e9e8e2; border-radius: 3px; max-width: 420px; margin: 22px auto 0; overflow: hidden; }
.progress-bar { height: 100%; background: var(--study); }
.progress-label { margin: 8px 0 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.progress-label a { color: var(--ink); }
.cat-group { padding: 26px 0 8px; border-bottom: 1px solid var(--line); }
.cat-part { font-size: 13px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; margin: 0 0 14px; color: var(--ink); }
.cat-list { list-style: none; margin: 0; padding: 0; }
.cat-row {
  display: grid; grid-template-columns: 80px 1fr 64px; gap: 16px; align-items: baseline;
  padding: 14px 0; border-top: 1px solid var(--line);
}
.cat-n { font-size: 11.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--study); font-weight: 700; }
.cat-title { font-family: var(--serif); font-weight: 700; font-size: 20px; line-height: 1.2; text-decoration: none; }
.cat-title:hover { color: var(--study); }
.cat-title.plain { color: var(--muted); }
.cat-sub { display: block; font-family: var(--serif); font-style: italic; font-size: 15px; color: var(--muted); margin-top: 2px; }
.cat-dek { margin: 6px 0 0; font-size: 14.5px; color: #2c2f35; line-height: 1.5; }
.cat-date { font-size: 11.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint); text-align: right; }
.upcoming .cat-row { opacity: 0.85; }
.empty-note { font-family: var(--serif); text-align: center; color: var(--muted); padding: 40px 0; }

/* Footer */
footer { padding: 22px 0 60px; }
.arch-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.arch-label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin: 0; white-space: nowrap; }
.archive { display: flex; flex-wrap: wrap; gap: 7px; }
.chip.all { border-style: dashed; color: var(--ink); }
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
  .lead { text-align: left; padding: 24px 0 22px; }
  .lead-hed { font-size: clamp(25px, 2.7vw, 33px); line-height: 1.1; max-width: none; margin: 0; }
  .lead-dek {
    text-align: justify; hyphens: auto; -webkit-hyphens: auto; max-width: none; margin: 14px 0 0;
    font-size: clamp(15px, 1.25vw, 17px);
    column-count: 2; column-gap: 38px; column-rule: 1px solid var(--line);
  }
  .kicker { margin-bottom: 10px; }
  /* A lone story (e.g. its section's other item became the page lead) becomes a
     full-width feature: headline spans, body flows in two columns to fill the row. */
  .columns.single .hed { font-size: 21px; }
  .columns.single .dek { column-count: 2; column-gap: 38px; column-rule: 1px solid var(--line); }
  .columns.single .why { max-width: 64ch; }
}

@media (max-width: 720px) {
  .dateline { font-size: 10px; flex-direction: column; gap: 2px; }
  .nav { gap: 2px 18px; }
  .nav-a { font-size: 11px; }
  .nav-a .full { display: none; }
  .nav-a .short { display: inline; }
  .charts { grid-template-columns: 1fr; }
  .columns { column-rule: none; column-count: 1 !important; }
  .lead { padding: 22px 0 20px; }
  .lead-hed { font-size: clamp(23px, 6.4vw, 30px); max-width: none; }
  .lead-dek { font-size: 16px; margin-top: 12px; }
  .dek { text-align: left; }
  .study-grid { grid-template-columns: 1fr; gap: 18px; }
  .lesson-card-hed { font-size: 20px; }
  .lesson-body { font-size: 17px; }
  .lesson-body p { text-align: left; }
  .pager { grid-template-columns: 1fr; }
  .pager-a.next { text-align: left; }
  .cat-row { grid-template-columns: 1fr; gap: 4px; }
  .cat-date { text-align: left; }
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
  const lessonsByTrack = Object.fromEntries(TRACKS.map((t) => [t.slug, loadLessons(t)]));

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "style.css"), STYLE);
  writeFileSync(join(OUT_DIR, "favicon.svg"), FAVICON);
  writeFileSync(join(OUT_DIR, ".nojekyll"), "");

  // Lesson pages and catalogues (independent of whether any edition exists).
  for (const track of TRACKS) {
    const { lessons, curriculum } = lessonsByTrack[track.slug];
    const dir = join(OUT_DIR, track.slug);
    mkdirSync(dir, { recursive: true });
    lessons.forEach((lesson, i) => {
      writeFileSync(
        join(dir, lesson.href),
        renderLessonPage(track, lesson, lessons[i - 1] || null, lessons[i + 1] || null, editions),
      );
    });
    writeFileSync(join(dir, "index.html"), renderCatalogue(track, lessons, curriculum, editions));
  }

  if (editions.length === 0) {
    writeFileSync(
      join(OUT_DIR, "index.html"),
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${SITE_TITLE}</title><link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="style.css"></head><body><header class="masthead"><div class="wrap"><span class="nameplate">${SITE_TITLE}</span><p class="tagline">No editions yet — run the daily loop.</p></div></header></body></html>`,
    );
    console.log("No editions found — wrote placeholder index.");
    return;
  }

  writeFileSync(
    join(OUT_DIR, "index.html"),
    renderPage(editions[0], editions, true, lessonsByTrack),
  );
  for (const e of editions) {
    writeFileSync(
      join(OUT_DIR, `${e.date}.html`),
      renderPage(e, editions, false, lessonsByTrack),
    );
  }
  writeFileSync(join(OUT_DIR, "archive.html"), renderArchive(editions));
  const lessonCount = TRACKS.map(
    (t) => `${lessonsByTrack[t.slug].lessons.length} ${t.slug}`,
  ).join(", ");
  console.log(
    `Built ${editions.length} edition(s) and lessons (${lessonCount}). Latest: ${editions[0].date} → docs/index.html`,
  );
}

build();
