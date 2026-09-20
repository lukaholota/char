import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { HomebrewCreatureForm } from "@/components/homebrew/HomebrewCreatureForm";
import { HomebrewPageShell } from "@/components/homebrew/HomebrewPageShell";
import { HomebrewSignInPrompt } from "@/components/homebrew/HomebrewSignInPrompt";
import { HomebrewSpellForm } from "@/components/homebrew/HomebrewSpellForm";
import { buildHomebrewCatalogHref } from "@/lib/logic/homebrew-catalog";
import { buildEmptyCreatureValues, buildEmptySpellValues } from "@/lib/logic/homebrew-form-values";

export const metadata: Metadata = { title: "Новий хоумбрю — ДнД українською", robots: { index: false } };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NewHomebrewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const isCreature = params.kind === "CREATURE";
  const ruleset = params.edition === "2024" ? "RULES_2024" : "RULES_2014";
  const session = await auth();

  return (
    <HomebrewPageShell title={isCreature ? "Нова істота" : "Нове заклинання"} backHref={buildHomebrewCatalogHref({ kind: isCreature ? "CREATURE" : "SPELL", is2024: ruleset === "RULES_2024" })} backLabel="Хоумбрю">
      {!session?.user?.email ? (
        <HomebrewSignInPrompt />
      ) : isCreature ? (
        <HomebrewCreatureForm initialValues={buildEmptyCreatureValues(ruleset)} initialImageUrl={null} />
      ) : (
        <HomebrewSpellForm initialValues={buildEmptySpellValues(ruleset)} />
      )}
    </HomebrewPageShell>
  );
}
