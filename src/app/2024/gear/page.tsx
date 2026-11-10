import { Suspense } from "react";
import type { Metadata } from "next";

import { GearClient } from "@/components/gear/GearClient";
import { getAllGear } from "@/lib/gearData";

export const metadata: Metadata = {
  title: "Звичайні речі 2024 — ДнД українською",
  description: "Спорядження шукача пригод D&D 5e (2024) українською: ціна й правила олії, мотузки, ліхтарів та інших речей.",
};

export default function Gear2024Page() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <GearClient items={getAllGear("RULES_2024")} ruleset="RULES_2024" />
      </Suspense>
    </div>
  );
}
