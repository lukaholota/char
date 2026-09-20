import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { buildIconFileName } from "../src/lib/refs/icon-prompt";

const SIZE = 64;
const COLUMNS = 24;
const QUALITY = 85;
const SPRITE_DIR = "public/assets/spell-icons";
const INDEX_FILE = "src/lib/generated/spell-icon-sprite.json";
/// Походження іконок потрібне лише гейтам і інструментам, тож воно живе окремо від
/// маніфеста: той їде в браузер, і кожен зайвий кілобайт у ньому платять усі читачі.
const SOURCES_FILE = "data/spell-icons/sprite-sources.json";

type Source = "bg3" | "built";

function collectIcons(): { engName: string; file: string; source: Source }[] {
  const bg3Map = JSON.parse(readFileSync("data/spell-icons/bg3-map.json", "utf8")) as Record<string, string>;
  const subjects = JSON.parse(readFileSync("data/spell-icons/prompt-subjects.json", "utf8")) as Record<string, unknown>;

  const icons: { engName: string; file: string; source: Source }[] = [];
  for (const engName of Object.keys(bg3Map)) {
    icons.push({ engName, file: join("data/spell-icons/raw", `${buildIconFileName(engName)}.webp`), source: "bg3" });
  }
  for (const engName of Object.keys(subjects)) {
    icons.push({ engName, file: join("data/spell-icons/built", `${buildIconFileName(engName)}.webp`), source: "built" });
  }
  return icons.sort((a, b) => a.engName.localeCompare(b.engName));
}

async function buildSprite(): Promise<void> {
  const icons = collectIcons();
  const absent = icons.filter((icon) => !existsSync(icon.file));
  if (absent.length) {
    console.error(`немає файлів для ${absent.length} іконок, перша — ${absent[0].engName} (${absent[0].file})`);
    process.exit(1);
  }

  const rows = Math.ceil(icons.length / COLUMNS);
  const tiles = await Promise.all(
    icons.map(async (icon, i) => ({
      input: await sharp(icon.file).resize(SIZE, SIZE, { fit: "fill" }).removeAlpha().toBuffer(),
      left: (i % COLUMNS) * SIZE,
      top: Math.floor(i / COLUMNS) * SIZE,
    })),
  );

  const sprite = await sharp({
    create: { width: COLUMNS * SIZE, height: rows * SIZE, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite(tiles)
    .webp({ quality: QUALITY })
    .toBuffer();

  const hash = createHash("sha1").update(sprite).digest("hex").slice(0, 10);
  const file = `sprite-${hash}.webp`;

  rmSync(SPRITE_DIR, { recursive: true, force: true });
  mkdirSync(SPRITE_DIR, { recursive: true });
  writeFileSync(join(SPRITE_DIR, file), sprite);

  /// Позиція заклинання у спрайті — це його місце в масиві. Карта «назва → число» коштувала б
  /// утричі більше байтів у бандлі заради того самого.
  const names = icons.map((icon) => icon.engName);
  const source: Record<string, Source> = {};
  icons.forEach((icon) => {
    source[icon.engName] = icon.source;
  });

  writeFileSync(
    INDEX_FILE,
    `${JSON.stringify({ file: `/assets/spell-icons/${file}`, size: SIZE, columns: COLUMNS, rows, names }, null, 2)}\n`,
  );
  writeFileSync(SOURCES_FILE, `${JSON.stringify(source, null, 2)}\n`);

  const counts = icons.reduce<Record<string, number>>((acc, icon) => ({ ...acc, [icon.source]: (acc[icon.source] ?? 0) + 1 }), {});
  console.log(`спрайт ${COLUMNS * SIZE}×${rows * SIZE}, ${Math.round(sprite.length / 1024)} КБ → ${SPRITE_DIR}/${file}`);
  console.log(`іконок ${icons.length}: вікі BG3 ${counts.bg3 ?? 0}, зібраних ${counts.built ?? 0}`);
}

void buildSprite();
