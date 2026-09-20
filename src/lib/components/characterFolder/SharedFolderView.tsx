"use client";

import React, { useMemo, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Loader2, Pencil } from "lucide-react";
import { acceptFolderEditShareToken, copyFolderByShareToken } from "@/lib/actions/share-actions";
import { toast } from "sonner";
import { CharHomeClient, PersHomeItem, PersFolderHomeItem } from "@/app/char/home/CharHomeClient";
import { collectPersClassNames, collectPersSubclassNames } from "@/lib/logic/pers-class-names";
import type { Ruleset } from "@prisma/client";

interface SharedFolderPers {
  persId: number;
  name: string;
  portraitKey?: string | null;
  level: number;
  folderId?: number | null;
  currentHp?: number | null;
  maxHp?: number | null;
  isPinned?: boolean | null;
  shareToken?: string | null;
  editToken?: string | null;
  ruleset?: string | null;
  race?: { name: string } | null;
  class?: { name: string } | null;
  subclass?: { name: string } | null;
  background?: { name: string } | null;
  multiclasses?: { class: { name: string } | null; subclass: { name: string } | null }[];
}

interface SharedFolderItem {
  folderId: number;
  name: string;
  color?: string | null;
  isPinned?: boolean | null;
  parentFolderId?: number | null;
}

interface SharedFolderData {
  folderId: number;
  name: string;
  ruleset: Ruleset;
  color?: string | null;
  isPinned?: boolean | null;
  perses: SharedFolderPers[];
  folders?: SharedFolderItem[];
}

interface SharedFolderViewProps {
  token: string;
  folder: SharedFolderData;
  canEdit: boolean;
}

export function SharedFolderView({ token, folder, canEdit }: SharedFolderViewProps) {
  const [isAcceptPending, startAcceptTransition] = useTransition();
  const [isCopyPending, startCopyTransition] = useTransition();

  const { persItems, folderItems } = useMemo(() => {
    const root: SharedFolderItem = {
      folderId: folder.folderId,
      name: folder.name,
      color: folder.color,
      isPinned: folder.isPinned ?? false,
      parentFolderId: null,
    };

    const mergedFolders = [root, ...(folder.folders ?? [])];

    const folderItems: PersFolderHomeItem[] = mergedFolders.map((f) => ({
      folderId: f.folderId,
      name: f.name,
      color: f.color ?? "#38bdf8",
      isPinned: Boolean(f.isPinned),
      parentFolderId: f.parentFolderId ?? null,
    }));

    const persItems: PersHomeItem[] = (folder.perses ?? []).map((p) => ({
      persId: p.persId,
      name: p.name,
      portraitKey: p.portraitKey ?? null,
      level: p.level,
      currentHp: p.currentHp ?? 0,
      maxHp: p.maxHp ?? 0,
      raceName: p.race?.name ?? "Інше",
      className: p.class?.name ?? "Інше",
      backgroundName: p.background?.name ?? "Інше",
      shareToken: p.shareToken ?? null,
      isOwned: false,
      folderId: p.folderId ?? folder.folderId,
      isPinned: Boolean(p.isPinned),
      ruleset: p.ruleset ?? null,
      classNames: collectPersClassNames({ class: p.class, subclass: p.subclass, multiclasses: p.multiclasses }),
      subclassNames: collectPersSubclassNames({ class: p.class, subclass: p.subclass, multiclasses: p.multiclasses }),
    }));

    return { persItems, folderItems };
  }, [folder]);

  const persLinkResolver = useMemo(() => {
    const persList = folder.perses ?? [];

    if (canEdit) {
      return (pers: PersHomeItem) => {
        const match = persList.find((p) => p.persId === pers.persId);
        return match?.editToken ? `/char/share/${match.editToken}` : null;
      };
    }

    return (pers: PersHomeItem) => {
      const match = persList.find((p) => p.persId === pers.persId);
      return match?.shareToken ? `/char/share/${match.shareToken}` : null;
    };
  }, [canEdit, folder.perses]);

  const handleAcceptEditAccess = () => {
    startAcceptTransition(async () => {
      const result = await acceptFolderEditShareToken(token);
      if (result.success && result.folderId) {
        toast.success("Папку додано до профілю!");
      } else {
        toast.error(result.error || "Не вдалося отримати доступ");
      }
    });
  };

  const handleCopyFolder = () => {
    startCopyTransition(async () => {
      const result = await copyFolderByShareToken(token);
      if (result.success && result.folder) {
        toast.success("Папку скопійовано до профілю!");
      } else {
        toast.error(result.error || "Не вдалося скопіювати папку");
      }
    });
  };

  const extraHeaderActions = canEdit ? (
    <Button
      size="sm"
      variant="secondary"
      className="h-9 gap-2 bg-sky-600/20 hover:bg-sky-600/30 border-sky-500/30 text-sky-200"
      onClick={handleAcceptEditAccess}
      disabled={isAcceptPending}
    >
      {isAcceptPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
      <span className="hidden sm:inline">Додати в профіль</span>
    </Button>
  ) : (
    <Button
      size="sm"
      variant="secondary"
      className="h-9 gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/30 text-emerald-200"
      onClick={handleCopyFolder}
      disabled={isCopyPending}
    >
      {isCopyPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
      <span className="hidden sm:inline">Скопіювати папку</span>
    </Button>
  );

  return (
    <CharHomeClient
      perses={persItems}
      folders={folderItems}
      ruleset={folder.ruleset}
      initialFolderId={folder.folderId}
      persLinkResolver={persLinkResolver}
      extraHeaderActions={extraHeaderActions}
      rootHref={folder.ruleset === "RULES_2024" ? "/2024/char/home" : "/char/home"}
    />
  );
}
