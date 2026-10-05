// Kindle edition: packages one day's paper (both lessons in full, then the
// news) as an EPUB 3 file. Zero dependencies: a minimal ZIP writer (stored
// entries, CRC-32) is enough for EPUB. Called from build.mjs; the output goes
// to docs/kindle/<date>.epub and docs/kindle/latest.epub so it can be
// downloaded, sideloaded, or emailed to a Send-to-Kindle address.

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ---------- minimal ZIP (store only) ----------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(d = new Date()) {
  const time = (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | (d.getUTCSeconds() >> 1);
  const date = ((d.getUTCFullYear() - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate();
  return { time, date };
}

function zipStore(entries) {
  // entries: [{ name, data: Buffer }] — order preserved (mimetype must be first).
  const { time, date } = dosDateTime();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // flags: UTF-8 names
    local.writeUInt16LE(0, 8); // method: store
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + data.length;
  }
  const cdSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cdSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, ...centrals, end]);
}

// ---------- EPUB ----------

const EPUB_CSS = `body { font-family: serif; line-height: 1.45; }
h1 { font-size: 1.6em; margin: 0 0 0.2em; }
h2 { font-size: 1.25em; margin: 1.4em 0 0.4em; }
h3 { font-size: 1.05em; margin: 1.2em 0 0.3em; }
p { margin: 0 0 0.8em; text-align: left; }
.kicker { font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.08em; color: #555; margin: 0 0 0.4em; }
.sub { font-style: italic; color: #444; margin: 0 0 1em; }
.summary { border-left: 3px solid #999; padding-left: 0.8em; color: #333; }
.why { font-size: 0.92em; color: #444; margin: 0.2em 0 0.4em; }
.src { font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.06em; color: #666; margin: 0 0 1.2em; }
.box { border: 1px solid #bbb; padding: 0.6em 0.9em; margin: 1.2em 0; }
.box h3 { margin: 0 0 0.4em; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.08em; }
.ahead { font-size: 0.92em; color: #333; border-top: 1px dashed #bbb; padding-top: 0.5em; }
hr { border: 0; border-top: 1px solid #bbb; margin: 1.4em 0; }
`;

const xhtml = (title, body) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><meta charset="utf-8"/><title>${title}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
${body}
</body>
</html>
`;

// Inline markup already escaped by helpers; XHTML needs self-closing <br/>
// and no bare ampersands, which escapeHtml guarantees.
export function buildEpub({ edition, dayLessons, outDir, helpers }) {
  const { escapeHtml, inline, renderBody, mediumDate, lessonKicker } = helpers;
  const date = edition.date;
  const title = `Daily Loop — ${mediumDate(date)}`;
  const chapters = [];

  // Lessons, in full.
  for (const { track, lesson } of dayLessons) {
    const takeaways = (lesson.takeaways || []).map((t) => `<li>${inline(t)}</li>`).join("");
    const names = (lesson.names || [])
      .map((p) => `<li><b>${escapeHtml(p.name)}</b>${p.note ? ` — ${inline(p.note)}` : ""}</li>`)
      .join("");
    const reading = (lesson.reading || [])
      .map((r) => `<li><i>${escapeHtml(r.title)}</i>${r.by ? `, ${escapeHtml(r.by)}` : ""}</li>`)
      .join("");
    chapters.push({
      id: `lesson-${track.slug}`,
      title: `${track.label}: ${lesson.title}`,
      body: `<p class="kicker">${escapeHtml(lessonKicker(track, lesson))}</p>
<h1>${escapeHtml(lesson.title)}</h1>
${lesson.subtitle ? `<p class="sub">${inline(lesson.subtitle)}</p>` : ""}
${lesson.summary ? `<p class="summary">${inline(lesson.summary)}</p>` : ""}
${renderBody(lesson.body)}
${takeaways ? `<div class="box"><h3>Keep</h3><ul>${takeaways}</ul></div>` : ""}
${names ? `<div class="box"><h3>Names worth knowing</h3><ul>${names}</ul></div>` : ""}
${reading ? `<div class="box"><h3>Further reading</h3><ul>${reading}</ul></div>` : ""}`,
    });
  }

  // News, one chapter per section.
  for (const section of edition.sections || []) {
    const items = (section.items || [])
      .map(
        (it) => `<h3>${escapeHtml(it.headline)}</h3>
<p>${escapeHtml(it.summary || "")}</p>
${it.why ? `<p class="why"><b>Why it matters —</b> ${escapeHtml(it.why)}</p>` : ""}
<p class="src">${escapeHtml(it.source || "")}${it.url ? ` · <a href="${escapeHtml(it.url)}">link</a>` : ""}</p>`,
      )
      .join("\n");
    const ahead = (section.ahead || [])
      .filter((a) => a && a.what)
      .map((a) => `${a.date ? `<b>${escapeHtml(a.date)}</b> ` : ""}${escapeHtml(a.what)}`)
      .join(" · ");
    if (!items && !ahead) continue;
    chapters.push({
      id: `news-${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title: section.title,
      body: `<h1>${escapeHtml(section.title)}</h1>
${items}
${ahead ? `<p class="ahead"><b>Ahead:</b> ${ahead}</p>` : ""}`,
    });
  }

  const nav = `<nav epub:type="toc" id="toc"><h1>${escapeHtml(title)}</h1><ol>
${chapters.map((c) => `<li><a href="${c.id}.xhtml">${escapeHtml(c.title)}</a></li>`).join("\n")}
</ol></nav>`;

  const manifest = [
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="css" href="style.css" media-type="text/css"/>`,
    ...chapters.map((c) => `<item id="${c.id}" href="${c.id}.xhtml" media-type="application/xhtml+xml"/>`),
  ].join("\n    ");
  const spine = chapters.map((c) => `<itemref idref="${c.id}"/>`).join("\n    ");
  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="en">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:daily-loop:${date}</dc:identifier>
    <dc:title>${escapeHtml(title)}</dc:title>
    <dc:language>en</dc:language>
    <dc:creator>Daily Loop</dc:creator>
    <dc:date>${date}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    ${manifest}
  </manifest>
  <spine>
    ${spine}
  </spine>
</package>
`;
  const container = `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>
`;

  const entries = [
    { name: "mimetype", data: Buffer.from("application/epub+zip") },
    { name: "META-INF/container.xml", data: Buffer.from(container) },
    { name: "OEBPS/content.opf", data: Buffer.from(opf) },
    { name: "OEBPS/nav.xhtml", data: Buffer.from(xhtml(escapeHtml(title), nav)) },
    { name: "OEBPS/style.css", data: Buffer.from(EPUB_CSS) },
    ...chapters.map((c) => ({
      name: `OEBPS/${c.id}.xhtml`,
      data: Buffer.from(xhtml(escapeHtml(c.title), c.body)),
    })),
  ];
  const epub = zipStore(entries);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${date}.epub`), epub);
  writeFileSync(join(outDir, "latest.epub"), epub);
  return { bytes: epub.length, chapters: chapters.length };
}
