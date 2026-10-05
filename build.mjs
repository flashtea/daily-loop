#!/usr/bin/env node
// Daily Loop — static site builder.
// Reads every editions/*.json and lessons/<track>/*.json and renders the site
// into docs/. Zero dependencies; run with: node build.mjs

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { buildEpub } from "./kindle.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const EDITIONS_DIR = join(ROOT, "editions");
const LESSONS_DIR = join(ROOT, "lessons");
const CURRICULUM_DIR = join(ROOT, "curriculum");
const OUT_DIR = join(ROOT, "docs");

const SITE_TITLE = "Daily Loop";
const SITE_TAGLINE = "World · AI · Software · Money — plus a daily lesson";

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

function masthead({ base, dateline, activeNav }) {
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
      const when = a.date ? `<b>${escapeHtml(/^\d{4}-\d{2}-\d{2}$/.test(a.date) ? shortDate(a.date) : a.date)}</b> ` : "";
      const what = a.url
        ? `<a href="${escapeHtml(a.url)}" target="_blank" rel="noopener">${escapeHtml(a.what)}</a>`
        : escapeHtml(a.what);
      return `<span class="ahead-item">${when}${what}</span>`;
    })
    .join("");
  return `<p class="ahead"><span class="ahead-label">Ahead</span>${parts}</p>`;
}

// ---------- Bitcoin chart: weekly close vs 200-week moving average ----------
// Data comes from data/btc-weekly.json (written by fetch-btc.mjs). The chart
// is a static inline SVG on a log scale, with a small hover layer; no
// third-party script. Deliberately long-horizon: this is not for watching
// the price.

const CHART_YEARS = 8;
const WMA_WEEKS = 200;
const CHART_PRICE = "#c0151d"; // masthead red
const CHART_WMA = "#2b6cb0"; // validated against the red for CVD separation

function loadBtcWeekly() {
  try {
    const d = JSON.parse(readFileSync(join(ROOT, "data", "btc-weekly.json"), "utf8"));
    if (!Array.isArray(d.weeks) || d.weeks.length < WMA_WEEKS + 52) return null;
    return d;
  } catch {
    return null;
  }
}

const fmtUsd = (v) =>
  v >= 1000
    ? "$" + Math.round(v).toLocaleString("en-US")
    : "$" + v.toLocaleString("en-US", { maximumFractionDigits: 2 });

function logTicks(lo, hi) {
  const series = [
    [1, 2, 5],
    [1, 3],
    [1],
  ];
  for (const mult of series) {
    const ticks = [];
    for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) {
      for (const m of mult) {
        const v = m * 10 ** e;
        if (v >= lo && v <= hi) ticks.push(v);
      }
    }
    if (ticks.length <= 6) return ticks;
  }
  return [];
}

