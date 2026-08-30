#!/usr/bin/env node
/* ==================================================================== *
 *  Emphasis that never renders.
 *
 *  CommonMark will only close a "**" run if it is right-flanking: when the
 *  character before it is punctuation, the character after it must be
 *  whitespace or punctuation. So "**W:** The" renders and "**W:**The" does
 *  not — the asterisks are printed to the page instead. The same rule (in
 *  mirror image) governs whether a run can OPEN, which is how
 *  'track**"paranoia"**under' ends up showing its markers too.
 *
 *  Nothing in a Markdown pipeline treats this as an error: the file parses,
 *  the build succeeds, and the asterisks simply appear in the published
 *  prose. It went unnoticed across 25 posts and 800-odd markers, so this
 *  check exists to make the next one loud.
 *
 *  Run: node scripts/validate-markdown.js   (part of `npm run validate`)
 * ==================================================================== */
const fs = require("fs");
const path = require("path");
const md = require("markdown-it")({ html: true, linkify: true });

const ROOT = path.join(__dirname, "..");
const DIRS = ["content/news", "content/sessions"];

/** Body text as rendered, with tags removed — what a reader actually sees. */
function renderedText(file) {
  const src = fs.readFileSync(file, "utf8");
  const fmEnd = src.indexOf("\n---", 3);
  const body = fmEnd === -1 ? src : src.slice(fmEnd + 4);
  return md.render(body).replace(/<[^>]+>/g, " ");
}

function main() {
  const errors = [];
  let scanned = 0;

  for (const dir of DIRS) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs).filter((x) => x.endsWith(".md"))) {
      scanned++;
      const text = renderedText(path.join(abs, f));
      let i = -1;
      while ((i = text.indexOf("*", i + 1)) !== -1) {
        const context = text.slice(Math.max(0, i - 45), i + 45).replace(/\s+/g, " ").trim();
        errors.push(`${dir}/${f}: emphasis marker reaches the page — …${context}…`);
      }
    }
  }

  if (errors.length) {
    errors.slice(0, 20).forEach((e) => console.error("error:   " + e));
    if (errors.length > 20) console.error(`         …and ${errors.length - 20} more`);
    console.error(
      `\nUnrendered Markdown in ${scanned} files: ${errors.length} marker(s).\n` +
      `A "**" run needs whitespace on the outside to open or close — write "**Name:** text", not "**Name:**text".`
    );
    process.exit(1);
  }
  console.log(`Markdown valid: ${scanned} files, no emphasis markers reach the page.`);
}

main();
