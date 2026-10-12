import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

type ArtKind = "subclass" | "portrait";
type ArtEntry = { file: string; camera: string; subject: string; accent: string; subclassKeys?: string[]; done?: boolean };
type ArtPlan = { name: string; title: string; kind: ArtKind; className?: string; entries: ArtEntry[] };
type QueueItem = ArtEntry & { kind: ArtKind };
type CoverageProblems = { missing: string[]; stray: string[]; duplicated: string[] };

const DATA_DIR = "data/subclass-art";
const READY_BUILDS_DIR = "data/rpgbot/ready-builds";
const PORTRAITS_PLAN = "portraits";
const PRESET_PORTRAITS_PLAN = "presets";
const QUEUE_PLAN = "all";
const BATCH_SIZE = Number(process.env.SUBCLASS_ART_BATCH ?? 20);

const STYLE_BLOCK = `Unreal Engine 5 cinematic game key art, real-time ray-traced render, Lumen global illumination, Nanite-level geometry detail, glossy physically based materials, crisp specular highlights on wet stone, steel and cloth, volumetric fog and god rays, rich saturated colour grading in the style of a AAA game cinematic trailer, 8k, sharp focus, cinematic depth of field matched to the shot. Not a painting, not an illustration, no brush strokes, no sketch or hatching texture, no monochrome.`;

const FIGURE_RULE_BY_KIND: Record<ArtKind, string> = {
  subclass: `Any person is anonymous: seen from behind, in silhouette, cropped, masked, or reduced to hands and limbs — no clearly visible face and no recognisable species or race, so the picture fits any character of this subclass.`,
  portrait: `This is a portrait of one specific character: the face is visible, expressive and individual, exactly as described in the Subject, and is the focus of the image.`,
};

const SAFETY_RULES = `Keep the scene calm and clean: no person is shown being harmed or threatened, and any conflict is shown only through impacts on objects, shields, stone, energy and light.`;

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function readPlan(name: string): ArtPlan {
  if (name === PORTRAITS_PLAN) {
    const { entries } = readJson<{ entries: ArtEntry[] }>(join(DATA_DIR, "portraits.json"));
    return { name, title: "Портрети готових персонажів", kind: "portrait", entries };
  }
  if (name === PRESET_PORTRAITS_PLAN) {
    const { entries } = readJson<{ entries: ArtEntry[] }>(join(DATA_DIR, "preset-portraits.json"));
    return { name, title: "Портрети готових персонажів (решта)", kind: "portrait", entries };
  }
  const { className, entries } = readJson<{ className: string; entries: ArtEntry[] }>(join(DATA_DIR, `${name}.json`));
  return { name, title: `Підкласи ${className}`, kind: "subclass", className, entries };
}

function findClassSubclassKeys(className: string): string[] {
  const classes = readJson<{ engName: string; subclasses: { key: string }[] }[]>("src/lib/generated/classes.json");
  const keys = classes.filter((entry) => entry.engName === className).flatMap((entry) => entry.subclasses.map((subclass) => subclass.key));
  return [...new Set(keys)].sort();
}

function findReadyBuildFiles(): string[] {
  return readdirSync(READY_BUILDS_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => `preset-${basename(name, ".json")}`)
    .sort();
}

function compareCoverage(expected: string[], covered: string[]): CoverageProblems {
  return {
    missing: expected.filter((item) => !covered.includes(item)),
    stray: covered.filter((item) => !expected.includes(item)),
    duplicated: covered.filter((item, index) => covered.indexOf(item) !== index),
  };
}

function findBriefFiles(): string[] {
  return readJson<{ presets: { file: string }[] }>(join(DATA_DIR, "preset-portrait-brief.json")).presets.map((preset) => preset.file);
}

function findPlanProblems(plan: ArtPlan): CoverageProblems {
  if (plan.name === PRESET_PORTRAITS_PLAN) return compareCoverage(findBriefFiles(), plan.entries.map((entry) => entry.file));
  if (plan.kind === "portrait") return compareCoverage(findReadyBuildFiles(), plan.entries.map((entry) => entry.file));
  return compareCoverage(findClassSubclassKeys(plan.className!), plan.entries.flatMap((entry) => entry.subclassKeys ?? []));
}

function hasProblems(problems: CoverageProblems): boolean {
  return Object.values(problems).some((items) => items.length > 0);
}

function reportProblems(planName: string, problems: CoverageProblems): void {
  console.error(`Покриття не сходиться: ${planName}`);
  console.error(`  без зображення: ${problems.missing.join(", ") || "—"}`);
  console.error(`  зайві: ${problems.stray.join(", ") || "—"}`);
  console.error(`  вказані двічі: ${problems.duplicated.join(", ") || "—"}`);
}

