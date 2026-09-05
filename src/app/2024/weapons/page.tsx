import { Suspense } from "react";
import { Metadata } from "next";
import { getAllWeapons } from "@/lib/weaponsData";
import { WeaponsClient } from "@/components/weapons/WeaponsClient";

export const metadata: Metadata = {
  title: "Зброя D&D 2024 — ДнД українською",
  description: "Каталог зброї PHB 2024 українською мовою з новими властивостями Майстерності зброї (Weapon Mastery).",
};

export default function Weapons2024Page() {
  const weapons = getAllWeapons("RULES_2024");

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <WeaponsClient weapons={weapons} ruleset="RULES_2024" />
      </Suspense>
    </div>
  );
}
