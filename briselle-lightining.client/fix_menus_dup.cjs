const fs = require('fs');
const c = fs.readFileSync('src/modules/notion-nest/menus.jsx', 'utf8');
const l = c.split('\n');
console.log('Lines:', l.length);
console.log('Has POPULAR_EMOJIS:', c.includes('POPULAR_EMOJIS'));
console.log('Has recentList state:', c.includes('recentList'));
console.log('Has recent-emojis-updated:', c.includes('nn-recent-emojis-updated'));
console.log('Has isCountryFlagEmoji in cell:', c.includes('isCountryFlagEmoji(em)'));
console.log('Has recordRecentEmoji in cell:', c.includes('recordRecentEmoji(em)'));
console.log('Has Tennis text:', c.includes("'Tennis'"));
console.log('Has duplicate BLOCK_TYPE_OPTIONS:', (c.match(/const BLOCK_TYPE_OPTIONS/g) || []).length);
console.log('Has EMOJI_CATEGORIES:', (c.match(/const EMOJI_CATEGORIES/g) || []).length);

// Check lines 138-200
console.log('\n--- Lines 135-200 ---');
l.slice(134, 200).forEach((line, i) => console.log((135+i) + ': ' + line.substring(0, 100)));
