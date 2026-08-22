#!/usr/bin/env node
/* ============================================================
   Briselle — measure-bundle.js
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Task: BRIS-NN-T145

   Prints built asset sizes and flags anything over the budget, so bundle
   growth is caught rather than re-discovered when a page feels slow.

   Usage:  node .agents/scripts/measure-bundle.js [distDir]
   Exit 1 if any asset exceeds its budget.
   ============================================================ */
const fs = require('fs');
const path = require('path');

const dist = process.argv[2] || 'briselle-lightining.client/dist/assets';
const BUDGET_KB = { js: 700, css: 320 };

if (!fs.existsSync(dist)) {
  console.log(`No build at ${dist} — run \`vite build\` first.`);
  process.exit(0);
}

const files = fs.readdirSync(dist)
  .filter(f => f.endsWith('.js') || f.endsWith('.css'))
  .map(f => ({
    name: f,
    ext: f.endsWith('.css') ? 'css' : 'js',
    kb: Math.round(fs.statSync(path.join(dist, f)).size / 1024),
  }))
  .sort((a, b) => b.kb - a.kb);

let over = 0;
console.log('  SIZE  TYPE  ASSET');
files.slice(0, 12).forEach((f) => {
  const bad = f.kb > BUDGET_KB[f.ext];
  if (bad) over += 1;
  console.log(`${bad ? '!' : ' '} ${String(f.kb).padStart(5)}KB  ${f.ext.padEnd(4)}  ${f.name}`);
});

const total = files.reduce((n, f) => n + f.kb, 0);
console.log(`\n${files.length} assets, ${total}KB total`);
console.log(`budgets: js ${BUDGET_KB.js}KB, css ${BUDGET_KB.css}KB`);

if (over) {
  console.log(`\n${over} asset(s) over budget. A large lazy chunk still blocks first paint —`);
  console.log('nothing renders until it arrives. See T143 in NOTIONNEST_T140_PERFORMANCE_PLAN.md.');
  process.exit(1);
}
console.log('\nAll assets within budget.');
