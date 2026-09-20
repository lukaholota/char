import { Suspense } from "react";
import { Metadata } from "next";
import { getAllCreatures, getCreatureIndex } from "@/lib/bestiaryData";
import { findCreatureLoreGroup } from "@/lib/bestiaryLore";
import type { CreatureStatblockView } from "@/lib/catalog-reads";
import { BestiaryClient } from "@/components/bestiary/BestiaryClient";

export const metadata: Metadata = {
  title: "Бестіарій — ДнД українською",
  description: "Каталог монстрів та істот D&D 5e (MM 2014) українською мовою.",
};

export default function BestiaryPage() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <BestiaryClient
          ruleset="RULES_2014"
          index={getCreatureIndex("RULES_2014")}
          initialStatblock={findFirstCreatureView()}
        />
      </Suspense>
    </div>
  );
}

function findFirstCreatureView(): CreatureStatblockView {
  const creature = getAllCreatures("RULES_2014")[0] ?? null;
  return { creature, loreGroup: creature ? findCreatureLoreGroup(creature.creatureId, "RULES_2014") : null };
}
