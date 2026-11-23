"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { FolderPlus, FolderUp, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACCEPTED_IMAGE_MIME_TYPES } from "@/lib/media-upload-limits";

type Folder = { id: number; name: string };
type Props = {
  folders: readonly Folder[];
  folderId: number | null;
  isBusy: boolean;
  canUpload: boolean;
  moveTo: number | null | undefined;
  onSelect: (id: number | null) => void;
  onCreate: (name: string) => Promise<boolean>;
  onUpload: (files: File[], folderName?: string) => void;
  onMoveTo: (id: number | null | undefined) => void;
};

export function ObjectLibraryFolders({ folders, folderId, isBusy, canUpload, moveTo, onSelect, onCreate, onUpload, onMoveTo }: Props) {
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const create = async () => {
    if (newFolder?.trim() && await onCreate(newFolder)) setNewFolder(null);
  };
  const pick = (event: ChangeEvent<HTMLInputElement>, isFolder: boolean) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (files.length) onUpload(files, isFolder ? files[0].webkitRelativePath.split("/")[0] : undefined);
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <select aria-label="Папка зображень" value={folderId ?? "root"} disabled={isBusy} onChange={(event) => onSelect(event.target.value === "root" ? null : Number(event.target.value))} className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/15 bg-slate-950 px-2 text-sm text-slate-100">
          <option value="root">Без папки</option>
          {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
        </select>
        <Button type="button" variant="outline" size="icon" aria-label="Створити папку" title="Створити папку" aria-expanded={newFolder !== null} disabled={isBusy} className="h-11 w-11 shrink-0" onClick={() => setNewFolder(newFolder === null ? "" : null)}><FolderPlus className="h-4 w-4" aria-hidden /></Button>
      </div>
      {newFolder !== null ? (
        <div className="flex gap-2">
          <Input value={newFolder} onChange={(event) => setNewFolder(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void create(); } }} aria-label="Назва папки" maxLength={60} disabled={isBusy} className="h-11 min-w-0" />
          <Button type="button" variant="outline" disabled={isBusy || !newFolder.trim()} className="h-11" onClick={() => void create()}>Створити</Button>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={!canUpload} className="min-h-10 gap-2" onClick={() => filesRef.current?.click()}><Images className="h-4 w-4" aria-hidden />Кілька файлів</Button>
        <Button type="button" variant="outline" disabled={!canUpload} className="min-h-10 gap-2" onClick={() => folderRef.current?.click()}><FolderUp className="h-4 w-4" aria-hidden />Папка з диска</Button>
        <input ref={filesRef} type="file" multiple accept={ACCEPTED_IMAGE_MIME_TYPES} aria-label="Завантажити кілька файлів" className="sr-only" tabIndex={-1} onChange={(event) => pick(event, false)} />
        <input ref={folderRef} type="file" multiple {...{ webkitdirectory: "" }} aria-label="Завантажити папку з диска" className="sr-only" tabIndex={-1} onChange={(event) => pick(event, true)} />
      </div>
      {folders.length ? (
        <select aria-label="Перемістити зображення до папки" value={moveTo === undefined ? "none" : moveTo ?? "root"} disabled={isBusy} onChange={(event) => onMoveTo(event.target.value === "none" ? undefined : event.target.value === "root" ? null : Number(event.target.value))} className="min-h-11 min-w-0 rounded-lg border border-white/15 bg-slate-950 px-2 text-sm text-slate-100">
          <option value="none">Перемістити зображення…</option>
          {folderId !== null ? <option value="root">Без папки</option> : null}
          {folders.filter((folder) => folder.id !== folderId).map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
        </select>
      ) : null}
    </div>
  );
}
