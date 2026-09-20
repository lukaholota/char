import { Suspense } from "react";
import { Metadata } from "next";
import { getAllMetamagic } from "@/lib/metamagicData";
import { MetamagicClient } from "@/components/metamagic/MetamagicClient";

export const metadata: Metadata = {
  title: "Метамагія Чародія D&D 2024 — ДнД українською",
  description: "Каталог варіантів метамагії (Metamagic) Чародія PHB 2024 українською: ціна в очках чародійства й повний опис кожного варіанта.",
};

export default function Metamagic2024Page() {
  const metamagic = getAllMetamagic("RULES_2024");

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <MetamagicClient metamagic={metamagic} ruleset="RULES_2024" />
      </Suspense>
    </div>
  );
}
