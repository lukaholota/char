"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Pencil, Repeat, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { LazyRichTextEditor } from "@/components/ui/rich-text/LazyRichTextEditor";
import type { CharacterFeatureItem } from "@/lib/actions/pers";
import { saveFeatureDescription } from "@/lib/actions/feature-descriptions";
import { buildEditableDescription } from "@/lib/logic/feature-descriptions";
import { SubclassOptionRechoiceDialog } from "@/lib/components/characterSheet/SubclassOptionRechoiceDialog";
import { buildSpellLinkForSpell, openSpellLink } from "@/lib/spell-link";
import type { FeatureSpellRow } from "@/lib/logic/free-feat-spell-casts";

type Props = {
  persId: number;
  feature: CharacterFeatureItem | null;
  /** Заклинання, які дала ця риса: з її опису до самого заклинання інакше не дійти. */
  spells?: readonly FeatureSpellRow[];
  title: string;
  isReadOnly?: boolean;
  onClose: () => void;
  onDescriptionSaved: () => void;
};

export function FeatureDetailsDialog({ persId, feature, spells, title, isReadOnly, onClose, onDescriptionSaved }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSaving, startSaving] = useTransition();
  const [isRechoiceOpen, setIsRechoiceOpen] = useState(false);
  const canEdit = !isReadOnly && Boolean(feature?.descriptionTarget);
  const rechoosableGroupName = !isReadOnly ? feature?.rechoosableGroupName ?? null : null;

  useEffect(() => {
    setIsEditing(false);
    setDraft(feature ? buildEditableDescription(feature.description, Boolean(feature.hasCustomDescription)) : "");
  }, [feature]);

  const submit = (description: string) => {
    if (!feature?.descriptionTarget) return;
    const target = feature.descriptionTarget;
    startSaving(async () => {
      const result = await saveFeatureDescription({ persId, target, description });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.description === null ? "Повернуто оригінальний опис" : "Опис збережено");
      setIsEditing(false);
      onDescriptionSaved();
    });
  };

  return (
    <Dialog open={Boolean(feature)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="pr-6 text-lg font-bold sm:text-xl">{title}</DialogTitle>
          {feature?.hasCustomDescription ? <CustomDescriptionBadge /> : null}
        </DialogHeader>

        {isEditing ? (
          <DescriptionEditor draft={draft} onDraftChange={setDraft} />
        ) : feature?.description ? (
          <div className="glass-panel rounded-xl border border-slate-800/70 p-3 sm:p-4">
            <FormattedDescription content={feature.description} className="text-slate-200/90" />
          </div>
        ) : null}

        {spells && spells.length > 0 && !isEditing ? <FeatureSpellLinks spells={spells} onOpen={onClose} /> : null}

        {rechoosableGroupName && !isEditing ? (
          <Button type="button" variant="secondary" className="h-11 gap-2 sm:h-9 sm:self-start" onClick={() => setIsRechoiceOpen(true)}>
            <Repeat className="h-4 w-4" />
            Змінити вибір
          </Button>
        ) : null}

        {canEdit ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {isEditing ? (
              <>
                <Button type="button" variant="secondary" className="h-11 sm:h-9" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  Скасувати
                </Button>
                <Button type="button" className="h-11 sm:h-9" onClick={() => submit(draft)} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Зберегти"}
                </Button>
              </>
            ) : (
              <>
                {feature?.hasCustomDescription ? (
                  <Button type="button" variant="secondary" className="h-11 gap-2 sm:h-9" onClick={() => submit("")} disabled={isSaving}>
                    <RotateCcw className="h-4 w-4" />
                    Повернути оригінал
                  </Button>
                ) : null}
                <Button type="button" className="h-11 gap-2 sm:h-9" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4" />
                  Редагувати опис
                </Button>
              </>
            )}
          </div>
        ) : null}
      </DialogContent>
      {rechoosableGroupName ? (
        <SubclassOptionRechoiceDialog
          persId={persId}
          groupName={rechoosableGroupName}
          open={isRechoiceOpen}
          onOpenChange={setIsRechoiceOpen}
          onSaved={() => {
            onDescriptionSaved();
            onClose();
          }}
        />
      ) : null}
    </Dialog>
  );
}

function CustomDescriptionBadge() {
  return (
    <span className="w-fit rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
      Ваш опис
    </span>
  );
}

function DescriptionEditor({ draft, onDraftChange }: { draft: string; onDraftChange: (value: string) => void }) {
  return (
    <div className="space-y-1">
      <LazyRichTextEditor value={draft} onChange={onDraftChange} ariaLabel="Опис фічі" contentClassName="min-h-[45dvh] sm:min-h-72" isToolbarSticky />
      <p className="text-xs text-slate-400">Порожній опис поверне оригінал. Опис бачите лише ви та ті, кому відкрито лист.</p>
    </div>
  );
}

/// Модалка заклинання змонтована глобально й сама по собі модальна, тож картку риси спершу
/// закриваємо: два накладені Radix-діалоги забирають фокус один в одного.
function FeatureSpellLinks({ spells, onOpen }: { spells: readonly FeatureSpellRow[]; onOpen: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-wide text-slate-400">Заклинання риси</span>
      <div className="flex flex-wrap gap-2">
        {spells.map((spell) => (
          <Button
            key={spell.spellId}
            type="button"
            variant="secondary"
            className="h-11 gap-2 sm:h-9"
            onClick={() => {
              onOpen();
              openSpellLink(buildSpellLinkForSpell(spell));
            }}
          >
            <Sparkles className="h-4 w-4" />
            {spell.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
