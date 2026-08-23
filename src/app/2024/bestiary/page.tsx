import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isRules2024Allowed } from "@/rules/access";
import { BestiaryClient } from "@/components/bestiary/BestiaryClient";

export const metadata: Metadata = {
  title: "Бестіарій D&D 2024 — ДнД українською",
  description: "Каталог істот, духів та монстрів D&D 5e (Monster Manual 2024 / PHB 2024) українською мовою.",
};

export default async function Bestiary2024Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!isRules2024Allowed(session?.user)) {
    redirect("/bestiary");
  }

  const resolvedSearchParams = await searchParams;

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <BestiaryClient ruleset="RULES_2024" initialSearchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}
