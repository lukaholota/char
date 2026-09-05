// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Skills } from "@prisma/client";
import type { PersWithRelations } from "@/lib/actions/pers";
import { getAllCreatures } from "@/lib/bestiaryData";
import type { CreatureData } from "@/lib/bestiaryData";
import { buildBeastFormPers, listBeastAbilities } from "@/lib/logic/beast-form";
import { BeastFormBar } from "@/lib/components/characterSheet/BeastFormBar";
import type { BeastFormView } from "@/lib/components/characterSheet/BeastFormMarks";
import SkillsSlide from "@/lib/components/characterSheet/slides/SkillsSlide";
import MainStatsSlide from "@/lib/components/characterSheet/slides/MainStatsSlide";
import { BeastHitPointsDialog } from "@/lib/components/characterSheet/BeastHitPointsDialog";
import { damageBeastForm } from "@/server/db/wildshape-actions";

/// KR24.4. Другий шар перевіряється там, де його бачить гравець: змінене значення несе поруч
/// власне ([Р-5]), незмінене — ні, а повний статблок читається з листа, не виходячи з нього.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

/// Модалка правок тягне за собою серверні дії й next-auth; тут перевіряються числа на листі,
/// а не вона.
vi.mock("@/lib/components/characterSheet/ModifyStatModal", () => ({ default: () => null }));
vi.mock("@/lib/components/characterSheet/HitDiceDialog", () => ({ default: () => null }));
vi.mock("@/server/db/wildshape-actions", () => ({
  damageBeastForm: vi.fn(),
  healBeastForm: vi.fn(),
  loadWildshapeForms: vi.fn(),
}));
vi.mock("@/hooks/useOfflineQueue", () => ({ useOfflineQueue: () => ({ commitOperation: vi.fn() }) }));
vi.mock("@/lib/actions/combat-actions", () => ({
  applyHpChange: vi.fn(),
  reviveCharacter: vi.fn(),
  setDeathSaves: vi.fn(),
}));
vi.mock("@/lib/actions/update-character", () => ({ updateCharacterAction: vi.fn() }));

afterEach(cleanup);

// Раннер (vitest на bun) не дає jsdom робочого localStorage — підставляємо мінімальне сховище.
beforeEach(() => {
  const entries = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      get length() {
        return entries.size;
      },
      key: (index: number) => [...entries.keys()][index] ?? null,
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, String(value)),
      removeItem: (key: string) => void entries.delete(key),
      clear: () => entries.clear(),
    } satisfies Storage,
  });
});

function findCreature(nameEng: string): CreatureData {
  const creature = getAllCreatures("RULES_2014").find((candidate) => candidate.nameEng === nameEng);
  if (!creature) throw new Error(`У каталозі 2014 немає істоти ${nameEng}`);
  return creature;
}

const brownBear = findCreature("Brown Bear");

function buildDruid(): PersWithRelations {
  return {
    persId: 1,
    level: 6,
    str: 8,
    dex: 14,
    con: 12,
    int: 10,
    wis: 18,
    cha: 11,
    maxHp: 44,
    currentHp: 30,
    tempHp: 0,
    statBonuses: {},
    skills: [{ name: Skills.ATHLETICS, proficiencyType: "PROFICIENT" }],
    additionalSaveProficiencies: [],
    armors: [],
    wearsShield: false,
    additionalShieldBonus: 0,
    raceStaticAcBonus: 0,
    overrideBaseAC: null,
    features: [],
    race: { traits: [] },
    subrace: null,
    raceVariants: [],
    raceChoiceOptions: [],
    class: { features: [] },
    subclass: null,
    multiclasses: [],
    classOptionalFeatures: [],
    choiceOptions: [],
    feats: [],
    magicItems: [],
  } as unknown as PersWithRelations;
}

function buildView(ownPers: PersWithRelations): BeastFormView {
  return {
    layer: {
      creature: brownBear,
      context: { druidLevel: 6, isMoonCircle: true, ruleset: "RULES_2014" },
      beastCurrentHp: 34,
      beastMaxHp: 34,
    },
    ownPers,
    beastAbilities: listBeastAbilities(brownBear),
    onChanged: vi.fn(),
  };
}

