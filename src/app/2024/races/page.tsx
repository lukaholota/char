import { Suspense } from "react";
import type { Metadata } from "next";

import { getAllRaces } from "@/lib/racesData";
import { RacesClient } from "@/components/races/RacesClient";

export const metadata: Metadata = {
  title: "Види D&D 2024 — ДнД українською",
  description:
    "Каталог видів D&D 5e (PHB 2024) українською: розмір, швидкість, мови та риси виду.",
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
