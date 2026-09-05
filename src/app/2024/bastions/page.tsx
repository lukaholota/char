import { Suspense } from "react";
import { Metadata } from "next";
import { getAllBastionFacilities } from "@/lib/bastionsData";
import { BastionsClient } from "@/components/bastions/BastionsClient";

export const metadata: Metadata = {
  title: "Приміщення бастіону D&D 2024 — ДнД українською",
  description:
    "Повний каталог приміщень бастіону (Bastion Facilities) DMG 2024 українською: рівні 5, 9, 13 і 17, накази, найманці та передумови.",
};

export default function Bastions2024Page() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <BastionsClient
          facilities={getAllBastionFacilities()}
        />
      </Suspense>
    </div>
  );
}
