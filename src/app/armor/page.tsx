import { Suspense } from "react";
import { Metadata } from "next";
import { getAllArmors } from "@/lib/armorData";
import { ArmorClient } from "@/components/armor/ArmorClient";

export const metadata: Metadata = {
  title: "Обладунки — ДнД українською",
  description: "Повний каталог легких, середніх і важких обладунків та щитів D&D 5e (2014) українською мовою.",
};

export default async function ArmorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const armors = getAllArmors("RULES_2014");

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <ArmorClient armors={armors} initialSearchParams={resolvedSearchParams} ruleset="RULES_2014" />
      </Suspense>
    </div>
  );
}
