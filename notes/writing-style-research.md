# Research: what makes prose read as AI-written, and what to do about it in Daily Loop

Date: 2026-10-13. Working notes, not yet policy. Sources are linked at the end.

## 1. The short version

Every current catalogue of "AI tells" agrees on one thing: word blacklists ("delve", "tapestry") are the weakest layer and the first thing models stop doing. The signals that survive are structural and rhythmic, and they are exactly the ones in our lessons:

- negative parallelism ("not X but Y", "X was never the problem; Y was", "gone is not quite the word");
- the rule of three and parallel phrasing generally;
- short punchy fragments used as payoffs ("Those people got out.");
- paragraphs that each "land" on a quotable sentence, and sections that end on an aphorism;
- suspiciously even paragraph lengths and one-idea-one-landing structure;
- significance inflation ("that is the warrant for this series' rule...");
- synonym cycling instead of repeating the plain noun;
- generic examples with no irrelevant specificity, and conflicts smoothed into tidy trade-offs;
- "statistical good behaviour": nothing odd, no tangents, no unresolved mess.

The academic side backs this up. A June 2026 study of 284 features across 27 models and 10 domains (El Attar et al.) found most proposed indicators are model- and domain-specific; the one robust signal is **lexical richness** (vocabulary a bit too even). The Wikipedia essay, the most maintained practitioner list, has moved em dashes and section summaries into "historical indicators" and lists perfect grammar, formal prose and transition words as **ineffective** indicators. Its "signs of human writing" are instructive: plain "is/has" phrasing, plain verbs ("wrote", "died"), willingness to make definitive claims ("was the first"), qualifiers ("perhaps", "tends to"), and even wordy constructions ("as a result of").

So the target is not "fewer fancy words". It is: stop performing, start explaining.

## 2. How our 12 lessons measure up

Crude scan (regexes undercount; the eye catches more):

| lesson | words | avg sent | sd | short para openers | neg. parallel | triads |
|---|---|---|---|---|---|---|
| MM-001 latticework | 686 | 15.7 | 7.9 | 2/9 | 1 | 0 |
| MM-002 map/territory | 940 | 15.7 | 8.2 | 3/11 | 2 | 0 |
| MM-003 circle of competence | 978 | 18.8 | 10.3 | 2/12 | 3 | 0 |
| MM-004 inversion | 1002 | 16.1 | 10.1 | 2/13 | 2 | 0 |
| MM-005 first principles | 1026 | 19.8 | 11.2 | 5/12 | 1 | 3 |
| MM-006 second-order | 991 | 19.9 | 8.8 | 0/11 | 0 | 1 |
| H-001 why study the arc | 706 | 15.3 | 9.1 | 2/11 | 0 | 0 |
| H-002 first tools | 946 | 17.0 | 10.7 | 5/11 | 0 | 2 |
| H-003 fire | 998 | 20.8 | 11.1 | 4/10 | 0 | 3 |
| H-004 language | 901 | 19.6 | 10.9 | 3/12 | 1 | 6 |
| H-005 hunter-gatherer | 1073 | 20.2 | 11.3 | 1/15 | 2 | 3 |
| H-006 out of Africa | 1053 | 20.3 | 10.2 | 3/10 | 2 | 4 |

Sentence-length variance is actually fine (sd 8–11 on a mean of 16–20 is human range). The problem is not burstiness. It is the rhetorical shape: in 006, every section opens with a short declarative hook, builds for two or three sentences, and closes on a punchline. Specific offenders from 006:

