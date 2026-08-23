import MultiStepForm from "@/lib/components/characterCreator/MultiStepForm";
import { loadCharacterCreatorOptions } from "@/server/db/creation-content";
import { BackgroundI, ClassI, RaceI } from "@/lib/types/model-types";
import { auth } from "@/lib/auth";
import { isRules2024Allowed } from "@/rules/access";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Створення персонажа (2024) — ДнД українською",
  description: "Створюй персонажа за оновленими правилами D&D 5e (PHB 2024) українською мовою.",
};

export default async function Page() {
  const session = await auth();
  const canSelect2024 = isRules2024Allowed(session?.user);

  if (!canSelect2024) {
    redirect("/char");
  }

  const [
    loadedRaces,
    loadedClasses,
    loadedBackgrounds,
    weapons,
    // armors,
    feats,
  ] = await loadCharacterCreatorOptions({ ruleset: "RULES_2024" });

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
      canSelect2024={canSelect2024}
      initialRuleset="RULES_2024"
    />
  );
}
