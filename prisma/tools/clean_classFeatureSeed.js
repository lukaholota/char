const fs = require('fs');
const path = 'prisma/seed/classFeatureSeed.ts';
let s = fs.readFileSync(path, 'utf8');
const re = /\{[\s\S]*?engName:\s*'([^']+)'[\s\S]*?\}/g;
let m;
const items = [];
while ((m = re.exec(s))) {
  const block = m[0];
  const eng = m[1];
  const descMatch = /description\s*:\s*'([\s\S]*?)'\s*(,|$)/m.exec(block);
  const desc = descMatch ? descMatch[1] : '';
  items.push({ eng, block, descLen: desc.trim().length });
}
if (items.length === 0) {
  console.error('No feature blocks found. Aborting.');
  process.exit(1);
}
// Determine bounds of matched region
const firstMatch = re.exec(s); // move pointer
// Reset and re-extract positions
let all = [];
re.lastIndex = 0;
while ((m = re.exec(s))) {
  all.push({ start: m.index, end: re.lastIndex, block: m[0], eng: m[1] });
}
const regionStart = all[0].start;
const regionEnd = all[all.length - 1].end;
// Group by engName and pick block with maximum descLen
const map = new Map();
for (const it of items) {
  if (!map.has(it.eng) || map.get(it.eng).descLen < it.descLen) map.set(it.eng, it);
}
const kept = [...map.values()].map(x => x.block);
// Ensure shortDescription exists in kept blocks; derive by taking first 160 chars of description without HTML
function deriveShort(block) {
  if (/shortDescription\s*:/.test(block)) return block;
  const descMatch = /description\s*:\s*'([\s\S]*?)'\s*(,|$)/m.exec(block);
  const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
  const short = desc.length > 160 ? desc.slice(0, 157).trim() + '...' : desc;
  // insert before the final closing brace of the object
  return block.replace(/\}\s*$/,'  ,\n  shortDescription: \'' + short.replace(/'/g, "\\'") + '\'\n}');
}
const normalized = kept.map(deriveShort);
// Build new file content by replacing region with normalized blocks joined by ',\n'
const newRegion = normalized.join(',\n\n');
const newContent = s.slice(0, regionStart) + newRegion + s.slice(regionEnd);
fs.writeFileSync(path, newContent, 'utf8');
console.log('Wrote cleaned file with', normalized.length, 'unique features.');
