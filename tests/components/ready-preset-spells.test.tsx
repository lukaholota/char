// @vitest-environment jsdom
import { useState } from "react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { buildRecipeSchema } from "@/lib/optimization/schema";
import { buildReadyPresetDraft, readyPresetSchema } from "@/lib/optimization/ready-preset";
import { buildReadyPresetOptions } from "@/lib/optimization/ready-preset-options";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { getAllSpells } from "@/lib/spellsData";
import { ReadyPresetSpells } from "@/components/optimization/ReadyPresetSpells";
import { ReadyPresetChoices } from "@/components/optimization/ReadyPresetChoices";

vi.mock("@/components/optimization/BuildSource", () => ({ BuildSource: () => null }));
afterEach(cleanup);

const content = findCharacterCreationOptions("RULES_2014");
const findSpellId = (engName: string) => getAllSpells("RULES_2014").find((spell) => spell.engName === engName)!.spellId;

function loadPreset(slug: string, change: (draft: PersFormData) => PersFormData = (draft) => draft) {
  const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
  const preset = readyPresetSchema.parse(read(`data/rpgbot/ready-builds/${slug}.json`));
  const recipe = buildRecipeSchema.parse(read(`data/rpgbot/builds/${preset.buildId}.json`));
  const draft = change(buildReadyPresetDraft(recipe, preset, content));
  const race = content.races.find((entry) => entry.raceId === draft.raceId)!;
  return { preset, recipe, draft, options: buildReadyPresetOptions(draft, content), creator: { race: { raceChoiceOptions: race.raceChoiceOptions } } };
}

function renderSpells(slug: string, change?: (draft: PersFormData) => PersFormData) {
  const data = loadPreset(slug, change);
  const update = vi.fn();
  function Harness() { const [draft, setDraft] = useState(data.draft); return <ReadyPresetSpells data={data} draft={draft} update={(changes) => { update(changes); setDraft((current) => ({ ...current, ...changes })); }} />; }
  render(<Harness />);
  return { ...data, update };
}

const findOptionCard = (label: string) => screen.getByText(label, { exact: true }).closest<HTMLElement>("[role=radio]")!;

function renderChoices(slug: string) {
  const data = loadPreset(slug);
  const update = vi.fn();
  render(<ReadyPresetChoices data={data} draft={data.draft} update={update} />);
  return { ...data, update };
}

