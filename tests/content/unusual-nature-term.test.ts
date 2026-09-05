import { describe, expect, it } from "vitest";
import creatures2014 from "@/lib/generated/creatures.json";
import creatures2024 from "@/lib/generated/creatures2024.json";
import dictionary from "@/lib/refs/dictionary.json";
import {
  countUnusualNatureByCarrier,
  findUnmarkedUnusualNature,
} from "../../scripts/terms/unusual-nature-occurrences";

/// Зведено 2026-09-02. Корпус мав одну українську форму й два написання: 39 записів несли
/// маркер `{{Unusual Nature}}`, 15 ні — партії 5etools 01 і 03 писали голо, з партії 04 почався
/// маркер і назад його не долили, а всі 9 партій aidedd писали голо. Власник звів їх до
/// **маркованої** форми і ратифікував термін: це другий випадок «ратифіковано, але маркер
/// лишається» після `НІП{{NPC}}` — переклад буквальний, та без оригіналу читач не звірить
/// рису з книгою.
const RATIFIED = dictionary.DND_DICTIONARY.statblockFeatures["Unusual Nature"];
const MARKED = `${RATIFIED}{{Unusual Nature}}`;

describe("термін Unusual Nature", () => {
  it("тримає ратифікований запис словника", () => {
    expect(RATIFIED).toBe("Незвичайна природа");
  });

  it("ловить голу форму — інакше нулі нижче нічого не доводять", () => {
    expect(findUnmarkedUnusualNature(`<p><b>${RATIFIED}.</b> Не потребує їжі.</p>`)).toEqual([
      RATIFIED,
    ]);
    expect(findUnmarkedUnusualNature(`<p><b>${MARKED}.</b> Не потребує їжі.</p>`)).toEqual([]);
  });

  it("не лишає голої форми в жодному носії — ні в каталозі, ні у файлі-джерелі", () => {
    const bare = Object.entries(countUnusualNatureByCarrier()).filter(([, count]) => count.bare > 0);
    expect(bare).toEqual([]);
  });

  it("тримає 54 марковані вживання в каталозі 2014 і жодного в 2024", () => {
    const counted = countUnusualNatureByCarrier();
    expect(counted["src/lib/generated/creatures.json"]).toEqual({ marked: 54, bare: 0 });
    expect(counted["src/lib/generated/creatures2024.json"]).toEqual({ marked: 0, bare: 0 });
  });

  it("везе марковану форму обома конвеєрами, а не лише 5etools", () => {
    const carries = (list: { specialAbilities: string }[], nameEng: string) =>
      (list as Array<{ nameEng: string; specialAbilities: string }>).find(
        (creature) => creature.nameEng === nameEng
      )?.specialAbilities;

    /// `Allip` приїхав партією aidedd, `Steel Predator` — партією 5etools. До зведення перший
    /// писав голо, другий із маркером.
    expect(carries(creatures2014, "Allip")).toContain(MARKED);
    expect(carries(creatures2014, "Steel Predator")).toContain(MARKED);
    expect(creatures2024).not.toContain(RATIFIED);
  });
});
