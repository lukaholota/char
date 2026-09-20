"use client";

import { PersCardBody } from "./PersCardBody";
import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  MoreVertical,
  Copy,
  Share2,
  Printer,
  Search,
  History,
  Folder,
  FolderPlus,
  FolderOpen,
  ChevronRight,
  ChevronLeft,
  Pin,
  PinOff,
  Paintbrush,
  Filter,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { SnapshotHistoryModal } from "@/lib/components/characterSheet/SnapshotHistoryModal";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { subclassTranslations } from "@/lib/refs/translation";
import { subclassParentClass } from "@/lib/refs/subclassMapping";
import { useTwoStepConfirm } from "@/hooks/useTwoStepConfirm";
import {
  createPersFolder,
  deletePers,
  deletePersFolder,
  duplicatePers,
  duplicatePersFolder,
  movePersFolder,
  movePersToFolder,
  renamePers,
  renamePersFolder,
  setPersFolderColor,
  setPersFolderPinned,
  setPersPinned,
} from "@/lib/actions/pers";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareDialog } from "@/lib/components/characterSheet/ShareDialog";
import PrintCharacterDialog from "@/lib/components/characterSheet/PrintCharacterDialog";
import { ShareFolderDialog } from "@/lib/components/characterFolder/ShareFolderDialog";
import { useModalBackButton } from "@/hooks/useModalBackButton";
import { AnimatePresence, motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Ruleset } from "@prisma/client";

export interface PersHomeItem {
  persId: number;
  name: string;
  portraitKey?: string | null;
  level: number;
  currentHp: number;
  maxHp: number;
  raceName: string;
  className: string;
  backgroundName: string;
  shareToken?: string | null;
  isOwned?: boolean;
  folderId?: number | null;
  isPinned?: boolean;
  ruleset?: string | null;
  classNames?: string[];
  subclassNames?: string[];
}

export interface PersFolderHomeItem {
  folderId: number;
  name: string;
  color: string;
  isPinned: boolean;
  parentFolderId?: number | null;
}

interface Props {
  perses: PersHomeItem[];
  folders: PersFolderHomeItem[];
  ruleset: Ruleset;
  initialFolderId?: number | null;
  persLinkResolver?: (pers: PersHomeItem) => string | null;
  extraHeaderActions?: React.ReactNode;
  rootHref?: string;
  createHref?: string;
}

