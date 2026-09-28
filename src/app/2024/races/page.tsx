import { Suspense } from "react";
import type { Metadata } from "next";

import { getAllRaces } from "@/lib/racesData";
import { RacesClient } from "@/components/races/RacesClient";

export const metadata: Metadata = {
  title: "Раси D&D 2024 — ДнД українською",
  description:
    "Каталог рас D&D 5e (PHB 2024) українською: розмір, швидкість, мови та расові риси.",
};

export default function Races2024Page() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <RacesClient
          races={getAllRaces("RULES_2024")}
          ruleset="RULES_2024"
        />
      </Suspense>
    </div>
  );
}
