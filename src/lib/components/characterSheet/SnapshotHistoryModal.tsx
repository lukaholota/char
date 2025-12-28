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
import { History, Eye, Play, Check } from "lucide-react";
import { getSnapshots, activateSnapshot } from "@/lib/actions/snapshot-actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

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
}

export function SnapshotHistoryModal({ persId, characterName }: SnapshotHistoryModalProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isOpen, setIsOpen] = useState(false);
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

  const handleActivate = (snapshotId: number) => {
    startTransition(async () => {
      const result = await activateSnapshot(snapshotId);
      if (result.success) {
        toast.success("Знімок активовано!");
        loadSnapshots();
      } else {
        toast.error(result.error || "Не вдалося активувати знімок");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
          <History className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] glass-card border-white/10 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
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
                    {snapshot.isActive && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 py-0 h-5">
                        <Check className="h-3 w-3 mr-1" /> Активний
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {format(new Date(snapshot.createdAt), "d MMMM yyyy, HH:mm", { locale: uk })}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Link href={`/pers/${snapshot.persId}`} target="_blank">
                    <Button variant="ghost" size="icon" title="Переглянути">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  
                  {!snapshot.isActive && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title="Активувати"
                      disabled={isPending}
                      onClick={() => handleActivate(snapshot.persId)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
