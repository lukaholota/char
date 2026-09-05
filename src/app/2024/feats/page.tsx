import { Suspense } from "react";
import { Metadata } from "next";
import { getAllFeats } from "@/lib/featsData";
import { FeatsClient } from "@/components/feats/FeatsClient";

export const metadata: Metadata = {
  title: "Риси D&D 2024 — ДнД українською",
  description: "Повний каталог 75 рис D&D 5e (PHB 2024) українською мовою: Origin Feats, General Feats, Epic Boons та Fighting Styles.",
};

export default function Feats2024Page() {
  const feats = getAllFeats("RULES_2024");

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <FeatsClient feats={feats} ruleset="RULES_2024" />
      </Suspense>
    </div>
  );
}