describe("навички у звіриній формі", () => {
  it("змінена навичка показує звірине число і власне поруч", () => {
    const own = buildDruid();
    const view = buildView(own);

    render(<SkillsSlide pers={buildBeastFormPers(own, view.layer)} beastForm={view} />);

    // Атлетика: Сила ведмедя +4 плюс володіння +3; власне значення друїда — −1 плюс +3.
    const athletics = screen.getByText("Атлетика").closest("div")?.parentElement;
    expect(athletics?.textContent).toContain("+7");
    expect(athletics?.textContent).toContain("+2");
  });

  it("навичка від Мудрості другого числа не отримує", () => {
    const own = buildDruid();
    const view = buildView(own);

    render(<SkillsSlide pers={buildBeastFormPers(own, view.layer)} beastForm={view} />);

    const perception = screen.getByText("Уважність").closest("div")?.parentElement;
    expect(perception?.textContent).toBe("Уважність+4");
  });

  it("поза формою других чисел немає взагалі", () => {
    const { container } = render(<SkillsSlide pers={buildDruid()} />);

    expect(container.querySelectorAll("[title='Ваше значення поза формою']")).toHaveLength(0);
  });
});

describe("смуга другого шару", () => {
  it("статблок звіра читається з листа тим самим компонентом, що в бестіарії", () => {
    render(
      <BeastFormBar creature={brownBear} is2024={false} showBeastLayer onToggleLayer={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: /Статблок/ }));

    expect(screen.getByText("Дії")).toBeTruthy();
    expect(screen.getAllByText(/Багатоатака|Укус/).length).toBeGreaterThan(0);
  });

  it("перемикач повертає до власного листа, не виходячи з форми", () => {
    const onToggleLayer = vi.fn();
    render(
      <BeastFormBar creature={brownBear} is2024={false} showBeastLayer onToggleLayer={onToggleLayer} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Ти" }));

    expect(onToggleLayer).toHaveBeenCalledWith(false);
  });
});

describe("головна сторінка листа у звіриній формі", () => {
  function renderInBeastForm() {
    const own = buildDruid();
    const view = buildView(own);
    return render(<MainStatsSlide pers={buildBeastFormPers(own, view.layer)} beastForm={view} />);
  }

  it("Сила ведмедя стоїть на листі, а власна — дрібним поруч", () => {
    renderInBeastForm();

    const strength = screen.getByText("СИЛ").parentElement;
    expect(strength?.textContent).toBe("СИЛ198");
  });

  it("Мудрість лишається власною і другого числа не отримує", () => {
    renderInBeastForm();

    const wisdom = screen.getByText("МУД").parentElement;
    expect(wisdom?.textContent).toBe("МУД18");
  });

  it("блок хітів один, названий звіриним, і показує власні хіти дрібним", () => {
    renderInBeastForm();

    expect(screen.getByText("Хіти звіра")).toBeTruthy();
    expect(screen.queryByText("Здоровʼя")).toBeNull();
    expect(screen.getByText("ви: 30 / 44")).toBeTruthy();
    expect(screen.getByText("34")).toBeTruthy();
  });

  it("КБ і швидкість — звірині, зі своїми числами поруч", () => {
    const { container } = renderInBeastForm();

    const ownValues = [...container.querySelectorAll("[title='Ваше значення поза формою']")].map(
      (node) => node.textContent
    );
    expect(ownValues).toContain("12");
    expect(ownValues).toContain("30");
  });

  it("поза формою лист лишається таким, як був", () => {
    const { container } = render(<MainStatsSlide pers={buildDruid()} />);

    expect(screen.getByText("Здоровʼя")).toBeTruthy();
    expect(screen.queryByText("Хіти звіра")).toBeNull();
    expect(container.querySelectorAll("[title='Ваше значення поза формою']")).toHaveLength(0);
  });
});

/// Саме ця гілка згасла в браузері з першого разу: щойно активної форми не стає, другий шар
/// зникає — а з ним зникло б і повідомлення про перелив. Подія мусить дочекатися, поки її
/// прочитають.
describe("падіння форми на екрані", () => {
  it("повідомлення про перелив тримається, доки його не підтвердять", async () => {
    vi.mocked(damageBeastForm).mockResolvedValue({
      ok: true,
      reverted: true,
      carriedOver: 6,
      beastCurrentHp: 0,
      persCurrentHp: 34,
    });

    const own = buildDruid();
    const view = buildView(own);
    render(<BeastHitPointsDialog view={view} open onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Скільки"), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: /Шкода/ }));
    await screen.findByText("Форма впала");

    expect(screen.getByText("6 шкоди перелилося на ваші хіти.")).toBeTruthy();
    expect(view.onChanged).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Зрозуміло" }));
    expect(view.onChanged).toHaveBeenCalledTimes(1);
  });

  it("шкода в межах стосу листа не затримує", async () => {
    vi.mocked(damageBeastForm).mockResolvedValue({
      ok: true,
      reverted: false,
      carriedOver: 0,
      beastCurrentHp: 24,
      persCurrentHp: 40,
    });

    const view = buildView(buildDruid());
    render(<BeastHitPointsDialog view={view} open onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Скільки"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /Шкода/ }));

    await vi.waitFor(() => expect(view.onChanged).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Форма впала")).toBeNull();
  });
});
