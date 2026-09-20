import MultiStepForm from "@/lib/components/characterCreator/MultiStepForm";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { collectCreationStepRuleExcerpts } from "@/lib/content/creation-step-rule-excerpts";
import { BackgroundI, ClassI, RaceI } from "@/lib/types/model-types";
import { auth } from "@/lib/auth";
import { isRules2024Allowed } from "@/rules/access";
import { get2014FallbackPath } from "@/rules/route-helpers";
import { redirectKeepingNoAiMode } from "@/lib/no-ai/no-ai-server";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Створення персонажа (2024) — ДнД українською",
  description: "Створюй персонажа за оновленими правилами D&D 5e (PHB 2024) українською мовою.",
};

export default async function Page() {
  const session = await auth();
  const canSelect2024 = isRules2024Allowed();

  if (!canSelect2024) {
    await redirectKeepingNoAiMode(get2014FallbackPath("/2024/char"));
  }

  const {
    races: loadedRaces,
    classes: loadedClasses,
    backgrounds: loadedBackgrounds,
    weapons,
    feats,
  } = findCharacterCreationOptions("RULES_2024");

  const races = loadedRaces as unknown as RaceI[];
  const classes = loadedClasses as unknown as ClassI[];
  const backgrounds = loadedBackgrounds as unknown as BackgroundI[];

  return (
    <MultiStepForm
      races={races}
      classes={classes}
      backgrounds={backgrounds}
      weapons={weapons}
      feats={feats}
      initialRuleset="RULES_2024"
      ruleExcerpts={collectCreationStepRuleExcerpts()}
    />
  );
}
