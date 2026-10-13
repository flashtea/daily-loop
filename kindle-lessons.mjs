#!/usr/bin/env node
// Lessons-only EPUBs for Send to Kindle.
//
//   node kindle-lessons.mjs --week [--until YYYY-MM-DD] --out DIR
//       one book with every lesson dated in the seven days ending --until
//       (default: today, UTC); nothing is written when the week has no lesson.
//   node kindle-lessons.mjs --books --out DIR
//       one catch-up book per track with every lesson written so far.
//
// Titles name the contents, e.g. "Daily Loop · Mental Models 7–8 · History 7–8".
// Prints the path of each file written, one per line, for the workflow.

import { join } from "node:path";
import {
  TRACKS,
  loadLessons,
  escapeHtml,
  inline,
  renderBody,
  mediumDate,
  lessonKicker,
} from "./build.mjs";
import { buildLessonsEpub } from "./kindle.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const outDir = opt("--out", "out");
const helpers = { escapeHtml, inline, renderBody, mediumDate, lessonKicker };

const byTrack = TRACKS.map((track) => ({ track, lessons: loadLessons(track).lessons }));

const range = (ns) => (ns.length === 1 ? `${ns[0]}` : `${ns[0]}–${ns[ns.length - 1]}`);
const titleFor = (items) =>
  "Daily Loop · " +
  TRACKS.filter((t) => items.some((it) => it.track.slug === t.slug))
    .map((t) => `${t.label} ${range(items.filter((it) => it.track.slug === t.slug).map((it) => it.lesson.n))}`)
    .join(" · ");

const written = [];

if (flag("--week")) {
  const until = opt("--until", new Date().toISOString().slice(0, 10));
  const since = new Date(Date.parse(until) - 6 * 86400e3).toISOString().slice(0, 10);
  const items = byTrack
    .flatMap(({ track, lessons }) => lessons.filter((l) => l.date >= since && l.date <= until).map((lesson) => ({ track, lesson })))
    .sort((a, b) => a.lesson.date.localeCompare(b.lesson.date) || a.track.slug.localeCompare(b.track.slug));
  if (items.length) {
    const outPath = join(outDir, `daily-loop-lessons-${since}-to-${until}.epub`);
    const r = buildLessonsEpub({ title: titleFor(items), uid: `urn:daily-loop:lessons:${since}:${until}`, date: until, items, outPath, helpers });
    written.push([outPath, r]);
  } else {
    console.error(`no lessons dated ${since}..${until}`);
  }
}

if (flag("--books")) {
  for (const { track, lessons } of byTrack) {
    if (!lessons.length) continue;
    const items = lessons.map((lesson) => ({ track, lesson }));
    const outPath = join(outDir, `daily-loop-${track.slug}-${range(items.map((it) => it.lesson.n)).replace("–", "-")}.epub`);
    const date = lessons[lessons.length - 1].date;
    const r = buildLessonsEpub({ title: titleFor(items), uid: `urn:daily-loop:book:${track.slug}:${date}`, date, items, outPath, helpers });
    written.push([outPath, r]);
  }
}

if (!flag("--week") && !flag("--books")) {
  console.error("usage: node kindle-lessons.mjs (--week [--until YYYY-MM-DD] | --books) [--out DIR]");
  process.exit(2);
}
for (const [p, r] of written) console.log(`${p}\t${r.chapters} chapters, ${Math.round(r.bytes / 1024)} KB`);
