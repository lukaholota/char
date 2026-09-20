import { describe, expect, it } from "vitest";
import { readSubclassFeatureSeedInputs } from "../../prisma/seed/subclassFeatureSeed";
import {
  WILD_MAGIC_ERROR_COPIES,
  WILD_MAGIC_SURGE_FEATURE_ENG_NAME,
  drawRandomCopyIndex,
  findSeededCopyIndex,
} from "@/components/errors/wild-magic-error-copy";
import { WILD_MAGIC_SURGE_TABLE_ROWS } from "@/lib/wild-magic-surge-table";

const SURGE_ROW = /^(\d\d-\d\d): (.+)$/gm;

const TABLE_PHRASE_BY_ROLL: Record<string, string> = {
  "07-08": "Вогнекуля [Fireball]</a> як закляття 3-го рівня з центром на собі",
  "01-02": "кидайте по цій таблиці на початку кожного свого ходу",
  "41-42": "кімнатну рослину в горщику до початку вашого наступного ходу",
  "31-32": "переноситесь на Астральний План до кінця вашого наступного ходу",
  "49-50": "з рота вилітають рожеві бульбашки",
  "91-92": "помрете протягом наступної хвилини, то негайно повернетесь до життя",
};

function readSurgeTableRows(): Map<string, string> {
  const surge = readSubclassFeatureSeedInputs().find((input) => input.engName === WILD_MAGIC_SURGE_FEATURE_ENG_NAME);
  if (!surge?.description) throw new Error("У сіді підкласів немає риси Wild Magic Surge");
  return new Map([...surge.description.matchAll(SURGE_ROW)].map(([, roll, text]) => [roll, text]));
}

describe("Сторінка помилки — підписи з таблиці Сплеску дикої магії 2014", () => {
  const rows = readSurgeTableRows();

  it("таблиця в сіді має всі 50 рядків", () => {
    expect(rows.size).toBe(50);
  });

  it("модалка бере всі рядки з таблиці сіду, а не власну копію", () => {
    expect(WILD_MAGIC_SURGE_TABLE_ROWS).toEqual(
      Array.from(rows, ([roll, description]) => ({ roll, description })),
    );
  });

  it("кожен рядок таблиці має варіант error-екрана", () => {
    expect(WILD_MAGIC_ERROR_COPIES).toHaveLength(rows.size);
    expect(new Set(WILD_MAGIC_ERROR_COPIES.map((copy) => copy.surgeRoll))).toEqual(new Set(rows.keys()));
  });

  it("кожен підпис спирається на реальний рядок таблиці і називає його діапазон", () => {
    for (const copy of WILD_MAGIC_ERROR_COPIES) {
      const row = rows.get(copy.surgeRoll);
      expect(row, `у таблиці 2014 немає рядка ${copy.surgeRoll}`).toBeDefined();
      const phrase = TABLE_PHRASE_BY_ROLL[copy.surgeRoll];
      if (phrase) expect(row, `рядок ${copy.surgeRoll} не про те, про що жарт`).toContain(phrase);
    }
  });

  it("щонайменше пʼять різних варіантів, і жоден не показує сирі ідентифікатори", () => {
    expect(WILD_MAGIC_ERROR_COPIES.length).toBeGreaterThanOrEqual(5);
    expect(new Set(WILD_MAGIC_ERROR_COPIES.map((copy) => copy.title)).size).toBe(WILD_MAGIC_ERROR_COPIES.length);
    for (const copy of WILD_MAGIC_ERROR_COPIES) {
      expect(`${copy.title} ${copy.description}`).not.toMatch(/<a |\/spell\/|WILD_MAGIC|[a-z]{3,}/);
    }
  });

  it("варіанти не показують технічну розмітку й уміщаються в екран помилки", () => {
    for (const copy of WILD_MAGIC_ERROR_COPIES) {
      const shownDescription = `У таблиці Дикої магії випало ${copy.surgeRoll.replace("-", "–")}: ${copy.description}`;
      expect(shownDescription.length, shownDescription).toBeGreaterThanOrEqual(50);
      expect(shownDescription.length, shownDescription).toBeLessThanOrEqual(500);
      expect(shownDescription).not.toMatch(/<a |\[[A-Za-z ]+\]/);
    }
  });

  it("вибір із зерна детермінований, випадковий — у межах списку", () => {
    expect(findSeededCopyIndex("digest-1")).toBe(findSeededCopyIndex("digest-1"));
    expect(findSeededCopyIndex(undefined)).toBe(0);
    expect(new Set(["a", "b", "c", "d", "e", "f", "g"].map(findSeededCopyIndex)).size).toBeGreaterThan(1);
    expect(drawRandomCopyIndex(() => 0)).toBe(0);
    expect(drawRandomCopyIndex(() => 0.999999)).toBe(WILD_MAGIC_ERROR_COPIES.length - 1);
  });
});
