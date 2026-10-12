// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { buildRecipeSchema } from "@/lib/optimization/schema";
import { buildReadyPresetDraft, readyPresetSchema } from "@/lib/optimization/ready-preset";
import { buildReadyPresetOptions } from "@/lib/optimization/ready-preset-options";
import { isSavedPresetValid } from "@/lib/optimization/ready-preset-validation";
import { ReadyPresetSpells } from "@/components/optimization/ReadyPresetSpells";

vi.mock("@/components/optimization/BuildSource", () => ({ BuildSource: () => null }));
afterEach(cleanup);

const content = findCharacterCreationOptions("RULES_2014");

function loadPreset(slug: string) {
  const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
  const preset = readyPresetSchema.parse(read(`data/rpgbot/ready-builds/${slug}.json`));
  const recipe = buildRecipeSchema.parse(read(`data/rpgbot/builds/${preset.buildId}.json`));
  const draft = buildReadyPresetDraft(recipe, preset, content);
  return { preset, recipe, draft, options: buildReadyPresetOptions(draft, content) };
}

describe("стартова підготовка зі списку класу в пресеті", () => {
  it("Друїд бачить підготовлені заклинання автора, не бачить Чарівникової книги й змінює їх у межах ліміту", () => {
    const data = loadPreset("druid-land-owlin-2014");
    const update = vi.fn();
    render(<ReadyPresetSpells data={data} draft={data.draft} update={update} />);

    expect(screen.getByText(/Підготовлені заклинання · 4 з 4/)).toBeTruthy();
    expect(screen.queryByText(/підготовлені заклинання ви виберете на листі персонажа/)).toBeNull();
    const group = screen.getByRole("region", { name: "Підготовлені заклинання" });
    const chosen = within(group).getAllByRole("button", { pressed: true });
    expect(chosen).toHaveLength(4);
    expect(within(group).getAllByRole("button", { pressed: false }).every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
    fireEvent.click(chosen[0]);
    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.calls[0][0].initialPreparedSpellIds).toHaveLength(3);
  });

  it("пресет Клірика без названих автором підготовлених заклинань лишає примітку про лист", () => {
    const data = loadPreset("cleric-tempest-2014");
    render(<ReadyPresetSpells data={data} draft={data.draft} update={vi.fn()} />);
    expect(screen.getByText(/підготовлені заклинання ви виберете на листі персонажа/)).toBeTruthy();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("збережена чернетка не проходить з чужим, повторним чи зайвим заклинанням", () => {
    const { draft, options } = loadPreset("druid-land-owlin-2014");
    const prepared = draft.initialPreparedSpellIds!;
    expect(isSavedPresetValid(draft, draft, options)).toBe(true);
    expect(isSavedPresetValid({ ...draft, initialPreparedSpellIds: [...prepared.slice(1), 999999] }, draft, options)).toBe(false);
    expect(isSavedPresetValid({ ...draft, initialPreparedSpellIds: [prepared[0], prepared[0]] }, draft, options)).toBe(false);
    const another = options.spells.candidates.find((spell) => spell.level === 1 && !prepared.includes(spell.spellId))!.spellId;
    expect(isSavedPresetValid({ ...draft, initialPreparedSpellIds: [...prepared, another] }, draft, options)).toBe(false);
    expect(isSavedPresetValid({ ...draft, initialPreparedSpellIds: prepared.slice(0, 2) }, draft, options)).toBe(true);
  });
});
