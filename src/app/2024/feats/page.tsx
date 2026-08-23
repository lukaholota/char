import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isRules2024Allowed } from "@/rules/access";
import { getAllFeats } from "@/lib/featsData";
import { FeatsClient } from "@/components/feats/FeatsClient";

export const metadata: Metadata = {
  title: "Риси D&D 2024 — ДнД українською",
  description: "Повний каталог 75 рис D&D 5e (PHB 2024) українською мовою: Origin Feats, General Feats, Epic Boons та Fighting Styles.",
};

export default async function Feats2024Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!isRules2024Allowed(session?.user)) {
    redirect("/feats");
  }

  const resolvedSearchParams = await searchParams;
  const feats = getAllFeats("RULES_2024");

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <FeatsClient feats={feats} initialSearchParams={resolvedSearchParams} ruleset="RULES_2024" />
      </Suspense>
    </div>
  );
}
