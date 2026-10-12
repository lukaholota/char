import MultiStepForm from "@/lib/components/characterCreator/MultiStepForm";
import { NetworkRequiredNotice } from "@/components/ui/NetworkRequiredNotice";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { collectCreationStepRuleExcerpts } from "@/lib/content/creation-step-rule-excerpts";
import { BackgroundI, ClassI, RaceI } from "@/lib/types/model-types";
import { isRules2024Allowed } from "@/rules/access";
import type { Ruleset } from "@prisma/client";
import { Metadata } from "next";
import { loadReadyPresetPage } from "@/lib/optimization/ready-preset.server";
import { ReadyPresetCreator } from "@/components/optimization/ReadyPresetCreator";
import { notFound } from "next/navigation";
import { findPresetEntry } from "@/lib/monitoring/rpgbot-analytics-model";

const metadata: Metadata = {
  title: "Створення персонажа — ДнД українською",
  description: "Створюй персонажа за правилами D&D 5e (2014) українською мовою.",
};

export async function generateMetadata({ searchParams }: { searchParams?: Promise<{ preset?: string }> }): Promise<Metadata> {
  const params = searchParams ? await searchParams : undefined;
  return params?.preset ? { ...metadata, title: "Готові персонажі — ДнД українською", robots: { index: false, follow: false } } : metadata;
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ ruleset?: string; preset?: string; q?: string; class?: string; from?: string }>;
}) {
  const canSelect2024 = isRules2024Allowed();

  const resolvedParams = searchParams ? await searchParams : undefined;
  const requestedRuleset = resolvedParams?.ruleset;
  if (resolvedParams?.preset) {
    if (requestedRuleset === "RULES_2024") notFound();
    return <ReadyPresetCreator key={resolvedParams.preset} data={await loadReadyPresetPage(resolvedParams.preset)} catalogQuery={resolvedParams.q ?? ""} catalogClass={resolvedParams.class ?? ""} entry={findPresetEntry(resolvedParams.from)} />;
  }
  const showReadyBuilds = requestedRuleset !== "RULES_2024";
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
        showReadyBuilds={showReadyBuilds}
        ruleExcerpts={collectCreationStepRuleExcerpts()}
      />
    </>
  );
}
