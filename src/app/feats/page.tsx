import { Suspense } from "react";
import { Metadata } from "next";
import { getAllFeats } from "@/lib/featsData";
import { FeatsClient } from "@/components/feats/FeatsClient";

export const metadata: Metadata = {
  title: "Риси — ДнД українською",
  description: "Каталог рис (Feats) D&D 5e (2014) українською мовою з фільтрами та пошуком.",
};

export default async function FeatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const feats = getAllFeats("RULES_2014");

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <FeatsClient feats={feats} initialSearchParams={resolvedSearchParams} ruleset="RULES_2014" />
      </Suspense>
    </div>
  );
}
