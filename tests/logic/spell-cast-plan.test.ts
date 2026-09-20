import { describe, expect, it } from "vitest";
import type { PersWithRelations } from "@/lib/actions/pers";
import { planSpellCast } from "@/lib/logic/pers-effect-rows";

/// O39. Що лист робить після касту з картки заклинання: концентрація і баф, про який питає тостом
/// (Прискорення може бути й на союзнику).

const spell = (engName: string, name: string, hasConcentration: string, spellId = 1) => ({ spellId, name, engName, hasConcentration });
const HASTE = spell("Haste", "Прискорення [Haste]", "так", 501);
const BLESS = spell("Bless", "Благословення [Bless]", "так", 502);

const caster = (ruleset: "RULES_2014" | "RULES_2024", effects: unknown[] = []) => ({ ruleset, effects }) as unknown as PersWithRelations;

describe("planSpellCast", () => {
  it("Прискорення — концентрація і питання «на себе»", () => {
    expect(planSpellCast(caster("RULES_2024"), HASTE)).toEqual({
      isConcentration: true,
      title: "Концентрація: Прискорення",
      endedName: null,
      offeredBuff: "HASTE",
    });
  });

  it("Щит — реакція в мить атаки, а не стан: після касту нічого не вмикається", () => {
    expect(planSpellCast(caster("RULES_2024"), spell("Shield", "Щит [Shield]", "ні"))).toEqual({
      isConcentration: false,
      title: "«Щит»",
      endedName: null,
      offeredBuff: null,
    });
  });

  it("нова концентрація називає попередню, яку зірвала", () => {
    const concentrating = caster("RULES_2024", [{ effectKey: "CONCENTRATION", spellId: BLESS.spellId, spell: BLESS }]);
    expect(planSpellCast(concentrating, HASTE).endedName).toBe("Благословення");
    expect(planSpellCast(concentrating, BLESS).endedName).toBeNull();
  });

  it("Збільшення/Зменшення пропонує збільшити себе", () => {
    expect(planSpellCast(caster("RULES_2024"), spell("Enlarge/Reduce", "Збільшення/Зменшення", "так")).offeredBuff).toBe("ENLARGE");
  });

  it("Дубова шкіра береться з редакції персонажа: 2014 — з концентрацією, 2024 — без", () => {
    expect(planSpellCast(caster("RULES_2014"), spell("Barkskin", "Дубова шкіра", "так"))).toMatchObject({ isConcentration: true, offeredBuff: "BARKSKIN" });
    expect(planSpellCast(caster("RULES_2024"), spell("Barkskin", "Дубова шкіра", "ні"))).toMatchObject({ isConcentration: false, offeredBuff: "BARKSKIN" });
  });

  it("звичайне заклинання — нічого не пропонує", () => {
    expect(planSpellCast(caster("RULES_2024"), spell("Fireball", "Вогняна куля", "ні"))).toMatchObject({ isConcentration: false, offeredBuff: null, title: "«Вогняна куля»" });
  });
});
