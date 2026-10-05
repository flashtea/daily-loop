#!/usr/bin/env node
// Narrates lessons to MP3 with OpenAI's text-to-speech API.
// Usage: node tts.mjs <out-dir> <lesson.json> [<lesson.json> ...]
// Env:   OPENAI_API_KEY (required), TTS_VOICE (default "onyx"),
//        TTS_MODEL (default "gpt-4o-mini-tts").
// Needs ffmpeg on PATH to join the per-chunk segments. Run by
// .github/workflows/audio.yml, not by the daily routine.

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { basename, join, dirname } from "node:path";
import { execFileSync } from "node:child_process";

const API_KEY = process.env.OPENAI_API_KEY;
const VOICE = process.env.TTS_VOICE || "onyx";
const MODEL = process.env.TTS_MODEL || "gpt-4o-mini-tts";
const MAX_CHARS = 3800; // API limit is 4096 per request

const INSTRUCTIONS =
  "Narrate as a calm, deliberate, deep-voiced reader: unhurried pace, long sentences carried through, slight emphasis on the key idea in each paragraph, no theatrics.";

const trackLabel = (slug) => (slug === "history" ? "History of Civilization" : "Mental Models");

// Turn a lesson into plain narration text: title, subtitle, body with
// subheads spoken as short pauses, then the takeaways.
function narrationText(lesson) {
  const parts = [];
  const unit = lesson.track === "history" ? "Chapter" : "Lesson";
  parts.push(`${trackLabel(lesson.track)}. ${unit} ${lesson.n}: ${lesson.title}.`);
  if (lesson.subtitle) parts.push(`${lesson.subtitle}.`);
  for (const raw of lesson.body || []) {
    const s = String(raw).trim();
    if (!s) continue;
    if (s.startsWith("## ")) parts.push(`\n${s.slice(3)}.\n`);
    else if (s.startsWith("### ")) parts.push(`\n${s.slice(4)}.\n`);
    else if (s.startsWith("> ")) parts.push(s.slice(2));
    else if (s.startsWith("- ")) parts.push(s.split("\n").map((l) => l.replace(/^-\s+/, "")).join(". "));
    else parts.push(s);
  }
  if (lesson.takeaways?.length) {
    parts.push("\nTo keep.\n");
    parts.push(lesson.takeaways.join(" "));
  }
  return parts
    .join("\n\n")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/\n{3,}/g, "\n\n");
}

function chunk(text) {
  const paras = text.split(/\n\n+/);
  const chunks = [];
  let cur = "";
  for (const p of paras) {
    if ((cur + "\n\n" + p).length > MAX_CHARS && cur) {
      chunks.push(cur);
      cur = p;
    } else {
      cur = cur ? cur + "\n\n" + p : p;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

async function speak(text) {
  if (process.env.TTS_DRY_RUN) return Buffer.from(`[dry run: ${text.length} chars]\n${text}\n`);
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, voice: VOICE, input: text, instructions: INSTRUCTIONS, response_format: "mp3" }),
    signal: AbortSignal.timeout(180000),
  });
  if (!r.ok) throw new Error(`TTS ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return Buffer.from(await r.arrayBuffer());
}

async function narrate(lessonPath, outDir) {
  const lesson = JSON.parse(readFileSync(lessonPath, "utf8"));
  const slug = basename(lessonPath).replace(/\.json$/, "");
  const track = lesson.track || basename(dirname(lessonPath));
  const out = join(outDir, `${track}--${slug}.mp3`);
  const text = narrationText({ ...lesson, track });
  const pieces = chunk(text);
  const tmp = join(outDir, `.tmp-${track}-${slug}`);
  mkdirSync(tmp, { recursive: true });
  const files = [];
  for (let i = 0; i < pieces.length; i++) {
    const f = join(tmp, `${String(i).padStart(2, "0")}.mp3`);
    writeFileSync(f, await speak(pieces[i]));
    files.push(f);
  }
  if (files.length === 1 || process.env.TTS_DRY_RUN) {
    writeFileSync(out, Buffer.concat(files.map((f) => readFileSync(f))));
  } else {
    const list = join(tmp, "list.txt");
    writeFileSync(list, files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n"));
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", out]);
  }
  rmSync(tmp, { recursive: true, force: true });
  let seconds = null;
  try {
    seconds = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).toString().trim());
  } catch {}
  console.log(`${out}  ${text.length} chars, ${pieces.length} chunk(s)${seconds ? `, ${Math.round(seconds)}s` : ""}`);
  return { file: out, key: `${track}/${slug}`, seconds };
}

async function main() {
  const [outDir, ...lessons] = process.argv.slice(2);
  if (!API_KEY && !process.env.TTS_DRY_RUN) {
    console.error("OPENAI_API_KEY is not set.");
    process.exit(2);
  }
  if (!outDir || !lessons.length) {
    console.error("usage: node tts.mjs <out-dir> <lesson.json> ...");
    process.exit(2);
  }
  mkdirSync(outDir, { recursive: true });
  const results = [];
  for (const l of lessons) results.push(await narrate(l, outDir));
  writeFileSync(join(outDir, "narrated.json"), JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
