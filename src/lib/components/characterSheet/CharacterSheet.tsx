"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { PersWithRelations, CharacterFeaturesGroupedResult } from "@/lib/actions/pers";
import { getCharacterFeaturesGrouped, getCharacterFeaturesGroupedByShareToken, renamePers } from "@/lib/actions/pers";
import CharacterCarousel from "./CharacterCarousel";
import type { SpellSource } from "@/rules/spell-sources";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, Loader2, Pencil } from "lucide-react";
import RestButton from "./RestButton";
import { Badge } from "@/components/ui/badge";
import { ShareDialog } from "./ShareDialog";
import { useParams, useRouter } from "next/navigation";
import { acceptPersEditShareToken, copyPersByToken } from "@/lib/actions/share-actions";
import { Copy } from "lucide-react";
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
import OfflineStatusBadge from "./OfflineStatusBadge";
import { useIsOnline } from "@/hooks/useIsOnline";
import { applyQueuedOperations } from "@/lib/offline/operations";
import { readOfflineQueue } from "@/lib/offline/queue";

const mobileIconButtonClassName = "h-9 w-9 gap-0 p-0 sm:h-8 sm:w-8";
const mobileTextButtonClassName = "h-9 min-w-[5.5rem] justify-start gap-1.5 px-2 text-left sm:h-8 sm:min-w-0 sm:justify-center sm:gap-2 sm:px-3";
const mobileTextLabelClassName = "block text-[10px] leading-none sm:text-sm";

interface CharacterSheetProps {
  pers: PersWithRelations;
  spellcastingSources: readonly SpellSource[];
  groupedFeatures: CharacterFeaturesGroupedResult | null;
  isPublicView?: boolean;
  editShareToken?: string | null;
}

