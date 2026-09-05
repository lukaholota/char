import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { MIRROR_REVISION } from "./mirror";
import { BATCH_PLAN_PATH, BatchPlan, BatchRow, readBatchPlan } from "./creature-batches";
import { RulesEdition, SourceCreature, findLooseNameKey, readCreatures } from "./schema";
import { toEntitySlug } from "../../src/lib/slug-utils";

/// Планувальник партій KR16.3. Бере наступні `batchSize` рядків маніфесту aidedd зі статусом
/// `pending`, пінує кожному книгу корпусу й дописує партію в план. Порядок маніфесту не
/// перебудовується: aidedd склав його за зростанням показника небезпеки, тож ранні партії —
/// прості статблоки, пізні — легендарні.
const MANIFEST_PATH = join(process.cwd(), "data/aidedd/import-manifest.json");

/// Та сама істота лежить і в збірці, і в первинній книзі. Беремо перевидання: наш конвеєр
/// aidedd уже зводить Volo's і Mordenkainen's до `MPMM` (`findSourceKey2014`), і 121 запис
/// каталогу вже стоїть під ним.
const PREFERRED_BOOKS = ["MPMM", "FTD", "BGDIA", "CoA"];

type ManifestRow = {
  nameEng: string;
  slug: string;
  edition: RulesEdition;
  status: string;
  creatureId: number;
};

function planNextBatch(): void {
  const plan = readBatchPlan();
  const edition = readFlag("edition") === "2024" ? "RULES_2024" : "RULES_2014";
  const batch = plan.batches.length === 0 ? 1 : Math.max(...plan.batches.map((entry) => entry.batch)) + 1;
  const corpus = readCreatures().filter((creature) => creature.isFullStatblock);
  const named = readFlag("names");
  const rows = named === "" ? findNextRows(plan, edition, corpus) : findNamedRows(named, plan, edition, corpus);

  if (rows.length === 0) throw new Error(`Нічого планувати: ${edition} не має pending-рядків із корпусом`);

  const next: BatchPlan = {
    ...plan,
    revision: MIRROR_REVISION,
    batches: [...plan.batches, { batch, edition, creatures: rows }],
  };

  writeFileSync(BATCH_PLAN_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  console.log(`✅ партія ${batch} (${edition}): ${rows.length} істот → ${BATCH_PLAN_PATH}`);
  for (const row of rows) console.log(`   ${row.creatureId}\t${row.nameEng} (${row.pinnedSource})`);
}

function findNextRows(plan: BatchPlan, edition: RulesEdition, corpus: SourceCreature[]): BatchRow[] {
  const planned = new Set(plan.batches.flatMap((entry) => entry.creatures.map((row) => row.slug)));

  return readManifest()
    .filter((row) => row.edition === edition && row.status === "pending" && !planned.has(row.slug))
    .flatMap((row) => {
      const book = findPinnedBook(row, corpus);
      return book === "" ? [] : [buildRow(row, book)];
    })
    .slice(0, plan.batchSize);
}

/// Істоти, яких у маніфесті aidedd немає **взагалі**. Маніфест дзеркалить те, що публікує
/// aidedd, тож дописувати в нього чужі рядки не можна — інакше він перестане дорівнювати
/// джерелу. Але корпус 5etools подекуди тримає поіменні статблоки там, де aidedd дає лише
/// збірну сторінку: 15 прадраконів проти трьох слагів `*-greatwyrm`. Такий рядок планується
/// за назвою, слаг виводиться з неї, а id береться наступний вільний у діапазоні редакції.
function findNamedRows(named: string, plan: BatchPlan, edition: RulesEdition, corpus: SourceCreature[]): BatchRow[] {
  let nextId = findNextFreeId(plan, edition);

  return named.split(",").map((entry) => {
    const nameEng = entry.trim();
    const book = findPinnedBook({ nameEng, edition }, corpus);
    if (book === "") throw new Error(`${nameEng}: у корпусі немає статблока для ${edition}`);
    const row = buildRow({ nameEng, slug: toEntitySlug(nameEng), edition, creatureId: nextId }, book);
    nextId += 1;
    return row;
  });
}

/// Ті самі три носії, що знає маніфест: власні рядки маніфесту, вже заплановані партії й
/// сам каталог. Брати максимум лише з одного з них замало — id, виданий партією, у маніфест
/// не повертається, і друга така партія видала б його вдруге.
function findNextFreeId(plan: BatchPlan, edition: RulesEdition): number {
  const taken = [
    ...readManifest().filter((row) => row.edition === edition).map((row) => row.creatureId),
    ...plan.batches.filter((entry) => entry.edition === edition).flatMap((entry) => entry.creatures.map((row) => row.creatureId)),
  ];
  return Math.max(...taken) + 1;
}

function buildRow(
  row: Pick<ManifestRow, "nameEng" | "slug" | "edition" | "creatureId">,
  pinnedSource: string
): BatchRow {
  return {
    nameEng: row.nameEng,
    slug: row.slug,
    creatureId: row.creatureId,
    edition: row.edition,
    pinnedSource,
    status: "ready",
    blocker: "",
  };
}

function findPinnedBook(row: Pick<ManifestRow, "nameEng" | "edition">, corpus: SourceCreature[]): string {
  const found = corpus.filter(
    (creature) =>
      creature.edition === row.edition && findLooseNameKey(creature.nameEng) === findLooseNameKey(row.nameEng)
  );
  if (found.length === 0) return "";
  const preferred = found.find((creature) => PREFERRED_BOOKS.includes(creature.source));
  return (preferred ?? found[0]).source;
}

function readManifest(): ManifestRow[] {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as ManifestRow[];
}

function readFlag(name: string): string {
  const found = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : "";
}

try {
  planNextBatch();
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
