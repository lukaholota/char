"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { askToConfirm } from "@/components/ui/confirm-dialog";

const NO_CONNECTION_ERROR = "Немає звʼязку із сервером. Зміни не збережено, спробуйте ще раз.";

export function useCustomContentSave() {
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const runSave = async <Result,>(save: () => Promise<Result>): Promise<Result | null> => {
    setIsSaving(true);
    setFormError(null);
    try {
      return await save();
    } catch {
      setFormError(NO_CONNECTION_ERROR);
      return null;
    } finally {
      setIsSaving(false);
    }
  };
  return { isSaving, formError, setFormError, runSave };
}

export function CustomContentForm({ children, formError, isSaving, deleteRequest, onSubmit, onDelete }: {
  children: ReactNode;
  formError: string | null;
  isSaving: boolean;
  deleteRequest: { title: string; description: string } | null;
  onSubmit: () => void;
  onDelete: () => void;
}) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!isSaving) onSubmit();
  };
  const confirmDelete = async () => {
    if (deleteRequest && (await askToConfirm({ ...deleteRequest, confirmLabel: "Видалити", isDestructive: true }))) onDelete();
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {children}
      {formError ? <p role="alert" className="text-sm text-rose-300">{formError}</p> : null}
      <div className="flex items-center justify-between gap-2">
        {deleteRequest ? (
          <Button type="button" variant="ghost" className="h-11 text-rose-300 hover:text-rose-200" disabled={isSaving} onClick={confirmDelete}>
            Видалити
          </Button>
        ) : <span />}
        <Button type="submit" className="h-11" disabled={isSaving}>{isSaving ? "Зберігаємо…" : "Зберегти"}</Button>
      </div>
    </form>
  );
}
