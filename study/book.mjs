#!/usr/bin/env node
// Builds the archived study tracks into one EPUB per track, in syllabus order:
//   node study/book.mjs            -> study/books/<track>.epub
// Self-contained apart from the EPUB packer in ../kindle.mjs. Lessons marked
// read in study/progress.json are not treated differently; the books are the
// whole track.

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { packEpub } from "../kindle.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "books");

const TRACKS = [
  { slug: "mental-models", label: "Mental Models", unit: "No." },
  { slug: "history", label: "History of Civilization", unit: "Chapter" },
];

const escapeHtml = (s = "") =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// Lesson markup: **bold** and *italic* inline; "## " subhead, "- " list, "> " quote.
const inline = (s = "") =>
  escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");

const renderBody = (body = []) =>
  body
    .map((raw) => {
      const s = String(raw).trim();
      if (!s) return "";
      if (s.startsWith("## ")) return `<h2>${inline(s.slice(3))}</h2>`;
      if (s.startsWith("### ")) return `<h3>${inline(s.slice(4))}</h3>`;
      if (s.startsWith("> ")) return `<blockquote><p>${inline(s.slice(2))}</p></blockquote>`;
      if (s.startsWith("- "))
        return `<ul>${s
          .split("\n")
          .map((l) => l.replace(/^-\s+/, "").trim())
          .filter(Boolean)
          .map((l) => `<li>${inline(l)}</li>`)
          .join("")}</ul>`;
      return `<p>${inline(s)}</p>`;
    })
    .join("\n");

function loadLessons(slug) {
  const dir = join(HERE, "lessons", slug);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")))
    .sort((a, b) => a.n - b.n);
}

function chapter(track, lesson) {
  const part = lesson.part ? ` · ${lesson.part.replace(/^Part\s+[IVXLC]+\s+—\s+/, "")}` : "";
  const reading = (lesson.reading || [])
    .map((r) => `<li><i>${escapeHtml(r.title)}</i>${r.by ? `, ${escapeHtml(r.by)}` : ""}</li>`)
    .join("");
  return {
    id: `${track.slug}-${String(lesson.n).padStart(3, "0")}`,
    title: `${lesson.n}. ${lesson.title}`,
    body: `<p class="kicker">${escapeHtml(`${track.unit} ${lesson.n}${part}`)}</p>
<h1>${escapeHtml(lesson.title)}</h1>
${lesson.subtitle ? `<p class="sub">${inline(lesson.subtitle)}</p>` : ""}
${lesson.summary ? `<p class="summary">${inline(lesson.summary)}</p>` : ""}
${renderBody(lesson.body)}
${reading ? `<div class="box"><h3>Further reading</h3><ul>${reading}</ul></div>` : ""}`,
  };
}

mkdirSync(OUT, { recursive: true });
for (const track of TRACKS) {
  const lessons = loadLessons(track.slug);
  if (!lessons.length) continue;
  const last = lessons[lessons.length - 1];
  const title = `${track.label} · ${lessons[0].n}–${last.n}`;
  const epub = packEpub({
    title,
    uid: `urn:daily-loop:study:${track.slug}:${last.n}`,
    date: last.date,
    chapters: lessons.map((l) => chapter(track, l)),
    escapeHtml,
  });
  const path = join(OUT, `${track.slug}.epub`);
  writeFileSync(path, epub);
  console.log(`${path}: ${title}, ${lessons.length} chapters, ${Math.round(epub.length / 1024)} KB`);
}
