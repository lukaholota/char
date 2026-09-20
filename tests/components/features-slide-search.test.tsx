// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FeatureDisplayType } from "@prisma/client";
import type { CharacterFeatureItem, CharacterFeaturesGroupedResult, PersWithRelations } from "@/lib/actions/pers";
import FeaturesSlide from "@/lib/components/characterSheet/slides/FeaturesSlide";

/// Слайд «Здібності» у персонажа 2024: сіди писали назву фічі в короткий опис, і картка
/// повторювала назву двічі. Тут же — пошук між картками «Риси» і «Ресурсами класу».

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), useParams: () => ({}) }));
vi.mock("@/lib/actions/feature-uses", () => ({ spendFeatureUse: vi.fn(), restoreFeatureUse: vi.fn() }));
vi.mock("@/lib/actions/feature-descriptions", () => ({ saveFeatureDescription: vi.fn() }));
vi.mock("@/lib/actions/subclass-option-rechoice", () => ({ loadSubclassOptionRechoice: vi.fn(), saveSubclassOptionRechoice: vi.fn() }));
vi.mock("@/lib/actions/bastion-actions", () => ({ loadBastion: vi.fn() }));
vi.mock("@/lib/components/characterSheet/FeatsSheetManagerModal", () => ({ FeatsSheetManagerModal: () => null }));
vi.mock("@/lib/components/levelUp/MagicItemInfoModal", () => ({ MagicItemInfoModal: () => null }));
vi.mock("@/lib/components/characterSheet/slides/FeaturesHeaderCards", () => ({ FeaturesHeaderCards: () => null }));
vi.mock("@/lib/components/characterCreator/modals/ClassInfoModal", () => ({ ClassInfoModal: () => null }));
vi.mock("@/lib/components/characterCreator/modals/SubclassInfoModal", () => ({ SubclassInfoModal: () => null }));

afterEach(cleanup);

const feature = (fields: Partial<CharacterFeatureItem> & Pick<CharacterFeatureItem, "key" | "name" | "description">): CharacterFeatureItem => ({
  shortDescription: fields.name,
  displayTypes: [FeatureDisplayType.PASSIVE],
  primaryType: FeatureDisplayType.PASSIVE,
  source: "RACE",
  sourceName: "Ельф",
  ...fields,
});

const groupedFeatures: CharacterFeaturesGroupedResult = {
  actions: [],
  bonusActions: [],
  reactions: [],
  passive: [
    feature({ key: "darkvision", name: "Темнозір", description: "Ви бачите в темряві на 60 футів." }),
    feature({ key: "trance", name: "Транс", description: "Вам не потрібен сон: ви медитуєте 4 години." }),
    feature({ key: "pact", name: "Магія пакту", description: "Покровитель дарує вам слоти заклинань.", source: "CLASS", sourceName: "Чорнокнижник" }),
  ],
};

const pers = {
  persId: 1,
  ruleset: "RULES_2014",
  level: 1,
  classId: 1,
  class: { name: "WARLOCK_2024" },
  race: { name: "ELF_2024" },
  background: { name: "SAGE_2024" },
  feats: [],
  skills: [],
  choiceOptions: [],
} as unknown as PersWithRelations;

const renderSlide = () => render(<FeaturesSlide pers={pers} groupedFeatures={groupedFeatures} isReadOnly />);

describe("слайд здібностей", () => {
  it("під назвою фічі стоїть початок опису, а не та сама назва", () => {
    renderSlide();

    expect(screen.getAllByText("Темнозір")).toHaveLength(1);
    expect(screen.getByText("Ви бачите в темряві на 60 футів.")).toBeTruthy();
  });

  it("пошук лишає лише фічі, що містять запит у назві чи описі", () => {
    renderSlide();

    fireEvent.change(screen.getByPlaceholderText("Пошук по здібностях"), { target: { value: "слоти" } });

    expect(screen.getByText("Магія пакту")).toBeTruthy();
    expect(screen.queryByText("Темнозір")).toBeNull();
    expect(screen.queryByText("Транс")).toBeNull();
  });

  it("порожній результат каже про це, а не показує пусті категорії", () => {
    renderSlide();

    fireEvent.change(screen.getByPlaceholderText("Пошук по здібностях"), { target: { value: "телепорт" } });

    expect(screen.getByText("Нічого не знайдено")).toBeTruthy();
    expect(screen.queryByText("Пасивні здібності")).toBeNull();
  });
});
