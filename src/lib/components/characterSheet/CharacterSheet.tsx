"use client";

import { useEffect, useState } from "react";
import { PersWithRelations } from "@/lib/actions/pers";
import CharacterCarousel from "./CharacterCarousel";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle } from "lucide-react";
import { CharacterFeaturesGroupedResult } from "@/lib/actions/pers";
import RestButton from "./RestButton";
import { Badge } from "@/components/ui/badge";
import { ShareDialog } from "./ShareDialog";
import { useParams, useRouter } from "next/navigation";
import { copyPersByToken } from "@/lib/actions/share-actions";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useTransition } from "react";
import PrintCharacterDialog from "./PrintCharacterDialog";

interface CharacterSheetProps {
  pers: PersWithRelations;
  groupedFeatures: CharacterFeaturesGroupedResult | null;
  isPublicView?: boolean;
}

export default function CharacterSheet({ pers, groupedFeatures, isPublicView }: CharacterSheetProps) {
  const [localPers, setLocalPers] = useState<PersWithRelations>(pers);
  const isReadOnly = isPublicView || pers.isSnapshot;
  const params = useParams();
  const router = useRouter();
  const [isCopyPending, startCopyTransition] = useTransition();

  useEffect(() => {
    setLocalPers(pers);
  }, [pers]);

  const handleCopyToProfile = () => {
    const token = params?.token as string;
    if (!token) return;

    startCopyTransition(async () => {
        const result = await copyPersByToken(token);
        if (result.success && result.persId) {
            toast.success("Персонажа скопійовано до вашого профілю!");
            router.push(`/pers/${result.persId}`);
        } else {
            toast.error(result.error || "Не вдалося скопіювати персонажа");
        }
    });
  };

  return (
    <div className="h-screen w-full bg-slate-900 flex flex-col">
      <div className="p-3 px-4 border-b border-white/10 flex justify-between items-center bg-slate-900/70 backdrop-blur sticky top-0 z-20">
           <div className="flex items-center gap-3">
             <div>
               <div className="font-bold text-base md:text-lg text-slate-50">{localPers.name}</div>
               <div className="text-xs text-slate-300/80">Рівень {localPers.level}</div>
             </div>
             {isReadOnly && (
               <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                 {isPublicView ? "Тільки для читання" : `Знімок: Рівень ${pers.snapshotLevel || pers.level}`}
               </Badge>
             )}
           </div>
           <div className="flex items-center gap-2">
               {isPublicView && (
                   <Button 
                       size="sm" 
                       variant="secondary" 
                       className="h-8 gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/30 text-emerald-400"
                       onClick={handleCopyToProfile}
                       disabled={isCopyPending}
                   >
                       <Copy className="w-4 h-4" />
                       <span className="hidden sm:inline">Копіювати до себе</span>
                   </Button>
               )}
              {!isPublicView && (
              <PrintCharacterDialog
                persId={localPers.persId}
                characterName={localPers.name ?? "character"}
                disabled={isCopyPending}
              />
              )}
               {!isReadOnly && <ShareDialog persId={localPers.persId} initialToken={localPers.shareToken} />}
               {!isReadOnly && <RestButton pers={localPers} onPersUpdate={setLocalPers} />}
               {!isReadOnly && (
                 <Link href={`/pers/${localPers.persId}/levelup`}>
                     <Button size="sm" variant="secondary" className="h-8 gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/30">
                         <ArrowUpCircle className="w-4 h-4" />
                         <span className="hidden sm:inline">Підняти рівень</span>
                     </Button>
                 </Link>
               )}
           </div>
       </div>
      
      <div className="flex-1 overflow-hidden">
        <CharacterCarousel pers={localPers} onPersUpdate={setLocalPers} groupedFeatures={groupedFeatures} isReadOnly={isReadOnly} />
      </div>
    </div>
  );
}