export default function CharacterSheet({ pers, spellcastingSources, groupedFeatures, isPublicView, editShareToken }: CharacterSheetProps) {
  const [localPers, setLocalPers] = useState<PersWithRelations>(pers);
  const [localGroupedFeatures, setLocalGroupedFeatures] = useState<CharacterFeaturesGroupedResult | null>(groupedFeatures);
  const [isLevelUpPending, setIsLevelUpPending] = useState<boolean>(false);
  const isReadOnly = isPublicView || pers.isSnapshot;
  const params = useParams();
  const router = useRouter();
  const [isCopyPending, startCopyTransition] = useTransition();
  const [isAcceptPending, startAcceptTransition] = useTransition();
  const [isRenamePending, startRenameTransition] = useTransition();
  const [, startFeaturesTransition] = useTransition();
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(pers.name);
  const isOnline = useIsOnline();

  const shareToken = (params as any)?.token as string | undefined;

  // Офлайн сторінка приїжджає з кешу service worker, тобто зі станом на момент кешування.
  // Незбережені операції лежать у черзі — без них лист показував би застарілі хіти й комірки.
  useEffect(() => {
    setLocalPers(applyQueuedOperations(pers, readOfflineQueue()));
  }, [pers]);

  useEffect(() => {
    setLocalGroupedFeatures(groupedFeatures);
  }, [groupedFeatures]);

  const reloadFeatures = useCallback(() => {
    if (!localPers?.persId) return;

    startFeaturesTransition(async () => {
      try {
        const gf = isPublicView && shareToken
          ? await getCharacterFeaturesGroupedByShareToken(shareToken)
          : await getCharacterFeaturesGrouped(localPers.persId);
        setLocalGroupedFeatures(gf);
      } catch (e) {
        console.error(e);
      }
    });
  }, [isPublicView, localPers?.persId, shareToken]);

  useEffect(() => {
    // When the page streams/loads without grouped features, fetch them in the background.
    if (localGroupedFeatures) return;
    reloadFeatures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadFeatures]);

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

  const handleAcceptEditAccess = () => {
    if (!editShareToken) return;

    startAcceptTransition(async () => {
      const result = await acceptPersEditShareToken(editShareToken);
      if (result.success && result.persId) {
        toast.success("Доступ до редагування надано!");
        router.push(`/char/${result.persId}`);
      } else {
        toast.error(result.error || "Не вдалося отримати доступ");
      }
    });
  };

  const handleRename = () => {
    const next = renameValue.trim();
    if (!next) {
      toast.error("Імʼя не може бути порожнім");
      return;
    }

    startRenameTransition(async () => {
      const result = await renamePers(localPers.persId, next);
      if (!result.success) {
        toast.error(result.error || "Не вдалося перейменувати");
        return;
      }

      setLocalPers((prev) => ({ ...prev, name: next }));
      toast.success("Імʼя оновлено");
      setRenameOpen(false);
      router.refresh();
    });
  };

  const handleLevelUp = () => {
    if (!isOnline) {
      toast.error("Підняття рівня потребує мережі");
      return;
    }

    const levelUpLocation = `/char/${localPers.persId}/levelup`;
    setIsLevelUpPending(true);
    router.push(levelUpLocation);
    setTimeout(() => {
      setIsLevelUpPending(false);
    }, 3000);
  };

  const refreshGroupedFeatures = (persId?: number) => {
    const id = persId ?? localPers?.persId;
    if (typeof id !== "number" || Number.isNaN(id)) return;
    startFeaturesTransition(async () => {
      try {
        const gf = await getCharacterFeaturesGrouped(id);
        setLocalGroupedFeatures(gf);
      } catch (e) {
        console.error(e);
      }
    });
  };

  return (
    <div className="h-full overflow-hidden w-full bg-slate-900 flex flex-col">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-900/70 p-3 px-4 backdrop-blur">
           <div className="flex items-start justify-between gap-2 sm:items-center">
             <div className="min-w-0 flex-1 pr-1">
               {!isReadOnly ? (
                 <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
                   <DialogTrigger asChild>
                     <button
                       type="button"
                       className="block max-w-full text-left"
                       onClick={() => {
                         setRenameValue(localPers.name);
                       }}
                       title="Перейменувати персонажа"
                     >
                       <span className="max-w-full overflow-hidden text-base font-bold leading-tight text-slate-50 transition hover:text-white md:text-lg [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] break-words">
                         {localPers.name}
                       </span>
                     </button>
                   </DialogTrigger>
                   <DialogContent className="sm:max-w-[520px] glass-card border-white/10 text-slate-100">
                     <DialogHeader>
                       <DialogTitle>Перейменувати персонажа</DialogTitle>
                     </DialogHeader>

                     <div className="space-y-3">
                       <Input
                         value={renameValue}
                         onChange={(e) => setRenameValue(e.target.value)}
                         maxLength={60}
                         autoFocus
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
               ) : (
                 <div className="overflow-hidden text-base font-bold leading-tight text-slate-50 md:text-lg [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] break-words">
                   {localPers.name}
                 </div>
               )}
               <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-300/80">
                 <span>Рівень {localPers.level}</span>
                 {!isReadOnly && <OfflineStatusBadge />}
               </div>
               {isReadOnly && (
                 <Badge variant="outline" className="mt-2 bg-amber-500/10 text-amber-500 border-amber-500/20">
                   {isPublicView ? "Тільки для читання" : `Знімок: Рівень ${pers.snapshotLevel || pers.level}`}
                 </Badge>
               )}
             </div>
             <div className="grid shrink-0 grid-cols-[2.25rem_auto] gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:justify-end sm:gap-2">
               {isPublicView && (
                   <Button 
                       size="sm" 
                       variant="secondary" 
                       className={`${mobileTextButtonClassName} bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border-emerald-500/30`}
                       onClick={handleCopyToProfile}
                       disabled={isCopyPending}
                   >
                       <Copy className="w-4 h-4" />
                       <span className={mobileTextLabelClassName}>Копіювати</span>
                   </Button>
               )}
              {isPublicView && editShareToken && (
                <Button
                  size="sm"
                  variant="secondary"
                  className={`${mobileTextButtonClassName} bg-sky-600/20 text-sky-200 hover:bg-sky-600/30 border-sky-500/30`}
                  onClick={handleAcceptEditAccess}
                  disabled={isAcceptPending}
                >
                  <Pencil className="w-4 h-4" />
                  <span className={mobileTextLabelClassName}>Редагувати</span>
                </Button>
              )}
              <PrintCharacterDialog
                persId={localPers.persId}
                characterName={localPers.name ?? "character"}
                disabled={isCopyPending}
                shareToken={isPublicView ? shareToken : undefined}
                triggerClassName={mobileIconButtonClassName}
                triggerLabel="Друк"
                triggerLabelClassName="sr-only"
              />
               {!isReadOnly && (
                 <RestButton
                   pers={localPers}
                   onPersUpdate={setLocalPers}
                   onGroupedFeaturesRefresh={() => refreshGroupedFeatures()}
                   triggerClassName={mobileTextButtonClassName}
                   triggerLabel="Відпочинок"
                   triggerLabelClassName={mobileTextLabelClassName}
                 />
               )}
               {!isReadOnly && (
                 <ShareDialog
                   persId={localPers.persId}
                   initialToken={localPers.shareToken}
                   triggerVariant="secondary"
                   triggerClassName={`${mobileIconButtonClassName} text-slate-200`}
                   triggerLabel="Поділитися"
                   triggerLabelClassName="sr-only"
                 />
               )}
               {!isReadOnly && (
                 <Button
                   size="sm"
                   variant="secondary"
                   className={`${mobileTextButtonClassName} bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/30`}
                   onClick={handleLevelUp}
                   disabled={isLevelUpPending || isCopyPending || isRenamePending}
                 >
                   {isLevelUpPending ? (
                     <Loader2 className="w-4 h-4 animate-spin" />
                   ) : (
                     <ArrowUpCircle className="w-4 h-4" />
                   )}
                   <span className={mobileTextLabelClassName}>Підняти рівень</span>
                 </Button>
               )}
             </div>
           </div>
       </div>
      
      <div className="flex-1 min-h-0 md:pb-0 md:overflow-hidden">
        <CharacterCarousel pers={localPers} spellcastingSources={spellcastingSources} onPersUpdate={setLocalPers} groupedFeatures={localGroupedFeatures} isReadOnly={isReadOnly} reloadFeatures={reloadFeatures} />
      </div>
    </div>
  );
}

