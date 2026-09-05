import { Suspense } from "react";
import type { Metadata } from "next";

import { getAllRaces } from "@/lib/racesData";
import { RacesClient } from "@/components/races/RacesClient";

export const metadata: Metadata = {
  title: "Раси — ДнД українською",
  description:
    "Каталог рас D&D 5e (2014) українською: розмір, швидкість, мови, расові риси, підраси та варіанти.",
};

export default function RacesPage() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <RacesClient
          races={getAllRaces("RULES_2014")}
          ruleset="RULES_2014"
        />
      </Suspense>
    </div>
  );
}
