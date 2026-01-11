import fs from 'node:fs/promises';
import path from 'node:path';

type SpellEntry = {
  spell_id: number;
  eng_name: string;
  name: string;
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

async function loadSpells(workspaceRoot: string): Promise<SpellEntry[]> {
  const dictPath = path.join(workspaceRoot, 'src', 'lib', 'refs', 'dictionary.json');
  const raw = await fs.readFile(dictPath, 'utf8');
  const json = JSON.parse(raw) as DictionaryJson;

  if (!json.SPELLS || !Array.isArray(json.SPELLS)) {
    throw new Error(`No SPELLS[] found in ${dictPath}`);
  }

  return json.SPELLS;
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const targetRoots = args.filter((a) => a !== '--write');

  const workspaceRoot = process.cwd();
  const spells = await loadSpells(workspaceRoot);
  const spellIdByEngName = new Map<string, number>();
  for (const s of spells) {
    spellIdByEngName.set(normalizeSpellName(s.eng_name), s.spell_id);
  }

  const roots = targetRoots.length ? targetRoots : [path.join(workspaceRoot, 'prisma', 'seed')];

  // Modified to match slugs and optional brackets
  const anchorRe = /<a\s+href=("|')\/spells?\/([^"']+)\1>([^<]*?)(?:\[(.*?)\])?<\/a>/g;

  let totalChanges = 0;
  let totalAnchors = 0;
  let filesTouched = 0;

  for (const root of roots) {
    const resolvedRoot = path.isAbsolute(root) ? root : path.join(workspaceRoot, root);
    const tsFiles = await collectTsFiles(resolvedRoot);

    for (const filePath of tsFiles) {
      const original = await fs.readFile(filePath, 'utf8');

      let fileChanges = 0;
      const sampleChanges: Array<{ currentId: string; expectedId: number; name: string }> = [];
      const updated = original.replace(anchorRe, (full, quote, idOrSlug, textContent, engName) => {
        totalAnchors += 1;
        const normalizedEngName = engName ? normalizeSpellName(engName) : null;
        
        let expectedId: number | undefined;
        
        if (normalizedEngName) {
          expectedId = spellIdByEngName.get(normalizedEngName);
        }

        // Try to identify by slug if eng name not in brackets or not found
        if (!expectedId && isNaN(Number(idOrSlug))) {
          const slugAsName = idOrSlug.replace(/-/g, ' ');
          expectedId = spellIdByEngName.get(normalizeSpellName(slugAsName));
        }

        if (!expectedId) return full;
        
        const spellEntry = spells.find(s => s.spell_id === expectedId);
        if (!spellEntry) return full;

        const newText = spellEntry.name;
        const newHref = `/spell/${expectedId}`;
        const newAnchor = `<a href=${quote}${newHref}${quote}>${newText}</a>`;

        if (full === newAnchor) return full;

        fileChanges += 1;
        totalChanges += 1;
        if (!write && sampleChanges.length < 5) {
          sampleChanges.push({ currentId: idOrSlug, expectedId, name: spellEntry.eng_name });
        }
        return newAnchor;
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
