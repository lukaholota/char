"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Printer } from "lucide-react";

import type { PrintConfig, PrintSection } from "@/server/pdf/types";
import { generateCharacterPdfAction } from "@/app/char/[id]/print/actions";
import { generateCharacterPdfByTokenAction } from "@/app/char/share/[token]/print/actions";

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export interface PrintCharacterDialogProps {
  persId: number;
  characterName: string;
  disabled?: boolean;
  shareToken?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  noButtonTrigger?: boolean;
  initialSections?: PrintSection[];
}

export default function PrintCharacterDialog({ 
  persId, 
  characterName, 
  disabled, 
  shareToken,
  open: openOverride,
  onOpenChange: onOpenChangeOverride,
  noButtonTrigger: hideTrigger,
  initialSections
}: PrintCharacterDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openOverride !== undefined ? openOverride : internalOpen;
  const setOpen = onOpenChangeOverride !== undefined ? onOpenChangeOverride : setInternalOpen;

  const [isPending, startTransition] = useTransition();

  const [includeCharacter, setIncludeCharacter] = useState(() => !initialSections || initialSections.includes("CHARACTER"));
  const [includeFeatures, setIncludeFeatures] = useState(() => !initialSections || initialSections.includes("FEATURES"));
  const [includeSpells, setIncludeSpells] = useState(() => !initialSections || initialSections.includes("SPELLS"));
  const [includeSpellSheet, setIncludeSpellSheet] = useState(() => !initialSections || initialSections.includes("SPELL_SHEET"));
  const [includeDetails, setIncludeDetails] = useState(() => initialSections?.includes("DETAILS") ?? false);
  const [includeMagicItems, setIncludeMagicItems] = useState(() => !initialSections || initialSections.includes("MAGIC_ITEMS"));

  useEffect(() => {
    if (open && initialSections) {
      setIncludeCharacter(initialSections.includes("CHARACTER"));
      setIncludeFeatures(initialSections.includes("FEATURES"));
      setIncludeSpells(initialSections.includes("SPELLS"));
      setIncludeSpellSheet(initialSections.includes("SPELL_SHEET"));
      setIncludeDetails(initialSections.includes("DETAILS"));
      setIncludeMagicItems(initialSections.includes("MAGIC_ITEMS"));
    }
  }, [open, initialSections]);

  const config: PrintConfig = useMemo(() => {
    const sections: PrintSection[] = [];
    if (includeCharacter) sections.push("CHARACTER");
    if (includeFeatures) sections.push("FEATURES");
    if (includeSpellSheet) sections.push("SPELL_SHEET");
    if (includeDetails) sections.push("DETAILS");
    if (includeSpells) sections.push("SPELLS");
    if (includeMagicItems) sections.push("MAGIC_ITEMS");
    return { sections };
  }, [includeCharacter, includeFeatures, includeSpells, includeSpellSheet, includeDetails, includeMagicItems]);

  const handleDownload = () => {
    startTransition(async () => {
      try {
        const res = shareToken
          ? await generateCharacterPdfByTokenAction(shareToken, config)
          : await generateCharacterPdfAction(persId, config);
        const bytes = base64ToUint8Array(res.data);
        const arrayBuffer = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(arrayBuffer).set(bytes);
        const blob = new Blob([arrayBuffer], { type: res.contentType });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${characterName || "character"}.pdf`;
        a.click();
        URL.revokeObjectURL(url);

        setOpen(false);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to generate PDF";
        toast.error(message);
      }
    });
  };

  return (
    <>
      {hideTrigger !== true && (
        <Button
          size="sm"
          variant="secondary"
          className="h-8 gap-2"
          onClick={() => setOpen(true)}
          disabled={disabled || isPending}
        >
          <Printer className="h-4 w-4" />
          <span className="hidden sm:inline">Друк</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent 
          className="sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Друк у PDF</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox checked={includeCharacter} onCheckedChange={(v) => setIncludeCharacter(Boolean(v))} id="print-character" />
              <Label htmlFor="print-character">Лист персонажа</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={includeDetails} onCheckedChange={(v) => setIncludeDetails(Boolean(v))} id="print-details" />
              <Label htmlFor="print-details">Бланк подробиць</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={includeSpellSheet} onCheckedChange={(v) => setIncludeSpellSheet(Boolean(v))} id="print-spell-sheet" />
              <Label htmlFor="print-spell-sheet">Лист заклинань (таблиця)</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={includeFeatures} onCheckedChange={(v) => setIncludeFeatures(Boolean(v))} id="print-features" />
              <Label htmlFor="print-features">Здібності</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={includeSpells} onCheckedChange={(v) => setIncludeSpells(Boolean(v))} id="print-spells" />
              <Label htmlFor="print-spells">Описи заклинань (повні)</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={includeMagicItems} onCheckedChange={(v) => setIncludeMagicItems(Boolean(v))} id="print-magic-items" />
              <Label htmlFor="print-magic-items">Магічні предмети</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                Скасувати
              </Button>
              <Button onClick={handleDownload} disabled={isPending || config.sections.length === 0}>
                {isPending ? "Генеруємо…" : "Завантажити PDF"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
