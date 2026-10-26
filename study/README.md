# Study tracks (paused)

Two long-form tracks used to ride along with the Daily Loop paper, one lesson a
day, alternating: **Mental Models** (Munger's latticework) and the **History of
Civilization** (Durant at a fraction of the length). They were paused on
2026-10-26 because they were not being read. The paper no longer shows them,
the daily routine no longer writes them, and the weekly lessons-to-Kindle mail
was removed. Everything written so far is kept here, unchanged, to pick up later.

## What is here

```
study/lessons/mental-models/NNN-slug.json   lessons 1–13
study/lessons/history/NNN-slug.json         chapters 1–12
study/curriculum/<track>.md                 the full syllabus for each track
study/progress.json                         lessons marked as read
study/lint-prose.mjs                        the machine-prose linter the lessons were checked with
study/notes/writing-style-research.md       the style research and decisions behind the prose rules
study/book.mjs                              builds each track into an EPUB
study/books/<track>.epub                    the built books, ready for a Kindle
```

History chapters 1–7 were rewritten as narrative history on 2026-10-15.
Chapters 8–12 and Mental Models 8–13 were written afterwards under the older
History voice (mechanism first, Saylor-style). Their delivery references
("tomorrow's lesson", "the next chapter", "this series") have been removed,
but their voice was not revised.

## Reading them

```sh
node study/book.mjs        # rebuilds study/books/mental-models.epub and history.epub
```

Send the EPUB to a Kindle address, or open it in any e-reader.

## Picking it up again

1. Decide where the lessons should live: back inside the paper, or as their
   own site or book. The renderer for lesson pages, catalogues and the "Lesson
   of the day" band was removed from `build.mjs`; it is intact in git history
   at commit `26c1b99` (`build.mjs`, `kindle.mjs`, `kindle-lessons.mjs` and
   `.github/workflows/kindle.yml`).
2. Move the policy below back into `CLAUDE.md` (or into its own instructions
   file) and add a lesson step to the routine.
3. The next lessons are Mental Models 14, *Opportunity cost*, and History 13,
   *Göbekli Tepe and the temple before the town*. Write them with
   `node study/lint-prose.mjs --all` passing.

## The writing policy, as it stood

### The study tracks

Two books delivered **one piece per day, alternating between the tracks**,
in order, that the reader can also browse later as a catalogue. The goal is to
get a little wiser every day without the daily dose growing past what one
person with little time will actually read. Lessons keep their full length;
the pacing is what makes them sustainable.
These are **not news**: write them from your own knowledge, following the
syllabus. Web search is optional, for verifying a date, figure, or quotation.
Never invent a quotation; if you cannot verify its wording, paraphrase and say
so.

**Written to be published, not posted.** Each lesson is a chapter of a book
that will be read in any order, on any day, years from now, and the compiled
tracks may be published as they stand. Nothing in a lesson may refer to the
day it was written or to the machinery that delivers it: no "today",
"yesterday" or "tomorrow"; no "this series", "this track" or "the loop"; no
lesson or chapter numbers, no "the previous lesson" or "the next chapter", no
"Part II"; no mention of the reader's phone, the paper, or the daily rhythm;
no trailer for the next lesson. Other lessons are referred to only by the
name of their idea, as a book would ("the circle of competence", "the
hand-axe"), and only where the connection is real. The opening lesson of each
track may describe the plan of the whole in a paragraph. `study/lint-prose.mjs`
flags the common slips as hard errors.

**Mental Models** (`study/lessons/mental-models/`, syllabus
`study/curriculum/mental-models.md`): Charlie Munger's latticework, one model per
day across thinking tools, the psychology of misjudgment, mathematics, physics,
biology, economics, systems, engineering and decision-making. A lesson should
leave the reader able to *use* the model, not just recognize it. Each one:

- states the model plainly in the first paragraph, and briefly where it comes
  from;
- shows it working in at least two unrelated domains, with concrete cases;
- names its failure mode: when it misleads, and what it looks like when
  someone is over-applying it;
- gives one question or habit the reader can apply at once, under a
  subhead `## The habit`;
- connects it, by name, to related models where the connection is real.

**History of Civilization** (`study/lessons/history/`, syllabus
`study/curriculum/history.md`): from the first tools to the present, in order. The
model is Durant's *Story of Civilization* at a fraction of the length:
narrative history for a general reader, written by someone who has lived with
the sources and wants to tell what happened. The five threads (energy, tools,
information, money, force) are the author's lens and stay mostly out of sight.
Each chapter:

- tells what happened to people, in order, and opens on a scene, a find, a
  person or a place rather than on a definition or a law of physics;
- explains **how the thing worked** in plain words at the point where the
  story needs it, well enough that the reader could explain it to someone
  else; the mechanism is a paragraph, never the chapter, and a quantity
  appears only where one number makes the thing vivid (an ox does the work of
  several men), never as a spec sheet;
- says, in ordinary language, what the change made possible or forced
  elsewhere, and never announces which "thread" is moving or audits the
  threads that did not;
- uses sites, dates and discoverers where they carry the story or settle a
  dispute, a few per chapter, never as a gazetteer;
- names a person only when they were the hinge, in the body, with the year
  and what they did;
- ends on its own subject, not on a trailer. A closing paragraph may look
  forward by content ("the remedy for that, writing, was still ninety
  thousand years off"), never by lesson.

**Picking today's track and lesson.** Write exactly one lesson per day. The
track is the one with fewer lessons written so far; on a tie, Mental Models.
(So the tracks alternate, and a missed day never breaks the pattern.) Within
the track, count the files in its directory; the next lesson is syllabus entry
N+1. Keep its number and title (sharpen the title if useful). File name
`NNN-slug.json`, zero-padded, lowercase kebab-case. When fewer than 30
syllabus entries remain unwritten, append a new part to the curriculum file in
the same style before writing the day's lesson. If a lesson dated today
already exists in either track, leave it alone unless asked to revise.

**Length.** 700–1000 words of body. A `## ` subhead every few paragraphs.
Paragraph lengths vary; one may be a single sentence, another eight. No bullet
lists in the body unless the content is a genuine list (the parts of a
mechanism, the steps of a procedure). No takeaways list, no "names worth
knowing" list; the lesson ends with its last paragraph, on its own subject.

**Prose rules.** The lessons are written prose, read on a phone or heard as
narration, by someone who knows the subject and is explaining it to an
intelligent friend. The explanation is the content; nothing performs. In
particular:

- *Third person.* No "I", "we", "our", "us". "You" is allowed where the
  reader is being handed something to do or check.
- *Written, not spoken.* No talk cadence: no one-line declarations for
  effect, no "here is the thing", no rhetorical questions, no questions as
  subheads.
- *Banned shapes.* These are the marks of machine prose whatever the words,
  and none of them may appear: negative parallelism in any form ("not X but
  Y", "not just X", "X was never the problem; Y was", "is not quite the
  word"); a short sentence or fragment used as a hook or a payoff (a short
  sentence may state a fact or a judgment, never a beat); triads and parallel
  lists built for rhythm (count the real items; two or five is fine); a
  paragraph or section that ends on an aphorism, a moral, a "that is why", or
  a colon followed by an epiphany; restating the summary or the series' thesis
  inside the body; synonym cycling (repeat the plain noun); "serves as",
  "stands as", "represents" for "is"; significance words ("pivotal",
  "transformative", "a testament to", "crucial"); -ing tails that attach
  meaning to a fact ("..., highlighting the importance of").
- *Required texture.* At least one detail per lesson that is specific past
  the point of usefulness: a weight, a place, who found the thing and in what
  year. Name the person or institution that did the thing when known. Where
  the evidence is contested, say so and leave it contested; do not resolve a
  disagreement into a tidy trade-off. Plain verbs: wrote, died, built, sold.
  A paragraph may end flat, on the fact.
- *Story before mechanism, mechanism before consequence.* In History the
  reader should be able to picture the people before being asked to
  understand the device, and should understand the device before being told
  what it changed. The Saylor series supplies only the lens (energy, money as
  a technology); its engineering register, its quantities for their own sake,
  its spoken cadence and its one-line slogans do not transfer to the page.
  In Mental Models one case per lesson is as concrete as Munger's: a named
  company or person, a figure, a date, and the detail that does not fit the
  model. Munger's bluntness, named cases and honest hedges transfer; his talk
  rhythm does not.
- *Judgments* are allowed and are stated as judgments ("the strongest case
  is", "most archaeologists think"), never dressed as facts.
- *Check.* Before saving, read the body once only for the banned shapes and
  remove every one. Then run `node study/lint-prose.mjs <file>`; hard flags must be
  zero, soft warnings are read and judged. A clean lint is necessary, not
  sufficient.

### Lesson JSON schema

```json
{
  "track": "mental-models",
  "n": 12,
  "date": "2026-10-14",
  "title": "Inversion",
  "subtitle": "Invert, always invert",
  "part": "Part I — Tools for thinking",
  "summary": "Two or three sentences: the idea in a nutshell. Shown in the catalogue and at the top of the lesson page.",
  "body": [
    "A paragraph. Strings are paragraphs.",
    "## A subhead starts with two hashes",
    "- A string starting with a dash\n- is a bullet list",
    "> A string starting with > is a quotation.",
    "Inline **bold** and *italic* are supported; nothing else."
  ],
  "reading": [{ "title": "Poor Charlie's Almanack", "by": "Peter Kaufman (ed.)", "url": "optional" }]
}
```

`track`, `n`, `date`, `title`, `part`, `summary` and `body` are required;
`subtitle` and `reading` are optional. `takeaways` and `names` are retired:
do not write them, and the builder ignores them. `part` must match the `## ` heading of the syllabus part the entry
sits in. The builder puts the day's lesson in a compact "Lesson of the day"
band on that day's edition, gives each lesson its own page under
`docs/<track>/`, and keeps a catalogue at `docs/<track>/index.html` grouped by
part with progress against the syllabus and the next five titles.

**Reading progress.** `study/progress.json` lists the lessons the reader has
finished, as `"<track>/<slug>"` keys. The builder marks them in the catalogues
(tick, read counter, a "continue" link to the first unread), and the front page
lists what is still unread. **The daily routine never touches this file.** It
changes only when the reader says what they have read ("I read the map is not
the territory but not the first tools"): then add or remove the keys, rebuild,
and push.

**Kindle.** The weekly lessons-only EPUB mail (`.github/workflows/kindle.yml`
with `kindle-lessons.mjs`) was removed with the pause. `study/book.mjs`
builds the whole of each track instead.
