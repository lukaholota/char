import MultiStepForm from "@/lib/components/characterCreator/MultiStepForm";
import { NetworkRequiredNotice } from "@/components/ui/NetworkRequiredNotice";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { BackgroundI, ClassI, RaceI } from "@/lib/types/model-types";
import { auth } from "@/lib/auth";
import { isRules2024Allowed } from "@/rules/access";
import type { Ruleset } from "@prisma/client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Створення персонажа — ДнД українською",
  description: "Створюй персонажа за правилами D&D 5e (2014) українською мовою.",
};

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ ruleset?: string }>;
}) {
  const session = await auth();
  const canSelect2024 = isRules2024Allowed();

  const resolvedParams = searchParams ? await searchParams : undefined;
  const requestedRuleset = resolvedParams?.ruleset;
  const effectiveRuleset: Ruleset =
    requestedRuleset === "RULES_2024" && canSelect2024
      ? "RULES_2024"
      : "RULES_2014";

  const {
    races: loadedRaces,
    classes: loadedClasses,
    backgrounds: loadedBackgrounds,
    weapons,
    feats,
  } = findCharacterCreationOptions(effectiveRuleset);

  const races = loadedRaces as unknown as RaceI[];
  const classes = loadedClasses as unknown as ClassI[];
  const backgrounds = loadedBackgrounds as unknown as BackgroundI[];

  return (
    <>
      <NetworkRequiredNotice action="Створення персонажа" />
      <MultiStepForm
        races={races}
        classes={classes}
        backgrounds={backgrounds}
        weapons={weapons}
        feats={feats}
        initialRuleset={effectiveRuleset}
      />
    </>
  );
}
