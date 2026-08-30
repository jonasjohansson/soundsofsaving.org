#!/usr/bin/env node
/* ==================================================================== *
 *  Does .pages.yml still describe the content it edits?
 *
 *  Pages CMS writes back the fields it knows about. A key that exists in a
 *  JSON file but has no field in the schema is therefore not merely
 *  uneditable — it can be REMOVED the first time someone saves that file in
 *  the editor. That is how a partner's link, a founder's portrait, or the
 *  generated logo dimensions would quietly disappear from a page nobody
 *  thought they were touching.
 *
 *  The reverse is milder but still worth catching: a field declared in the
 *  schema that no content uses is an input in the editor that changes
 *  nothing.
 *
 *  Run: node scripts/validate-cms.js   (also part of `npm run validate`)
 * ==================================================================== */
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = path.join(__dirname, "..");
const IGNORE_FILES = new Set([".gitkeep", ".DS_Store"]);

/** Field names declared by the schema, as dotted paths. */
function fieldPaths(fields, prefix = "", out = new Set()) {
  for (const f of fields || []) {
    if (!f || !f.name) continue;
    const p = prefix ? prefix + "." + f.name : f.name;
    out.add(p);
    if (f.fields) fieldPaths(f.fields, p, out);
  }
  return out;
}

/** Keys present in the data, as dotted paths. A list collapses to one level:
 *  every entry contributes the same paths, which is what the schema says too. */
function dataPaths(v, prefix = "", out = new Set()) {
  if (Array.isArray(v)) {
    v.forEach((x) => dataPaths(x, prefix, out));
    return out;
  }
  if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v)) {
      const p = prefix ? prefix + "." + k : k;
      out.add(p);
      dataPaths(val, p, out);
    }
  }
  return out;
}

function main() {
  const cfg = yaml.load(fs.readFileSync(path.join(ROOT, ".pages.yml"), "utf8"));
  const entries = cfg.content || [];
  const errors = [];
  const warnings = [];

  for (const c of entries) {
    if (c.type !== "file" || !c.path || !c.path.endsWith(".json")) continue;
    const file = path.join(ROOT, c.path);
    if (!fs.existsSync(file)) {
      errors.push(`${c.path}: declared in .pages.yml but the file is missing`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const declared = fieldPaths(c.fields);
    const actual = dataPaths(data);

    for (const p of actual) {
      if (!declared.has(p)) errors.push(`${c.path}: "${p}" has no CMS field — an editor save would drop it`);
    }
    for (const p of declared) {
      if (!actual.has(p)) warnings.push(`${c.path}: "${p}" is a CMS field no content uses`);
    }
  }

  // Every page file should be reachable from the editor.
  const covered = new Set(entries.map((c) => c.path));
  const pagesDir = path.join(ROOT, "content/pages");
  if (fs.existsSync(pagesDir)) {
    for (const f of fs.readdirSync(pagesDir)) {
      if (IGNORE_FILES.has(f) || !f.endsWith(".json")) continue;
      const rel = "content/pages/" + f;
      if (!covered.has(rel)) errors.push(`${rel}: no entry in .pages.yml — not editable in the CMS`);
    }
  }

  warnings.forEach((w) => console.warn("warning: " + w));
  if (errors.length) {
    errors.forEach((e) => console.error("error:   " + e));
    console.error(`\nCMS schema out of sync: ${errors.length} error(s).`);
    process.exit(1);
  }
  console.log(
    `CMS schema valid: ${entries.length} entries, no unmapped content keys` +
    (warnings.length ? `, ${warnings.length} unused field(s).` : ".")
  );
}

main();
