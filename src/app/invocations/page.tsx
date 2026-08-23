import { Suspense } from "react";
import { Metadata } from "next";
import { getAllInvocations } from "@/lib/invocationsData";
import { InvocationsClient } from "@/components/invocations/InvocationsClient";

export const metadata: Metadata = {
  title: "Потойбічні виклики Чорнокнижника — ДнД українською",
  description: "Повний каталог потойбічних викликів (Eldritch Invocations) Чорнокнижника D&D 5e (2014) українською мовою.",
};

export default async function InvocationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const invocations = getAllInvocations("RULES_2014");

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <InvocationsClient invocations={invocations} initialSearchParams={resolvedSearchParams} ruleset="RULES_2014" />
      </Suspense>
    </div>
  );
}
