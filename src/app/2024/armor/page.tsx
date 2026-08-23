import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isRules2024Allowed } from "@/rules/access";
import { getAllArmors } from "@/lib/armorData";
import { ArmorClient } from "@/components/armor/ArmorClient";

export const metadata: Metadata = {
  title: "Обладунки D&D 2024 — ДнД українською",
  description: "Каталог обладунків та щитів PHB 2024 українською мовою з оновленими правилами натягання та зняття.",
};

export default async function Armor2024Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!isRules2024Allowed(session?.user)) {
    redirect("/armor");
  }

  const resolvedSearchParams = await searchParams;
  const armors = getAllArmors("RULES_2024");

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <ArmorClient armors={armors} initialSearchParams={resolvedSearchParams} ruleset="RULES_2024" />
      </Suspense>
    </div>
  );
}
