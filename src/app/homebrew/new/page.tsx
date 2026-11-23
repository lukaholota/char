import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { HomebrewCreatureForm } from "@/components/homebrew/HomebrewCreatureForm";
import { HomebrewItemForm } from "@/components/homebrew/HomebrewItemForm";
import { HomebrewPageShell } from "@/components/homebrew/HomebrewPageShell";
import { HomebrewSignInPrompt } from "@/components/homebrew/HomebrewSignInPrompt";
import { HomebrewSpellForm } from "@/components/homebrew/HomebrewSpellForm";
import { buildHomebrewCatalogHref, parseHomebrewKind } from "@/lib/logic/homebrew-catalog";
import { buildEmptyCreatureValues, buildEmptyItemValues, buildEmptySpellValues } from "@/lib/logic/homebrew-form-values";
import { listHomebrewItemBases } from "@/server/db/homebrew-item-bases";

export const metadata: Metadata = { title: "Новий хоумбрю — ДнД українською", robots: { index: false } };

const NEW_ENTRY_TITLES = { SPELL: "Нове заклинання", CREATURE: "Нова істота", ITEM: "Новий предмет" } as const;

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NewHomebrewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const kind = parseHomebrewKind(params.kind);
  const ruleset = params.edition === "2024" ? "RULES_2024" : "RULES_2014";
  const isWeapon = kind === "ITEM" && params.gear === "weapon";
  const weaponCatalog = `${ruleset === "RULES_2024" ? "/2024" : ""}/weapons?hb=1`;
  const [session, bases] = await Promise.all([auth(), kind === "ITEM" ? listHomebrewItemBases() : null]);

  return (
    <HomebrewPageShell title={isWeapon ? "Нова зброя" : NEW_ENTRY_TITLES[kind]} backHref={isWeapon ? weaponCatalog : buildHomebrewCatalogHref({ kind, is2024: ruleset === "RULES_2024" })} backLabel={isWeapon ? "Зброя" : "Хоумбрю"}>
      {!session?.user?.email ? (
        <HomebrewSignInPrompt />
      ) : kind === "CREATURE" ? (
        <HomebrewCreatureForm initialValues={buildEmptyCreatureValues(ruleset)} initialImageUrl={null} />
      ) : kind === "ITEM" ? (
        <HomebrewItemForm initialValues={{ ...buildEmptyItemValues(ruleset), ...(isWeapon ? { itemType: "WEAPON", isMundane: true } : {}) }} initialImageUrl={null} bases={bases ?? { weapons: [], armors: [] }} />
      ) : (
        <HomebrewSpellForm initialValues={buildEmptySpellValues(ruleset)} />
      )}
    </HomebrewPageShell>
  );
}
