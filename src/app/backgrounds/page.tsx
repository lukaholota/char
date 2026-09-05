import { Suspense } from "react";
import { Metadata } from "next";
import { getAllBackgrounds } from "@/lib/backgroundsData";
import { BackgroundsClient } from "@/components/backgrounds/BackgroundsClient";

export const metadata: Metadata = {
  title: "Походження — ДнД українською",
  description:
    "Каталог походжень (Backgrounds) D&D 5e (2014) українською мовою: навички, інструменти, мови, спорядження та спеціальні вміння.",
};

export default function BackgroundsPage() {
  const backgrounds = getAllBackgrounds("RULES_2014");

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <BackgroundsClient
          backgrounds={backgrounds}
          ruleset="RULES_2014"
        />
      </Suspense>
    </div>
  );
}
