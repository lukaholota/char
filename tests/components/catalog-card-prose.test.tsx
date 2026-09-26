// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { ClassDetailCard } from "@/components/classes/ClassDetailCard";
import { RaceDetailCard } from "@/components/races/RaceDetailCard";
import type { ClassData } from "@/lib/classesData";
import type { RaceData } from "@/lib/racesData";
import type { ReadingActions, ReadingView } from "@/components/catalogs/reading/reading-view";

afterEach(cleanup);

function buildView<T extends string>(section: T): ReadingView<T> {
  return { section, featureKey: null, focusRequest: 0, missing: null };
}

function buildActions<T extends string>(): ReadingActions<T> {
  return { onSectionChange: vi.fn(), onOpenBranch: vi.fn(), onDismissMissing: vi.fn() };
}

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
    render(<ClassDetailCard characterClass={buildClass(CLASS_PROSE)} view={buildView("overview")} actions={buildActions()} />);

    expect(screen.getByText(CLASS_PROSE)).toBeTruthy();
  });

  it("огляд класу не несе описів здібностей і підкласів — вони у своїх розділах (O44)", () => {
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

    const overview = render(<ClassDetailCard characterClass={characterClass} view={buildView("overview")} actions={buildActions()} />);
    expect(screen.getByText(CLASS_PROSE)).toBeTruthy();
    expect(screen.queryByText("Опис натхнення.")).toBeNull();
    expect(screen.queryByText("Опис колегії.")).toBeNull();
    overview.unmount();

    render(<ClassDetailCard characterClass={characterClass} view={buildView("subclasses")} actions={buildActions()} />);
    expect(screen.getByText("Опис колегії.")).toBeTruthy();
    expect(screen.queryByText("Опис слів.")).toBeNull();
  });

  it("картка класу без опису не малює порожнього блоку", () => {
    const { container } = render(<ClassDetailCard characterClass={buildClass(null)} view={buildView("overview")} actions={buildActions()} />);

    expect(container.querySelector("[data-catalog-prose]")).toBeNull();
  });

  it("картка раси малює опис раси в огляді, а підраси — у своєму розділі", () => {
    const race = buildRace(RACE_PROSE, SUBRACE_PROSE);
    const overview = render(<RaceDetailCard race={race} view={buildView("overview")} actions={buildActions()} />);
    expect(screen.getByText(RACE_PROSE)).toBeTruthy();
    overview.unmount();

    render(<RaceDetailCard race={race} view={buildView("branches")} actions={buildActions()} />);
    expect(screen.getByText(SUBRACE_PROSE)).toBeTruthy();
  });

  it("картка раси без описів не малює порожніх блоків", () => {
    const { container } = render(<RaceDetailCard race={buildRace(null, null)} view={buildView("overview")} actions={buildActions()} />);

    expect(container.querySelector("[data-catalog-prose]")).toBeNull();
  });
});
