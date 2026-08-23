import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isRules2024Allowed } from "@/rules/access";
import { getAllInvocations } from "@/lib/invocationsData";
import { InvocationsClient } from "@/components/invocations/InvocationsClient";

export const metadata: Metadata = {
  title: "Потойбічні виклики Чорнокнижника D&D 2024 — ДнД українською",
  description: "Повний каталог потойбічних викликів (Eldritch Invocations) PHB 2024 українською мовою з оновленими пактами та вимогами.",
};

export default async function Invocations2024Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!isRules2024Allowed(session?.user)) {
    redirect("/invocations");
  }

  const resolvedSearchParams = await searchParams;
  const invocations = getAllInvocations("RULES_2024");

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <InvocationsClient invocations={invocations} initialSearchParams={resolvedSearchParams} ruleset="RULES_2024" />
      </Suspense>
    </div>
  );
}
