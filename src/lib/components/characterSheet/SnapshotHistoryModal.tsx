"use client";

import React, { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History as HistoryIcon, Eye, Copy } from "lucide-react";
import { getSnapshots } from "@/lib/actions/snapshot-actions";
import { duplicatePers } from "@/lib/actions/pers";
import { toast } from "sonner";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import Link from "next/link";

interface Snapshot {
  persId: number;
  name: string;
  level: number;
  snapshotLevel: number | null;
  createdAt: Date;
  isActive: boolean;
}

interface SnapshotHistoryModalProps {
  persId: number;
  characterName: string;
  openOverride?: boolean;
  onOpenChangeOverride?: (open: boolean) => void;
  noButtonTrigger?: boolean;
  onSuccess?: (pers: any) => void;
}

export function SnapshotHistoryModal({ 
  persId, 
  characterName, 
  openOverride, 
  onOpenChangeOverride,
  noButtonTrigger: hideTrigger,
  onSuccess
}: SnapshotHistoryModalProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isOpen = openOverride !== undefined ? openOverride : internalOpen;
  const setIsOpen = onOpenChangeOverride !== undefined ? onOpenChangeOverride : setInternalOpen;

  const [isPending, startTransition] = useTransition();

  const loadSnapshots = async () => {
    const data = await getSnapshots(persId);
    setSnapshots(data as any);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      loadSnapshots();
    }
  };

  const handleCopy = (snapshotId: number) => {
    startTransition(async () => {
      const result = await duplicatePers(snapshotId);
      if (result.success && result.pers) {
        toast.success("Створено нову копію персонажа!");
        onSuccess?.(result.pers);
        setIsOpen(false); 
      } else {
        toast.error(result.error || "Не вдалося скопіювати знімок");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <HistoryIcon className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent 
        className="sm:max-w-[500px] glass-card border-white/10 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5" />
            Історія: {characterName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {snapshots.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              Знімків ще немає. Вони створюються автоматично при підвищенні рівня.
            </div>
          ) : (
            snapshots.map((snapshot) => (
              <div 
                key={snapshot.persId}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Рівень {snapshot.snapshotLevel || snapshot.level}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {format(new Date(snapshot.createdAt), "d MMMM yyyy, HH:mm", { locale: uk })}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Link href={`/char/${snapshot.persId}`} target="_blank">
                    <Button variant="ghost" size="icon" title="Переглянути">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                                     <Button 
                      variant="ghost" 
                      size="icon" 
                      title="Скопіювати"
                      disabled={isPending}
                      onClick={() => handleCopy(snapshot.persId)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-cyan-400 text-center">
            потрібно зіграти іншим рівнем? скопіюйте з історії!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