function buildCompositionBlock(camera: string): string {
  return `Composition: ONE single image, cinematic 16:9 landscape, 1672x941, filling the whole frame. Never a collage, grid, gallery, contact sheet, storyboard, diptych, triptych or multi-panel layout; no border, frame, margins or panels. ${camera} The bottom third stays quiet and dark — floor, ground fog or deep shadow — because a dark gradient and a heading are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text of any kind: no letters, numerals, runes that read as writing, captions, titles, labels, signatures, logos or watermarks.`;
}

function buildArtPrompt(item: QueueItem): string {
  return [
    STYLE_BLOCK,
    buildCompositionBlock(item.camera),
    FIGURE_RULE_BY_KIND[item.kind],
    SAFETY_RULES,
    `Subject: ${item.subject}`,
    `Colour: ${item.accent}, over a darker, mostly neutral environment.`,
  ].join("\n\n");
}

function buildPromptBlock(item: QueueItem, number: number, total: number): string {
  return [
    "=".repeat(72),
    `## ${number} / ${total}. ${item.file}.png`,
    "=".repeat(72),
    "",
    buildArtPrompt(item),
    "",
  ].join("\n");
}

function buildAllPromptsText(title: string, items: QueueItem[]): string {
  const head = [
    `# Промпти зображень: ${title} — ${items.length} штук`,
    "",
    "Кожен блок нижче самодостатній: стиль, композиція, сюжет і колір уже підставлені.",
    "Нічого не заповнювати, не скорочувати й не переписувати — текст блока йде в генерацію як є.",
    "Кожен блок — ОКРЕМЕ зображення на весь кадр. Не колаж, не сітка, не галерея.",
    "",
  ].join("\n");
  const blocks = items.map((item, index) => buildPromptBlock(item, index + 1, items.length));
  return `${head}\n${blocks.join("\n")}`;
}

function buildBatchText(items: QueueItem[], index: number, total: number, firstNumber: number, grandTotal: number): string {
  const head = [
    `# Партія ${index} з ${total} — зображення ${firstNumber}–${firstNumber + items.length - 1} із ${grandTotal}`,
    "",
    "Згенеруй ці зображення по черзі, по одному на повідомлення, у порядку списку.",
    "Кожне — окреме зображення на весь кадр, не колаж і не сітка, без жодного тексту на ньому.",
    "Перед кожним напиши одним рядком «номер/усього імʼя-файлу» з заголовка блока — коментарі не потрібні.",
    "Якщо зображення заблоковано фільтром, один раз повтори блок із спокійнішою сценою (без шкоди чи загрози людям), а якщо знову — напиши SKIPPED і йди далі.",
    "Кожен промпт самодостатній: нічого не переноси з попереднього.",
    "",
  ].join("\n");
  const blocks = items.map((item, position) => buildPromptBlock(item, firstNumber + position, grandTotal));
  return `${head}\n${blocks.join("\n")}`;
}

function describeCovered(item: QueueItem): string {
  return item.kind === "portrait" ? "готовий персонаж" : (item.subclassKeys ?? []).join(", ");
}

function buildBatchSection(batchCount: number): string {
  if (batchCount < 2) return "";
  return `## Якщо сесія не тягне весь файл

Поруч лежать ті самі промпти, порізані на ${batchCount} партій по ${BATCH_SIZE} — \`batch-01.txt\` … Тоді
прикріплюй партію замість \`all-prompts.txt\`, текст першого повідомлення той самий. Нумерація в партіях
наскрізна, тож «продовжуй з номера N» працює й там.

`;
}

