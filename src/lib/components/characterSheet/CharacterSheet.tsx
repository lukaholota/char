"use client";

import { useEffect, useState, useTransition } from "react";
import type { PersWithRelations, CharacterFeaturesGroupedResult } from "@/lib/actions/pers";
import { duplicatePers, renamePers } from "@/lib/actions/pers";
import CharacterCarousel from "./CharacterCarousel";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, Loader2, Pencil, Copy } from "lucide-react";
import RestButton from "./RestButton";
import { Badge } from "@/components/ui/badge";
import { ShareDialog } from "./ShareDialog";
import { useParams, useRouter } from "next/navigation";
import { copyPersByToken } from "@/lib/actions/share-actions";
import { toast } from "sonner";
import PrintCharacterDialog from "./PrintCharacterDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface CharacterSheetProps {
  pers: PersWithRelations;
  groupedFeatures: CharacterFeaturesGroupedResult | null;
  isPublicView?: boolean;
}

export default function CharacterSheet({ pers, groupedFeatures, isPublicView }: CharacterSheetProps) {
  const [localPers, setLocalPers] = useState<PersWithRelations>(pers);
  const [isLevelUpPending, setIsLevelUpPending] = useState<boolean>(false);
  const [localGroupedFeatures, setLocalGroupedFeatures] = useState<CharacterFeaturesGroupedResult | null>(groupedFeatures);
  const isReadOnly = isPublicView || pers.isSnapshot;
  const params = useParams();
  const router = useRouter();
  const [isCopyPending, startCopyTransition] = useTransition();
  const [isRenamePending, startRenameTransition] = useTransition();
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(pers.name);

  const shareToken = (params as any)?.token as string | undefined;

  useEffect(() => {
    setLocalPers(pers);
  }, [pers]);

  useEffect(() => {
    setLocalGroupedFeatures(groupedFeatures);
  }, [groupedFeatures]);

  useEffect(() => {
    setRenameValue(pers.name);
  }, [pers.name]);

  const handleCopyToProfile = () => {
    const token = params?.token as string;
    if (!token) return;

    startCopyTransition(async () => {
        const result = await copyPersByToken(token);
        if (result.success && result.persId) {
            toast.success("Персонажа скопійовано до вашого профілю!");
            router.push(`/char/${result.persId}`);
        } else {
            toast.error(result.error || "Не вдалося скопіювати персонажа");
        }
    });
  };

  const handleDuplicateSnapshot = () => {
    startCopyTransition(async () => {
        const result = await duplicatePers(pers.persId);
        if (result.success && result.pers) {
            toast.success("Знімок скопійовано у новий повноцінний персонаж!");
            router.push(`/char/${result.pers.persId}`);
        } else {
            toast.error(result.error || "Не вдалося скопіювати знімок");
        }
    });
  };

  const handleRename = () => {
    const next = renameValue.trim();
    if (!next) {
      toast.error("Ім'я не може бути порожнім");
      return;
    }

    startRenameTransition(async () => {
      const result = await renamePers(localPers.persId, next);
      if (!result.success) {
        toast.error(result.error || "Не вдалося перейменувати");
        return;
      }

      setLocalPers((prev) => ({ ...prev, name: next }));
      toast.success("Ім'я оновлено");
      setRenameOpen(false);
      router.refresh();
    });
  };

  const handleLevelUp = () => {
      setIsLevelUpPending(true);
      router.push(`/char/${localPers.persId}/levelup`);
  };

  return (
    <div className="h-screen w-full bg-slate-900 flex flex-col">
      <div className="p-3 px-4 border-b border-white/10 flex justify-between items-center bg-slate-900/70 backdrop-blur sticky top-0 z-20">
           <div className="flex items-center gap-3">
             <div>
               <div className="font-bold text-base md:text-lg text-slate-50 flex items-center gap-2">
                 <span>{localPers.name}</span>
                 {!isReadOnly && (
                   <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
                     <DialogTrigger asChild>
                       <Button
                         variant="ghost"
                         size="icon"
                         className="h-8 w-8"
                         onClick={() => {
                           setRenameValue(localPers.name);
                         }}
                         title="Перейменувати"
                       >
                         <Pencil className="h-4 w-4" />
                       </Button>
                     </DialogTrigger>
                     <DialogContent 
                        className="sm:max-w-[520px] glass-card border-white/10 text-slate-100"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                       <DialogHeader>
                         <DialogTitle>Перейменувати персонажа</DialogTitle>
                       </DialogHeader>

                       <div className="space-y-3">
                         <Input
                           autoFocus={false}
                           value={renameValue}
                           onChange={(e) => setRenameValue(e.target.value)}
                           maxLength={60}
                         />
                         <div className="flex justify-end gap-2">
                           <Button variant="ghost" onClick={() => setRenameOpen(false)} disabled={isRenamePending}>
                             Скасувати
                           </Button>
                           <Button onClick={handleRename} disabled={isRenamePending}>
                             {isRenamePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             Зберегти
                           </Button>
                         </div>
                       </div>
                     </DialogContent>
                   </Dialog>
                 )}
               </div>
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
                {!isPublicView && pers.isSnapshot && (
                    <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-8 gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/30 text-emerald-400"
                        onClick={handleDuplicateSnapshot}
                        disabled={isCopyPending}
                    >
                        <Copy className="w-4 h-4" />
                        <span className="hidden sm:inline">Копіювати</span>
                    </Button>
                )}
              <PrintCharacterDialog
                persId={localPers.persId}
                characterName={localPers.name ?? "character"}
                disabled={isCopyPending}
                shareToken={isPublicView ? shareToken : undefined}
              />
               {!isReadOnly && <ShareDialog persId={localPers.persId} initialToken={localPers.shareToken} />}
               {!isReadOnly && <RestButton pers={localPers} onPersUpdate={setLocalPers} onFeaturesUpdate={setLocalGroupedFeatures} />}
               {!isReadOnly && (
                 <Button
                   size="sm"
                   variant="secondary"
                   className="h-8 gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/30"
                   onClick={handleLevelUp}
                   disabled={isLevelUpPending || isCopyPending || isRenamePending}
                 >
                   {isLevelUpPending ? (
                     <Loader2 className="w-4 h-4 animate-spin" />
                   ) : (
                     <ArrowUpCircle className="w-4 h-4" />
                   )}
                   <span className="hidden sm:inline">Підняти рівень</span>
                 </Button>
               )}
           </div>
       </div>
      
      <div className="flex-1 overflow-hidden">
        <CharacterCarousel pers={localPers} onPersUpdate={setLocalPers} groupedFeatures={localGroupedFeatures} isReadOnly={isReadOnly} />
      </div>
    </div>
  );
}