describe("ready preset spells for every caster kind", () => {
  it("shows the Warlock cantrips and known spells as the author's choice and lets a known spell change", () => {
    const { draft, update } = renderSpells("warlock-fiend-2014");
    expect(screen.getByText("Замовляння класу")).toBeTruthy();
    expect(screen.getByText("Відомі заклинання")).toBeTruthy();
    expect(screen.getAllByText("вибір автора RPGbot")).toHaveLength(2);
    expect(screen.queryByText(/вибір платформи/)).toBeNull();
    const group = screen.getByRole("region", { name: "Відомі заклинання" });
    const chosen = within(group).getAllByRole("button", { pressed: true });
    expect(chosen).toHaveLength(2);
    const removed = draft.classSpells!.preparedIds[0];
    fireEvent.click(chosen[0]);
    const spell = getAllSpells("RULES_2014").find((entry) => entry.engName === "Armor of Agathys")!;
    fireEvent.click(within(group).getByRole("button", { name: spell.name, exact: true }));
    expect(update).toHaveBeenLastCalledWith({ classSpells: { ...draft.classSpells, preparedIds: [...draft.classSpells!.preparedIds.filter((id) => id !== removed), spell.spellId] } });
  });

  it("offers only spells of the class list and the patron list for a Warlock known slot", () => {
    renderSpells("warlock-fiend-2014");
    const group = screen.getByRole("region", { name: "Відомі заклинання" });
    const names = within(group).getAllByRole("button").map((button) => button.getAttribute("aria-label") ?? "");
    expect(names.some((name) => name.includes("[Command]"))).toBe(true);
    expect(names.some((name) => name.includes("[Burning Hands]"))).toBe(true);
    expect(names.some((name) => name.includes("[Magic Missile]"))).toBe(false);
    expect(names.some((name) => name.includes("[Fireball]"))).toBe(false);
  });

  it("marks cantrips the platform chose and explains the sheet-side preparation for an Artificer", () => {
    renderSpells("artificer-alchemist-2014");
    expect(screen.getByText("вибір платформи: автор цього не називає")).toBeTruthy();
    expect(screen.getByText(/підготовлені заклинання ви виберете на листі персонажа/)).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Замовляння класу" })).getAllByRole("button", { pressed: true })).toHaveLength(2);
  });

  it("explains the sheet-side preparation for a Cleric and shows only the cantrip group", () => {
    renderSpells("cleric-life-2014");
    expect(within(screen.getByRole("region", { name: "Замовляння класу" })).getAllByRole("button", { pressed: true })).toHaveLength(3);
    expect(screen.queryByText("Відомі заклинання")).toBeNull();
    expect(screen.getByText(/підготовлені заклинання ви виберете на листі персонажа/)).toBeTruthy();
  });

  it("shows the spellbook preparation editor and platform labels for the Wizard without the sheet-side note", () => {
    const { update } = renderSpells("wizard-evocation-2014");
    expect(screen.getByText(/Підготовлені заклинання · 4 з 4/)).toBeTruthy();
    expect(screen.getAllByText("вибір платформи: автор цього не називає")).toHaveLength(2);
    expect(screen.queryByText(/підготовлені заклинання ви виберете на листі персонажа/)).toBeNull();
    fireEvent.click(within(screen.getByRole("region", { name: "Підготовлені заклинання" })).getAllByRole("button", { pressed: true })[0]);
    expect(update).toHaveBeenCalledOnce();
  });

  it("shows the subclass spell choice with its feature label when the subclass grants one", () => {
    const druidcraft = findSpellId("Druidcraft");
    const nature = content.classes.find((entry) => entry.name === "CLERIC_2014")!.subclasses.find((entry) => entry.name === "NATURE_DOMAIN")!;
    const { update } = renderSpells("cleric-life-2014", (draft) => ({ ...draft, subclassId: nature.subclassId, classOptionSpellIds: [druidcraft] }));
    expect(screen.getByText("Послідовник природи")).toBeTruthy();
    const group = screen.getByRole("region", { name: "Послідовник природи" });
    const names = within(group).getAllByRole("button").map((button) => button.getAttribute("aria-label") ?? "");
    expect(names.some((name) => /\[thorn whip\]/i.test(name))).toBe(true);
    expect(names.some((name) => name.includes("[Fire Bolt]"))).toBe(false);
    fireEvent.click(within(group).getByRole("button", { pressed: true }));
    fireEvent.click(within(group).getByRole("button", { name: getAllSpells("RULES_2014").find((spell) => spell.engName === "Thorn Whip")!.name, exact: true }));
    expect(update).toHaveBeenLastCalledWith({ classOptionSpellIds: [findSpellId("Thorn Whip")] });
  });

  it("hides a spell already chosen in another group from the other slots", () => {
    renderSpells("sorcerer-draconic-2014");
    const group = screen.getByRole("region", { name: "Замовляння класу" });
    const chosen = within(group).getAllByRole("button", { pressed: true });
    expect(new Set(chosen.map((button) => button.getAttribute("aria-label"))).size).toBe(chosen.length);
    expect(within(group).getAllByRole("button", { pressed: false }).every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
  });

  it("renders nothing for a class that has no spells at level one", () => {
    const { container } = render((() => {
      const data = loadPreset("paladin-devotion-2014");
      return <ReadyPresetSpells data={data} draft={data.draft} update={vi.fn()} />;
    })());
    expect(container.textContent).toBe("");
  });
});

describe("ready preset class, subclass and race choices", () => {
  it("lets the platform-chosen Dragon Ancestor and Draconic Ancestry change and says the platform chose them", () => {
    const { draft, update } = renderChoices("sorcerer-draconic-2014");
    expect(screen.getAllByText(/вибір зробила платформа/)).toHaveLength(2);
    const data = loadPreset("sorcerer-draconic-2014");
    const ancestor = data.options.choiceGroups.subclassOptions.find((group) => group.group === "Дракон-предок")!;
    const other = ancestor.options.find((option) => option.id !== draft.subclassChoiceSelections[ancestor.group])!;
    fireEvent.click(findOptionCard(other.label));
    expect(update).toHaveBeenCalledWith({ subclassChoiceSelections: { ...draft.subclassChoiceSelections, [ancestor.group]: other.id } });
    const ancestry = data.options.choiceGroups.raceOptions.find((group) => group.group === "Родовід дракона")!;
    const otherAncestry = ancestry.options.find((option) => option.id !== draft.raceChoiceSelections[ancestry.group])!;
    fireEvent.click(findOptionCard(otherAncestry.label));
    expect(update).toHaveBeenCalledWith({ raceChoiceSelections: { ...draft.raceChoiceSelections, [ancestry.group]: otherAncestry.id } });
  });

  it("shows the full Fighting Style text behind the same help button as the creator", async () => {
    const { draft } = renderChoices("fighter-champion-shield-2014");
    const data = loadPreset("fighter-champion-shield-2014");
    const style = data.options.choiceGroups.classOptions.find((group) => group.options.length > 1)!;
    const chosen = style.options.find((option) => option.id === draft.classChoiceSelections![style.group])!;
    fireEvent.click(within(screen.getByRole("radio", { checked: true })).getByRole("button", { name: /^Інформація про / }));
    const feature = data.options.choiceRows.classOptions.find((row) => row.choiceOptionId === chosen.id)!.choiceOption.features[0].feature;
    expect(await within(await screen.findByRole("dialog")).findByText(feature.name)).toBeTruthy();
  });

  it("marks the Ranger first-level options as the platform's choice", () => {
    renderChoices("ranger-hunter-2014");
    expect(screen.getAllByText(/вибір зробила платформа/)).toHaveLength(2);
    expect(screen.queryByLabelText("Налаштування Слідопита: ворог")).toBeNull();
    expect(screen.getByText("Налаштування Слідопита: ворог")).toBeTruthy();
    expect(screen.getByText("Налаштування Слідопита: місцевість")).toBeTruthy();
    expect(screen.getAllByText(/змінює навички, Експертизу або мови/)).toHaveLength(2);
  });

  it("keeps the Half-Elf skill choice fixed because it changes the skills", () => {
    renderChoices("bard-lore-2014");
    expect(screen.queryByLabelText("Універсальність напівельфа")).toBeNull();
    expect(screen.getByText("Універсальність навичок")).toBeTruthy();
    expect(screen.getByText(/змінює навички/)).toBeTruthy();
    expect(screen.getByText(/уже заповнений за авторським прикладом/)).toBeTruthy();
  });

  it("shows nothing for a preset with no first-level choices", () => {
    const data = loadPreset("cleric-life-2014");
    const { container } = render(<ReadyPresetChoices data={data} draft={data.draft} update={vi.fn()} />);
    expect(container.textContent).toBe("");
  });
});