function stopCardClick(e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

function stopCardKeyDown(e: React.KeyboardEvent) {
  e.stopPropagation();
}

const FOLDER_COLORS = [
  { name: "Sky", value: "#38bdf8" },
  { name: "Mint", value: "#34d399" },
  { name: "Amber", value: "#fbbf24" },
  { name: "Rose", value: "#fb7185" },
  { name: "Violet", value: "#a78bfa" },
  { name: "Slate", value: "#94a3b8" },
  { name: "Lime", value: "#a3e635" },
  { name: "Teal", value: "#2dd4bf" },
];

const LEVEL_OPTIONS = Array.from({ length: 20 }, (_, idx) => String(idx + 1));
const LONG_PRESS_MS = 220;

function sortByPinnedThenName<T extends { name: string; isPinned?: boolean }>(
  a: T,
  b: T,
) {
  const pinDiff = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
  if (pinDiff !== 0) return pinDiff;
  return a.name.localeCompare(b.name, "uk");
}

function sortByPinnedThenPersId<
  T extends { persId: number; isPinned?: boolean },
>(a: T, b: T) {
  const pinDiff = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
  if (pinDiff !== 0) return pinDiff;
  return b.persId - a.persId;
}

function getFolderParamValue(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function FolderCard({
  folder,
  stats,
  onOpen,
  onEdit,
  onDelete,
  onDuplicate,
  onTogglePin,
  onShare,
  isSelected,
  selectionMode,
  onSelectToggle,
  onLongPress,
  allowLongPress,
}: {
  folder: PersFolderHomeItem;
  stats: { persCount: number; folderCount: number };
  onOpen: (folderId: number) => void;
  onEdit: (folder: PersFolderHomeItem) => void;
  onDelete: (folderId: number) => void;
  onDuplicate: (folderId: number) => void;
  onTogglePin: (folderId: number, nextPinned: boolean) => void;
  onShare: (folder: PersFolderHomeItem) => void;
  isSelected: boolean;
  selectionMode: boolean;
  onSelectToggle: (folderId: number) => void;
  onLongPress: (folderId: number) => void;
  allowLongPress: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (event: React.PointerEvent) => {
    if (selectionMode) return;
    if (event.button !== 0) return;
    if (!allowLongPress) return;
    event.preventDefault();
    longPressTriggered.current = false;
    pointerStart.current = { x: event.clientX, y: event.clientY };
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      onLongPress(folder.folderId);
    }, LONG_PRESS_MS);
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!pointerStart.current || !longPressTimer.current) return;
    const dx = Math.abs(event.clientX - pointerStart.current.x);
    const dy = Math.abs(event.clientY - pointerStart.current.y);
    if (dx + dy > 8) {
      clearLongPress();
    }
  };

  const {
    ref: deleteRef,
    isConfirming,
    onClick: onConfirmClick,
  } = useTwoStepConfirm<HTMLButtonElement>({
    onConfirm: () => onDelete(folder.folderId),
  });

  useModalBackButton(menuOpen, () => setMenuOpen(false));

  const accent = folder.color || "#38bdf8";
  const accentSoft = `${accent}22`;
  const accentStrong = `${accent}55`;

  return (
    <Card
      className={cn(
        "h-full transition-shadow cursor-pointer relative group glass-card border hover:shadow-lg overflow-hidden select-none",
        selectionMode && "ring-1 ring-white/20",
        isSelected && "ring-2 ring-arcane-400/70",
      )}
      role="button"
      tabIndex={0}
      style={{
        borderColor: accentStrong,
      }}
      onClick={() => {
        if (longPressTriggered.current) {
          longPressTriggered.current = false;
          return;
        }
        if (selectionMode) {
          onSelectToggle(folder.folderId);
          return;
        }
        onOpen(folder.folderId);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (selectionMode) {
            onSelectToggle(folder.folderId);
          } else {
            onOpen(folder.folderId);
          }
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      onPointerCancel={clearLongPress}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${accentSoft}, transparent 60%)`,
        }}
      />
      <div className="absolute top-3 right-2 z-10">
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
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
            <DropdownMenuItem onClick={() => onEdit(folder)}>
              <Paintbrush className="mr-2 h-4 w-4" />
              <span>Редагувати</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(folder.folderId)}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Копіювати</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onTogglePin(folder.folderId, !folder.isPinned)}
            >
              {folder.isPinned ? (
                <PinOff className="mr-2 h-4 w-4" />
              ) : (
                <Pin className="mr-2 h-4 w-4" />
              )}
              <span>{folder.isPinned ? "Відкріпити" : "Закріпити"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onShare(folder)}>
              <Share2 className="mr-2 h-4 w-4" />
              <span>Поширити</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem
              ref={deleteRef as any}
              className="text-red-400 focus:text-red-400"
              onSelect={(e) => {
                e.preventDefault();
                onConfirmClick();
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>{isConfirming ? "Підтвердити видалення" : "Видалити"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardHeader className="relative">
        {selectionMode && (
          <div className="absolute left-4 top-4 z-10">
            {isSelected ? (
              <CheckSquare className="h-5 w-5 text-arcane-300" />
            ) : (
              <Square className="h-5 w-5 text-slate-500" />
            )}
          </div>
        )}
        <div className={cn("flex items-center gap-2", selectionMode && "pl-6")}>
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: accentSoft,
              border: `1px solid ${accentStrong}`,
            }}
          >
            <FolderOpen className="h-5 w-5" style={{ color: accent }} />
          </div>
          <div className="flex-1">
            <CardTitle className="pr-12 text-lg leading-tight flex items-center gap-2">
              <span className="truncate">{folder.name}</span>
              {folder.isPinned && <Pin className="h-4 w-4 text-amber-300" />}
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              {stats.folderCount > 0
                ? `${stats.folderCount} папок`
                : "Без підпапок"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{stats.persCount} персонажів</span>
          <span className="text-xs uppercase tracking-[0.12em] text-slate-500">
            Папка
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function PersCard({
  pers,
  onRename,
  onDelete,
  onDuplicate,
  onMove,
  onTogglePin,
  onDuplicateSuccess,
  isSelected,
  selectionMode,
  onSelectToggle,
  onLongPress,
  allowLongPress,
  contextLabel,
  linkResolver,
}: {
  pers: PersHomeItem;
  onRename: (persId: number, nextName: string) => void;
  onDelete: (persId: number) => void;
  onDuplicate: (persId: number) => void;
  onMove: (pers: PersHomeItem) => void;
  onTogglePin: (persId: number, nextPinned: boolean) => void;
  onDuplicateSuccess?: (newPers: PersHomeItem) => void;
  isSelected: boolean;
  selectionMode: boolean;
  onSelectToggle: (persId: number) => void;
  onLongPress: (persId: number) => void;
  allowLongPress: boolean;
  contextLabel?: string | null;
  linkResolver?: (pers: PersHomeItem) => string | null;
}) {
  const router = useModeRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(pers.name);
  const [isRenaming, startRename] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (event: React.PointerEvent) => {
    if (selectionMode) return;
    if (event.button !== 0) return;
    if (!allowLongPress) return;
    event.preventDefault();
    longPressTriggered.current = false;
    pointerStart.current = { x: event.clientX, y: event.clientY };
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      onLongPress(pers.persId);
    }, LONG_PRESS_MS);
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!pointerStart.current || !longPressTimer.current) return;
    const dx = Math.abs(event.clientX - pointerStart.current.x);
    const dy = Math.abs(event.clientY - pointerStart.current.y);
    if (dx + dy > 8) {
      clearLongPress();
    }
  };

  useModalBackButton(menuOpen, () => setMenuOpen(false));

  const {
    ref: deleteRef,
    isConfirming,
    onClick: onConfirmClick,
  } = useTwoStepConfirm<HTMLButtonElement>({
    onConfirm: () => onDelete(pers.persId),
  });

  const handleNavigate = useCallback(() => {
    const target = linkResolver ? linkResolver(pers) : `/char/${pers.persId}`;
    if (!target) return;
    router.push(target);
  }, [linkResolver, pers, router]);

  const handleRename = useCallback(() => {
    const next = renameValue.trim();
    if (!next) {
      toast.error("Імʼя не може бути порожнім");
      return;
    }

    startRename(async () => {
      await onRename(pers.persId, next);
      setRenameOpen(false);
    });
  }, [onRename, pers.persId, renameValue]);

  return (
    <Card
      className={cn(
        "h-full transition-shadow cursor-pointer relative group glass-card border-white/10 hover:shadow-lg select-none",
        selectionMode && "ring-1 ring-white/20",
        isSelected && "ring-2 ring-arcane-400/70",
      )}
      role="link"
      tabIndex={0}
      onClick={() => {
        if (longPressTriggered.current) {
          longPressTriggered.current = false;
          return;
        }
        if (selectionMode) {
          onSelectToggle(pers.persId);
          return;
        }
        handleNavigate();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (selectionMode) {
            onSelectToggle(pers.persId);
          } else {
            handleNavigate();
          }
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      onPointerCancel={clearLongPress}
    >
      <div className="absolute top-3 right-2 z-10">
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
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

            <DropdownMenuItem onClick={() => onDuplicate(pers.persId)}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Копіювати</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onMove(pers)}>
              <FolderOpen className="mr-2 h-4 w-4" />
              <span>Перемістити</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => onTogglePin(pers.persId, !pers.isPinned)}
            >
              {pers.isPinned ? (
                <PinOff className="mr-2 h-4 w-4" />
              ) : (
                <Pin className="mr-2 h-4 w-4" />
              )}
              <span>{pers.isPinned ? "Відкріпити" : "Закріпити"}</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
              <History className="mr-2 h-4 w-4" />
              <span>Історія</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/5" />

            {pers.isOwned !== false && (
              <DropdownMenuItem onClick={() => setShareOpen(true)}>
                <Share2 className="mr-2 h-4 w-4" />
                <span>Поділитися</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={() => setPrintOpen(true)}>
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
            onKeyDownCapture={stopCardKeyDown}
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
                onKeyDown={stopCardKeyDown}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setRenameOpen(false)}
                  disabled={isRenaming}
                >
                  Скасувати
                </Button>
                <Button onClick={handleRename} disabled={isRenaming}>
                  {isRenaming && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
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

      <PersCardBody pers={pers} selectionMode={selectionMode} isSelected={isSelected} contextLabel={contextLabel} />
    </Card>
  );
}

export function CharHomeClient({
  perses,
  folders,
  ruleset,
  initialFolderId,
  persLinkResolver,
  extraHeaderActions,
  rootHref,
  createHref,
}: Props) {
  const router = useModeRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<PersHomeItem[]>(perses);
  const [folderItems, setFolderItems] = useState<PersFolderHomeItem[]>(folders);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(
    () =>
      getFolderParamValue(searchParams.get("folder")) ??
      initialFolderId ??
      null,
  );
  const hasAppliedInitialFolder = useRef(false);

  React.useEffect(() => {
    setItems(perses);
  }, [perses]);

  React.useEffect(() => {
    setFolderItems(folders);
  }, [folders]);

  React.useEffect(() => {
    const nextFolderId = getFolderParamValue(searchParams.get("folder"));
    if (nextFolderId === null && initialFolderId !== undefined) {
      if (!hasAppliedInitialFolder.current) {
        setCurrentFolderId(initialFolderId ?? null);
        hasAppliedInitialFolder.current = true;
      }
      return;
    }
    hasAppliedInitialFolder.current = true;
    setCurrentFolderId((prev) => (prev === nextFolderId ? prev : nextFolderId));
  }, [initialFolderId, searchParams]);

  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [classFilterQuery, setClassFilterQuery] = useState("");
  const [subclassFilterQuery, setSubclassFilterQuery] = useState("");
  const [isCreating, startCreate] = useTransition();
  const [isDuplicating, startDuplicate] = useTransition();
  const [isFolderPending, startFolderTransition] = useTransition();
  const [isMovePending, startMoveTransition] = useTransition();

  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderDialogMode, setFolderDialogMode] = useState<"create" | "edit">(
    "create",
  );
  const [folderDialogName, setFolderDialogName] = useState("");
  const [folderDialogColor, setFolderDialogColor] = useState(
    FOLDER_COLORS[0].value,
  );
  const [folderDialogTargetId, setFolderDialogTargetId] = useState<
    number | null
  >(null);

  const [shareFolderOpen, setShareFolderOpen] = useState(false);
  const [shareFolderId, setShareFolderId] = useState<number | null>(null);
  const [shareFolderName, setShareFolderName] = useState<string | null>(null);

  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<PersHomeItem | null>(null);
  const [moveFolderId, setMoveFolderId] = useState<string>("root");

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPersIds, setSelectedPersIds] = useState<Set<number>>(
    new Set(),
  );
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<number>>(
    new Set(),
  );
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkMoveFolderId, setBulkMoveFolderId] = useState<string>("root");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkCreateOpen, setBulkCreateOpen] = useState(false);
  const [bulkCreateName, setBulkCreateName] = useState("");
  const [bulkCreateParentId, setBulkCreateParentId] = useState<string>("root");
  const [bulkCreateColor, setBulkCreateColor] = useState(
    FOLDER_COLORS[0].value,
  );
  const [postCreateMoveOpen, setPostCreateMoveOpen] = useState(false);
  const [postCreateFolder, setPostCreateFolder] =
    useState<PersFolderHomeItem | null>(null);

  const [classFilters, setClassFilters] = useState<Set<string>>(new Set());
  const [subclassFilters, setSubclassFilters] = useState<Set<string>>(
    new Set(),
  );
  const [levelFilters, setLevelFilters] = useState<Set<string>>(new Set());

  const folderMap = useMemo(
    () => new Map(folderItems.map((f) => [f.folderId, f])),
    [folderItems],
  );
  const currentFolder = currentFolderId
    ? (folderMap.get(currentFolderId) ?? null)
    : null;

  const navigateToFolder = useCallback(
    (folderId: number | null, replace = false) => {
      const params = new URLSearchParams(searchParams.toString());
      if (typeof folderId === "number") params.set("folder", String(folderId));
      else params.delete("folder");

      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;

      if (replace) router.replace(url);
      else router.push(url);

      setCurrentFolderId(folderId);
    },
    [pathname, router, searchParams],
  );

  React.useEffect(() => {
    if (currentFolderId && !folderMap.has(currentFolderId)) {
      navigateToFolder(null, true);
    }
  }, [currentFolderId, folderMap, navigateToFolder]);

  const breadcrumbs = useMemo(() => {
    const path: PersFolderHomeItem[] = [];
    let cursor = currentFolderId;
    while (cursor) {
      const folder = folderMap.get(cursor);
      if (!folder) break;
      path.unshift(folder);
      cursor = folder.parentFolderId ?? null;
    }
    return path;
  }, [currentFolderId, folderMap]);

  const buildFolderPathLabel = useCallback(
    (folderId: number | null | undefined) => {
      if (!folderId) return "Без папки";
      const path: string[] = [];
      let cursor: number | null = folderId;
      while (cursor) {
        const folder = folderMap.get(cursor);
        if (!folder) break;
        path.unshift(folder.name);
        cursor = folder.parentFolderId ?? null;
      }
      return path.length ? `Папка: ${path.join(" / ")}` : "Без папки";
    },
    [folderMap],
  );

  const isDescendantFolder = useCallback(
    (folderId: number, potentialParentId: number | null) => {
      if (!potentialParentId) return false;
      let cursor: number | null = potentialParentId;
      while (cursor) {
        if (cursor === folderId) return true;
        const folder = folderMap.get(cursor);
        cursor = folder?.parentFolderId ?? null;
      }
      return false;
    },
    [folderMap],
  );

  const folderStats = useMemo(() => {
    const persCount = new Map<number, number>();
    const folderCount = new Map<number, number>();

    items.forEach((p) => {
      if (p.folderId) {
        persCount.set(p.folderId, (persCount.get(p.folderId) ?? 0) + 1);
      }
    });

    folderItems.forEach((f) => {
      if (f.parentFolderId) {
        folderCount.set(
          f.parentFolderId,
          (folderCount.get(f.parentFolderId) ?? 0) + 1,
        );
      }
    });

    return { persCount, folderCount };
  }, [items, folderItems]);

  const folderOptions = useMemo(() => {
    const options: { id: number; label: string }[] = [];

    const walk = (parentId: number | null, depth: number) => {
      const level = folderItems
        .filter((f) => (f.parentFolderId ?? null) === parentId)
        .sort(sortByPinnedThenName);

      level.forEach((folder) => {
        const prefix = depth > 0 ? `${"--".repeat(depth)} ` : "";
        options.push({ id: folder.folderId, label: `${prefix}${folder.name}` });
        walk(folder.folderId, depth + 1);
      });
    };

    walk(null, 0);
    return options;
  }, [folderItems]);

  const classOptions = useMemo(() => {
    const values = new Set<string>();
    items.forEach((p) => {
      const list = p.classNames?.length ? p.classNames : [p.className];
      list.forEach((name) => {
        if (name) values.add(name);
      });
    });
    return Array.from(values).sort((a, b) =>
      translateValue(a).localeCompare(translateValue(b), "uk"),
    );
  }, [items]);

  const allSubclassOptions = useMemo(() => {
    const values = new Set<string>(Object.keys(subclassTranslations));
    items.forEach((p) => {
      (p.subclassNames ?? []).forEach((name) => {
        if (name) values.add(name);
      });
    });
    return Array.from(values).sort((a, b) =>
      translateValue(a).localeCompare(translateValue(b), "uk"),
    );
  }, [items]);

  const subclassesByClass = useMemo(() => {
    const record: Record<string, string[]> = {};
    allSubclassOptions.forEach((sub) => {
      const parent = subclassParentClass[translateValue(sub)] || "Інше";
      if (!record[parent]) record[parent] = [];
      record[parent].push(sub);
    });

    return Object.entries(record)
      .map(([className, subs]) => {
        const uniq = Array.from(new Set(subs));
        uniq.sort((a, b) => a.localeCompare(b, "uk"));
        return { className, subclasses: uniq };
      })
      .sort((a, b) => {
        const aIsOther = a.className === "Інше";
        const bIsOther = b.className === "Інше";
        if (aIsOther && !bIsOther) return 1;
        if (!aIsOther && bIsOther) return -1;
        return a.className.localeCompare(b.className, "uk");
      });
  }, [allSubclassOptions]);

  const totalSelected = selectedPersIds.size + selectedFolderIds.size;
  const filtersActiveCount =
    classFilters.size + subclassFilters.size + levelFilters.size;
  const selectedItems = useMemo(() => {
    const foldersList = folderItems
      .filter((folder) => selectedFolderIds.has(folder.folderId))
      .map((folder) => ({
        type: "folder" as const,
        id: folder.folderId,
        name: folder.name,
      }));
    const persList = items
      .filter((pers) => selectedPersIds.has(pers.persId))
      .map((pers) => ({
        type: "pers" as const,
        id: pers.persId,
        name: pers.name,
      }));
    return [...foldersList, ...persList];
  }, [folderItems, items, selectedFolderIds, selectedPersIds]);

  const matchesFilters = useCallback(
    (pers: PersHomeItem) => {
      if (classFilters.size > 0) {
        const classList = pers.classNames?.length
          ? pers.classNames
          : [pers.className];
        const hasClass = classList.some((name) => classFilters.has(name));
        if (!hasClass) return false;
      }

      if (subclassFilters.size > 0) {
        const subList = pers.subclassNames ?? [];
        const hasSubclass = subList.some((name) => subclassFilters.has(name));
        if (!hasSubclass) return false;
      }

      if (levelFilters.size > 0) {
        if (!levelFilters.has(String(pers.level))) return false;
      }

      return true;
    },
    [classFilters, levelFilters, subclassFilters],
  );

  const clearSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedPersIds(new Set());
    setSelectedFolderIds(new Set());
  }, []);

  const togglePersSelection = useCallback((persId: number) => {
    setSelectionMode(true);
    setSelectedPersIds((prev) => {
      const next = new Set(prev);
      if (next.has(persId)) next.delete(persId);
      else next.add(persId);
      return next;
    });
  }, []);

  const toggleFolderSelection = useCallback((folderId: number) => {
    setSelectionMode(true);
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const handleLongPressFolder = useCallback((folderId: number) => {
    setSelectionMode(true);
    setSelectedFolderIds((prev) => {
      if (prev.has(folderId)) return prev;
      const next = new Set(prev);
      next.add(folderId);
      return next;
    });
  }, []);

  const handleLongPressPers = useCallback((persId: number) => {
    setSelectionMode(true);
    setSelectedPersIds((prev) => {
      if (prev.has(persId)) return prev;
      const next = new Set(prev);
      next.add(persId);
      return next;
    });
  }, []);

  const toggleFilterValue = useCallback(
    <T,>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) => {
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
      });
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setClassFilters(new Set());
    setSubclassFilters(new Set());
    setLevelFilters(new Set());
  }, []);

  const renderFolderTree = useCallback(
    (
      parentId: number | null,
      depth: number,
      selectedId: string,
      onSelect: (value: string) => void,
    ) => {
      const level = folderItems
        .filter((f) => (f.parentFolderId ?? null) === parentId)
        .sort(sortByPinnedThenName);

      return level.map((folder) => {
        const value = String(folder.folderId);
        const isSelected = selectedId === value;
        return (
          <div key={folder.folderId} className="space-y-2">
            <button
              type="button"
              className={cn(
                "w-full text-left rounded-xl border px-3 py-2 text-sm transition",
                isSelected
                  ? "border-arcane-500/40 bg-arcane-500/10 text-arcane-200"
                  : "border-white/10 bg-slate-950/40 text-slate-200 hover:bg-white/5",
              )}
              style={{ marginLeft: depth * 14 }}
              onClick={() => onSelect(value)}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: folder.color || "#38bdf8" }}
                />
                <span className="truncate">{folder.name}</span>
              </div>
            </button>
            {renderFolderTree(folder.folderId, depth + 1, selectedId, onSelect)}
          </div>
        );
      });
    },
    [folderItems],
  );

  React.useEffect(() => {
    if (selectionMode && totalSelected === 0) {
      setSelectionMode(false);
    }
  }, [selectionMode, totalSelected]);

  const searchValue = search.trim().toLowerCase();

  const filteredPerses = useMemo(
    () => items.filter(matchesFilters),
    [items, matchesFilters],
  );

  const folderMatchCounts = useMemo(() => {
    if (filtersActiveCount === 0) return new Map<number, number>();
    const counts = new Map<number, number>();

    filteredPerses.forEach((pers) => {
      let cursor = pers.folderId ?? null;
      while (cursor) {
        counts.set(cursor, (counts.get(cursor) ?? 0) + 1);
        cursor = folderMap.get(cursor)?.parentFolderId ?? null;
      }
    });

    return counts;
  }, [filteredPerses, filtersActiveCount, folderMap]);

  const visibleFolders = useMemo(() => {
    const list = folderItems.filter(
      (f) => (f.parentFolderId ?? null) === currentFolderId,
    );
    const scoped =
      filtersActiveCount > 0
        ? list.filter((f) => (folderMatchCounts.get(f.folderId) ?? 0) > 0)
        : list;

    if (!searchValue) return scoped.sort(sortByPinnedThenName);
    return scoped
      .filter((f) => f.name.toLowerCase().includes(searchValue))
      .sort(sortByPinnedThenName);
  }, [
    folderItems,
    currentFolderId,
    searchValue,
    filtersActiveCount,
    folderMatchCounts,
  ]);

  const visiblePerses = useMemo(() => {
    const list = filteredPerses.filter(
      (p) => (p.folderId ?? null) === currentFolderId,
    );
    if (!searchValue) return list.sort(sortByPinnedThenPersId);
    return list
      .filter((p) => p.name.toLowerCase().includes(searchValue))
      .sort(sortByPinnedThenPersId);
  }, [filteredPerses, currentFolderId, searchValue]);

  const globalSearchPerses = useMemo(() => {
    if (!searchValue) return [] as PersHomeItem[];
    if (visibleFolders.length + visiblePerses.length > 0)
      return [] as PersHomeItem[];
    return filteredPerses
      .filter((p) => p.name.toLowerCase().includes(searchValue))
      .sort(sortByPinnedThenPersId);
  }, [
    filteredPerses,
    searchValue,
    visibleFolders.length,
    visiblePerses.length,
  ]);

  const handleCreate = useCallback(() => {
    startCreate(() => {
      const targetCreateHref =
        createHref ??
        (pathname.startsWith("/2024") ? "/2024/char" : "/char/create");
      router.push(targetCreateHref);
    });
  }, [router, createHref, pathname]);

  const openCreateFolder = useCallback(() => {
    setFolderDialogMode("create");
    setFolderDialogName("");
    setFolderDialogColor(FOLDER_COLORS[0].value);
    setFolderDialogTargetId(null);
    setFolderDialogOpen(true);
  }, []);

  const openEditFolder = useCallback((folder: PersFolderHomeItem) => {
    setFolderDialogMode("edit");
    setFolderDialogName(folder.name);
    setFolderDialogColor(folder.color || FOLDER_COLORS[0].value);
    setFolderDialogTargetId(folder.folderId);
    setFolderDialogOpen(true);
  }, []);

  const openShareFolder = useCallback((folder: PersFolderHomeItem) => {
    setShareFolderId(folder.folderId);
    setShareFolderName(folder.name);
    setShareFolderOpen(true);
  }, []);

  const handleShareFolderOpenChange = useCallback((open: boolean) => {
    setShareFolderOpen(open);
    if (!open) {
      setShareFolderId(null);
      setShareFolderName(null);
    }
  }, []);

  const handleFolderColorPick = useCallback(
    (color: string) => {
      setFolderDialogColor(color);
      if (folderDialogMode !== "edit" || !folderDialogTargetId) return;

      const prevFolders = folderItems;
      setFolderItems((prev) =>
        prev.map((f) =>
          f.folderId === folderDialogTargetId ? { ...f, color } : f,
        ),
      );

      startFolderTransition(async () => {
        const result = await setPersFolderColor(folderDialogTargetId, color);
        if (!result.success) {
          setFolderItems(prevFolders);
          toast.error(result.error || "Не вдалося оновити колір");
          return;
        }
        router.refresh();
      });
    },
    [folderDialogMode, folderDialogTargetId, folderItems, router],
  );

  const handleFolderSave = useCallback(() => {
    startFolderTransition(async () => {
      const name = folderDialogName.trim();
      if (!name) {
        toast.error("Назва папки не може бути порожньою");
        return;
      }

      if (folderDialogMode === "create") {
        const result = await createPersFolder({
          name,
          ruleset,
          color: folderDialogColor,
          parentFolderId: currentFolderId,
        });

        if (!result.success || !result.folder) {
          toast.error(result.error || "Не вдалося створити папку");
          return;
        }

        setFolderItems((prev) => [result.folder!, ...prev]);
        setFolderDialogOpen(false);
        toast.success("Папку створено");
        router.refresh();
        if (selectionMode && totalSelected > 0) {
          setPostCreateFolder(result.folder!);
          window.setTimeout(() => setPostCreateMoveOpen(true), 0);
        }
        return;
      }

      if (!folderDialogTargetId) return;
      const target = folderItems.find(
        (f) => f.folderId === folderDialogTargetId,
      );
      if (!target) return;

      const prevFolders = folderItems;
      setFolderItems((prev) =>
        prev.map((f) =>
          f.folderId === folderDialogTargetId
            ? { ...f, name, color: folderDialogColor }
            : f,
        ),
      );

      if (target.name !== name) {
        const result = await renamePersFolder(folderDialogTargetId, name);
        if (!result.success) {
          setFolderItems(prevFolders);
          toast.error(result.error || "Не вдалося перейменувати папку");
          return;
        }
      }

      if (target.color !== folderDialogColor) {
        const result = await setPersFolderColor(
          folderDialogTargetId,
          folderDialogColor,
        );
        if (!result.success) {
          setFolderItems(prevFolders);
          toast.error(result.error || "Не вдалося оновити колір");
          return;
        }
      }
      setFolderDialogOpen(false);
      toast.success("Папку оновлено");
      router.refresh();
    });
  }, [
    folderDialogColor,
    folderDialogMode,
    folderDialogName,
    folderDialogTargetId,
    folderItems,
    currentFolderId,
    ruleset,
    selectionMode,
    totalSelected,
    router,
  ]);

  const handlePostCreateMoveOpenChange = useCallback((open: boolean) => {
    setPostCreateMoveOpen(open);
    if (!open) {
      setPostCreateFolder(null);
    }
  }, []);

  const handleRename = useCallback(
    async (persId: number, nextName: string) => {
      const prevItems = items;
      setItems((prev) =>
        prev.map((p) => (p.persId === persId ? { ...p, name: nextName } : p)),
      );

      const result = await renamePers(persId, nextName);
      if (!result.success) {
        setItems(prevItems);
        toast.error(result.error || "Не вдалося перейменувати");
        return;
      }

      toast.success("Імʼя оновлено");
      router.refresh();
    },
    [items, router],
  );

  const handleDelete = useCallback(
    async (persId: number) => {
      const prevItems = items;
      setItems((prev) => prev.filter((p) => p.persId !== persId));

      const result = await deletePers(persId);
      if (!result.success) {
        setItems(prevItems);
        toast.error(result.error || "Не вдалося видалити персонажа");
        return;
      }

      toast.success("unlinked" in result && result.unlinked ? "Персонажа прибрано з вашого списку" : "Персонажа видалено");
      router.refresh();
    },
    [items, router],
  );

  const handleDuplicate = useCallback(
    async (persId: number) => {
      startDuplicate(async () => {
        const result = await duplicatePers(persId);
        if (!result.success || !result.pers) {
          toast.error(result.error || "Не вдалося скопіювати");
          return;
        }

        setItems((prev) => [result.pers!, ...prev]);
        toast.success("Персонажа скопійовано");
        router.refresh();
      });
    },
    [router],
  );

  const handleFolderDelete = useCallback(
    async (folderId: number) => {
      const folder = folderMap.get(folderId);
      const nextParentId = folder?.parentFolderId ?? null;

      const prevFolders = folderItems;
      const prevItems = items;

      setFolderItems((prev) =>
        prev
          .filter((f) => f.folderId !== folderId)
          .map((f) =>
            f.parentFolderId === folderId
              ? { ...f, parentFolderId: nextParentId }
              : f,
          ),
      );
      setItems((prev) =>
        prev.map((p) =>
          p.folderId === folderId ? { ...p, folderId: nextParentId } : p,
        ),
      );

      if (currentFolderId === folderId) {
        setCurrentFolderId(nextParentId);
      }

      const result = await deletePersFolder(folderId);
      if (!result.success) {
        setFolderItems(prevFolders);
        setItems(prevItems);
        toast.error(result.error || "Не вдалося видалити папку");
        return;
      }

      toast.success("Папку видалено");
      router.refresh();
    },
    [folderMap, folderItems, items, currentFolderId, router],
  );

  const handleFolderDuplicate = useCallback(
    async (folderId: number) => {
      startFolderTransition(async () => {
        const result = await duplicatePersFolder(folderId);
        if (!result.success || !result.folder) {
          toast.error(result.error || "Не вдалося скопіювати папку");
          return;
        }

        setFolderItems((prev) => [result.folder!, ...prev]);
        toast.success("Папку скопійовано");
        router.refresh();
      });
    },
    [router],
  );

  const handleToggleFolderPin = useCallback(
    async (folderId: number, nextPinned: boolean) => {
      const prevFolders = folderItems;
      setFolderItems((prev) =>
        prev.map((f) =>
          f.folderId === folderId ? { ...f, isPinned: nextPinned } : f,
        ),
      );

      const result = await setPersFolderPinned(folderId, nextPinned);
      if (!result.success) {
        setFolderItems(prevFolders);
        toast.error(result.error || "Не вдалося оновити папку");
        return;
      }

      router.refresh();
    },
    [router],
  );

  const handleOpenFolder = useCallback(
    (folderId: number) => {
      navigateToFolder(folderId);
    },
    [navigateToFolder],
  );

  const handleMoveOpen = useCallback((pers: PersHomeItem) => {
    setMoveTarget(pers);
    setMoveFolderId(pers.folderId ? String(pers.folderId) : "root");
    setMoveDialogOpen(true);
  }, []);

  const handleMoveConfirm = useCallback(() => {
    if (!moveTarget) return;

    startMoveTransition(async () => {
      const nextId = moveFolderId === "root" ? null : Number(moveFolderId);
      const prevItems = items;
      setItems((prev) =>
        prev.map((p) =>
          p.persId === moveTarget.persId ? { ...p, folderId: nextId } : p,
        ),
      );

      const result = await movePersToFolder(moveTarget.persId, nextId);
      if (!result.success) {
        setItems(prevItems);
        toast.error(result.error || "Не вдалося перемістити");
        return;
      }
      setMoveDialogOpen(false);
      toast.success("Персонажа переміщено");
      router.refresh();
    });
  }, [items, moveFolderId, moveTarget, router]);

  const handleBulkCreateFolder = useCallback(() => {
    startFolderTransition(async () => {
      const name = bulkCreateName.trim();
      if (!name) {
        toast.error("Назва папки не може бути порожньою");
        return;
      }

      const parentId =
        bulkCreateParentId === "root" ? null : Number(bulkCreateParentId);
      const result = await createPersFolder({
        name,
        ruleset,
        color: bulkCreateColor,
        parentFolderId: parentId,
      });

      if (!result.success || !result.folder) {
        toast.error(result.error || "Не вдалося створити папку");
        return;
      }

      setFolderItems((prev) => [result.folder!, ...prev]);
      setBulkCreateName("");
      setBulkCreateOpen(false);
      setBulkMoveFolderId(String(result.folder.folderId));
      toast.success("Папку створено");
      router.refresh();
    });
  }, [
    bulkCreateColor,
    bulkCreateName,
    bulkCreateParentId,
    createPersFolder,
    ruleset,
    router,
  ]);

  const handleTogglePersPin = useCallback(
    async (persId: number, nextPinned: boolean) => {
      const prevItems = items;
      setItems((prev) =>
        prev.map((p) =>
          p.persId === persId ? { ...p, isPinned: nextPinned } : p,
        ),
      );

      const result = await setPersPinned(persId, nextPinned);
      if (!result.success) {
        setItems(prevItems);
        toast.error(result.error || "Не вдалося оновити персонажа");
        return;
      }

      router.refresh();
    },
    [items, router],
  );

  const handleBulkMoveConfirm = useCallback(() => {
    startMoveTransition(async () => {
      const targetFolderId =
        bulkMoveFolderId === "root" ? null : Number(bulkMoveFolderId);
      const persIds = Array.from(selectedPersIds);
      const folderIds = Array.from(selectedFolderIds);

      if (persIds.length === 0 && folderIds.length === 0) return;

      const invalidFolders = folderIds.filter((id) =>
        isDescendantFolder(id, targetFolderId),
      );
      const validFolders = folderIds.filter(
        (id) => !invalidFolders.includes(id),
      );

      if (invalidFolders.length > 0) {
        toast.error("Деякі папки не можна перемістити у власні підпапки");
      }

      const prevItems = items;
      const prevFolders = folderItems;

      setItems((prev) =>
        prev.map((p) =>
          persIds.includes(p.persId) ? { ...p, folderId: targetFolderId } : p,
        ),
      );
      setFolderItems((prev) =>
        prev.map((f) =>
          validFolders.includes(f.folderId)
            ? { ...f, parentFolderId: targetFolderId }
            : f,
        ),
      );

      const persResults = await Promise.all(
        persIds.map((id) => movePersToFolder(id, targetFolderId)),
      );
      const folderResults = await Promise.all(
        validFolders.map((id) => movePersFolder(id, targetFolderId)),
      );
      const hasFailure = [...persResults, ...folderResults].some(
        (result) => !result.success,
      );

      if (hasFailure) {
        setItems(prevItems);
        setFolderItems(prevFolders);
        toast.error("Не вдалося перемістити всі елементи");
        router.refresh();
        return;
      }

      toast.success("Елементи переміщено");
      setBulkMoveOpen(false);
      clearSelection();
      router.refresh();
    });
  }, [
    bulkMoveFolderId,
    clearSelection,
    folderItems,
    isDescendantFolder,
    items,
    movePersFolder,
    movePersToFolder,
    router,
    selectedFolderIds,
    selectedPersIds,
  ]);

  const handlePostCreateAddSelected = useCallback(() => {
    if (!postCreateFolder) return;

    startMoveTransition(async () => {
      const targetFolderId = postCreateFolder.folderId;
      const persIds = Array.from(selectedPersIds);
      const folderIds = Array.from(selectedFolderIds);

      if (persIds.length === 0 && folderIds.length === 0) return;

      const invalidFolders = folderIds.filter((id) =>
        isDescendantFolder(id, targetFolderId),
      );
      const validFolders = folderIds.filter(
        (id) => !invalidFolders.includes(id),
      );

      if (invalidFolders.length > 0) {
        toast.error("Деякі папки не можна перемістити у власні підпапки");
      }

      if (persIds.length === 0 && validFolders.length === 0) return;

      const prevItems = items;
      const prevFolders = folderItems;

      setItems((prev) =>
        prev.map((p) =>
          persIds.includes(p.persId) ? { ...p, folderId: targetFolderId } : p,
        ),
      );
      setFolderItems((prev) =>
        prev.map((f) =>
          validFolders.includes(f.folderId)
            ? { ...f, parentFolderId: targetFolderId }
            : f,
        ),
      );

      const persResults = await Promise.all(
        persIds.map((id) => movePersToFolder(id, targetFolderId)),
      );
      const folderResults = await Promise.all(
        validFolders.map((id) => movePersFolder(id, targetFolderId)),
      );
      const hasFailure = [...persResults, ...folderResults].some(
        (result) => !result.success,
      );

      if (hasFailure) {
        setItems(prevItems);
        setFolderItems(prevFolders);
        toast.error("Не вдалося додати всі елементи");
        router.refresh();
        return;
      }

      toast.success("Елементи додано до папки");
      setPostCreateMoveOpen(false);
      clearSelection();
      router.refresh();
    });
  }, [
    clearSelection,
    folderItems,
    isDescendantFolder,
    items,
    movePersFolder,
    movePersToFolder,
    postCreateFolder,
    router,
    selectedFolderIds,
    selectedPersIds,
  ]);

  const handleBulkDeleteConfirm = useCallback(() => {
    startMoveTransition(async () => {
      const persIds = new Set(selectedPersIds);
      const folderIds = new Set(selectedFolderIds);

      if (persIds.size === 0 && folderIds.size === 0) return;

      const prevItems = items;
      const prevFolders = folderItems;

      setItems((prev) =>
        prev
          .filter((p) => !persIds.has(p.persId))
          .map((p) =>
            folderIds.has(p.folderId ?? -1) ? { ...p, folderId: null } : p,
          ),
      );
      setFolderItems((prev) =>
        prev
          .filter((f) => !folderIds.has(f.folderId))
          .map((f) =>
            folderIds.has(f.parentFolderId ?? -1)
              ? { ...f, parentFolderId: null }
              : f,
          ),
      );

      const persResults = await Promise.all(
        Array.from(persIds).map((id) => deletePers(id)),
      );
      const folderResults = await Promise.all(
        Array.from(folderIds).map((id) => deletePersFolder(id)),
      );
      const hasFailure = [...persResults, ...folderResults].some(
        (result) => !result.success,
      );

      if (hasFailure) {
        setItems(prevItems);
        setFolderItems(prevFolders);
        toast.error("Не вдалося видалити всі елементи");
        router.refresh();
        return;
      }

      toast.success("Елементи видалено");
      setBulkDeleteOpen(false);
      clearSelection();
      router.refresh();
    });
  }, [
    clearSelection,
    deletePers,
    deletePersFolder,
    folderItems,
    items,
    router,
    selectedFolderIds,
    selectedPersIds,
  ]);

  const emptyMessage = searchValue
    ? "Нічого не знайдено за вашим запитом"
    : filtersActiveCount > 0
      ? "Нічого не знайдено за активними фільтрами"
      : currentFolderId
        ? "У цій папці поки немає персонажів"
        : "У вас ще немає персонажів. Створіть першого!";

  return (
    <div
      className={cn(
        "container mx-auto py-8 px-4 pb-28 md:pb-8 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-8",
        selectionMode && "pt-24",
      )}
    >
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
          {currentFolderId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                navigateToFolder(currentFolder?.parentFolderId ?? null)
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <button
            className="hover:text-slate-200 transition"
            onClick={() => {
              if (rootHref) {
                router.push(rootHref);
                return;
              }
              navigateToFolder(null);
            }}
          >
            Мої персонажі
          </button>
          {breadcrumbs.map((folder) => (
            <div key={folder.folderId} className="flex items-center gap-2">
              <ChevronRight className="h-3 w-3" />
              <button
                className="hover:text-slate-200 transition"
                onClick={() => navigateToFolder(folder.folderId)}
              >
                {folder.name}
              </button>
            </div>
          ))}
        </div>

        {selectionMode && (
          <div className="fixed top-0 left-0 right-0 z-40 border-b border-white/10 bg-slate-950/75 backdrop-blur-xl">
            <div className="container mx-auto px-4 py-3">
              <div className="glass-card border-white/10 bg-white/5 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-sm text-slate-200">
                  <CheckSquare className="h-4 w-4 text-arcane-300" />
                  <span>Вибрано: {totalSelected}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBulkMoveFolderId(
                        currentFolderId ? String(currentFolderId) : "root",
                      );
                      setBulkMoveOpen(true);
                    }}
                    disabled={totalSelected === 0}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    До папки
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeleteOpen(true)}
                    disabled={totalSelected === 0}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Видалити
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    <X className="h-4 w-4 mr-2" />
                    Скасувати
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-rpg-display font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-3">
              {currentFolder ? (
                <FolderOpen className="h-6 w-6 text-slate-400" />
              ) : (
                <Folder className="h-6 w-6 text-slate-400" />
              )}
              <span>{currentFolder?.name ?? "Мої Персонажі"}</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Пошук папок або персонажів..."
                className="pl-9 glass-card border-white/10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
              <Button
                type="button"
                variant="secondary"
                className={
                  "h-9 gap-2 border-0 bg-transparent hover:bg-white/5 " +
                  (filtersActiveCount > 0
                    ? "text-arcane-200 bg-arcane-500/10"
                    : "")
                }
                onClick={() => setFiltersOpen(true)}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Фільтри</span>
                {filtersActiveCount > 0 && (
                  <span className="ml-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-200">
                    {filtersActiveCount}
                  </span>
                )}
              </Button>

              {filtersActiveCount > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 gap-2 border-0 bg-transparent hover:bg-white/5 text-slate-200"
                  onClick={clearFilters}
                  aria-label="Очистити фільтри"
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Очистити</span>
                </Button>
              ) : null}
            </div>

            {extraHeaderActions}

            <Button
              variant="secondary"
              onClick={openCreateFolder}
              disabled={isFolderPending}
            >
              <FolderPlus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Нова папка</span>
            </Button>

            {currentFolder && (
              <Button
                variant="secondary"
                onClick={() => openShareFolder(currentFolder)}
                disabled={isFolderPending}
              >
                <Share2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Поширити папку</span>
              </Button>
            )}

            <Button
              onClick={handleCreate}
              disabled={isCreating || isDuplicating}
              className="shrink-0"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">Створити</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout" initial={false}>
          {visibleFolders.map((folder) => (
            <motion.div
              key={`folder-${folder.folderId}`}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <FolderCard
                folder={folder}
                stats={{
                  persCount: folderStats.persCount.get(folder.folderId) ?? 0,
                  folderCount:
                    folderStats.folderCount.get(folder.folderId) ?? 0,
                }}
                onOpen={handleOpenFolder}
                onEdit={openEditFolder}
                onDelete={handleFolderDelete}
                onDuplicate={handleFolderDuplicate}
                onTogglePin={handleToggleFolderPin}
                onShare={openShareFolder}
                isSelected={selectedFolderIds.has(folder.folderId)}
                selectionMode={selectionMode}
                onSelectToggle={toggleFolderSelection}
                onLongPress={handleLongPressFolder}
                allowLongPress={true}
              />
            </motion.div>
          ))}

          {visiblePerses.map((pers) => (
            <motion.div
              key={pers.persId}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <PersCard
                pers={pers}
                onRename={handleRename}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onMove={handleMoveOpen}
                onTogglePin={handleTogglePersPin}
                onDuplicateSuccess={(newPers) =>
                  setItems((prev) => [newPers, ...prev])
                }
                isSelected={selectedPersIds.has(pers.persId)}
                selectionMode={selectionMode}
                onSelectToggle={togglePersSelection}
                onLongPress={handleLongPressPers}
                allowLongPress={true}
                linkResolver={persLinkResolver}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {visibleFolders.length === 0 && visiblePerses.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
            {emptyMessage}
          </div>
        )}

        {globalSearchPerses.length > 0 && (
          <div className="col-span-full">
            <div className="mb-4 text-xs uppercase tracking-[0.2em] text-slate-500">
              Результати поза поточною папкою
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {globalSearchPerses.map((pers) => (
                <motion.div
                  key={`global-${pers.persId}`}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <PersCard
                    pers={pers}
                    onRename={handleRename}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onMove={handleMoveOpen}
                    onTogglePin={handleTogglePersPin}
                    onDuplicateSuccess={(newPers) =>
                      setItems((prev) => [newPers, ...prev])
                    }
                    isSelected={selectedPersIds.has(pers.persId)}
                    selectionMode={selectionMode}
                    onSelectToggle={togglePersSelection}
                    onLongPress={handleLongPressPers}
                    allowLongPress={true}
                    contextLabel={buildFolderPathLabel(pers.folderId)}
                    linkResolver={persLinkResolver}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="sm:max-w-[520px] glass-card border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle>
              {folderDialogMode === "create"
                ? "Нова папка"
                : "Редагувати папку"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={folderDialogName}
              onChange={(e) => setFolderDialogName(e.target.value)}
              maxLength={80}
              autoFocus
              placeholder="Назва папки"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">
                Колір папки
              </p>
              <div className="grid grid-cols-8 gap-2">
                {FOLDER_COLORS.map((color) => {
                  const isActive = folderDialogColor === color.value;
                  return (
                    <button
                      key={color.value}
                      type="button"
                      title={color.name}
                      className={`h-8 w-8 rounded-full border ${isActive ? "ring-2 ring-white/70" : "border-white/10"}`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => handleFolderColorPick(color.value)}
                    />
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setFolderDialogOpen(false)}
                disabled={isFolderPending}
              >
                Скасувати
              </Button>
              <Button onClick={handleFolderSave} disabled={isFolderPending}>
                {isFolderPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Зберегти
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {shareFolderId !== null && (
        <ShareFolderDialog
          folderId={shareFolderId}
          folderName={shareFolderName}
          open={shareFolderOpen}
          onOpenChange={handleShareFolderOpenChange}
          noButtonTrigger={true}
        />
      )}

      <Dialog
        open={postCreateMoveOpen}
        onOpenChange={handlePostCreateMoveOpenChange}
      >
        <DialogContent className="sm:max-w-[520px] glass-card border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle>Додати до нової папки?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Додати вибрані елементи до новоствореної папки{" "}
              {postCreateFolder?.name ? `"${postCreateFolder.name}"` : ""}?
            </p>
            <div className="max-h-52 overflow-auto rounded-xl border border-white/10 bg-slate-950/40 p-3 text-sm text-slate-200 space-y-1">
              {selectedItems.length === 0 ? (
                <div className="text-slate-500">Немає вибраних елементів.</div>
              ) : (
                selectedItems.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center gap-2"
                  >
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-500">
                      {item.type === "folder" ? "Папка" : "Персонаж"}
                    </span>
                    <span className="truncate">{item.name}</span>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => handlePostCreateMoveOpenChange(false)}
                disabled={isMovePending}
              >
                Ні, дякую
              </Button>
              <Button
                onClick={handlePostCreateAddSelected}
                disabled={isMovePending || selectedItems.length === 0}
              >
                {isMovePending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Додати
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-[480px] glass-card border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle>Перемістити персонажа</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Оберіть папку для персонажа{" "}
              {moveTarget?.name ? `"${moveTarget.name}"` : ""}.
            </p>
            <div className="max-h-64 overflow-auto pr-2 space-y-2">
              <button
                type="button"
                className={cn(
                  "w-full text-left rounded-xl border px-3 py-2 text-sm transition",
                  moveFolderId === "root"
                    ? "border-arcane-500/40 bg-arcane-500/10 text-arcane-200"
                    : "border-white/10 bg-slate-950/40 text-slate-200 hover:bg-white/5",
                )}
                onClick={() => setMoveFolderId("root")}
              >
                Корінь
              </button>
              {renderFolderTree(null, 0, moveFolderId, setMoveFolderId)}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setMoveDialogOpen(false)}
                disabled={isMovePending}
              >
                Скасувати
              </Button>
              <Button
                onClick={handleMoveConfirm}
                disabled={isMovePending || !moveTarget}
              >
                {isMovePending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Перемістити
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkMoveOpen} onOpenChange={setBulkMoveOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[80vh] overflow-y-auto glass-card border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle>Перемістити вибране</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Оберіть папку для {totalSelected} елементів.
            </p>
            <div className="glass-card rounded-xl border border-white/10 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-300">
                  Створити нову папку
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBulkCreateOpen((prev) => !prev)}
                >
                  {bulkCreateOpen ? "Сховати" : "Нова папка"}
                </Button>
              </div>
              {bulkCreateOpen && (
                <div className="mt-3 space-y-3">
                  <Input
                    value={bulkCreateName}
                    onChange={(e) => setBulkCreateName(e.target.value)}
                    placeholder="Назва папки"
                    className="border-white/10 bg-slate-950/40 text-slate-200"
                  />
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400">Шлях</div>
                    <div className="max-h-44 overflow-auto pr-2 space-y-2">
                      <button
                        type="button"
                        className={cn(
                          "w-full text-left rounded-xl border px-3 py-2 text-sm transition",
                          bulkCreateParentId === "root"
                            ? "border-arcane-500/40 bg-arcane-500/10 text-arcane-200"
                            : "border-white/10 bg-slate-950/40 text-slate-200 hover:bg-white/5",
                        )}
                        onClick={() => setBulkCreateParentId("root")}
                      >
                        Корінь
                      </button>
                      {renderFolderTree(
                        null,
                        0,
                        bulkCreateParentId,
                        setBulkCreateParentId,
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-2">Колір</div>
                    <div className="flex flex-wrap gap-2">
                      {FOLDER_COLORS.map((color) => {
                        const active = bulkCreateColor === color.value;
                        return (
                          <button
                            key={color.value}
                            type="button"
                            title={color.name}
                            className={cn(
                              "h-7 w-7 rounded-full border",
                              active
                                ? "ring-2 ring-white/70"
                                : "border-white/10",
                            )}
                            style={{ backgroundColor: color.value }}
                            onClick={() => setBulkCreateColor(color.value)}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleBulkCreateFolder}
                      disabled={isFolderPending}
                    >
                      {isFolderPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Створити
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="max-h-64 overflow-auto pr-2 space-y-2">
              <button
                type="button"
                className={cn(
                  "w-full text-left rounded-xl border px-3 py-2 text-sm transition",
                  bulkMoveFolderId === "root"
                    ? "border-arcane-500/40 bg-arcane-500/10 text-arcane-200"
                    : "border-white/10 bg-slate-950/40 text-slate-200 hover:bg-white/5",
                )}
                onClick={() => setBulkMoveFolderId("root")}
              >
                Корінь
              </button>
              {renderFolderTree(null, 0, bulkMoveFolderId, setBulkMoveFolderId)}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setBulkMoveOpen(false)}
                disabled={isMovePending}
              >
                Скасувати
              </Button>
              <Button
                onClick={handleBulkMoveConfirm}
                disabled={isMovePending || totalSelected === 0}
              >
                {isMovePending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Перемістити
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="sm:max-w-[480px] glass-card border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle>Видалити вибране</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Ви збираєтесь видалити {totalSelected} елементів. Цю дію не можна
              скасувати.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setBulkDeleteOpen(false)}
                disabled={isMovePending}
              >
                Скасувати
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDeleteConfirm}
                disabled={isMovePending || totalSelected === 0}
              >
                {isMovePending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Видалити
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent
          className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto p-0"
          showClose={false}
        >
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="font-rpg-display text-2xl font-semibold tracking-wide text-arcane-400">
                Фільтри
              </DialogTitle>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="glass-card inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-200/90 hover:text-arcane-300"
                aria-label="Закрити"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="glass-card rounded-xl border border-white/10 p-3">
                <div className="text-xs font-semibold text-slate-300">
                  Рівні
                </div>
                <div className="mt-2 max-h-44 overflow-auto pr-1">
                  <div className="flex flex-wrap gap-2">
                    {LEVEL_OPTIONS.map((lvl) => {
                      const active = levelFilters.has(lvl);
                      return (
                        <Badge
                          key={lvl}
                          variant={active ? "default" : "outline"}
                          className={
                            active
                              ? "bg-arcane-500/15 text-arcane-300 border-arcane-500/30"
                              : ""
                          }
                          onClick={() =>
                            toggleFilterValue(setLevelFilters, lvl)
                          }
                          role="button"
                        >
                          {lvl}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-xl border border-white/10 p-3">
                <div className="text-xs font-semibold text-slate-300">
                  Класи
                </div>
                <div className="mt-2">
                  <Input
                    value={classFilterQuery}
                    onChange={(e) => setClassFilterQuery(e.target.value)}
                    placeholder="Пошук класів..."
                    className="h-9 border-white/10 bg-slate-950/40 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
                <div className="mt-2 max-h-44 overflow-auto pr-1">
                  <div className="flex flex-wrap gap-2">
                    {classOptions
                      .filter((cls) => {
                        const q = classFilterQuery.trim().toLowerCase();
                        if (!q) return true;
                        const label = translateValue(cls);
                        return `${cls} ${label}`.toLowerCase().includes(q);
                      })
                      .map((cls) => {
                        const active = classFilters.has(cls);
                        return (
                          <Badge
                            key={cls}
                            variant={active ? "default" : "outline"}
                            className={
                              active
                                ? "bg-arcane-500/15 text-arcane-300 border-arcane-500/30"
                                : ""
                            }
                            onClick={() =>
                              toggleFilterValue(setClassFilters, cls)
                            }
                            role="button"
                          >
                            {translateValue(cls)}
                          </Badge>
                        );
                      })}
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-xl border border-white/10 p-3">
                <div className="text-xs font-semibold text-slate-300">
                  Підкласи
                </div>
                <div className="mt-2">
                  <Input
                    value={subclassFilterQuery}
                    onChange={(e) => setSubclassFilterQuery(e.target.value)}
                    placeholder="Пошук підкласів..."
                    className="h-9 border-white/10 bg-slate-950/40 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
                <div className="mt-2 max-h-44 overflow-auto pr-1">
                  <div className="space-y-3">
                    {subclassesByClass
                      .map(({ className, subclasses }) => {
                        const q = subclassFilterQuery.trim().toLowerCase();
                        const visible = !q
                          ? subclasses
                          : subclasses.filter((sub) =>
                              `${sub} ${translateValue(sub)}`
                                .toLowerCase()
                                .includes(q),
                            );
                        if (visible.length === 0) return null;

                        return (
                          <div key={className} className="space-y-2">
                            <div className="text-xs font-semibold text-slate-400">
                              {className}:
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {visible.map((sub) => {
                                const active = subclassFilters.has(sub);
                                return (
                                  <Badge
                                    key={sub}
                                    variant={active ? "default" : "outline"}
                                    className={
                                      active
                                        ? "bg-arcane-500/15 text-arcane-300 border-arcane-500/30"
                                        : ""
                                    }
                                    onClick={() =>
                                      toggleFilterValue(setSubclassFilters, sub)
                                    }
                                    role="button"
                                  >
                                    {translateValue(sub)}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                      .filter(Boolean)}
                  </div>
                </div>
              </div>

              {filtersActiveCount > 0 && (
                <div className="flex justify-end">
                  <Button variant="ghost" onClick={clearFilters}>
                    Очистити фільтри
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
