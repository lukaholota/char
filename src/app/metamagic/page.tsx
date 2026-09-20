import { Suspense } from "react";
import { Metadata } from "next";
import { getAllMetamagic } from "@/lib/metamagicData";
import { MetamagicClient } from "@/components/metamagic/MetamagicClient";

export const metadata: Metadata = {
  title: "Метамагія Чародія — ДнД українською",
  description: "Каталог варіантів метамагії (Metamagic) Чародія D&D 5e (2014) українською: ціна в очках чародійства й повний опис кожного варіанта.",
};

export default function MetamagicPage() {
  const metamagic = getAllMetamagic("RULES_2014");

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <MetamagicClient metamagic={metamagic} ruleset="RULES_2014" />
      </Suspense>
    </div>
  );
}
