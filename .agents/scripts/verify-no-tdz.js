#!/usr/bin/env node
/* ============================================================
   Briselle — verify-no-tdz.js
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Task: BRIS-NN-MNB-T130

   Catches temporal-dead-zone bugs in large React components: a name
   USED during render but DECLARED further down the same function body.

   Why this exists: `vite build` never fails on it, because JavaScript
   only throws at run time. The symptom is always the same —
   "Cannot access 'X' before initialization" and a blank block on mount.
   This class has caused five separate defects in MeetingNotesBlockBase.

   Two shapes are checked, because fixing the first one exposed the
   second:
     1. hook dependency ARRAYS  — }, [a, b, c]);
     2. plain render STATEMENTS — someRef.current = { a, b };
   Both are evaluated in source order during render. A function BODY is
   not checked, and must not be: it runs later, when everything exists.

   Usage:  node .agents/scripts/verify-no-tdz.js [file ...]
   Exit 1 if any forward reference is found.
   ============================================================ */
const fs = require('fs');
const path = require('path');

const DEFAULT_TARGETS = [
  'briselle-lightining.client/src/modules/notion-nest/blocks/meeting-notes/MeetingNotesBlockBase.jsx',
  'briselle-lightining.client/src/modules/notion-nest/core/NotionNestPage.jsx',
  'briselle-lightining.client/src/modules/notion-nest/core/PageContext.jsx',
];

function scan(file) {
  if (!fs.existsSync(file)) return { file, skipped: true, problems: [] };
  const lines = fs.readFileSync(file, 'utf8').split('\n');

  /* Where each top-level binding in the component body is declared. */
  const declaredAt = {};
  lines.forEach((l, i) => {
    let m = l.match(/^  const \[([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\]\s*=/);
    if (m) {
      if (!(m[1] in declaredAt)) declaredAt[m[1]] = i;
      if (!(m[2] in declaredAt)) declaredAt[m[2]] = i;
      return;
    }
    m = l.match(/^  (?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/);
    if (m && !(m[1] in declaredAt)) declaredAt[m[1]] = i;
  });

  const problems = [];
  const check = (names, lineIdx, kind) => {
    names.forEach((n) => {
      if (n in declaredAt && declaredAt[n] > lineIdx) {
        problems.push({ kind, line: lineIdx + 1, name: n, declared: declaredAt[n] + 1 });
      }
    });
  };

  lines.forEach((l, i) => {
    /* 1. dependency arrays */
    const deps = l.match(/\}, \[([^\]]*)\]\);/);
    if (deps) {
      check([...deps[1].matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)/g)].map(x => x[2]), i, 'deps');
    }
    /* 2. plain render statements, e.g. ref.current = { a, b } */
    const stmt = l.match(/^  [A-Za-z_$][\w$]*(?:\.current)?\s*=\s*(.+);\s*$/);
    if (stmt) {
      check([...stmt[1].matchAll(/(^|[^.\w$'"])([A-Za-z_$][\w$]*)/g)].map(x => x[2]), i, 'stmt');
    }
  });

  return { file, skipped: false, problems };
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_TARGETS;
let total = 0;

targets.forEach((t) => {
  const r = scan(t);
  const name = path.basename(r.file);
  if (r.skipped) { console.log(`- ${name}: not found, skipped`); return; }
  if (!r.problems.length) { console.log(`✓ ${name}: no forward references`); return; }
  console.log(`✗ ${name}: ${r.problems.length} forward reference(s)`);
  r.problems.forEach((p) => {
    console.log(`    line ${p.line} (${p.kind}) uses '${p.name}', declared at line ${p.declared}`);
  });
  total += r.problems.length;
});

if (total) {
  console.log(`\n${total} temporal-dead-zone risk(s). These throw on mount; the build will NOT catch them.`);
  process.exit(1);
}
console.log('\nNo temporal-dead-zone risks.');
