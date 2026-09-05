import { Suspense } from "react";
import { Metadata } from "next";
import { getAllBackgrounds } from "@/lib/backgroundsData";
import { BackgroundsClient } from "@/components/backgrounds/BackgroundsClient";

export const metadata: Metadata = {
  title: "Походження D&D 2024 — ДнД українською",
  description:
    "Каталог 16 походжень D&D 5e (PHB 2024) українською мовою: три характеристики на вибір, риса походження, навички, інструмент і спорядження.",
};

export default function Backgrounds2024Page() {
  const backgrounds = getAllBackgrounds("RULES_2024");

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <BackgroundsClient
          backgrounds={backgrounds}
          ruleset="RULES_2024"
        />
      </Suspense>
    </div>
  );
}
