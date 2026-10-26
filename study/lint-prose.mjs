#!/usr/bin/env node
// Flags the mechanical marks of machine prose in lesson bodies.
// Usage: node study/lint-prose.mjs study/lessons/history/006-out-of-africa.json [more files...]
//        node study/lint-prose.mjs --all
// Exit code 1 when any hard flag fires (FAIL). Soft warnings (warn) are for judgment.
// A clean run is necessary, not sufficient.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
let files = args.filter((a) => !a.startsWith("--"));
if (args.includes("--all")) {
  for (const t of ["mental-models", "history"]) {
    const dir = path.join(HERE, "lessons", t);
    files.push(...fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => path.join(dir, f)));
  }
}
if (!files.length) {
  console.error("usage: node study/lint-prose.mjs <lesson.json> [...] | --all");
  process.exit(2);
}

const SOFT_LABELS = new Set(["short hook opener","short payoff closer","repeated sentence opener"]);
const HARD = [
  [/\b(?:not|never|no longer|nothing)\b[^.;:?!]{1,70}?\b(?:but|rather)\b/i, "negative parallelism (not X but Y)"],
  [/\bnot (?:just|merely|only|simply) \b/i, "negative parallelism (not just X)"],
  [/\b(?:was|is|were) never the (?:problem|point|question)\b/i, "negative parallelism (X was never the problem)"],
  [/\b(?:is|was) not quite the (?:word|point|right)/i, "self-correcting flourish"],
  [/\b(?:That|This|Which) is (?:why|the|what) \b/, "aphoristic pivot (that is why / that is the)"],
  [/\b(?:serves|stands|served|stood) as\b/i, "'serves as' for 'is'"],
  [/\ba testament to\b|\bpivotal\b|\btransformative\b|\bunderscor(?:e|es|ing)\b|\btapestry\b|\blandscape of\b|\bdelve\b|\bcrucial\b/i, "inflation vocabulary"],
  [/,\s+(?:highlighting|underscoring|emphasizing|showcasing|reflecting|demonstrating|signalling|signaling)\b/i, "-ing tail attaching significance"],
  [/\?\s*$|\?\s+[A-Z]/, "rhetorical question"],
  [/(?:^|[.!?]\s+)(?:I|We)\b|\b(?:I'm|I've|I'd|we're|we've|our|ours)\b/, "first person"],
  [/\bHere(?:'s| is) the (?:thing|kicker|catch)\b|\bthe real (?:question|point|story) is\b|\bIt(?:'s| is) worth noting\b|\bIt(?:'s| is) important to (?:note|remember)\b|\bAt its core\b|\bIn other words\b|\bPut differently\b|\bThink of it as\b/i, "template phrase"],
  // Marks of the daily delivery. A lesson is a chapter of a book read in any order, years later.
  [/\b(?:tomorrow|yesterday)\b|\btoday's\b/i, "delivery-day reference (tomorrow / yesterday / today's)"],
  [/\b(?:this|the) series\b(?!\s+of)|\balready in the series\b|\bthis (?:track|newsletter)\b|\bthe series\b(?!\s+of)|\bthis loop\b|\bdaily loop\b/i, "reference to the series or the loop"],
  [/\b(?:previous|next|last|first|earlier|later) (?:chapter|lesson)s?\b(?! of)|\b(?:chapter|lesson) (?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b|\bchapters? (?:ahead|so far|to come)\b/i, "reference to another lesson by position (use the idea's name)"],
  [/\bPart (?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV)\b/, "reference to a syllabus part"],
  [/\b(?:on|from) (?:a|the|the reader's|their|your) phone\b|\bover coffee\b|\bthe reader's phone\b/i, "reference to the reading device or occasion"],
];

const countTriads = (t) => (t.match(/\b[\w'-]+, [\w'-]+,? and [\w'-]+\b/g) || []).length;
const sentences = (t) =>
  (t.replace(/(\d)\.(\d)/g, "$1\u2024$2").match(/[^.!?]+[.!?]+["')\]]?/g) || [])
    .map((s) => s.replace(/\u2024/g, ".").trim())
    .filter(Boolean);
const words = (s) => s.split(/\s+/).filter(Boolean);

let failed = false;
for (const file of files) {
  const lesson = JSON.parse(fs.readFileSync(file, "utf8"));
  const flags = [];
  const paras = (lesson.body || []).filter((p) => !/^(## |### |- |> )/.test(p));
  let prevOpener = null, openerRun = 1;
  paras.forEach((p, i) => {
    const sents = sentences(p);
    if (!sents.length) return;
    const first = sents[0], last = sents[sents.length - 1];
    if (words(first).length <= 6) flags.push([i, "short hook opener", first]);
    if (sents.length > 1 && words(last).length <= 8) flags.push([i, "short payoff closer", last]);
    for (const s of sents) {
      if (words(s).length <= 3) flags.push([i, "fragment", s]);
      const unquoted = s.replace(/"[^"]*"/g, '""').replace(/“[^”]*”/g, '“”');
      for (const [re, label] of HARD) if (re.test(unquoted)) flags.push([i, label, s]);
      const opener = words(s)[0]?.toLowerCase();
      if (opener && opener === prevOpener) { if (++openerRun >= 3) flags.push([i, "repeated sentence opener", s]); } else openerRun = 1;
      prevOpener = opener;
    }
    const tri = countTriads(p);
    if (tri >= 2) flags.push([i, `triads (${tri} in one paragraph)`, p.slice(0, 80) + "…"]);
  });
  const all = paras.join(" ");
  const allWords = words(all.toLowerCase().replace(/[^a-z'\s-]/g, ""));
  const ttr = new Set(allWords).size / allWords.length;
  const totalTriads = countTriads(all);
  const lens = sentences(all).map((s) => words(s).length);
  const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
  const sd = Math.sqrt(lens.reduce((a, b) => a + (b - avg) ** 2, 0) / lens.length);
  if (totalTriads >= 4) flags.push(["*", `triads across the lesson (${totalTriads})`, ""]);
  if (lesson.takeaways || lesson.names) flags.push(["*", "retired fields present (takeaways/names)", ""]);
  const bodyWords = words(all).length;
  console.log(`\n${file}: ${bodyWords} words, ${lens.length} sentences, avg ${avg.toFixed(1)} sd ${sd.toFixed(1)}, type/token ${ttr.toFixed(2)}, triads ${totalTriads}`);
  if (bodyWords < 650 || bodyWords > 1050) flags.push(["*", `length ${bodyWords} outside 700–1000 band`, ""]);
  let hard = 0;
  for (const [i, label, ex] of flags) {
    const soft = SOFT_LABELS.has(label) || label.startsWith("triads");
    if (!soft) hard++;
    console.log(`  ${soft ? "warn" : "FAIL"} [¶${i}] ${label}${ex ? `: "${ex.slice(0, 110)}"` : ""}`);
  }
  if (hard) failed = true; else console.log(flags.length ? "  no hard flags" : "  clean");
}
process.exit(failed ? 1 : 0);
