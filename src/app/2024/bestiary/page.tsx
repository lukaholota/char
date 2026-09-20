import { Suspense } from "react";
import { Metadata } from "next";
import { getAllCreatures, getCreatureIndex } from "@/lib/bestiaryData";
import { findCreatureLoreGroup } from "@/lib/bestiaryLore";
import type { CreatureStatblockView } from "@/lib/catalog-reads";
import { BestiaryClient } from "@/components/bestiary/BestiaryClient";

export const metadata: Metadata = {
  title: "Бестіарій D&D 2024 — ДнД українською",
  description: "Каталог істот, духів та монстрів D&D 5e (Monster Manual 2024 / PHB 2024) українською мовою.",
};

export default function Bestiary2024Page() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <BestiaryClient
          ruleset="RULES_2024"
          index={getCreatureIndex("RULES_2024")}
          initialStatblock={findFirstCreatureView()}
        />
      </Suspense>
    </div>
  );
}

function findFirstCreatureView(): CreatureStatblockView {
  const creature = getAllCreatures("RULES_2024")[0] ?? null;
  return { creature, loreGroup: creature ? findCreatureLoreGroup(creature.creatureId, "RULES_2024") : null };
}
