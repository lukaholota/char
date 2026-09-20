// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { ClassDetailCard } from "@/components/classes/ClassDetailCard";
import { RaceDetailCard } from "@/components/races/RaceDetailCard";
import type { ClassData } from "@/lib/classesData";
import type { RaceData } from "@/lib/racesData";

afterEach(cleanup);

const CLASS_PROSE = "Барди творять магію музикою, танцем і віршем.";
const RACE_PROSE = "Ельфи — чарівний народ неземної грації.";
const SUBRACE_PROSE = "Високі ельфи мають гострий розум.";

function buildClass(description: string | null): ClassData {
  return {
    classId: 1,
    key: "BARD_2014",
    slug: "bard",
    name: "Бард",
    engName: "Bard",
    description,
    hitDie: 8,
    savingThrows: [],
    armorProficiencies: [],
    toolProficiencies: [],
    skillChoices: { options: [], count: 0 },
    spellcasting: null,
    castingStat: null,
    subclassLevel: 3,
    abilityScoreUpLevels: [],
    features: [],
    subclasses: [],
    imageSrc: null,
    source: "PHB",
    ruleset: "RULES_2014",
  };
}

function buildRace(description: string | null, subraceDescription: string | null): RaceData {
  return {
    raceId: 2,
    key: "ELF_2014",
    slug: "elf",
    name: "Ельф",
    engName: "Elf",
    description,
    source: "Книга Гравця (2014)",
    sizes: [],
    speed: 30,
    extraSpeeds: [],
    languages: [],
    languagesToChooseCount: 0,
    asiSummary: "",
    traits: [],
    subraces: [{ key: "HIGH_ELF", name: "Високий ельф", engName: "High Elf", description: subraceDescription, traits: [] }],
    variants: [],
    imageSrc: null,
    ruleset: "RULES_2014",
  };
}

describe("KR33.3 — проза в картках каталогу", () => {
  it("картка класу малює опис, коли він є", () => {
    render(<ClassDetailCard characterClass={buildClass(CLASS_PROSE)} />);

    expect(screen.getByText(CLASS_PROSE)).toBeTruthy();
  });

  it("картка класу домальовує риси й підкласи після першого екрана", async () => {
    const characterClass: ClassData = {
      ...buildClass(CLASS_PROSE),
      features: [{ level: 1, name: "Натхнення барда", engName: "Bardic Inspiration", description: "Опис натхнення." }],
      subclasses: [
        {
          subclassId: 7,
          key: "LORE",
          slug: "lore",
          name: "Колегія знань",
          engName: "College of Lore",
          description: "Опис колегії.",
          features: [{ level: 3, name: "Ріжучі слова", engName: "Cutting Words", description: "Опис слів." }],
        },
      ],
    };

    render(<ClassDetailCard characterClass={characterClass} />);

    expect(await screen.findByText("Опис натхнення.")).toBeTruthy();
    expect(screen.getByText("Опис колегії.")).toBeTruthy();
    expect(screen.getByText("Опис слів.")).toBeTruthy();
  });

  it("картка класу без опису не малює порожнього блоку", () => {
    const { container } = render(<ClassDetailCard characterClass={buildClass(null)} />);

    expect(container.querySelector("[data-catalog-prose]")).toBeNull();
  });

  it("картка раси малює опис раси й підраси, коли вони є", () => {
    render(<RaceDetailCard race={buildRace(RACE_PROSE, SUBRACE_PROSE)} />);

    expect(screen.getByText(RACE_PROSE)).toBeTruthy();
    expect(screen.getByText(SUBRACE_PROSE)).toBeTruthy();
  });

  it("картка раси без описів не малює порожніх блоків", () => {
    const { container } = render(<RaceDetailCard race={buildRace(null, null)} />);

    expect(container.querySelector("[data-catalog-prose]")).toBeNull();
  });
});
