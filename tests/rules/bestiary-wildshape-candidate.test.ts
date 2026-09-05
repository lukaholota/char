import { describe, expect, it } from "vitest";
import {
  buildWildshapeCandidate,
  findEntryEligibility,
  matchesWildshapeFilter,
} from "@/lib/bestiary-wildshape";
import { getCreatureIndex } from "@/lib/bestiaryData";
import type { CreatureIndexEntry } from "@/lib/bestiary-index";
import type { WildshapeContext } from "@/rules/wildshape";

/// KR24.3. Фільтр придатності рахується в браузері з вузького індексу, а не з повного каталогу —
/// і саме тут ламається розріджений запис KR24.1: відсутній ключ означає «режиму немає», а
/// правило чекає на `null`. Якби перекладу не було, `undefined` пройшов би як «швидкість є».

const moonDruid = (druidLevel: number): WildshapeContext => ({
  druidLevel,
  isMoonCircle: true,
  ruleset: "RULES_2014",
});

function findEntry(nameEng: string): CreatureIndexEntry {
  const entry = getCreatureIndex("RULES_2014").find((candidate) => candidate.nameEng === nameEng);
  if (!entry) throw new Error(`У каталозі 2014 немає істоти ${nameEng}`);
  return entry;
}

describe("рядок каталогу як кандидат Дикої форми", () => {
  it("відсутній ключ швидкості стає null, а не зникає", () => {
    const candidate = buildWildshapeCandidate(findEntry("Wolf"));

    expect(candidate).toMatchObject({
      nameEng: "Wolf",
      flySpeed: null,
      swimSpeed: null,
      climbSpeed: null,
      hasConditionalSpeed: false,
    });
  });

  it("наявна швидкість доїжджає числом", () => {
    expect(buildWildshapeCandidate(findEntry("Giant Eagle")).flySpeed).toBe(80);
    expect(buildWildshapeCandidate(findEntry("Reef Shark")).swimSpeed).toBe(40);
    expect(buildWildshapeCandidate(findEntry("Brown Bear")).climbSpeed).toBe(30);
  });
});

describe("придатність, порахована з індексу", () => {
  it("друїд 2 рівня бачить ведмедя й не бачить орла — і причина саме політ", () => {
    const bear = findEntryEligibility(findEntry("Brown Bear"), moonDruid(2));
    const eagle = findEntryEligibility(findEntry("Giant Eagle"), moonDruid(2));

    expect(bear.eligible).toBe(true);
    expect(eagle.eligible).toBe(false);
    expect(eagle.reasons.filter((reason) => reason.blocking).map((reason) => reason.kind)).toEqual([
      "flySpeedLocked",
    ]);
  });

  it("рифова акула недоступна і за КР, і за плаванням — обидві причини одразу", () => {
    const shark = findEntryEligibility(findEntry("Reef Shark"), {
      druidLevel: 2,
      isMoonCircle: false,
      ruleset: "RULES_2014",
    });

    expect(shark.reasons.filter((reason) => reason.blocking).map((reason) => reason.kind)).toEqual([
      "challengeTooHigh",
      "swimSpeedLocked",
    ]);
  });

  it("той самий індекс на 8 рівні відкриває орла", () => {
    expect(findEntryEligibility(findEntry("Giant Eagle"), moonDruid(8)).eligible).toBe(true);
  });

  it("лазіння не блокує на жодному рівні й каже про це вголос", () => {
    const bear = findEntryEligibility(findEntry("Brown Bear"), moonDruid(2));

    expect(bear.reasons.some((reason) => reason.kind === "climbSpeedAllowed")).toBe(true);
    expect(bear.reasons.some((reason) => reason.blocking)).toBe(false);
  });
});

describe("фільтр «лише придатні мені»", () => {
  const eagle = () => findEntry("Giant Eagle");

  it("вимкнений фільтр не ховає нікого — непридатний звір лишається в списку ([Р-3])", () => {
    expect(matchesWildshapeFilter(eagle(), { persId: 7, onlyEligible: false }, moonDruid(2))).toBe(true);
  });

  it("увімкнений фільтр ховає непридатного й лишає придатного", () => {
    expect(matchesWildshapeFilter(eagle(), { persId: 7, onlyEligible: true }, moonDruid(2))).toBe(false);
    expect(matchesWildshapeFilter(eagle(), { persId: 7, onlyEligible: true }, moonDruid(8))).toBe(true);
  });

  it("поки межі персонажа ще в дорозі, список не порожніє", () => {
    expect(matchesWildshapeFilter(eagle(), { persId: 7, onlyEligible: true }, null)).toBe(true);
  });
});
