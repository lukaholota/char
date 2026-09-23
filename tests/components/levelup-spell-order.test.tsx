// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { SpellChoiceGrid } from "@/components/spells/SpellChoiceGrid";
import type { SpellChoiceOption } from "@/rules/spell-choice-filter";

afterEach(cleanup);

const spells: SpellChoiceOption[] = [1, 0, 3, 2].map((level) => ({
  spellId: level + 1,
  level,
  school: "EVOCATION",
  name: `Заклинання ${level}`,
  engName: `Spell ${level}`,
}));

describe("порядок заклинань у левелапі", () => {
  it("показує замовляння першими, далі рівні від вищого до нижчого", () => {
    const { container } = render(
      <SpellChoiceGrid spells={spells} selectedIds={[]} limit={4} onChange={() => {}} findGroupLabel={(spell) => `Рівень ${spell.level}`} highestLevelFirst />,
    );
    expect(Array.from(container.querySelectorAll("section > h3"), (heading) => heading.textContent))
      .toEqual(["Рівень 0", "Рівень 3", "Рівень 2", "Рівень 1"]);
  });

  it("залишає порядок створення персонажа без змін", () => {
    const { container } = render(
      <SpellChoiceGrid spells={spells} selectedIds={[]} limit={4} onChange={() => {}} findGroupLabel={(spell) => `Рівень ${spell.level}`} />,
    );
    expect(Array.from(container.querySelectorAll("section > h3"), (heading) => heading.textContent))
      .toEqual(["Рівень 1", "Рівень 0", "Рівень 3", "Рівень 2"]);
  });
});
