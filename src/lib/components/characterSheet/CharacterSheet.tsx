"use client";

import { PersWithRelations } from "@/lib/actions/pers";
import CharacterCarousel from "./CharacterCarousel";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle } from "lucide-react";
import { raceTranslations, classTranslations } from "@/lib/refs/translation";
import { CharacterFeaturesGroupedResult } from "@/lib/actions/pers";

interface CharacterSheetProps {
  pers: PersWithRelations;
  groupedFeatures: CharacterFeaturesGroupedResult | null;
}

export default function CharacterSheet({ pers, groupedFeatures }: CharacterSheetProps) {
  const raceName = raceTranslations[pers.race.name as keyof typeof raceTranslations] || pers.race.name;
  const className = classTranslations[pers.class.name as keyof typeof classTranslations] || pers.class.name;

  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col">
      <div className="p-3 px-4 border-b border-white/10 flex justify-between items-center bg-slate-950/70 backdrop-blur sticky top-0 z-20">
           <div>
             <div className="font-bold text-base md:text-lg text-slate-50">{pers.name}</div>
             <div className="text-xs text-slate-300/80">{raceName} {className} • Рівень {pers.level}</div>
           </div>
           <Link href={`/pers/${pers.persId}/levelup`}>
               <Button size="sm" variant="secondary" className="h-8 gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/30">
                   <ArrowUpCircle className="w-4 h-4" />
                   <span className="hidden sm:inline">Підняти рівень</span>
               </Button>
           </Link>
       </div>
      
      <div className="flex-1 overflow-hidden">
        <CharacterCarousel pers={pers} groupedFeatures={groupedFeatures} />
      </div>
    </div>
  );
}
