import { Suspense } from "react";
import type { Metadata } from "next";

import { GearClient } from "@/components/gear/GearClient";
import { getAllGear } from "@/lib/gearData";

export const metadata: Metadata = {
  title: "Звичайні речі — ДнД українською",
  description: "Спорядження шукача пригод D&D 5e (2014) українською: ціна, вага й правила олії, мотузки, ліхтарів та інших речей.",
};

export default function GearPage() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <GearClient items={getAllGear("RULES_2014")} ruleset="RULES_2014" />
      </Suspense>
    </div>
  );
}
