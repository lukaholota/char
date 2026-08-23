import { Suspense } from "react";
import { Metadata } from "next";
import { getAllInfusions } from "@/lib/infusionsData";
import { InfusionsClient } from "@/components/infusions/InfusionsClient";

export const metadata: Metadata = {
  title: "Вливання Винахідника — ДнД українською",
  description: "Каталог магічних вливань (Infusions) Винахідника (Artificer) з Tasha's Cauldron of Everything українською мовою.",
};

export default async function InfusionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const infusions = getAllInfusions();

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <InfusionsClient infusions={infusions} initialSearchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}
