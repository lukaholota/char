"use client";

import { HomeDescriptionSection } from "@/components/home/HomeDescriptionSection";
import { HomeEditionScreen } from "@/components/home/HomeEditionScreen";

export default function Page() {
  return (
    <HomeEditionScreen edition="2014">
      <HomeDescriptionSection />
    </HomeEditionScreen>
  );
}
