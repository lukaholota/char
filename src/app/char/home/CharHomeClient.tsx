"use client";

import React, { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, MoreVertical, Copy, Share2, Printer, Search, History } from "lucide-react";
import { SnapshotHistoryModal } from "@/lib/components/characterSheet/SnapshotHistoryModal";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { useTwoStepConfirm } from "@/hooks/useTwoStepConfirm";
import { deletePers, renamePers, duplicatePers } from "@/lib/actions/pers";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ShareDialog } from "@/lib/components/characterSheet/ShareDialog";
import PrintCharacterDialog from "@/lib/components/characterSheet/PrintCharacterDialog";
import { DisintegratingCard } from "@/lib/components/ui/DisintegratingCard";
import { AnimatePresence } from "framer-motion";

export interface PersHomeItem {
  persId: number;
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  raceName: string;
  className: string;
  backgroundName: string;
  shareToken?: string | null;
}

interface Props {
  perses: PersHomeItem[];
}

function stopCardClick(e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

function PersCard({
  pers,
  onRename,
  onDelete,
  onDuplicate,
  onDuplicateSuccess,
}: {
  pers: PersHomeItem;
  onRename: (persId: number, nextName: string) => void;
  onDelete: (persId: number) => void;
  onDuplicate: (persId: number) => void;
  onDuplicateSuccess?: (newPers: PersHomeItem) => void;
}) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(pers.name);
  const [isRenaming, startRename] = useTransition();

  const { ref: deleteRef, isConfirming, onClick: onConfirmClick } = useTwoStepConfirm<HTMLButtonElement>({
    onConfirm: () => onDelete(pers.persId),
  });

  const handleNavigate = useCallback(() => {
    router.push(`/char/${pers.persId}`);
  }, [router, pers.persId]);

  const handleRename = useCallback(() => {
    const next = renameValue.trim();
    if (!next) {
      toast.error("Ім'я не може бути порожнім");
      return;
    }

    startRename(async () => {
      await onRename(pers.persId, next);
      setRenameOpen(false);
    });
  }, [onRename, pers.persId, renameValue]);

  return (
    <Card
      className="h-full transition-shadow cursor-pointer relative group glass-card border-white/10 hover:shadow-lg"
      role="link"
      tabIndex={0}
      onClick={handleNavigate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNavigate();
        }
      }}
    >
      <div className="absolute top-3 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white"
              onClick={stopCardClick}
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="glass-card border-white/10 text-slate-200"
            onClick={stopCardClick}
          >
            <DropdownMenuItem 
              onClick={() => {
                setRenameValue(pers.name);
                setRenameOpen(true);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              <span>Перейменувати</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => onDuplicate(pers.persId)}
            >
              <Copy className="mr-2 h-4 w-4" />
              <span>Копіювати</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={() => setHistoryOpen(true)}
            >
              <History className="mr-2 h-4 w-4" />
              <span>Історія</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/5" />

            <DropdownMenuItem 
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="mr-2 h-4 w-4" />
              <span>Поширити</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={() => setPrintOpen(true)}
            >
              <Printer className="mr-2 h-4 w-4" />
              <span>Друк</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/5" />

            <DropdownMenuItem 
              ref={deleteRef as any}
              className="text-red-400 focus:text-red-400"
              onSelect={(e) => {
                e.preventDefault(); // Keep dropdown open for confirmation
                onConfirmClick();
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>{isConfirming ? "Підтвердити видалення" : "Видалити"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Action Dialogs */}
        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
          <DialogContent 
            className="sm:max-w-[520px] glass-card border-white/10 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <DialogHeader>
              <DialogTitle>Перейменувати персонажа</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                maxLength={60}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setRenameOpen(false)} disabled={isRenaming}>
                  Скасувати
                </Button>
                <Button onClick={handleRename} disabled={isRenaming}>
                  {isRenaming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Зберегти
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <SnapshotHistoryModal 
          persId={pers.persId} 
          characterName={pers.name} 
          openOverride={historyOpen}
          onOpenChangeOverride={setHistoryOpen}
          noButtonTrigger={true}
          onSuccess={onDuplicateSuccess}
        />

        <ShareDialog 
          persId={pers.persId} 
          initialToken={pers.shareToken} 
          open={shareOpen} 
          onOpenChange={setShareOpen} 
          noButtonTrigger={true}
        />

        <PrintCharacterDialog 
          persId={pers.persId} 
          characterName={pers.name} 
          open={printOpen} 
          onOpenChange={setPrintOpen} 
          noButtonTrigger={true}
        />
      </div>

      <CardHeader>
        <CardTitle className="pr-12 text-xl leading-tight">{pers.name}</CardTitle>
        <CardDescription>
          {translateValue(pers.raceName)} {translateValue(pers.className)} {pers.level}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            HP: {pers.currentHp}/{pers.maxHp}
          </span>
          <span>Передісторія: {translateValue(pers.backgroundName)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function CharHomeClient({ perses }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<PersHomeItem[]>(perses);
  
  React.useEffect(() => {
    setItems(perses);
  }, [perses]);

  const [search, setSearch] = useState("");
  const [isCreating, startCreate] = useTransition();
  const [isDuplicating, startDuplicate] = useTransition();

  const handleCreate = useCallback(() => {
    startCreate(() => {
      router.push("/char");
    });
  }, [router]);

  const handleRename = useCallback(async (persId: number, nextName: string) => {
    const result = await renamePers(persId, nextName);
    if (!result.success) {
      toast.error(result.error || "Не вдалося перейменувати");
      return;
    }

    setItems((prev) => prev.map((p) => (p.persId === persId ? { ...p, name: nextName } : p)));
    toast.success("Ім'я оновлено");
    router.refresh();
  }, [router]);

  const handleDelete = useCallback(async (persId: number) => {
    const prevItems = items;
    setItems((prev) => prev.filter((p) => p.persId !== persId));

    const result = await deletePers(persId);
    if (!result.success) {
      setItems(prevItems);
      toast.error(result.error || "Не вдалося видалити персонажа");
      return;
    }

    toast.success("Персонажа видалено");
    router.refresh();
  }, [items, router]);

  const handleDuplicate = useCallback(async (persId: number) => {
    startDuplicate(async () => {
      const result = await duplicatePers(persId);
      if (!result.success || !result.pers) {
        toast.error(result.error || "Не вдалося скопіювати");
        return;
      }

      setItems(prev => [result.pers!, ...prev]);
      toast.success("Персонажа скопійовано");
      router.refresh(); // Sync tags/cache
    });
  }, [router]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const s = search.toLowerCase();
    return items.filter(p => p.name.toLowerCase().includes(s));
  }, [items, search]);

  const sorted = useMemo(() => filtered, [filtered]);

  return (
    <div className="container mx-auto py-8 px-4 pb-24 sm:pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-rpg-display font-semibold uppercase tracking-wider text-slate-200">
          Мої Персонажі
        </h1>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Пошук персонажа..."
              className="pl-9 glass-card border-white/10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button onClick={handleCreate} disabled={isCreating || isDuplicating} className="shrink-0">
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">Створити</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {sorted.map((pers) => (
            <DisintegratingCard key={pers.persId} isVisible={true}>
              <PersCard 
                pers={pers} 
                onRename={handleRename} 
                onDelete={handleDelete} 
                onDuplicate={handleDuplicate}
                onDuplicateSuccess={(newPers) => setItems(prev => [newPers, ...prev])}
              />
            </DisintegratingCard>
          ))}
        </AnimatePresence>

        {sorted.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
            {search ? "Персонажів з таким ім'ям не знайдено" : "У вас ще немає персонажів. Створіть першого!"}
          </div>
        )}
      </div>
    </div>
  );
}
