const fs = require('fs');
const path = 'prisma/seed/classFeatureSeed.ts';
const s = fs.readFileSync(path, 'utf8');
const re = /\{[\s\S]*?engName:\s*'([^']+)'[\s\S]*?\}/g;
const map = new Map();
let m;
while ((m = re.exec(s))) {
  const block = m[0];
  const name = m[1];
  const hasShort = /shortDescription\s*:/.test(block);
  const descMatch = /description\s*:\s*'([\s\S]*?)'\s*,/m.exec(block);
  const descLen = descMatch ? descMatch[1].trim().length : 0;
  const line = s.slice(0, m.index).split('\n').length + 1;
  if (!map.has(name)) map.set(name, []);
  map.get(name).push({ line, hasShort, descLen, preview: block.slice(0, 140).replace(/\n/g, ' ') });
}
const dups = [...map.entries()].filter(([k, v]) => v.length > 1).map(([k, v]) => ({ engName: k, occurrences: v }));
console.log(JSON.stringify(dups, null, 2));
