import { Suspense } from "react";
import { Metadata } from "next";
import { BestiaryClient } from "@/components/bestiary/BestiaryClient";

export const metadata: Metadata = {
  title: "Бестіарій — ДнД українською",
  description: "Каталог монстрів та істот D&D 5e (MM 2014) українською мовою.",
};

export default async function BestiaryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <BestiaryClient ruleset="RULES_2014" initialSearchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}
