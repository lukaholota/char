import { Suspense } from "react";
import { Metadata } from "next";
import { getAllWeapons } from "@/lib/weaponsData";
import { WeaponsClient } from "@/components/weapons/WeaponsClient";

export const metadata: Metadata = {
  title: "Зброя — ДнД українською",
  description: "Повний каталог простої та бойової зброї, а також вогнепальної зброї D&D 5e (2014) українською мовою.",
};

export default function WeaponsPage() {
  const weapons = getAllWeapons("RULES_2014");

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <WeaponsClient weapons={weapons} ruleset="RULES_2014" />
      </Suspense>
    </div>
  );
}
