// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import SubclassForm from "@/lib/components/characterCreator/SubclassForm";
import { isCreationStepCompleted } from "@/lib/components/characterCreator/creation-step-completion";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { ClassI } from "@/lib/types/model-types";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { findCreationSkillChoiceProblem } from "@/server/db/creation-skill-choices";

/// Гравець міняє домен і перескакує крок «Навички»: чернетка не мусить тягнути навичку
/// старого домену й не мусить мовчки обіцяти серверу, що навичку нового домену вже обрано.

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const CLERIC_2014 = findCharacterCreationOptions("RULES_2014").classes.find((cls) => cls.name === "CLERIC_2014") as unknown as ClassI;
const ORIGIN_PICKS = { race: [], selectedClass: ["HISTORY", "MEDICINE"], background: [] };
const ORIGIN_SKILLS = ["HISTORY", "MEDICINE", "DECEPTION", "STEALTH"];

function findSubclassId(name: string): number {
  const subclass = CLERIC_2014.subclasses.find((entry) => entry.name === name);
  if (!subclass) throw new Error(`no ${name}`);
  return subclass.subclassId;
}

function startOnSubclassStep(subclass: string, subclassPicks: string[], grantedSkills: string[] = []) {
  usePersFormStore.setState({
    formData: {
      classId: CLERIC_2014.classId,
      subclassId: findSubclassId(subclass),
      name: "Тест",
      skills: [...ORIGIN_SKILLS, ...grantedSkills, ...subclassPicks],
      skillsSchema: { isTasha: false, tashaChoices: [], choiceOptions: {}, basicChoices: { ...ORIGIN_PICKS, subclass: subclassPicks } },
    } as never,
    currentStep: 1,
    isHydrated: true,
  });
  render(<SubclassForm cls={CLERIC_2014} formId="subclass-step" />);
}

function switchSubclass(name: string) {
  fireEvent.click(screen.getByTestId(`subclass-${name}`));
  return usePersFormStore.getState().formData as PersFormData;
}

function findServerProblem(draft: PersFormData): string | null {
  const subclass = CLERIC_2014.subclasses.find((entry) => entry.subclassId === draft.subclassId)!;
  const firstLevel = subclass.features.filter((entry) => entry.levelGranted === 1);
  return findCreationSkillChoiceProblem(draft, {
    background: { name: "CRIMINAL", toolProficiencies: [], languagesToChooseCount: 0 },
    features: firstLevel.map((entry) => ({ featureId: entry.featureId, skillProficiencies: entry.feature.skillProficiencies })),
    subclassFeatureIds: firstLevel.map((entry) => entry.featureId),
  });
}

beforeEach(() => {
  usePersFormStore.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
  usePersFormStore.getState().resetForm();
});
afterEach(cleanup);

describe("2014 builder: switching the cleric domain after the skills step", () => {
  it("drops the old domain's pick, keeps the step done and lets the character be created", () => {
    startOnSubclassStep("PEACE_DOMAIN", ["INSIGHT"]);
    const draft = switchSubclass("LIFE_DOMAIN");

    expect(draft.skills).not.toContain("INSIGHT");
    expect(draft.skills).toEqual(ORIGIN_SKILLS);
    expect(draft.skillsSchema?.basicChoices).toEqual(ORIGIN_PICKS);
    expect(isCreationStepCompleted("skills", draft)).toBe(true);
    expect(findServerProblem(draft)).toBeNull();
  });

  it("asks for the skills step again when the new domain has its own pick", () => {
    startOnSubclassStep("LIFE_DOMAIN", []);
    const draft = switchSubclass("PEACE_DOMAIN");

    expect(isCreationStepCompleted("skills", draft)).toBe(false);
    expect(draft.skillsSchema?.basicChoices).toEqual(ORIGIN_PICKS);
    expect(findServerProblem(draft)).toBeNull();
  });

  it("does not keep a pick of one domain for another domain with a pick", () => {
    startOnSubclassStep("PEACE_DOMAIN", ["INSIGHT"]);
    const draft = switchSubclass("NATURE_DOMAIN");

    expect(draft.skillsSchema?.basicChoices.subclass).toBeUndefined();
    expect(isCreationStepCompleted("skills", draft)).toBe(false);
  });

  it("drops a skill the old domain granted outright", () => {
    startOnSubclassStep("ARCANA_DOMAIN", [], ["ARCANA"]);
    const draft = switchSubclass("LIFE_DOMAIN");

    expect(draft.skills).toEqual(ORIGIN_SKILLS);
  });

  it("leaves the skills untouched between domains without skill features", () => {
    startOnSubclassStep("LIFE_DOMAIN", []);
    const draft = switchSubclass("LIGHT_DOMAIN");

    expect(draft.skills).toEqual(ORIGIN_SKILLS);
    expect(draft.skillsSchema?.basicChoices.subclass).toEqual([]);
  });
});
