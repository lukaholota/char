import { Suspense } from "react";
import { Metadata } from "next";
import { getAllInvocations } from "@/lib/invocationsData";
import { InvocationsClient } from "@/components/invocations/InvocationsClient";

export const metadata: Metadata = {
  title: "Потойбічні виклики Чорнокнижника D&D 2024 — ДнД українською",
  description: "Повний каталог потойбічних викликів (Eldritch Invocations) PHB 2024 українською мовою з оновленими пактами та вимогами.",
};

export default function Invocations2024Page() {
  const invocations = getAllInvocations("RULES_2024");

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <InvocationsClient invocations={invocations} ruleset="RULES_2024" />
      </Suspense>
    </div>
  );
}