function buildInstructionText(title: string, planName: string, items: QueueItem[], batchCount: number): string {
  const coverageRows = items.map((item, index) => `| ${index + 1} | \`${item.file}.png\` | ${describeCovered(item)} |`).join("\n");
  return `# Як генерувати: ${title}

## Що кинути в ChatGPT

Прикріпи файл \`all-prompts.txt\` (${items.length} промптів) і надішли першим повідомленням оцей текст:

---

У прикріпленому файлі ${items.length} пронумерованих блоків. Кожен блок — готовий промпт для генерації
ОДНОГО окремого зображення, у якому вже все підставлено. Працюй автономно, без моєї участі, поки не
дійдеш до кінця списку.

Правила:
1. Генеруй по одному зображенню на повідомлення, суворо в порядку нумерації.
2. Кожне зображення — окремий кадр на весь екран, 16:9 (1672×941, якщо інструмент дає вибір; інакше
   найширший горизонтальний формат). НЕ роби колаж, сітку, галерею, контактний аркуш, розкадрування,
   диптих чи типтих і не клади кілька блоків в один кадр.
3. На зображенні не має бути жодного тексту: ні літер, ні цифр, ні підписів, ні назви файлу, ні
   водяних знаків, ні рамки чи полів.
4. Текст промпта бери з блока дослівно. Нічого не додавай, не скорочуй і не «покращуй».
5. Перед кожним зображенням напиши одним рядком «номер/усього імʼя-файлу» (наприклад \`3/${items.length} ${items[2]?.file ?? items[0].file}\`) — більше нічого.
6. Не питай підтвердження, чи продовжувати, не роби пауз і не підсумовуй. Зупиняйся лише після
   останнього блока.
7. Якщо зображення заблоковане фільтром безпеки, не зупиняйся: ОДИН раз повтори той самий блок, зробивши
   сцену спокійнішою — без будь-якої шкоди чи загрози людям і без зброї поруч із ними, але лишивши
   композицію, ракурс і колір. Якщо знову заблоковано — напиши \`SKIPPED: імʼя-файлу\` і йди до наступного блока.
8. Після останнього блока виведи одним рядком усі SKIPPED, якщо вони були.
9. Якщо обірвешся — я скажу номер, з якого продовжити.

Почни з блока 1.

---

${buildBatchSection(batchCount)}## Що робити з результатом

Збережи кожне зображення під іменем із рядка над ним, усі в одну теку і скинь її в Завантаження — далі я
сконвертую у webp, розкладу по теках і підключу. Для підкласів одна картинка обслуговує обидві
редакції (відповідність нижче); портрети готових персонажів ідуть у \`public/images/presets/\`.

## Якщо ChatGPT зробив колаж або поставив текст

Відповідай: «Це колаж. Згенеруй тільки блок N: одне зображення на весь кадр 16:9, без тексту».
Не переробляй картинку руками.

## Якщо зображення не вийшло або SKIPPED

Правиться сюжет у \`data/subclass-art/\` (файл класу або \`portraits.json\`, один запис), далі
\`bunx tsx scripts/build-subclass-art-prompts.ts ${planName}\` — і промпти перезберуться.

## Відповідність

| № | Файл | Що покриває |
|---|---|---|
${coverageRows}
`;
}

function splitIntoBatches<T>(items: T[]): T[][] {
  const batches: T[][] = [];
  for (let start = 0; start < items.length; start += BATCH_SIZE) batches.push(items.slice(start, start + BATCH_SIZE));
  return batches;
}

function writePromptFiles(outDir: string, planName: string, title: string, items: QueueItem[]): void {
  const batches = splitIntoBatches(items);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  if (batches.length > 1) {
    batches.forEach((batch, index) => {
      const name = `batch-${String(index + 1).padStart(2, "0")}.txt`;
      writeFileSync(join(outDir, name), buildBatchText(batch, index + 1, batches.length, index * BATCH_SIZE + 1, items.length));
    });
  }
  writeFileSync(join(outDir, "all-prompts.txt"), buildAllPromptsText(title, items));
  writeFileSync(join(outDir, "INSTRUCTION.md"), buildInstructionText(title, planName, items, batches.length));
}

function readQueueOrder(): string[] {
  return readJson<{ order: string[] }>(join(DATA_DIR, "queue.json")).order;
}

function toQueueItems(plan: ArtPlan): QueueItem[] {
  return plan.entries.filter((entry) => !entry.done).map((entry) => ({ ...entry, kind: plan.kind }));
}

function findDuplicateFiles(items: QueueItem[]): string[] {
  return items.map((item) => item.file).filter((file, index, files) => files.indexOf(file) !== index);
}

function loadValidPlans(planNames: string[]): ArtPlan[] {
  const plans = planNames.map(readPlan);
  const failed = plans.filter((plan) => hasProblems(findPlanProblems(plan)));
  failed.forEach((plan) => reportProblems(plan.name, findPlanProblems(plan)));
  if (failed.length > 0) process.exit(1);
  return plans;
}

function buildSubclassArtPrompts(planName: string): void {
  const isQueue = planName === QUEUE_PLAN;
  const plans = loadValidPlans(isQueue ? readQueueOrder() : [planName]);
  const items = plans.flatMap(toQueueItems);
  const duplicates = findDuplicateFiles(items);
  if (duplicates.length > 0) {
    console.error(`Імена файлів повторюються: ${duplicates.join(", ")}`);
    process.exit(1);
  }

  if (items.length === 0) {
    console.log("Усе вже згенеровано: нічого додавати в чергу.");
    return;
  }

  const title = isQueue ? "уся черга (портрети й підкласи)" : plans[0].title;
  const outDir = join(DATA_DIR, "prompts", planName);
  writePromptFiles(outDir, planName, title, items);
  console.log(`${title}: ${items.length} зображень, ${splitIntoBatches(items).length} партій у ${outDir}/`);
}

buildSubclassArtPrompts(process.argv[2] ?? "monk");