// Builds the SVG for one viewport size. Two are emitted (desktop and phone
// proportions) and CSS shows one, so text is never stretched.
function bitcoinChartSvg(data, W, H) {
  const weeks = data.weeks;
  // 200-week simple moving average of weekly closes.
  const wma = new Array(weeks.length).fill(null);
  let sum = 0;
  for (let i = 0; i < weeks.length; i++) {
    sum += weeks[i][1];
    if (i >= WMA_WEEKS) sum -= weeks[i - WMA_WEEKS][1];
    if (i >= WMA_WEEKS - 1) wma[i] = sum / WMA_WEEKS;
  }
  const asOf = data.asOf || weeks[weeks.length - 1][0];
  const start = new Date(`${asOf}T00:00:00Z`);
  start.setUTCFullYear(start.getUTCFullYear() - CHART_YEARS);
  const startIso = start.toISOString().slice(0, 10);
  const idx = [];
  for (let i = 0; i < weeks.length; i++) if (weeks[i][0] >= startIso && wma[i]) idx.push(i);
  if (idx.length < 52) return null;

  const narrow = W < 600;
  const padL = 8, padR = narrow ? 58 : 64, padT = 14, padB = 26;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const t0 = Date.parse(weeks[idx[0]][0]);
  const t1 = Date.parse(asOf);
  let lo = Infinity, hi = 0;
  for (const i of idx) {
    lo = Math.min(lo, weeks[i][1], wma[i]);
    hi = Math.max(hi, weeks[i][1], wma[i]);
  }
  lo = lo / 1.15; hi = hi * 1.15;
  const x = (iso) => padL + ((Date.parse(iso) - t0) / (t1 - t0)) * plotW;
  const y = (v) => padT + plotH - ((Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * plotH;
  const pts = (get) => idx.map((i) => `${x(weeks[i][0]).toFixed(1)},${y(get(i)).toFixed(1)}`).join(" ");

  const last = idx[idx.length - 1];
  const lastPrice = weeks[last][1], lastWma = wma[last];
  let ticks = logTicks(lo, hi);
  if (narrow && ticks.length > 4) ticks = ticks.filter((_, k) => k % 2 === 0);
  // Gridline for every tick; label only where it won't sit under an end label.
  const nearEnd = (v) => Math.abs(y(v) - y(lastPrice)) < 13 || Math.abs(y(v) - y(lastWma)) < 13;
  const yTicks = ticks
    .map(
      (v) => `<line x1="${padL}" x2="${padL + plotW}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="grid"/>${
        nearEnd(v) ? "" : `<text x="${padL + plotW + 8}" y="${(y(v) + 4).toFixed(1)}" class="tick">${fmtUsd(v)}</text>`
      }`,
    )
    .join("");
  const xTicks = [];
  const yearStep = narrow ? 2 : 1;
  for (let yr = new Date(t0).getUTCFullYear() + 1; yr <= new Date(t1).getUTCFullYear(); yr++) {
    const iso = `${yr}-01-01`;
    if (Date.parse(iso) < t0) continue;
    const labeled = (yr - new Date(t1).getUTCFullYear()) % yearStep === 0;
    xTicks.push(
      `<line x1="${x(iso).toFixed(1)}" x2="${x(iso).toFixed(1)}" y1="${padT}" y2="${padT + plotH}" class="grid"/>${
        labeled ? `<text x="${x(iso).toFixed(1)}" y="${H - 8}" class="tick mid">${yr}</text>` : ""
      }`,
    );
  }

  let yP = y(lastPrice), yW = y(lastWma);
  if (Math.abs(yP - yW) < 14) {
    const mid = (yP + yW) / 2;
    const priceAbove = yP <= yW;
    yP = priceAbove ? mid - 7 : mid + 7;
    yW = priceAbove ? mid + 7 : mid - 7;
  }
  const endLabel = (cx, cy, ly, color, text) =>
    `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="${color}" stroke="#fff" stroke-width="2"/>
     <text x="${(padL + plotW + 8).toFixed(1)}" y="${(ly + 4).toFixed(1)}" class="endlab">${text}</text>`;
  const series = idx.map((i) => [weeks[i][0], weeks[i][1], Math.round(wma[i])]);

  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bitcoin weekly price and ${WMA_WEEKS}-week moving average, log scale" data-series='${escapeHtml(JSON.stringify(series))}' data-pad="${padL},${padR},${padT},${padB}">
            ${yTicks}
            ${xTicks.join("")}
            <polyline points="${pts((i) => weeks[i][1])}" fill="none" stroke="${CHART_PRICE}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
            <polyline points="${pts((i) => wma[i])}" fill="none" stroke="${CHART_WMA}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
            ${endLabel(x(asOf), y(lastPrice), yP, CHART_PRICE, fmtUsd(lastPrice))}
            ${endLabel(x(asOf), y(lastWma), yW, CHART_WMA, fmtUsd(lastWma))}
            <g class="hover" style="display:none">
              <line class="xhair" y1="${padT}" y2="${padT + plotH}"/>
              <circle r="4" fill="${CHART_PRICE}" stroke="#fff" stroke-width="2"/>
              <circle r="4" fill="${CHART_WMA}" stroke="#fff" stroke-width="2"/>
            </g>
          </svg>`;
  return { svg, asOf, lastPrice, lastWma };
}

function bitcoinChart() {
  const data = loadBtcWeekly();
  if (!data) return "";
  const wide = bitcoinChartSvg(data, 960, 300);
  const narrow = bitcoinChartSvg(data, 400, 260);
  if (!wide || !narrow) return "";
  const ratio = wide.lastPrice / wide.lastWma;

  return `<figure class="chart btc">
        <figcaption>
          <span class="chart-title">Bitcoin · weekly close vs ${WMA_WEEKS}-week moving average · log scale · last ${CHART_YEARS} years</span>
          <span class="legend"><span class="key" style="background:${CHART_PRICE}"></span>Price<span class="key" style="background:${CHART_WMA}"></span>${WMA_WEEKS}-week average</span>
        </figcaption>
        <div class="chart-wrap wide">${wide.svg}<div class="tip" style="display:none"></div></div>
        <div class="chart-wrap narrow">${narrow.svg}<div class="tip" style="display:none"></div></div>
        <p class="chart-note">Price is ${ratio.toFixed(2)}× the ${WMA_WEEKS}-week average. Weekly closes, USD, as of ${escapeHtml(mediumDate(wide.asOf))} · data ${escapeHtml(data.source || "")}.</p>
      </figure>
      <script>
      (function(){
        var fig=document.currentScript.previousElementSibling; if(!fig) return;
        var fmt=function(v){return '$'+Math.round(v).toLocaleString('en-US');};
        fig.querySelectorAll('.chart-wrap').forEach(function(wrap){
          var svg=wrap.querySelector('svg'), tip=wrap.querySelector('.tip'), hov=svg.querySelector('.hover');
          var series=JSON.parse(svg.getAttribute('data-series')), pad=svg.getAttribute('data-pad').split(',').map(Number);
          var vb=svg.viewBox.baseVal, plotW=vb.width-pad[0]-pad[1];
          function show(ev){
            var r=svg.getBoundingClientRect(), fx=(ev.clientX-r.left)/r.width*vb.width;
            var k=Math.round((fx-pad[0])/plotW*(series.length-1)); k=Math.max(0,Math.min(series.length-1,k));
            var d=series[k], xs=pad[0]+k/(series.length-1)*plotW;
            var pts=svg.querySelectorAll('polyline');
            var yP=pts[0].points.getItem(k).y, yW=pts[1].points.getItem(k).y;
            var l=hov.querySelector('line'), c=hov.querySelectorAll('circle');
            l.setAttribute('x1',xs); l.setAttribute('x2',xs);
            c[0].setAttribute('cx',xs); c[0].setAttribute('cy',yP); c[1].setAttribute('cx',xs); c[1].setAttribute('cy',yW);
            hov.style.display='';
            tip.innerHTML='<b>'+d[0]+'</b><br>Price '+fmt(d[1])+'<br>Average '+fmt(d[2]);
            tip.style.display='';
            var px=xs/vb.width*r.width; tip.style.left=(px>r.width*0.65?px-tip.offsetWidth-12:px+12)+'px';
          }
          function hide(){hov.style.display='none'; tip.style.display='none';}
          svg.addEventListener('mousemove',show); svg.addEventListener('mouseleave',hide);
          svg.addEventListener('touchstart',function(e){show(e.touches[0]);},{passive:true});
          svg.addEventListener('touchmove',function(e){show(e.touches[0]);},{passive:true});
          svg.addEventListener('touchend',hide);
        });
      })();
      </script>`;
}

function renderSection(section, lead, editions) {
  const all = section.items || [];
  const hasLead = all.includes(lead);
  // The lead story runs full-width at the top of its own section; the rest
  // flow in columns beneath it.
  const featured = hasLead ? renderStory(lead, editions, true) : "";
  const visible = all.filter((it) => it !== lead);
  const items = visible.map((it) => renderStory(it, editions)).join("\n");
  const chart = /^(bitcoin|money)$/i.test(section.title.trim()) ? BTC_CHART : "";
  const ahead = aheadLine(section);
  if (!featured && !items.trim() && !chart && !ahead) return "";
  // Match the column count to the number of stories so short sections fill the
  // row instead of leaving empty column tracks (capped at 4 for readability).
  const cols = Math.min(Math.max(visible.length, 1), 4);
  const cls = cols === 1 ? "columns single" : "columns";
  const columns = items.trim()
    ? `<div class="${cls}" style="column-count:${cols}">
${items}
      </div>`
    : "";
  return `<section class="beat${hasLead ? " has-lead" : ""}">
      <h2 class="beat-label">${escapeHtml(section.title)}</h2>
      ${featured}
      ${columns}
      ${chart}
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
  const lead = leadOf(edition);

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

  const sections = (edition.sections || [])
    .map((s) => renderSection(s, lead, editions))
    .join("\n");
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
    }),
    main: `${renderLessonBand(dayLessons)}
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
.rule { height: 3px; background: var(--line-strong); margin: 14px 0 0; }
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

/* Featured (lead) story: full width at the top of its section */
.story.featured { padding: 0 0 22px; margin: 0 0 22px; border-top: 0; border-bottom: 1px solid var(--line); }
.story.featured .hed { font-size: clamp(24px, 3.2vw, 34px); line-height: 1.1; letter-spacing: -0.01em; margin-bottom: 12px; }
.story.featured .dek { font-family: var(--serif); font-size: clamp(15px, 1.4vw, 17px); line-height: 1.5; }
.kicker {
  margin: 0 0 12px; color: var(--accent);
  font-size: 12px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
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

/* Bitcoin chart */
.chart { margin: 24px 0 0; border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px 10px; background: #fff; }
.chart figcaption {
  display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--muted); margin-bottom: 6px; font-weight: 600;
}
.chart .legend { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.chart .key { display: inline-block; width: 14px; height: 3px; border-radius: 2px; margin-left: 10px; }
.chart .legend .key:first-child { margin-left: 0; }
.chart-wrap { position: relative; }
.chart-wrap.narrow { display: none; }
.chart svg { display: block; width: 100%; height: auto; }
.chart .grid { stroke: #ebeae4; stroke-width: 1; vector-effect: non-scaling-stroke; }
.chart .tick { font-family: var(--sans); font-size: 11px; fill: var(--faint); font-variant-numeric: tabular-nums; }
.chart .tick.mid { text-anchor: middle; }
.chart .endlab { font-family: var(--sans); font-size: 11.5px; font-weight: 700; fill: var(--ink); font-variant-numeric: tabular-nums; }
.chart .xhair { stroke: var(--line-strong); stroke-width: 1; vector-effect: non-scaling-stroke; opacity: 0.5; }
.chart .tip {
  position: absolute; top: 10px; pointer-events: none; background: var(--ink); color: #fff;
  font-size: 12px; line-height: 1.4; padding: 6px 9px; border-radius: 6px; white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.chart-note { margin: 8px 0 0; font-size: 12px; color: var(--muted); }
@media (max-width: 720px) { .chart-wrap.wide { display: none; } .chart-wrap.narrow { display: block; } .chart .tick { font-size: 12px; } .chart .endlab { font-size: 12.5px; } }

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

@media (min-width: 721px) {
  .story.featured .dek { column-count: 2; column-gap: 38px; column-rule: 1px solid var(--line); }
  .story.featured .why { max-width: 70ch; }
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
  .columns { column-rule: none; column-count: 1 !important; }
  .story.featured .hed { font-size: 25px; }
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

const BTC_CHART = bitcoinChart();

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

  // Kindle edition of the latest paper (docs/kindle/<date>.epub + latest.epub).
  const latest = editions[0];
  const latestLessons = TRACKS.flatMap((track) => {
    const lesson = (lessonsByTrack[track.slug]?.lessons || []).find((l) => l.date === latest.date);
    return lesson ? [{ track, lesson }] : [];
  });
  const epub = buildEpub({
    edition: latest,
    dayLessons: latestLessons,
    outDir: join(OUT_DIR, "kindle"),
    helpers: { escapeHtml, inline, renderBody, mediumDate, lessonKicker },
  });
  console.log(`Kindle edition: docs/kindle/${latest.date}.epub (${epub.chapters} chapters, ${Math.round(epub.bytes / 1024)} KB)`);
  const lessonCount = TRACKS.map(
    (t) => `${lessonsByTrack[t.slug].lessons.length} ${t.slug}`,
  ).join(", ");
  console.log(
    `Built ${editions.length} edition(s) and lessons (${lessonCount}). Latest: ${editions[0].date} → docs/index.html`,
  );
}

build();
