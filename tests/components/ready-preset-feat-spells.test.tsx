// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { buildReadyPresetDraft } from "@/lib/optimization/ready-preset";
import { buildReadyPresetOptions } from "@/lib/optimization/ready-preset-options";
import { buildFeatPresetFixture } from "@/lib/optimization/ready-preset-feat-fixture.test-helper";
import { getAllSpells } from "@/lib/spellsData";
import { ReadyPresetSpells } from "@/components/optimization/ReadyPresetSpells";

vi.mock("@/components/optimization/BuildSource", () => ({ BuildSource: () => null }));
afterEach(cleanup);

const content = findCharacterCreationOptions("RULES_2014");
const findSpellId = (engName: string) => getAllSpells("RULES_2014").find((spell) => spell.engName === engName)!.spellId;

function renderFeatSpells(fixture: Parameters<typeof buildFeatPresetFixture>[0]) {
  const { recipe, preset } = buildFeatPresetFixture(fixture);
  const draft = buildReadyPresetDraft(recipe, preset, content);
  const data = { preset, recipe, draft, options: buildReadyPresetOptions(draft, content) };
  const update = vi.fn();
  function Harness() { const [current, setCurrent] = useState(draft); return <ReadyPresetSpells data={data} draft={current} update={(changes) => { update(changes); setCurrent((old) => ({ ...old, ...changes })); }} />; }
  render(<Harness />);
  return { draft, update };
}

describe("ready preset spells from a 2014 feat", () => {
  it("shows the three Magic Initiate spells and keeps a slot inside the list the other two spells share", () => {
    renderFeatSpells({ featKey: "MAGIC_INITIATE", featOptionName: null, featSpellKeys: ["guidance", "light", "bless"] });
    expect(screen.getByText("Заклинання риси: Посвячений у магію")).toBeTruthy();
    const group = screen.getByRole("region", { name: "Заклинання риси: Посвячений у магію" });
    expect(within(group).getAllByRole("button", { pressed: true })).toHaveLength(3);
    const names = within(group).getAllByRole("button").map((button) => button.getAttribute("aria-label") ?? "");
    expect(names.some((name) => name.includes("[Sacred Flame]"))).toBe(true);
    expect(names.some((name) => name.includes("[Mage Hand]"))).toBe(false);
  });

  it("writes a changed spell under the feat source", () => {
    const { draft, update } = renderFeatSpells({ featKey: "MAGIC_INITIATE", featOptionName: null, featSpellKeys: ["guidance", "light", "bless"] });
    const group = screen.getByRole("region", { name: "Заклинання риси: Посвячений у магію" });
    const removed = getAllSpells("RULES_2014").find((spell) => spell.spellId === draft.featSpellSelections!.CLASS_ASI![0])!;
    fireEvent.click(within(group).getByRole("button", { name: removed.name, exact: true }));
    const sacredFlame = getAllSpells("RULES_2014").find((spell) => spell.engName === "Sacred Flame")!;
    fireEvent.click(within(group).getByRole("button", { name: sacredFlame.name, exact: true }));
    expect(update).toHaveBeenLastCalledWith({ featSpellSelections: { CLASS_ASI: [...draft.featSpellSelections!.CLASS_ASI!.slice(1), sacredFlame.spellId] } });
  });

  it("switches the whole feat selection to another class list", () => {
    const { update } = renderFeatSpells({ featKey: "MAGIC_INITIATE", featOptionName: null, featSpellKeys: ["guidance", "light", "bless"] });
    fireEvent.click(screen.getByRole("button", { name: "Чарівник", exact: true }));
    const sent = update.mock.calls[0][0].featSpellSelections.CLASS_ASI as number[];
    const wizardSpells = getAllSpells("RULES_2014").filter((spell) => sent.includes(spell.spellId));
    expect(sent).toHaveLength(3);
    expect(wizardSpells.map((spell) => spell.level).sort()).toEqual([0, 0, 1]);
    expect(wizardSpells.every((spell) => spell.spellClasses.some((entry) => entry.className === "Чарівник"))).toBe(true);
  });

  it("tells which spell the feat gives by name", () => {
    renderFeatSpells({ featKey: "FEY_TOUCHED", featOptionName: "FEY_TOUCHED Ability (Wisdom)", featSpellKeys: ["charm-person"] });
    expect(screen.getByText(/додатково дає: .*\[Misty Step\]/)).toBeTruthy();
    expect(screen.queryByLabelText("Список класу для риси")).toBeNull();
  });
});
