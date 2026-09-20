import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildIconFileName, buildIconPrompt, findDefaultHue } from "../src/lib/refs/icon-prompt";

type Subject = { hue?: string; subject: string };

const OUT_DIR = "data/spell-icons/prompts";
const BATCH_SIZE = Number(process.env.ICON_PROMPT_BATCH ?? 10);

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function findSpellsNeedingIcon(): { engName: string; school: string | null }[] {
  const schools = new Map<string, string | null>();
  for (const file of ["src/lib/generated/spells.json", "data/2024/normalized/spells.json"]) {
    for (const spell of readJson<{ engName: string; school: string | null }[]>(file)) {
      if (!schools.has(spell.engName)) schools.set(spell.engName, spell.school);
    }
  }

  const covered = new Set<string>();
  for (const file of ["data/spell-icons/bg3-map.json", "data/spell-icons/mystra-map.json"]) {
    try {
      for (const engName of Object.keys(readJson<Record<string, string>>(file))) covered.add(engName);
    } catch {
      // мапи мода ще немає — це нормально, вона з'явиться в KR40.5
    }
  }

  return [...schools.entries()]
    .filter(([engName]) => !covered.has(engName))
    .map(([engName, school]) => ({ engName, school }))
    .sort((a, b) => a.engName.localeCompare(b.engName));
}

function buildSingleFileText(ready: { engName: string; school: string | null }[], subjects: Record<string, Subject>): string {
  const head = [
    `# Промпти іконок заклинань — ${ready.length} штук`,
    "",
    "Кожен блок нижче самодостатній: у ньому вже підставлено і відтінок, і сюжет.",
    "Нічого не заповнювати, не скорочувати й не переписувати — текст блока йде в генерацію як є.",
    "",
  ].join("\n");

  const blocks = ready.map((spell, n) => {
    const entry = subjects[spell.engName];
    const hue = entry.hue ?? findDefaultHue(spell.school);
    return [
      "=".repeat(72),
      `## ${n + 1} / ${ready.length}. ${spell.engName} → ${buildIconFileName(spell.engName)}.png`,
      "=".repeat(72),
      "",
      buildIconPrompt(hue, entry.subject),
      "",
    ].join("\n");
  });

  return `${head}\n${blocks.join("\n")}`;
}

function buildInstructionText(total: number, batchCount: number): string {
  return `# Як генерувати іконки

## 1. Що кинути в ChatGPT

Прикріпи файл \`all-prompts.txt\` (${total} промптів, ~460 КБ — саме прикріпити, у поле введення він не влізе)
і надішли першим повідомленням оцей текст:

---

У прикріпленому файлі ${total} пронумерованих блоків. Кожен блок — готовий промпт для генерації
зображення, у якому вже все підставлено.

Працюй так:
1. Генеруй по одному зображенню на повідомлення, суворо в порядку нумерації.
2. Текст промпта бери з блока дослівно. Нічого не додавай, не скорочуй і не «покращуй».
3. Під кожним зображенням пиши тільки імʼя файлу із заголовка блока — більше нічого.
4. Не питай підтвердження між зображеннями, не роби пауз, не підсумовуй.
5. Якщо обірвешся — продовжиш з номера, який я назву.

Почни з блока 1.

---

## 2. Що робити з результатом

Зберігай кожне зображення під тим іменем, яке модель написала під ним (\`alarm.png\`, \`scrying.png\` …),
усі в одну теку. Тло в них буде чорне — так і має бути, камінь підставляє конвеєр.

Коли тека набереться:

\`\`\`
bunx tsx scripts/build-spell-icon.ts <тека з гліфами> <тека для іконок>
\`\`\`

Конвеєр сам доведе товщину штриха, зведе яскравість і насиченість, підставить еталонну плиту,
додасть сяйво й віддасть 64 × 64 webp.

## 3. Якщо сесія не тягне весь файл

Поруч лежать ті самі промпти, порізані на ${batchCount} партій по 10 — \`batch-01.txt\` … Тоді
прикріплюй партію замість \`all-prompts.txt\`, текст першого повідомлення той самий.

## 4. Якщо іконка не вийшла

Не переробляй картинку руками. Правиться сюжет у \`data/spell-icons/prompt-subjects.json\` (один рядок),
далі \`bunx tsx scripts/build-icon-prompts.ts\` — і промпт перезбереться.
`;
}

function buildBatchText(batch: { engName: string; school: string | null }[], subjects: Record<string, Subject>, index: number, total: number): string {
  const head = [
    `# Партія ${index} з ${total} — ${batch.length} іконок`,
    "",
    "Згенеруй ці зображення по черзі, по одному на повідомлення, у порядку списку.",
    "Після кожного напиши тільки імʼя файлу з заголовка — коментарі не потрібні.",
    "Кожен промпт самодостатній: нічого не переноси з попереднього.",
    "",
  ].join("\n");

  const blocks = batch.map((spell, n) => {
    const entry = subjects[spell.engName];
    const hue = entry.hue ?? findDefaultHue(spell.school);
    return [
      "=".repeat(72),
      `## ${n + 1}. ${spell.engName} → ${buildIconFileName(spell.engName)}.png`,
      "=".repeat(72),
      "",
      buildIconPrompt(hue, entry.subject),
      "",
    ].join("\n");
  });

  return `${head}\n${blocks.join("\n")}`;
}

function buildPromptFiles(): void {
  const subjects = readJson<Record<string, Subject>>("data/spell-icons/prompt-subjects.json");
  const needed = findSpellsNeedingIcon();
  const ready = needed.filter((spell) => subjects[spell.engName]);
  const missing = needed.filter((spell) => !subjects[spell.engName]);
  const stray = Object.keys(subjects).filter((engName) => !needed.some((spell) => spell.engName === engName));

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const batches: (typeof ready)[] = [];
  for (let i = 0; i < ready.length; i += BATCH_SIZE) batches.push(ready.slice(i, i + BATCH_SIZE));

  batches.forEach((batch, i) => {
    const name = `batch-${String(i + 1).padStart(2, "0")}.txt`;
    writeFileSync(join(OUT_DIR, name), buildBatchText(batch, subjects, i + 1, batches.length));
  });

  writeFileSync(join(OUT_DIR, "all-prompts.txt"), buildSingleFileText(ready, subjects));
  writeFileSync(join(OUT_DIR, "INSTRUCTION.md"), buildInstructionText(ready.length, batches.length));

  console.log(`без іконки: ${needed.length}`);
  console.log(`сюжет написано: ${ready.length} → ${batches.length} партій по ${BATCH_SIZE} у ${OUT_DIR}/`);
  console.log(`сюжету бракує: ${missing.length}`);
  if (stray.length) console.log(`зайві сюжети (іконка вже є): ${stray.join(", ")}`);
  if (missing.length) {
    console.log("\nнайближчі без сюжету:");
    for (const spell of missing.slice(0, 20)) console.log(`  ${spell.engName}  (${spell.school ?? "без школи"})`);
  }
}

buildPromptFiles();
