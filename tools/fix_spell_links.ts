import fs from 'node:fs/promises';
import path from 'node:path';

type SpellEntry = {
  spell_id: number;
  eng_name: string;
};

type DictionaryJson = {
  SPELLS?: SpellEntry[];
};

function normalizeSpellName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\u2019/g, "'") // curly apostrophe
    .replace(/\s+/g, ' ');
}

async function collectTsFiles(rootPath: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(current: string) {
    const stat = await fs.stat(current);
    if (stat.isFile()) {
      if (current.endsWith('.ts')) files.push(current);
      return;
    }

    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
      await walk(path.join(current, entry.name));
    }
  }

  await walk(rootPath);
  return files;
}

async function loadSpellIdByNameMap(workspaceRoot: string): Promise<Map<string, number>> {
  const dictPath = path.join(workspaceRoot, 'src', 'lib', 'refs', 'dictionary.json');
  const raw = await fs.readFile(dictPath, 'utf8');
  const json = JSON.parse(raw) as DictionaryJson;

  if (!json.SPELLS || !Array.isArray(json.SPELLS)) {
    throw new Error(`No SPELLS[] found in ${dictPath}`);
  }

  const map = new Map<string, number>();
  for (const spell of json.SPELLS) {
    if (!spell?.eng_name || typeof spell.spell_id !== 'number') continue;
    const key = normalizeSpellName(spell.eng_name);
    if (!map.has(key)) map.set(key, spell.spell_id);
  }

  return map;
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const targetRoots = args.filter((a) => a !== '--write');

  const workspaceRoot = process.cwd();
  const spellIdByName = await loadSpellIdByNameMap(workspaceRoot);

  const roots = targetRoots.length ? targetRoots : [path.join(workspaceRoot, 'prisma', 'seed')];

  // <a href="/spell/1289">UA text [Detect Magic]</a>
  const anchorRe = /<a\s+href=("|')\/spell\/(\d+)\1>([^<]*?)\[(.*?)\]<\/a>/g;

  let totalChanges = 0;
  let totalAnchors = 0;
  let filesTouched = 0;

  for (const root of roots) {
    const resolvedRoot = path.isAbsolute(root) ? root : path.join(workspaceRoot, root);
    const tsFiles = await collectTsFiles(resolvedRoot);

    for (const filePath of tsFiles) {
      const original = await fs.readFile(filePath, 'utf8');

      let fileChanges = 0;
      const sampleChanges: Array<{ currentId: number; expectedId: number; name: string }> = [];
      const updated = original.replace(anchorRe, (full, quote, idStr, beforeBracket, engName) => {
        totalAnchors += 1;
        const currentId = Number(idStr);
        const normalizedName = normalizeSpellName(engName);
        const expectedId = spellIdByName.get(normalizedName);

        if (!expectedId) return full;
        if (expectedId === currentId) return full;

        fileChanges += 1;
        totalChanges += 1;
        if (!write && sampleChanges.length < 10) {
          sampleChanges.push({ currentId, expectedId, name: engName });
        }
        return `<a href=${quote}/spell/${expectedId}${quote}>${beforeBracket}[${engName}]</a>`;
      });

      if (fileChanges > 0) {
        filesTouched += 1;
        const rel = path.relative(workspaceRoot, filePath);
        if (write) {
          await fs.writeFile(filePath, updated, 'utf8');
          console.log(`✅ ${rel}: fixed ${fileChanges} spell link(s)`);
        } else {
          console.log(`📝 ${rel}: would fix ${fileChanges} spell link(s)`);
          for (const c of sampleChanges) {
            console.log(`   - ${c.name}: ${c.currentId} -> ${c.expectedId}`);
          }
        }
      }
    }
  }

  console.log(`\nScanned anchors: ${totalAnchors}`);
  console.log(`Total fixes: ${totalChanges}`);
  console.log(`Files touched: ${filesTouched}`);

  if (!write && totalChanges > 0) {
    console.log(`\nRun with --write to apply changes.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
