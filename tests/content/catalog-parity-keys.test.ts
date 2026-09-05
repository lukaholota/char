import { describe, expect, it } from "vitest";
import { normalizeKey, toEnumCode } from "../../scripts/measure-catalog-parity";

/// Звірка каталогів порівнює множини ключів, тож будь-яка різниця в написанні читається як
/// різниця в контенті. Обидві редакції розводяться суфіксом, і суфікс має два вигляди: енам
/// пише `FARMER_2024`, а назва фічі — «Agonizing Blast (2024)». Другий не знімався, і звірка
/// щоразу показувала 31 виклик «лише в таблиці» проти 31 «лише у файлі» — ті самі 31.
describe("KR12.5 — ключі звірки каталогів", () => {
  it("знімає обидва види суфікса редакції", () => {
    expect(normalizeKey("FARMER_2024")).toBe("farmer");
    expect(normalizeKey("Agonizing Blast (2024)")).toBe("agonizing blast");
  });

  it("зводить різні апострофи й зайві пробіли до одного вигляду", () => {
    expect(normalizeKey("Devil’s  Sight")).toBe(normalizeKey("Devil's Sight"));
    expect(normalizeKey("  Pact of the Blade  ")).toBe("pact of the blade");
  });

  it("не чіпає 2024 всередині назви — знімається лише хвіст", () => {
    expect(normalizeKey("Player's Handbook 2024 Errata")).toBe("player's handbook 2024 errata");
  });

  it("виводить код енама з англійської назви", () => {
    expect(toEnumCode("Studded Leather Armor")).toBe("STUDDED_LEATHER_ARMOR");
  });
});
