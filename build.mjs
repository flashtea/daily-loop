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
      <a class="brand" href="${base}index.html">${SITE_TITLE}<span>${escapeHtml(SITE_TAGLINE)}</span></a>
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

// ---------- Bitcoin chart: weekly close vs 200-week moving average ----------
// Data comes from data/btc-weekly.json (written by fetch-btc.mjs). The chart
// is a static inline SVG on a log scale, with a small hover layer; no
// third-party script. Deliberately long-horizon: this is not for watching
// the price.

const CHART_YEARS = 8;
const WMA_WEEKS = 200;
const CHART_PRICE = "var(--c-price)"; // tea amber, as on flashtea.dev
const CHART_WMA = "var(--c-avg)"; // slate; differs from the amber in lightness too

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
    `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="${color}" stroke="var(--paper)" stroke-width="2"/>
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
              <circle r="4" fill="${CHART_PRICE}" stroke="var(--paper)" stroke-width="2"/>
              <circle r="4" fill="${CHART_WMA}" stroke="var(--paper)" stroke-width="2"/>
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
  const visible = all.filter((it) => it !== lead);
  const items = visible.map((it) => renderStory(it, editions)).join("\n");
  const chart = /^(bitcoin|money)$/i.test(section.title.trim()) ? BTC_CHART : "";
  const ahead = aheadLine(section);
  if (!items.trim() && !chart && !ahead) return "";
  const n = visible.length + (hasLead ? 1 : 0);
  return `<section class="beat">
      <h2 class="label">${escapeHtml(section.title)}<span>${n} ${n === 1 ? "story" : "stories"}${hasLead ? ", lead above" : ""}</span></h2>
      <div class="beat-body${ahead ? "" : " solo"}">
        ${items.trim() ? `<div class="stories">\n${items}\n        </div>` : "<div></div>"}
        ${ahead}
        ${chart}
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
            <span class="cat-date">${count} stories</span>
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
  const meta = `<p class="meta">No. ${no} · ${escapeHtml(longDate(edition.date))} · ${itemCount} stories</p>`;
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

  const sections = (edition.sections || [])
    .map((s) => renderSection(s, lead, editions))
    .join("\n");
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
   one colour, IBM Plex. The band at the top stays dark in both themes and carries the lead story; below it each
   section has a mono label rail on the left and its stories in a ruled grid. */
:root {
  --paper: #f6f6f3; --surface: #ffffff; --ink: #17181a; --ink-2: #44474a; --muted: #63686d; --rule: #dcdbd4;
  --accent: #9a560b; --c-price: #c47a12; --c-avg: #5f6b78;
  --band-bg: #17181a; --band-ink: #f0efe9; --band-muted: #a3a49d; --band-rule: #2f302c; --band-accent: #e9a445;
  --maxw: 1180px;
  --display: "IBM Plex Sans Condensed", "Arial Narrow", sans-serif;
  --body: "IBM Plex Sans", -apple-system, "Segoe UI", system-ui, sans-serif;
  --serif: "IBM Plex Serif", Georgia, serif;
  --mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --paper: #131311; --surface: #1a1a17; --ink: #ecebe6; --ink-2: #c2c1ba; --muted: #8f9089; --rule: #2c2c28;
    --accent: #e9a445; --c-price: #e9a445; --c-avg: #8fa3b8;
    --band-bg: #1f1f1b; --band-rule: #36362f;
    color-scheme: dark;
  }
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
.brand { display: flex; align-items: baseline; gap: 12px; font-weight: 600; font-size: 17px; letter-spacing: -.01em; text-decoration: none; white-space: nowrap; }
.brand span { font: 400 12.5px var(--mono); color: var(--muted); letter-spacing: 0; }
.top nav { display: flex; gap: 22px; font-size: 14.5px; }
.top nav a { text-decoration: none; color: var(--ink-2); padding-block: 4px; border-bottom: 1px solid transparent; }
.top nav a:hover { color: var(--ink); border-color: var(--rule); }
.top nav a[aria-current="page"] { color: var(--ink); border-color: var(--accent); }

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
.label { margin: 0; padding-top: 18px; font: 400 13px/1.6 var(--mono); color: var(--ink); }
.label span { display: block; color: var(--muted); margin-top: 2px; }
.beat-body { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 0 40px; align-items: start; }
.beat-body.solo { grid-template-columns: minmax(0, 1fr); }
.beat-body .chart { grid-column: 1 / -1; }
.stories { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0 36px; }
.story { padding: 18px 0 22px; border-top: 1px solid var(--rule); }
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
.ahead h3 { font: 400 12.5px var(--mono); color: var(--muted); margin: 0; padding: 18px 0 6px; border-top: 1px solid var(--rule); }
.ahead ul { list-style: none; margin: 0; padding: 0; }
.ahead li { display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 12px; padding: 7px 0; border-top: 1px solid var(--rule); font-size: 14px; line-height: 1.5; color: var(--ink-2); }
.ahead li:first-child { border-top: 0; }
.ahead .when { font: 12.5px/1.9 var(--mono); color: var(--ink); font-variant-numeric: tabular-nums; }
.ahead a { text-underline-offset: 3px; }

/* bitcoin chart */
.chart { margin: 18px 0 8px; padding-top: 16px; border-top: 1px solid var(--rule); }
.chart figcaption { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 20px; font: 12.5px var(--mono); color: var(--muted); }
.legend { display: inline-flex; align-items: center; gap: 6px; }
.key { display: inline-block; width: 12px; height: 3px; margin-left: 10px; }
.key:first-child { margin-left: 0; }
.chart-wrap { position: relative; margin-top: 10px; }
.chart-wrap svg { display: block; width: 100%; height: auto; overflow: visible; }
.chart-wrap.narrow { display: none; }
.chart .grid { stroke: var(--rule); stroke-width: 1; }
.chart .tick { font: 11px var(--mono); fill: var(--muted); }
.chart .tick.mid { text-anchor: middle; }
.chart .endlab { font: 500 11.5px var(--mono); fill: var(--ink); }
.chart .xhair { stroke: var(--muted); stroke-width: 1; stroke-dasharray: 2 3; }
.tip { position: absolute; top: 8px; pointer-events: none; background: var(--surface); border: 1px solid var(--rule); border-radius: 2px; padding: 6px 9px; font: 12px/1.5 var(--mono); color: var(--ink-2); white-space: nowrap; }
.tip b { color: var(--ink); font-weight: 500; }
.chart-note { margin: 8px 0 0; font-size: 13.5px; color: var(--muted); }

/* archive */
.cat-list { list-style: none; margin: 0; padding: 0; }
.cat-row { display: grid; grid-template-columns: 70px minmax(0, 1fr) auto; gap: 18px; align-items: baseline; padding: 14px 0; border-top: 1px solid var(--rule); }
.cat-row:first-child { padding-top: 18px; }
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
  .beat-body { grid-template-columns: minmax(0, 1fr); }
  .beat, .arch-row { grid-template-columns: minmax(0, 1fr); gap: 4px; padding-block: 24px; }
  .label { padding-top: 0; }
  .label span { display: inline; margin-left: 8px; }
  .chart-wrap.wide { display: none; } .chart-wrap.narrow { display: block; }
}
@media (max-width: 520px) {
  .brand span { display: none; }
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

const BTC_CHART = bitcoinChart();

function build() {
  const editions = loadEditions();

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "style.css"), STYLE);
  writeFileSync(join(OUT_DIR, "favicon.svg"), FAVICON);
  writeFileSync(join(OUT_DIR, ".nojekyll"), "");

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
