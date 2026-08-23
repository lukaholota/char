import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isRules2024Allowed } from "@/rules/access";
import { getAllWeapons } from "@/lib/weaponsData";
import { WeaponsClient } from "@/components/weapons/WeaponsClient";

export const metadata: Metadata = {
  title: "Зброя D&D 2024 — ДнД українською",
  description: "Каталог зброї PHB 2024 українською мовою з новими властивостями Майстерності зброї (Weapon Mastery).",
};

export default async function Weapons2024Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!isRules2024Allowed(session?.user)) {
    redirect("/weapons");
  }

  const resolvedSearchParams = await searchParams;
  const weapons = getAllWeapons("RULES_2024");

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <WeaponsClient weapons={weapons} initialSearchParams={resolvedSearchParams} ruleset="RULES_2024" />
      </Suspense>
    </div>
  );
}
