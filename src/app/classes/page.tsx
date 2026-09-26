import { Suspense } from "react";
import type { Metadata } from "next";

import { getAllClasses } from "@/lib/classesData";
import { ClassesClient } from "@/components/classes/ClassesClient";
import { findClassTables } from "@/lib/catalogs/class-tables";

export const metadata: Metadata = {
  title: "Класи — ДнД українською",
  description:
    "Каталог класів D&D 5e (2014) українською: кістка здоровʼя, рятівні кидки, навички, здібності за рівнями та підкласи.",
};

export default function ClassesPage() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <ClassesClient
          classes={getAllClasses("RULES_2014")}
          ruleset="RULES_2014"
          tables={findClassTables("RULES_2014")}
        />
      </Suspense>
    </div>
  );
}
