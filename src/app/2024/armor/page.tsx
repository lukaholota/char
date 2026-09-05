import { Suspense } from "react";
import { Metadata } from "next";
import { getAllArmors } from "@/lib/armorData";
import { ArmorClient } from "@/components/armor/ArmorClient";

export const metadata: Metadata = {
  title: "Обладунки D&D 2024 — ДнД українською",
  description: "Каталог обладунків та щитів PHB 2024 українською мовою з оновленими правилами натягання та зняття.",
};

export default function Armor2024Page() {
  const armors = getAllArmors("RULES_2024");

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <ArmorClient armors={armors} ruleset="RULES_2024" />
      </Suspense>
    </div>
  );
}
