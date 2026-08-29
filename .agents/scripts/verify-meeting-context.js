/*
 * Guard against the class of bug that produced "wakeWordRefblock is not
 * defined": every key placed into the meetingNotesApi object literal must
 * be a real binding in MeetingNotesBlockBase, or it throws at runtime
 * while the build stays green.
 */
const fs = require('fs');
const P = 'c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks/meeting-notes/MeetingNotesBlockBase.jsx';
const src = fs.readFileSync(P, 'utf8');

const objStart = src.indexOf('const meetingNotesApi = {');
const objEnd = src.indexOf('\n  };', objStart);
if (objStart === -1 || objEnd === -1) throw new Error('meetingNotesApi literal not found');
const keys = src.slice(objStart, objEnd)
  .split('\n').slice(1)
  .map(l => l.trim().replace(/,$/, ''))
  .filter(k => /^[A-Za-z_$][\w$]*$/.test(k));

// everything bound in the file, excluding the object literal itself
const head = src.slice(0, objStart) + src.slice(objEnd);
const bound = new Set();
for (const m of head.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) bound.add(m[1]);
for (const m of head.matchAll(/(?:const|let|var)\s*\[([^\]]*)\]/g))
  m[1].split(',').forEach(n => bound.add(n.trim()));
for (const m of head.matchAll(/(?:const|let|var)\s*\{([^}]*)\}/g))
  m[1].split(',').forEach(n => bound.add(n.trim().split(':').pop().trim()));
for (const m of head.matchAll(/function\s+([A-Za-z_$][\w$]*)/g)) bound.add(m[1]);
for (const m of head.matchAll(/import\s+\{([^}]*)\}/g))
  m[1].split(',').forEach(n => bound.add(n.trim().split(/\s+as\s+/).pop()));
for (const m of head.matchAll(/import\s+([A-Za-z_$][\w$]*)\s+from/g)) bound.add(m[1]);
// component props: function MeetingNotesBlockBase({ block })
for (const m of head.matchAll(/function\s+MeetingNotesBlockBase\s*\(\s*\{([^}]*)\}/g))
  m[1].split(',').forEach(n => bound.add(n.trim().split(':').pop().trim()));

const missing = keys.filter(k => !bound.has(k));
console.log(`context keys : ${keys.length}`);
console.log(`bound names  : ${bound.size}`);
if (missing.length) {
  console.log(`\nUNDEFINED KEYS (${missing.length}) — would throw at runtime:`);
  missing.forEach(k => console.log('  ' + k));
  process.exitCode = 1;
} else {
  console.log('\nevery context key resolves to a real binding ✓');
}
