import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { buildReadyPresetDraft, readyPresetSchema } from "./ready-preset";
import { fillDefaultOpenPicks, isOpenPickChosenByPlayer } from "./ready-preset-default-spells";
import { buildAssemblyStartState } from "./ready-preset-level-context";
import {
  findAssemblyChoiceProblem, listOpenPickCandidates, listOpenPickSlots, type AssemblyChoiceContext, type OpenPickChoices,
} from "./ready-preset-levels";
import { buildReadyPresetLevels } from "./ready-preset-levels.server";
import { buildReadyPresetOptions } from "./ready-preset-options";
import { buildRecipeSchema } from "./schema";
import { listSubclassGrantedSpellKeys } from "./progression-granted-spells";

vi.mock("server-only", () => ({}));

const content = findCharacterCreationOptions("RULES_2014");

function buildContext(slug: string, targetLevel: number, choices: OpenPickChoices = {}): AssemblyChoiceContext {
  const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
  const preset = readyPresetSchema.parse(read(`data/rpgbot/ready-builds/${slug}.json`));
  const recipe = buildRecipeSchema.parse(read(`data/rpgbot/builds/${preset.buildId}.json`));
  const draft = buildReadyPresetDraft(recipe, preset, content);
  const start = buildAssemblyStartState(draft, buildReadyPresetOptions(draft, content));
  return { levels: buildReadyPresetLevels(recipe, content)!, targetLevel, choices, advancements: {}, classOptionChoices: {}, preparedSpellKeys: null, start };
}

describe("default open spell picks", () => {
  it.each([
    ["wizard-chronurgy-magic-2014", 20], ["bard-lore-2014", 20], ["sorcerer-draconic-2014", 20], ["ranger-hunter-2014", 20], ["fighter-eldritch-knight-2014", 20], ["warlock-fiend-2014", 20],
  ])("fills every open slot of %s with spells the page accepts", (slug, level) => {
    const context = buildContext(slug, level);
    const slots = listOpenPickSlots(context.levels, level);
    expect(slots.length).toBeGreaterThan(0);
    const filled = fillDefaultOpenPicks(context);
    for (const slot of slots) expect(filled[slot.id], slot.id).toHaveLength(slot.count);
    expect(findAssemblyChoiceProblem({ ...context, choices: filled })).toBeNull();
  });

  it("takes the highest RPGbot score the slot still offers, never a worse one", () => {
    const context = buildContext("wizard-chronurgy-magic-2014", 20);
    const filled = fillDefaultOpenPicks(context);
    const [slot] = listOpenPickSlots(context.levels, 20).filter((entry) => entry.category === "spellbook");
    const [first] = filled[slot.id];
    const pool = context.levels.spellPools[slot.poolId];
    const scoreOf = (key: string) => pool.find((spell) => spell.key === key)?.score ?? 0;
    const offered = listOpenPickCandidates({ ...context, choices: { ...filled, [slot.id]: [] } }, slot, "");
    expect(scoreOf(first)).toBe(Math.max(...offered.map((spell) => spell.score ?? 0)));
    expect(scoreOf(first)).toBeGreaterThanOrEqual(3);
  });

  it("keeps a slot the player chose and does not repeat that spell in later defaults", () => {
    const base = buildContext("bard-lore-2014", 20);
    const [firstSlot, secondSlot] = listOpenPickSlots(base.levels, 20);
    const filledByDefault = fillDefaultOpenPicks(base);
    const taken = filledByDefault[secondSlot.id][0];
    const context = { ...base, choices: { [firstSlot.id]: Array(firstSlot.count).fill("") .map((_, index) => (index === 0 ? taken : "")) } };
    const filled = fillDefaultOpenPicks(context);
    expect(isOpenPickChosenByPlayer(context.choices, firstSlot.id)).toBe(true);
    expect(filled[firstSlot.id]).toEqual(context.choices[firstSlot.id]);
    expect(filled[secondSlot.id]).not.toContain(taken);
  });
});

describe("default picks across the whole gallery", () => {
  it("are accepted by the page at the highest level of every preset", () => {
    const rejected: string[] = [];
    for (const fileName of readdirSync("data/rpgbot/ready-builds").filter((name) => name.endsWith(".json"))) {
      const slug = fileName.replace(/\.json$/, "");
      const base = buildContext(slug, 2);
      const targetLevel = Math.max(...base.levels.targetLevels);
      const context = buildContext(slug, targetLevel);
      const problem = findAssemblyChoiceProblem({ ...context, choices: fillDefaultOpenPicks(context) });
      if (problem) rejected.push(`${slug}: ${problem}`);
    }
    expect(rejected).toEqual([]);
  }, 300_000);

  it("never pick a spell the subclass already grants — the server refuses it (Light at level 10)", () => {
    const repeated: string[] = [];
    for (const fileName of readdirSync("data/rpgbot/ready-builds").filter((name) => name.endsWith(".json"))) {
      const slug = fileName.replace(/\.json$/, "");
      const base = buildContext(slug, 2);
      const context = buildContext(slug, Math.max(...base.levels.targetLevels));
      const filled = fillDefaultOpenPicks(context);
      for (const slot of listOpenPickSlots(context.levels, context.targetLevel)) {
        const [classKey, subclassKey] = slot.poolId.split(":");
        const granted = listSubclassGrantedSpellKeys({ classKey, subclassKey: subclassKey || null, classLevel: 20 });
        filled[slot.id].filter((key) => granted.includes(key)).forEach((key) => repeated.push(`${slug} ${slot.id}: ${key}`));
      }
    }
    expect(repeated).toEqual([]);
  }, 300_000);
});
