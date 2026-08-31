#!/usr/bin/env node
/*
 * build-notes.js
 *
 * Reads the book itself (SUMMARY.md and every markdown page next to it) and
 * writes site/notes.js, the only data file the notes page needs.
 *
 *   node site/build-notes.js
 *
 * Nothing here is hand maintained. Edit a page in GitBook, GitBook commits the
 * markdown to this repo, the deploy workflow runs this script again, and the
 * notes page picks the change up. You never edit the site to update the book.
 */
const fs = require("fs");
const path = require("path");

const SITE = __dirname;
const ROOT = path.join(SITE, "..");
const GITBOOK = "https://hamcodes.gitbook.io/bro-to-bro";

/* Pages that are housekeeping rather than reading. They stay in the book,
   they just do not become floating notes. Remove a line to let one back in. */
const SKIP = new Set([
  "README.md",
  "bro-2-bro.-nobody-told-me/copyright.md",
  "introduction/table-of-contents.md",
  "introduction/read-in-your-preferred-language.md",
  "introduction/read-it-via-an-app.md",
]);

/* ------------------------------------------------------------------ */
/* 1. SUMMARY.md gives reading order, part names and the page paths.   */
/* ------------------------------------------------------------------ */
const summary = fs.readFileSync(path.join(ROOT, "SUMMARY.md"), "utf8");

const entries = [];
let part = "Introduction";

for (const line of summary.split("\n")) {
  const partM = line.match(/^##\s+(.+?)\s*$/);
  if (partM) {
    part = tidyPart(partM[1]);
    continue;
  }
  const m = line.match(/^(\s*)\*\s*\[(.+?)\]\((.+?)\)\s*$/);
  if (!m) continue;
  const [, indent, tocTitle, file] = m;
  entries.push({
    part,
    tocTitle: clean(tocTitle),
    file: decodeURIComponent(file),
    depth: Math.floor(indent.length / 2),
  });
}

function tidyPart(s) {
  const t = clean(s).replace(/^PART\s*\d+\s*:?\s*/i, "").trim();
  if (!t || t === "***") return part;
  if (/^BRO 2 BRO/i.test(t)) return "The Book";
  return t
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function clean(s) {
  return s.replace(/\s+/g, " ").replace(/[’]/g, "'").trim();
}

/* ------------------------------------------------------------------ */
/* 2. Each page: frontmatter + heading + paragraphs.                   */
/* ------------------------------------------------------------------ */
const notes = [];
let chapter = "Introduction";
let chapterUrl = GITBOOK;

for (const e of entries) {
  if (SKIP.has(e.file)) {
    if (e.depth === 0) rememberChapter(e);
    continue;
  }
  const abs = path.join(ROOT, e.file);
  if (!fs.existsSync(abs)) {
    console.warn("missing page:", e.file);
    continue;
  }
  const raw = fs.readFileSync(abs, "utf8");
  const { meta, body } = splitFrontmatter(raw);
  const blocks = parseBlocks(body);
  if (!blocks.list.length) continue;

  const isChapter = e.depth === 0 && /README\.md$/.test(e.file);
  if (e.depth === 0) rememberChapter(e);

  let title = clean(blocks.title || e.tocTitle);
  if (isChapter) {
    // "Chapter 1 : You Don't Need To Know Everything Yet" reads as a label, not
    // as a note. The page's own subheading is the human title, so prefer it.
    title = title.replace(/^Chapter\s*\d+\s*:\s*/i, "");
    const first = blocks.list[0];
    if (first && first.t === "h" && same(first.x, title)) blocks.list.shift();
  }

  const kicker = meta.description ? clean(meta.description) : "";

  notes.push({
    n: notes.length + 1,
    part: e.part,
    chapter,
    chapterUrl,
    kind: isChapter ? "chapter" : "note",
    title,
    kicker: same(kicker, title) ? "" : kicker,
    url: urlFor(e.file),
    words: blocks.words,
    blocks: blocks.list,
  });
}

function same(a, b) {
  const k = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, "");
  return k(a) === k(b);
}

function rememberChapter(e) {
  chapter = clean(e.tocTitle).replace(/^Chapter\s*(\d+)\s*:\s*/i, "Chapter $1. ");
  chapterUrl = urlFor(e.file);
}

function urlFor(file) {
  const slug = file.replace(/README\.md$/, "").replace(/\.md$/, "").replace(/\/$/, "");
  return slug ? `${GITBOOK}/${slug}` : GITBOOK;
}

function splitFrontmatter(raw) {
  const meta = {};
  let body = raw;
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (m) {
    body = raw.slice(m[0].length);
    for (const line of m[1].split("\n")) {
      const kv = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
      if (kv) meta[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
    }
  }
  return { meta, body };
}

/* Markdown here is deliberately plain: headings, paragraphs, GitBook's
   trailing-backslash hard breaks. Anything else is passed through as text. */
function parseBlocks(body) {
  const list = [];
  let title = "";
  let buf = [];
  let words = 0;

  const flush = () => {
    if (!buf.length) return;
    const text = buf.join("\n").trim();
    buf = [];
    if (!text) return;
    words += text.split(/\s+/).length;
    list.push({ t: "p", x: text });
  };

  for (const rawLine of body.split("\n")) {
    const line = rawLine.replace(/\s+$/, "");
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flush();
      const level = h[1].length;
      const text = clean(h[2]);
      if (level === 1 && !title) {
        title = text;
        continue;
      }
      // A subheading that only repeats the page title is GitBook noise.
      if (text.toLowerCase().replace(/[^a-z0-9]/g, "") ===
          title.toLowerCase().replace(/[^a-z0-9]/g, "")) continue;
      if (/^\(?chapter intro\)?$/i.test(text)) continue;
      list.push({ t: level <= 3 ? "h" : "h2", x: text.replace(/\s*\(chapter intro\)$/i, "") });
      continue;
    }
    if (line.trim() === "") { flush(); continue; }
    buf.push(line.replace(/\\$/, "\n"));  // GitBook hard break
  }
  flush();
  return { title, list, words };
}

/* ------------------------------------------------------------------ */
/* 3. Write notes.js                                                   */
/* ------------------------------------------------------------------ */
const out =
  "/* Generated by build-notes.js from the book's own markdown. Do not edit. */\n" +
  "window.NOTES = " + JSON.stringify(notes) + ";\n" +
  "window.NOTES_BUILT = " + JSON.stringify(new Date().toISOString().slice(0, 10)) + ";\n";

fs.writeFileSync(path.join(SITE, "notes.js"), out);

const chapters = [...new Set(notes.map((n) => n.chapter))];
console.log(`notes    ${notes.length}`);
console.log(`chapters ${chapters.length}`);
console.log(`words    ${notes.reduce((a, n) => a + n.words, 0).toLocaleString()}`);
console.log(`parts    ${[...new Set(notes.map((n) => n.part))].join(" | ")}`);