- "Africa was not a sealed box." / "Those people got out." (hook, fragment payoff)
- "Walking across the Sinai was never the problem. Living ... was the problem." (negative parallelism)
- "Gone is not quite the word." (self-correcting flourish, tropes.fyi #1 variant)
- "walked, paddled and hunted", "fire, sewn clothing, projectile weapons and boats" (triads, ascending lists)
- "Lived, it was a band deciding..." (comma-clipped fragment pivot)
- "That is the warrant for this series' rule: technology compounds, human nature does not." (colon epiphany + aphoristic closer + thesis echo)
- Every section ends on a moral. No paragraph ends flat.
- No odd detail that does not serve the argument. The LLM-ism dictionary calls this the deepest tell: "How much unresolved weirdness survives?"

The news items have a different problem set (see §5) but the same root: the `why` sentences lean on "so expect X" consultant cadence.

## 3. The two reference voices

### Munger (Mental Models track)

Evidence from the Psychology of Human Misjudgment and Worldly Wisdom talks:

- **First person, flatly.** "I have long been very interested in standard thinking errors." "To me, that's totally insane." He says what he thinks and that it is he who thinks it.
- **Named, specific, slightly off-topic cases.** Westinghouse's real-estate loans, the house counsel who lost his job "with no moral fault", the Wrigley/Glotz gum stand, the fishing-tackle salesman. The examples are concrete to the point of gossip and are not evenly distributed; he follows what interests him.
- **Blunt verdicts after long sentences.** Comma-stacked sentences with asides, then "Hell no, Charlie." The short sentence is a judgment, not a drumroll.
- **Vernacular mixed with erudition.** "bananas", "smashed to smithereens", next to Cicero and Skinner.
- **Transitions are cheap.** "Now", "And", "But", "Of course", "Moreover". He never announces structure; he just goes on.
- **Fixed arc per item, admitted openly.** Name the tendency, show it in a case, give the antidote as a maxim. He repeats himself on purpose and says so.
- **Hedges that are real.** "My current guess is..." when he is guessing; otherwise no hedge at all.
- **Humour is dry and at someone's expense**, often his own.

What to borrow: opinions stated as opinions; cases with names, dollar figures and a detail that does not quite fit; the antidote as a plain instruction; cheap transitions; ending a point when it is made. What not to borrow: we cannot fake his autobiography. A lesson can say "the usual example is..." or "the case I find most convincing is..." but cannot invent "I once saw".

### Saylor (History track)

Evidence from the Saylor Series (Breedlove, 2020) transcripts and his "Money is energy" essay:

- **Mechanism first, then uses, then consequence.** Fire: chemical energy to heat; then cooking, warmth, defence, metallurgy; then "the civilization that channels energy most effectively wins."
- **Everything is an engineering problem.** Aqueducts, leverage, half-lives, leakage, centre of gravity. He converts history into quantities: "7% a year", "a half-life of forever".
- **Deep-time anchoring with approximate numbers.** "100,000 years ago", "10–20 years", 1914, 1971.
- **Long extemporaneous chains with "and"**, then a short verdict or a rhetorical question he answers himself.
- **One recurring arc** (rise, corruption, collapse, replacement by a less corrupted group) applied to every era.

Warning: Saylor's cadence is itself the aphoristic-kicker pattern ("Money is energy. A monetary system is an energy system."). If we copy his rhythm we make the AI-smell worse. What to borrow is his **method**: the physics of the thing, the quantities, the chain from energy to the other threads. What to drop: the grand one-liners and the inevitability framing.

## 4. What the practitioner guides recommend (consensus)

From the LLM-ism dictionary §XVII, a16z "Habits of AI writing", the humanizer skill, and Vollmer's field guide:

1. Delete self-announcing transitions; say the interesting thing directly.
2. Replace prestige verbs with ordinary ones when the fancy word adds nothing.
3. Break symmetry when two sides do not deserve equal space.
4. Use the real number of items, not three.
5. Let paragraphs end without a moral. Cut the second conclusion once the point has landed.
6. Keep strange details; specificity is where personality lives.
7. Name agents when you know who did it.
8. Follow the aspects that fascinate you, disproportionately.
9. Do not reconcile contradictions automatically; let uncertainty stay ugly.
10. Prefer observations to frameworks.
11. Repeat the plain noun instead of cycling synonyms.
12. Stop trying to sound like "good writing". (Dictionary: "the hardest step".)

Paul Graham's "Write Simply" and Pinker's classic style say the same from the human side: the writer has seen something and points the reader at it; minimal signposting; no commentary on the writer's own effort; the reader is an equal; the occasion is informal.

## 5. Draft rules for CLAUDE.md (to discuss before adopting)

**Voice, both tracks.** Written by someone who knows the subject explaining it to a friend who asked. The explanation is the content. No performing.

**Banned shapes (not words):**
- Negative parallelism in any form: "not X but Y", "not just X", "X was never the problem", "Y rather than X" as a flourish, "is not quite the word".
- Short fragment or one-line sentence as a payoff or hook. Short sentences are allowed when they carry a judgment or a fact, not a beat.
- Triads and parallel lists for rhythm. Count the real items.
- Section- or paragraph-ending aphorisms, morals, "that is why", "which is the point", colon epiphanies.
- Thesis echo: restating the series' rule or the lesson's summary inside the body.
- Rhetorical questions answered immediately.
- Synonym cycling; say "band" eight times if the subject is the band.
- "Serves as", "stands as", "represents" for "is".

**Required texture:**
- At least one detail per lesson that is specific past the point of usefulness (a weight in kilograms, a place name, who found the bone and when).
- Name the person or institution that did the thing whenever known.
- Where the evidence is contested, say so plainly and leave it contested.
- Opinions are allowed and should be marked as opinions ("the case I find most convincing", "most archaeologists think, and I agree").
- Paragraph lengths should vary; at least one paragraph per lesson may be a single long sentence or a two-line aside.
- Mechanism before consequence, every chapter (Saylor's method, not his cadence).
- Mental Models: one case per lesson should be as concrete as Munger's: named company or person, figure, date, and the detail that does not fit the model.

**Process:** draft, then a second pass that reads only for the banned shapes, then a lint script (`node lint-prose.mjs lessons/...`) that flags: paragraph-opening sentences under 7 words, the negative-parallelism regexes, "X, Y and Z" triads, section-final sentences under 12 words, repeated sentence openers, and lexical type-token ratio out of the human band. The lint is a safety net, not a definition of good.

## 6. Scope of a rewrite

12 lessons (6 + 6), each 700–1,050 words. Facts, names, reading lists and takeaways stay; the body is rewritten paragraph by paragraph under the new rules, then linted, then rebuilt. The audio workflow will regenerate MP3s for changed lessons only if it keys on file changes; check `.github/workflows/audio.yml` before pushing. Editions (news) are a separate pass: the `why` sentences and summaries have their own template habits, but there are 119 editions and the archive is less important than the lessons.

## 7. Open questions

1. How far toward Munger's first person? The lessons have no human author to speak as "I". Options: (a) no first person, opinions phrased as "the strongest case is"; (b) an explicit editorial "I" meaning the series' author, with no invented experiences. I lean (b) for Mental Models and (a) for History.
2. Saylor's energy framing: keep as the organising lens (it already is in CLAUDE.md's five threads) but drop his aphorisms. Agree?
3. Rewrite all 12 now, or write the next 10 under the new rules first and see if the voice holds before touching the archive?

## Sources

Catalogues of AI prose patterns
- Wikipedia:Signs of AI writing (WikiProject AI Cleanup; ~15k words; maintained) https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing
- Structured mirror with pattern data: https://github.com/egc365/signs-of-ai-writing
- tropes.fyi, 49 tropes with examples: https://tropes.fyi/directory
- The LLM-ism Dictionary, 240 entries, Aug 2026, incl. §XVI–XVIII on clusters and "statistical good behaviour": https://roughatsea.com/notes/the-llm-ism-dictionary/
- a16z crypto, "Habits of AI writing, and what to do about them", Stephanie Zinn, Aug 2026: https://a16zcrypto.com/posts/article/ai-writing-hallmarks-for-founders/
- Matthew Vollmer, "I Asked the Machine to Tell on Itself", Apr 2026: https://matthewvollmer.substack.com/p/i-asked-the-machine-to-tell-on-itself

Research
- Juzek & Ward, "Why Does ChatGPT 'Delve' So Much?", COLING 2025 (21 focal words; RLHF plausible cause): https://aclanthology.org/2025.coling-main.426/
- El Attar, Dönmez, Maurer, Falenska, "A Systematic Analysis of Linguistic Features in AI-Generated Text Detection Across Domains and Models", June 2026 (lexical richness robust; most tells context-dependent): https://arxiv.org/abs/2606.04177
- Freeburg, "The Last Fingerprint: How Markdown Training Shapes LLM Prose", Mar 2026 (em dash persists under instruction; model-specific rates): https://arxiv.org/abs/2603.27006
- Rudnicka & Juzek, "Beyond 'AI Language': the idiolectal nature of LLM output", 2026: https://arxiv.org/pdf/2608.06589
- "How much are LLMs changing the language of academic papers after ChatGPT?", rev. Mar 2026: https://arxiv.org/abs/2509.09596
- Decressac, "Guilty by Punctuation", Apr 2026 (why single-feature tells fail; clusters matter): https://linguistically.substack.com/p/guilty-by-punctuation

Tooling
- blader/humanizer (Claude skill; 26 patterns in 6 groups; matches a writing sample if given): https://github.com/blader/humanizer
- conorbronsdon/avoid-ai-writing (skill + zero-dep detector with 0–100 score and CI gate): https://github.com/conorbronsdon/avoid-ai-writing

Human style references
- Paul Graham, "Write Simply": https://www.paulgraham.com/simply.html
- Pinker, The Sense of Style, ch. 2 on classic style (after Thomas & Turner, Clear and Simple as the Truth)
- Munger, "The Psychology of Human Misjudgment" (fs.blog transcript): https://fs.blog/great-talks/psychology-human-misjudgment/
- Munger, "A Lesson on Elementary, Worldly Wisdom" (James Clear transcript): https://jamesclear.com/great-speeches/a-lesson-on-elementary-worldly-wisdom-by-charlie-munger
- The Saylor Series synopsis and transcript excerpts (Breedlove, WiM221 / episodes 1–17): https://btctouchpoint.com/synopsis-of-the-saylor-series-with-michael-saylor-robert-breedlove-wim221/
