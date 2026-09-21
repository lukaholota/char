// @vitest-environment jsdom
//
// KR25.1 — механіка посилання на заклинання в обох редакціях: що розпізнається в описі, яка
// адреса малюється в DOM і що приїжджає в модалку. Прод-контенту 2024 з якорями ще немає (його
// проставляє KR25.3), тому якорі тут пишуться руками — саме в тій формі, яку писатиме проставляч.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/no-ai/2024/classes/druid" }));

vi.mock("@/lib/prisma", () => ({
  get prisma(): never {
    throw new Error("модалка пішла в базу — KR25.1 вимагає каталогу");
  },
}));

import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { NoAiModeProvider } from "@/components/no-ai/NoAiModeProvider";
import { findSpellForModal } from "@/lib/spell-catalog-chunk";
import { getAllSpells } from "@/lib/spellsData";

const fireball2024 = getAllSpells("RULES_2024").find((spell) => spell.engName === "Fireball")!;
const mageHand2014 = getAllSpells("RULES_2014").find((spell) => spell.engName === "Mage Hand")!;

function collectSpellOpenDetails() {
  const details: unknown[] = [];
  const listener = (event: Event) => details.push((event as CustomEvent).detail);
  window.addEventListener("spell:open", listener);
  return { details, stop: () => window.removeEventListener("spell:open", listener) };
}

beforeEach(() => {
  window.history.replaceState({}, "", "/2024/classes/druid");
});

afterEach(cleanup);

/// Відкриття чекає, поки відпрацює «назад» попереднього діалогу (history-back.ts), — мікрозадача.
function waitForSpellOpen() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("KR25.1 — якір у описі", () => {
  it("клік по заклинанню 2024 відкриває заклинання 2024, а не 2014", async () => {
    const opened = collectSpellOpenDetails();
    render(
      <FormattedDescription
        content={`<a href="/2024/spells/${fireball2024.spellId}">Вогнекуля [Fireball]</a>`}
      />
    );

    fireEvent.click(screen.getByRole("link", { name: /Вогнекуля/ }));
    await waitForSpellOpen();
    opened.stop();

    expect(opened.details).toEqual([
      { spellId: String(fireball2024.spellId), ruleset: "RULES_2024" },
    ]);
    expect(window.location.search).toBe(`?spell=${fireball2024.spellId}&edition=2024`);
  });

  /// KR25.2: ключ у якорі — слаг, бо номер 2024 — це позиція в масиві й міняється з пересортуванням.
  it("клік по слагу 2024 відкриває заклинання за слагом, а не за номером", async () => {
    const opened = collectSpellOpenDetails();
    render(<FormattedDescription content={`<a href="/2024/spells/produce-flame">Створення вогню [Produce Flame]</a>`} />);

    fireEvent.click(screen.getByRole("link", { name: /Створення вогню/ }));
    await waitForSpellOpen();
    opened.stop();

    expect(opened.details).toEqual([{ spellId: "produce-flame", ruleset: "RULES_2024" }]);
    expect(window.location.search).toBe("?spell=produce-flame&edition=2024");
  });

  it("давній якір 2014 `/spell/<id>` працює як раніше — і подією, і адресою без редакції", async () => {
    const opened = collectSpellOpenDetails();
    render(
      <FormattedDescription content={`<a href="/spell/${mageHand2014.spellId}">Магічна рука [Mage Hand]</a>`} />
    );

    fireEvent.click(screen.getByRole("link", { name: /Магічна рука/ }));
    await waitForSpellOpen();
    opened.stop();

    expect(opened.details).toEqual([
      { spellId: String(mageHand2014.spellId), ruleset: "RULES_2014" },
    ]);
    expect(window.location.search).toBe(`?spell=${mageHand2014.spellId}`);
  });

  it("малює справжній маршрут, а не коротку форму — середній клік і краулер не залежать від редиректу", () => {
    render(<FormattedDescription content={`<a href="/spell/${mageHand2014.spellId}">Магічна рука</a>`} />);

    expect(screen.getByRole("link", { name: "Магічна рука" })).toHaveProperty(
      "pathname",
      `/spells/${mageHand2014.spellId}`
    );
  });

  it("у режимі без ШІ адреса лишається в сегменті /no-ai/", () => {
    render(
      <NoAiModeProvider>
        <FormattedDescription content={`<a href="/2024/spells/${fireball2024.spellId}">Вогнекуля</a>`} />
      </NoAiModeProvider>
    );

    expect(screen.getByRole("link", { name: "Вогнекуля" })).toHaveProperty(
      "pathname",
      `/no-ai/2024/spells/${fireball2024.spellId}`
    );
  });

  it("посилання не на заклинання лишається звичайним", () => {
    const opened = collectSpellOpenDetails();
    render(<FormattedDescription content={`<a href="/2024/classes/wizard">Чарівник</a>`} />);

    fireEvent.click(screen.getByRole("link", { name: "Чарівник" }));
    opened.stop();

    expect(opened.details).toEqual([]);
    expect(window.location.search).toBe("");
  });
});

describe("KR25.1 — джерело даних модалки", () => {
  it("віддає заклинання 2024 за ключем 2024", async () => {
    const spell = await findSpellForModal({ spellKey: String(fireball2024.spellId), ruleset: "RULES_2024" });

    expect(spell?.engName).toBe("Fireball");
    expect(spell?.ruleset).toBe("RULES_2024");
  });

  it("віддає заклинання 2024 за слагом", async () => {
    const spell = await findSpellForModal({ spellKey: "produce-flame", ruleset: "RULES_2024" });

    expect(spell?.engName).toBe("Produce Flame");
    expect(spell?.ruleset).toBe("RULES_2024");
  });

  it("віддає заклинання 2014 за ключем 2014", async () => {
    const spell = await findSpellForModal({ spellKey: String(mageHand2014.spellId), ruleset: "RULES_2014" });

    expect(spell?.engName).toBe("Mage Hand");
    expect(spell?.ruleset).toBe("RULES_2014");
  });

  /// Номер каталогу 2024 (20000 + позиція) у каталозі 2014 не значить нічого — редакція не
  /// «підказка», а частина ключа. Це те, що ламало модалку до KR25.1 у зворотний бік.
  it("не віддає заклинання 2024 за ключем 2014", async () => {
    expect(await findSpellForModal({ spellKey: String(fireball2024.spellId), ruleset: "RULES_2014" })).toBeNull();
  });
});
