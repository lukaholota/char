/**
 * KR18.7 — володіння інструментом і стартове майно походжень 2024.
 *
 * Імпорт O6 лишив ці два поля неповними: вибіркові інструменти (ремісничі, музичні, ігрові)
 * випадали зовсім, каліграфічний набір не мав значення в enum, а пакунки майна писалися руками
 * й розійшлися з книгою. Джерело — `equipmentPackage` і `toolProficiency` у нормалізованих даних.
 */

import { BackgroundCategory, PrismaClient, ToolCategory } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type OriginBackground2024 = {
  engName: string;
  toolProficiency: { toolCategory: string | null };
  equipmentPackage: Array<{ name: string; quantity: number }>;
  existingBackgroundCategoryEnum?: string;
};

export const seedBackgroundOrigin2024 = async (prisma: PrismaClient) => {
  const backgrounds = readNormalizedBackgrounds();

  console.log(`🎒 Володіння інструментом і майно ${backgrounds.length} походжень 2024…`);
  let updated = 0;
  let errors = 0;

  for (const bg of backgrounds) {
    const name = toBackgroundEnum(bg);
    const toolCategory = bg.toolProficiency?.toolCategory as ToolCategory | null;

    try {
      await prisma.background.update({
        where: { name_ruleset: { name, ruleset: "RULES_2024" } },
        data: {
          toolProficiencies: toolCategory ? [toolCategory] : [],
          items: bg.equipmentPackage,
        },
      });
      updated++;
    } catch (err: unknown) {
      errors++;
      const e = err as { code?: string; message?: string };
      console.error(`  ❌ ${bg.engName} (${name}): ${e?.code ?? "?"} — ${e?.message ?? err}`);
    }
  }

  console.log(`✅ Походження 2024: ${updated} оновлено, ${errors} помилок`);
};

function readNormalizedBackgrounds(): OriginBackground2024[] {
  const existing = readNormalized("existing-2024-backgrounds-update-data.json");
  const alreadyUpdated = new Set(existing.map((bg) => bg.engName));

  return [...existing, ...readNormalized("backgrounds.json").filter((bg) => !alreadyUpdated.has(bg.engName))];
}

function readNormalized(fileName: string): OriginBackground2024[] {
  return JSON.parse(readFileSync(join(process.cwd(), "data/2024/normalized", fileName), "utf-8"));
}

function toBackgroundEnum(bg: OriginBackground2024): BackgroundCategory {
  const name = bg.existingBackgroundCategoryEnum ?? bg.engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return name as BackgroundCategory;
}
