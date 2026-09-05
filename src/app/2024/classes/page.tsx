import { Suspense } from "react";
import type { Metadata } from "next";

import { getAllClasses } from "@/lib/classesData";
import { ClassesClient } from "@/components/classes/ClassesClient";

export const metadata: Metadata = {
  title: "Класи D&D 2024 — ДнД українською",
  description:
    "Каталог класів D&D 5e (PHB 2024) українською: кістка здоровʼя, рятівні кидки, здібності за рівнями та підкласи з 3 рівня.",
};

export default function Classes2024Page() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <ClassesClient
          classes={getAllClasses("RULES_2024")}
          ruleset="RULES_2024"
        />
      </Suspense>
    </div>
  );
}
