#!/usr/bin/env node
/* ============================================================
   Briselle Platform — .agents/scripts/verify-no-duplicate-css.js
   Created At: 2026-08-22 | Task: BRIS-AI-T164v

   "No duplicate CSS" is a platform rule, and breaking it has cost four
   separate debugging rounds on this codebase:
     .nnr-settings-flyout  declared 3x  (overflow fought itself)
     .nnr-tab-content      declared 2x  (the white band)
     .mt-rich-text         padding stacked (Summary 32px vs 20px)
     .aipc-notice strong   too broad (split a sentence in half)

   A grep cannot do this job: `.foo` and `.foo:hover` share a prefix but
   are different selectors, while `.a, .b` is two. So selectors are
   normalised properly here — comments and at-rule bodies stripped, each
   comma-separated selector compared on its own, whitespace collapsed.

   Reports a selector declared more than once IN THE SAME FILE. That is
   the pattern that actually causes the bug; the same class appearing in
   two different sheets is usually deliberate scoping.

   Run:  node .agents/scripts/verify-no-duplicate-css.js [--all]
         (default scans only the sheets this feature owns; --all scans
          every .css under the client src)
   Exit: 0 clean, 1 duplicates found.
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'briselle-lightining.client', 'src');

const OWNED = [
  path.join(SRC, 'components', 'ui', 'BriselleControls.css'),
  path.join(SRC, 'pages', 'settings', 'ai-providers', 'AiProvidersConfig.css'),
];

const scanAll = process.argv.includes('--all');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (full.endsWith('.css')) out.push(full);
  }
  return out;
}

/**
 * Selectors declared at the top level of a stylesheet.
 *
 * At-rule bodies (@media, @supports, @keyframes) are deliberately
 * EXCLUDED: redefining a selector inside @media is how responsive and
 * dark-mode overrides are supposed to work, so flagging it would train
 * everyone to ignore this script.
 */
function topLevelSelectors(css) {
  /* Comments first, so a selector inside one is never counted. */
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');

  const found = [];
  let depth = 0;
  let buffer = '';
  let atRuleDepth = -1;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];

    if (ch === '{') {
      if (depth === 0) {
        const raw = buffer.trim();
        buffer = '';
        if (raw.startsWith('@')) {
          /* Entering an at-rule — ignore everything until it closes. */
          atRuleDepth = depth;
          depth++;
          continue;
        }
        if (raw) found.push(raw);
      }
      depth++;
      continue;
    }

    if (ch === '}') {
      depth--;
      if (atRuleDepth >= 0 && depth <= atRuleDepth) atRuleDepth = -1;
      buffer = '';
      continue;
    }

    /* Only accumulate a selector when at top level and outside an at-rule. */
    if (depth === 0 && atRuleDepth < 0) buffer += ch;
  }

  return found;
}

/** `.a , .b:hover` -> ['.a', '.b:hover'] with whitespace collapsed. */
function splitSelectors(raw) {
  return raw
    .split(',')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

const files = scanAll ? walk(SRC) : OWNED.filter((f) => fs.existsSync(f));

if (files.length === 0) {
  console.error('No stylesheets found to scan.');
  process.exit(1);
}

let totalDupes = 0;
let totalSelectors = 0;

files.forEach((file) => {
  const rel = path.relative(ROOT, file);
  const css = fs.readFileSync(file, 'utf8');

  const counts = new Map();
  topLevelSelectors(css).forEach((raw) => {
    splitSelectors(raw).forEach((sel) => {
      totalSelectors++;
      counts.set(sel, (counts.get(sel) || 0) + 1);
    });
  });

  const dupes = [...counts.entries()].filter(([, n]) => n > 1);
  if (dupes.length) {
    console.log(`\n${rel}`);
    dupes
      .sort((a, b) => b[1] - a[1])
      .forEach(([sel, n]) => console.log(`  x ${sel}  declared ${n} times`));
    totalDupes += dupes.length;
  }
});

console.log(`\nScanned ${files.length} stylesheet(s), ${totalSelectors} top-level selector(s).`);

if (totalDupes) {
  console.log(`${totalDupes} duplicated selector(s). Merge each into one rule.`);
  process.exit(1);
}

console.log('Clean: no selector is declared twice at the top level of its own sheet.');
process.exit(0);
